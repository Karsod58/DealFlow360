from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=schemas.AuthResponse)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token."""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "token": access_token,
        "user": user
    }


@router.post("/signup", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        hashed_password=hashed_password,
        name=user_data.name,
        role=user_data.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": new_user.email})
    
    return {
        "token": access_token,
        "user": new_user
    }


@router.get("/me", response_model=schemas.User)
def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get current user information."""
    return current_user
