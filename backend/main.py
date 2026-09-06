from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, quotations, dashboard, products, approvals, fulfillment, portal, subscriptions, invoices, admin, websocket, reports

settings = get_settings()

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="DealFlow360 API",
    description="CPQ System API for DealFlow360",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(quotations.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(approvals.router, prefix="/api")
app.include_router(fulfillment.router, prefix="/api")
app.include_router(portal.router, prefix="/api")  # Customer portal - separate auth
app.include_router(subscriptions.router, prefix="/api")  # Subscription billing
app.include_router(invoices.router, prefix="/api")  # Invoicing and payments
app.include_router(admin.router, prefix="/api")  # Admin configuration
app.include_router(reports.router, prefix="/api")  # PDF Reports and exports
app.include_router(websocket.router, prefix="/api")  # WebSocket real-time updates


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "DealFlow360 API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
