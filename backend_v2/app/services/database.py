

import logging
from datetime import datetime, timezone
from typing import Optional, Any, List
from supabase import create_client, Client
from ..config import settings

logger = logging.getLogger(__name__)

# Add file logging to bypass PowerShell display issues
file_handler = logging.FileHandler('database_debug.log')
file_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)
logger.setLevel(logging.INFO)

class SupabaseService:
    def __init__(self):
        # Public Client (Anon) - Used only for auth operations
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            self.anon_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        else:
            logger.warning("Supabase credentials missing. Persistence disabled.")
            self.anon_client = None

        # Admin Client (Service Role) - Bypasses RLS, used for ALL DB operations
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                self.admin_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
                logger.info("✅ Admin client initialized successfully with SERVICE_KEY")
            except Exception as e:
                logger.error(f"❌ Admin client initialization FAILED: {e}")
                self.admin_client = None
        else:
            logger.warning("⚠️ SUPABASE_SERVICE_KEY not configured - admin operations will use public client")
            self.admin_client = None

        # Primary DB client: prefer admin_client (bypasses RLS), fallback to anon
        self.client: Client = self.admin_client or self.anon_client
        if self.client == self.admin_client:
            logger.info("✅ Using SERVICE_ROLE client for all DB operations (bypasses RLS)")
        elif self.client == self.anon_client:
            logger.warning("⚠️ Using ANON client for DB operations - RLS policies may block access!")

    # ============================================================================
    # Clients
    # ============================================================================

    def list_clients(self) -> list[dict]:
        if not self.client: return []
        try:
            response = self.client.table("clients").select("*").execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"DB List Error (Clients): {e}")
            return []

    def create_client(self, client_data: dict):
        """Create a new client. Raises exception if fails."""
        if not self.client:
            raise Exception("Database client not initialized")
        try:
            logger.info(f"Creating client: {client_data.get('nombre')}")
            response = self.client.table("clients").insert(client_data).execute()
            logger.info(f"Client created successfully: {response.data}")
            return response.data
        except Exception as e:
            logger.error(f"DB Insert Error (Client): {e}")
            raise e  # Propagate error to endpoint

    def get_client(self, client_id: str) -> Optional[dict]:
        if not self.client: return None
        try:
            response = self.client.table("clients").select("*").eq("id", client_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"DB Get Error (Client): {e}")
            return None
    
    def update_client(self, client_id: str, updates: dict):
        """Update client information."""
        if not self.client:
            logger.error("DB: No client available for update")
            return
        
        try:
            response = self.client.table("clients").update(updates).eq("id", client_id).execute()
            logger.info(f"Updated client {client_id}: {updates}")
            return response.data
        except Exception as e:
            logger.error(f"DB Update Client Error: {e}")
            raise e

    def delete_client(self, client_id: str):
        if not self.client: return
        try:
            self.client.table("clients").delete().eq("id", client_id).execute()
        except Exception as e:
            logger.error(f"DB Delete Error (Client): {e}")

    def list_brand_users(self, brand_id: str) -> list[dict]:
        """List all users belonging to a brand (client)."""
        if not self.client: return []
        try:
            response = self.client.table("users").select("id, email, full_name, role, created_at").eq("client_id", brand_id).execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"DB List Brand Users Error: {e}")
            return []

    # ============================================================================
    # Users
    # ============================================================================

    def get_user_by_email(self, email: str) -> Optional[dict]:
        if not self.client: return None
        try:
            response = self.client.table("users").select("*").eq("email", email).limit(1).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            logger.error(f"DB Get User Error: {e}")
        return None

    def create_user_profile(self, user_data: dict):
        # Use Admin Client if available to bypass RLS (needed when Admin creates another user)
        target_client = self.admin_client if self.admin_client else self.client
        
        if not target_client: return

        try:
            # Ensure no password is stored in public profile
            if "password" in user_data:
                del user_data["password"]
            if "hashed_password" in user_data:
                del user_data["hashed_password"]
                
            target_client.table("users").insert(user_data).execute()
        except Exception as e:
            logger.error(f"DB Create User Profile Error: {e}")
            raise e

    def update_user(self, user_id: str, updates: dict):
        # FORCE use of Admin Client - we MUST bypass RLS for admin operations
        if not self.admin_client:
            error_msg = "CRITICAL: admin_client is NULL - cannot perform admin updates. Check SUPABASE_SERVICE_KEY in .env"
            logger.error(error_msg)
            raise Exception(error_msg)
        
        logger.info(f"✅ Using ADMIN client for update (SERVICE_ROLE)")
        
        try:
            logger.info(f"DB: Attempting to update user {user_id}. Updates: {updates}")
            
            # Prevent updating sensitive fields via this method if any
            if "id" in updates: del updates["id"]
            if "email" in updates: del updates["email"] # Usually email is immutable or handled via auth
            
            response = self.admin_client.table("users").update(updates).eq("id", user_id).execute()
            logger.info(f"DB: Update response: {response}")
            logger.info(f"DB: Response data: {response.data}")
            logger.info(f"DB: Response count: {response.count if hasattr(response, 'count') else 'N/A'}")
            
            # CRITICAL: Check if update actually affected rows
            if not response.data or len(response.data) == 0:
                error_msg = f"Supabase update returned empty data - update failed for user {user_id}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            logger.info(f"✅ Update successful - {len(response.data)} row(s) affected")
            return response.data[0]
            
        except Exception as e:
            logger.error(f"DB Update User Error: {e}")
            raise e

    def list_users(self) -> list[dict]:
        if not self.client: return []
        try:
            response = self.client.table("users").select("id, email, full_name, role, created_at, client_id").execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"DB List Users Error: {e}")
            return []

    def delete_user(self, user_id: str):
        if not self.client: return
        try:
            # 1. Delete Public Profile
            self.client.table("users").delete().eq("id", user_id).execute()
            
            # 2. Delete Auth User (if Admin Key available)
            if self.admin_client:
                self.admin_client.auth.admin.delete_user(user_id)
                
        except Exception as e:
            logger.error(f"DB Delete User Error: {e}")

    def update_password_admin(self, user_id: str, new_password: str):
        if not self.admin_client:
            raise Exception("Service Key not configured. Cannot reset password.")
        try:
            self.admin_client.auth.admin.update_user_by_id(user_id, {"password": new_password})
        except Exception as e:
            logger.error(f"DB Update Password Error: {e}")
            raise e

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user profile by ID."""
        if not self.client: return None
        try:
            response = self.client.table("users").select("*").eq("id", user_id).limit(1).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            logger.error(f"DB Get User By ID Error: {e}")
        return None

    # ============================================================================
    # Interview / Context
    # ============================================================================

    def save_interview(self, client_id: str, data: dict, file_url: Optional[str] = None):
        if not self.client: return
        try:
            # Check if exists to update or insert
            existing = self.client.table("client_interviews").select("id").eq("client_id", client_id).execute()
            
            payload = {
                "client_id": client_id,
                "data": data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            if file_url:
                payload["file_url"] = file_url

            if existing.data:
                # Update
                self.client.table("client_interviews").update(payload).eq("client_id", client_id).execute()
            else:
                # Insert
                self.client.table("client_interviews").insert(payload).execute()
                
        except Exception as e:
            logger.error(f"DB Save Interview Error: {e}")
            raise e

    def get_interview(self, client_id: str) -> Optional[dict]:
        """Get interview for a client. Returns None if not found (not an error)."""
        if not self.client: return None
        try:
            # Use maybeSingle() pattern - returns None if not found instead of throwing
            response = self.client.table("client_interviews").select("*").eq("client_id", client_id).execute()
            if response.data and len(response.data) > 0:
                logger.info(f"Interview found for client {client_id}")
                return response.data[0]
            else:
                logger.info(f"No interview found for client {client_id}")
                return None
        except Exception as e:
            # Log but don't propagate - missing interview is not an error
            logger.warning(f"DB Get Interview - no data for client {client_id}: {e}")
            return None

    # ============================================================================
    # Strategy (Visual Editor)
    # ============================================================================

    def get_strategy_nodes(self, client_id: str) -> list[dict]:
        if not self.client: return []
        try:
            logger.info(f"🔍 Fetching strategy nodes for client_id: {client_id}")
            
            # Order by type (main first, then secondary, then concept/post)
            # Then by created_at for consistent ordering within each type
            response = self.client.table("strategy_nodes")\
                .select("*")\
                .eq("client_id", client_id)\
                .order("created_at", desc=False)\
                .execute()
            
            logger.info(f"📊 Found {len(response.data) if response.data else 0} nodes for client {client_id}")
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"❌ DB Get Strategy Error: {e}")
            return []

    def get_strategy_review(self, client_id: str) -> Optional[dict]:
        """The client's approval of their strategy (strategy_reviews), if any."""
        if not self.client: return None
        try:
            response = self.client.table("strategy_reviews").select("*").eq("client_id", client_id).limit(1).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"❌ DB Get Strategy Review Error: {e}")
            return None

    def save_strategy_review(self, client_id: str, data: dict) -> None:
        if not self.client: return
        self.client.table("strategy_reviews").upsert({"client_id": client_id, **data}, on_conflict="client_id").execute()

    def sync_strategy_nodes(self, client_id: str, nodes: list[dict]):
        """
        Full sync: Delete all existing nodes for client and re-insert.
        Ideal for "Save" button or Auto-save on specific intervals.
        """
        if not self.client: return
        try:
            logger.info(f"💾 Syncing strategy nodes for client_id: {client_id} ({len(nodes)} nodes)")

            # 0. Keep a copy of the current nodes so we can restore them if the
            #    insert below fails — delete+insert isn't atomic over the REST
            #    API, so without this a failed insert would leave the client
            #    with an empty strategy tree.
            backup_response = self.client.table("strategy_nodes").select("*").eq("client_id", client_id).execute()
            backup_nodes = backup_response.data or []

            # 1. Delete all current nodes for this client
            self.client.table("strategy_nodes").delete().eq("client_id", client_id).execute()
            logger.info(f"🗑️ Deleted existing nodes for client {client_id}")

            # 2. Bulk Insert new nodes
            if nodes:
                # Ensure client_id is set on all
                for n in nodes:
                    n["client_id"] = client_id

                try:
                    self.client.table("strategy_nodes").insert(nodes).execute()
                    logger.info(f"✅ Strategy nodes synced for {client_id} ({len(nodes)} nodes)")
                except Exception as insert_err:
                    logger.error(f"❌ Insert failed for {client_id}, restoring previous {len(backup_nodes)} nodes: {insert_err}")
                    if backup_nodes:
                        self.client.table("strategy_nodes").insert(backup_nodes).execute()
                    raise
            else:
                logger.info(f"ℹ️ No nodes to insert for client {client_id}")

        except Exception as e:
            logger.error(f"❌ DB Sync Strategy Error for client {client_id}: {e}")
            raise e

    # ============================================================================
    # Brand Identity (Brand Book)
    # ============================================================================

    def get_brand_identity(self, client_id: str) -> dict:
        if not self.client: return {}
        try:
            response = self.client.table("brand_identities").select("*").eq("client_id", client_id).single().execute()
            return response.data if response.data else {}
        except Exception as e:
            # It's okay if it doesn't exist yet
            return {}

    def update_brand_identity(self, client_id: str, data: dict):
        if not self.client: return
        try:
            # Check if exists
            exists = self.get_brand_identity(client_id)
            data["client_id"] = client_id

            if exists:
                self.client.table("brand_identities").update(data).eq("client_id", client_id).execute()
            else:
                self.client.table("brand_identities").insert(data).execute()

            logger.info(f"✅ Brand identity updated for {client_id}")
        except Exception as e:
            logger.error(f"DB Update Brand Error: {e}")
            raise e

    def get_market_study(self, client_id: str) -> Optional[dict]:
        """Génesis study (01_mercado_estudio), written by hand from Claude Desktop. None if not run yet."""
        if not self.client: return None
        try:
            response = self.client.table("market_studies").select("*").eq("client_id", client_id).order("created_at", desc=True).limit(1).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"DB Get Market Study Error: {e}")
            return None

    def get_market_findings(self, client_id: str, limit: int = 50) -> List[dict]:
        """Recurring competitive findings (03_mercado_vigilancia), newest first."""
        if not self.client: return []
        try:
            response = self.client.table("market_findings").select("*").eq("client_id", client_id).order("fecha", desc=True).limit(limit).execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"DB Get Market Findings Error: {e}")
            return []

    def has_content_pieces(self, client_id: str) -> bool:
        """True once /05_planificacion has written at least one piece for this client."""
        if not self.client:
            return False
        try:
            response = self.client.table("content_pieces").select("id").eq("client_id", client_id).limit(1).execute()
            return bool(response.data)
        except Exception as e:
            logger.error(f"DB has_content_pieces Error: {e}")
            return False

    def get_content_pieces(self, client_id: str, month: Optional[str] = None) -> List[dict]:
        """Pieces written by the Claude Desktop pipeline (05_planificacion creates them, then copy, render and publishing). month = 'YYYY-MM'."""
        if not self.client: return []
        try:
            query = self.client.table("content_pieces").select("*").eq("client_id", client_id)
            if month:
                year, mon = (int(part) for part in month.split("-"))
                next_month = f"{year + mon // 12}-{mon % 12 + 1:02d}-01"
                query = query.gte("fecha", f"{month}-01").lt("fecha", next_month)
            response = query.order("fecha").execute()
            return response.data or []
        except Exception as e:
            logger.error(f"DB Get Content Pieces Error: {e}")
            return []

    def review_content_piece(self, client_id: str, piece_id: str, estado: str, comentario: Optional[str], reviewer: str, cambio_tipo: Optional[str] = None) -> Optional[dict]:
        """The client's approval decision. Filtered by client_id too, so a piece id from another client never matches."""
        if not self.client: return None
        response = self.client.table("content_pieces").update({
            "estado_aprobacion": estado,
            "comentario_cliente": comentario,
            "cambio_tipo": cambio_tipo,
            "revisado_at": datetime.now(timezone.utc).isoformat(),
            "revisado_por": reviewer,
        }).eq("id", piece_id).eq("client_id", client_id).execute()
        return response.data[0] if response.data else None

    def get_content_piece(self, client_id: str, piece_id: str) -> Optional[dict]:
        if not self.client: return None
        response = self.client.table("content_pieces").select("*").eq("id", piece_id).eq("client_id", client_id).limit(1).execute()
        return response.data[0] if response.data else None

    def review_plan_pieces(self, client_id: str, piece_ids: List[str], estado: str, comentario: Optional[str], reviewer: str) -> List[dict]:
        """The client's decision on ideas of the plan (plan_estado). Only pieces not yet in production can change."""
        if not self.client or not piece_ids: return []
        response = self.client.table("content_pieces").update({
            "plan_estado": estado,
            "plan_comentario": comentario,
            "plan_revisado_at": datetime.now(timezone.utc).isoformat(),
            "plan_revisado_por": reviewer,
        }).in_("id", piece_ids).eq("client_id", client_id).eq("estado_copy", "Pendiente").execute()
        return response.data or []

    def upload_public_file(self, bucket: str, path: str, data: bytes, content_type: str) -> str:
        """Uploads to a public Storage bucket and returns its permanent public URL."""
        storage = self.client.storage.from_(bucket)
        storage.upload(path, data, {"content-type": content_type, "upsert": "true"})
        return storage.get_public_url(path).rstrip("?")

    def save_piece_finals(self, client_id: str, piece_id: str, urls: List[str], generada_con_ia: bool, uploader: str, back_to_review: bool) -> Optional[dict]:
        """Final files uploaded by the team: the piece moves to Validación (or back to it after a visual correction)."""
        if not self.client: return None
        data = {
            "url_piezas_finales": urls,
            "url_imagen": urls[0],
            "estado_render": "✅ Postproducción",
            "generada_con_ia": generada_con_ia,
            "entregada_at": datetime.now(timezone.utc).isoformat(),
            "entregada_por": uploader,
        }
        if back_to_review:
            data["estado_aprobacion"] = "Pendiente"
        response = self.client.table("content_pieces").update(data).eq("id", piece_id).eq("client_id", client_id).execute()
        return response.data[0] if response.data else None

db = SupabaseService()
