"""
Backend v2: The Aggregation Engine
===================================
FastAPI entry point for the new serverless backend.
"""

import logging
# Force reload trigger
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import pipeline, clients, analysis, auth, tasks, interview, personas, tts, strategy, brand, admin, planning
# NOTE: images/studio routers (AI image generation: NanoBanana, DALL-E, ComfyUI) moved to
# backend_v2/_sandbox_ai_studio/ — image generation now happens in the local Magnific workflow,
# which uploads finished content straight to Supabase. See docs/superpowers/specs/ for the plan.

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: logging, db connections if needed
    logging.info("Starting up Aggregation Engine...")
    yield
    # Shutdown: Clean up resources
    print("--- LIFESPAN SHUTDOWN ---")
    logging.info("Shutting down Aggregation Engine...")
    logging.info("✅ All async resources cleaned up")

app = FastAPI(
    title="Pixely Partners API v2",
    description="The Aggregation Engine for Social Analysis",
    version="2.0.0",
    lifespan=lifespan
)

@app.on_event("startup")
async def startup_event():
    """Validate configuration and log startup status."""
    # Validate critical configuration
    print("\n--- CONFIGURATION CHECK ---")
    
    # Check Supabase
    if not settings.SUPABASE_URL:
        logging.warning("⚠️  SUPABASE_URL not configured - database operations will fail!")
        print("⚠️  SUPABASE_URL: MISSING")
    else:
        print(f"✅ SUPABASE_URL: Configured ({settings.SUPABASE_URL[:30]}...)")
    
    if not settings.SUPABASE_KEY:
        logging.warning("⚠️  SUPABASE_KEY not configured - public operations will fail!")
        print("⚠️  SUPABASE_KEY: MISSING")
    else:
        print("✅ SUPABASE_KEY: Configured")
    
    # CRITICAL: Service Key for admin operations
    if not settings.SUPABASE_SERVICE_KEY:
        logging.error("❌ SUPABASE_SERVICE_KEY not configured - ADMIN OPERATIONS WILL FAIL!")
        logging.error("   This includes: user creation, password reset, user updates")
        print("❌ SUPABASE_SERVICE_KEY: MISSING - ADMIN FEATURES DISABLED!")
    else:
        print("✅ SUPABASE_SERVICE_KEY: Configured")
    
    # Check Apify
    if not settings.APIFY_TOKEN:
        logging.warning("⚠️  APIFY_TOKEN not configured - scraping will fail!")
        print("⚠️  APIFY_TOKEN: MISSING")
    else:
        print("✅ APIFY_TOKEN: Configured")
    
    # Check Gemini
    if not settings.GEMINI_API_KEY:
        logging.warning("⚠️  GEMINI_API_KEY not configured - AI analysis will fail!")
        print("⚠️  GEMINI_API_KEY: MISSING")
    else:
        print("✅ GEMINI_API_KEY: Configured")
    
    print("---------------------------\n")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Strictify in logic later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(analysis.router)
app.include_router(pipeline.router)
app.include_router(tasks.router)
app.include_router(interview.router)
app.include_router(personas.router)
app.include_router(tts.router)
app.include_router(strategy.router)
app.include_router(brand.router)
app.include_router(admin.router)
app.include_router(planning.router)

@app.get("/", tags=["Health"])
async def root():
    """Health check."""
    return {
        "service": "Pixely Partners API v2",
        "engine": "Aggregation Engine",
        "status": "healthy",
        "docs": "/docs"
    }

@app.get("/direct-admin-test")
async def direct_test():
    return {"status": "direct-ok"}


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "components": {
            "apify": "connected" if settings.APIFY_TOKEN else "missing_token",
            "gemini": "connected" if settings.GEMINI_API_KEY else "missing_key",
        }
    }

