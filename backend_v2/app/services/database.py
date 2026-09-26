

import logging
from datetime import datetime, timezone
from typing import Optional, Any
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
    # Reports (Analysis)
    # ============================================================================

    def create_report(self, report_id: str, client_id: str, status: str = "PROCESSING"):
        if not self.client: return
        data = {
            "id": report_id,
            "client_id": client_id,
            "status": status,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        try:
            self.client.table("analysis_reports").insert(data).execute()
        except Exception as e:
            logger.error(f"DB Insert Error (Report): {e}")

    def update_report_status(self, report_id: str, status: str, result: Optional[dict] = None, error: Optional[str] = None, audit_log: Optional[dict] = None):
        if not self.client: return
        data = {"status": status}
        if result:
            data["frontend_compatible_json"] = result
        if error:
            data["error_message"] = error
        if audit_log:
            data["audit_log"] = audit_log
            
        try:
            self.client.table("analysis_reports").update(data).eq("id", report_id).execute()
        except Exception as e:
            logger.error(f"DB Update Error (Report): {e}")

    def get_latest_completed_report(self, client_id: str) -> Optional[dict]:
        if not self.client: return None
        try:
            response = self.client.table("analysis_reports")\
                .select("*")\
                .eq("client_id", client_id)\
                .eq("status", "COMPLETED")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            logger.error(f"DB Select Error (Report): {e}")
        return None

    def get_client_status(self, client_id: str) -> dict:
        if not self.client: return {"status": None}
        try:
            response = self.client.table("analysis_reports")\
                .select("id, status, created_at")\
                .eq("client_id", client_id)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if response.data:
                latest = response.data[0]
                return {"status": latest["status"], "report_id": latest["id"]}
        except Exception as e:
            logger.error(f"DB Status Check Error: {e}")
        
        return {"status": None}

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
    # Tasks
    # ============================================================================

    def create_tasks_batch(self, tasks_list: list[dict]):
        if not self.client:
            logger.error("DB Batch Insert Error (Tasks): No DB client")
            raise Exception("Database client not initialized")
        if not tasks_list:
            logger.warning("DB Batch Insert: Empty tasks list, skipping")
            return
        try:
            logger.info(f"DB Batch Insert: Inserting {len(tasks_list)} tasks")
            result = self.client.table("tasks").insert(tasks_list).execute()
            logger.info(f"DB Batch Insert Success: {len(result.data) if result.data else 0} tasks inserted")
            return result
        except Exception as e:
            logger.error(f"DB Batch Insert Error (Tasks): {e}", exc_info=True)
            raise  # Re-raise so pipeline can log it

    def get_tasks(self, client_id: str) -> list[dict]:
        if not self.client: return []
        try:
            response = self.client.table("tasks").select("*").eq("client_id", client_id).execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"DB Get Tasks Error: {e}")
            return []
    
    def get_task(self, task_id: str) -> Optional[dict]:
        """Get a single task by ID."""
        if not self.client: return None
        try:
            response = self.client.table("tasks").select("*").eq("id", task_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"❌ DB Get Task Error: {e}")
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

db = SupabaseService()
