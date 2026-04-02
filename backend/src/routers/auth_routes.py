import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import bcrypt
from dotenv import load_dotenv
from database.database import get_db
from database.models.user import User
from schemas import UserCreate, UserLogin
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer


load_dotenv()
router = APIRouter(
    tags=["Autentificare"] #grupare rute in swagger
)

SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalid")
        return {"id": user_id, "username": payload.get("username")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid sau expirat")

@router.post("/register")
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    
    db_email = db.query(User).filter(User.email == user_data.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email-ul este deja înregistrat.")

    db_username = db.query(User).filter(User.username == user_data.username).first()
    if db_username:
        raise HTTPException(status_code=400, detail="Numele de utilizator este deja luat.")

    print(f"Date primite pentru înregistrare: {user_data}")
    parola_bytes = user_data.password.encode('utf-8')
    salt = bcrypt.gensalt()
    
    # Criptăm parola și o transformăm înapoi în text (decode) pentru a o salva în baza de date
    hashed_password = bcrypt.hashpw(parola_bytes, salt).decode('utf-8')

    nou_utilizator = User(
        username=user_data.username,
        email=user_data.email,
        phone=user_data.phone,
        password=hashed_password  
    )

    # Salvam in bd
    db.add(nou_utilizator)
    db.commit()
    db.refresh(nou_utilizator)

    # 6. Returnăm un răspuns de succes
    return {
        "mesaj": "Contul a fost creat cu succes!",
        "utilizator": {
            "id": nou_utilizator.id_user,
            "username": nou_utilizator.username,
            "email": nou_utilizator.email
        }
    }

@router.post("/login")
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    print(f"Date primite pentru autentificare: {login_data}")
    db_user = db.query(User).filter(User.email == login_data.email).first()
    print(db_user.id_user)
    if not db_user:
        raise HTTPException(status_code=400, detail="Email sau parolă incorectă.")

    parola_bytes = login_data.password.encode('utf-8')
    parola_stocata_bytes = db_user.password.encode('utf-8')

    if not bcrypt.checkpw(parola_bytes, parola_stocata_bytes):
        raise HTTPException(status_code=400, detail="Email sau parolă incorectă.")
    
    token = create_access_token({"user_id": db_user.id_user, "username": db_user.username})
    return {
        "message": "Autentificare reușită!",
        "user": {
            "id": db_user.id_user,
            "username": db_user.username,
            "email": db_user.email
        },
        "token": token
    }