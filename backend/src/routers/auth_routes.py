import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import bcrypt
from dotenv import load_dotenv
from database.database import get_db
from database.models.user import User
from schemas import UserCreate, UserLogin, AppleLoginRequest, ForgotPasswordRequest, VerifyResetCodeRequest, ResetPasswordRequest
from jose import jwt 
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import requests as http_requests
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from cryptography.hazmat.backends import default_backend
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64

load_dotenv()
router = APIRouter(
    tags=["Autentificare"] #grupare rute in swagger
)

SECRET_KEY = os.getenv("SECRET_KEY")
APPLE_CLIENT_ID = os.getenv("APPLE_CLIENT_ID")

# Email config
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

# Stocare temporară coduri de resetare
reset_codes: dict = {}
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_apple_token(token: str):
    try:
        apple_keys = http_requests.get(
            "https://appleid.apple.com/auth/keys"
        ).json()["keys"]

        header = jwt.get_unverified_header(token)
        kid = header["kid"]

        key_data = next(
            k for k in apple_keys if k["kid"] == kid
        )

        def decode_value(val):
            val += "=" * (4 - len(val) % 4)
            return int.from_bytes(
                base64.urlsafe_b64decode(val), "big"
            )

        n = decode_value(key_data["n"])
        e = decode_value(key_data["e"])

        public_key = RSAPublicNumbers(e, n).public_key(
            default_backend()
        )

        payload = jwt.decode(
            token,
            public_key,
            audience=APPLE_CLIENT_ID,
            algorithms=["RS256"],
            issuer="https://appleid.apple.com",
        )
        return payload

    except Exception as e:
        print(f"Eroare validare Apple: {str(e)}")
        return None

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
        password=hashed_password,
        is_admin=False  # Setăm implicit ca utilizatorii noi să nu fie administratori
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
    
    token = create_access_token({"user_id": db_user.id_user, "username": db_user.username, "is_admin": db_user.is_admin})
    return {
        "message": "Autentificare reușită!",
        "user": {
            "id": db_user.id_user,
            "username": db_user.username,
            "email": db_user.email,
            "is_admin": db_user.is_admin
        },
        "token": token
    }

#get_current_admin e o dependență FastAPI (dependency) pe care o pui pe rutele din backend ca să le protejezi
# Extrage token-ul JWT din header-ul Authorization: Bearer ... al request-ului
# Verifică că token-ul e valid (nu e expirat, nu e falsificat)
# Verifică că user-ul are is_admin = true – altfel returnează 403 Forbidden

def get_current_admin(token: str = Depends(oauth2_scheme)):
    """
    Dependency pentru rutele de admin.
    Verifică că token-ul e valid ȘI că user-ul are is_admin = True.
    Folosește astfel: @router.get("/admin/...") + Depends(get_current_admin)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        is_admin = payload.get("is_admin", False)
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalid")
        
        if not is_admin:
            raise HTTPException(
                status_code=403, 
                detail="Acces interzis - necesită privilegii de admin"
            )
        
        return {
            "id": user_id, 
            "username": payload.get("username"), 
            "is_admin": True
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid sau expirat")

@router.post("/login/apple")
def login_apple(request: AppleLoginRequest, db: Session = Depends(get_db)):
    payload = verify_apple_token(request.appleToken)
    if not payload:
        raise HTTPException(401, "Token Apple invalid.")

    email = payload.get("email") or request.appleEmail
    if not email:
        raise HTTPException(400, "Nu am putut obține email-ul.")

    apple_sub = payload["sub"]

    user = db.query(User).filter(
        (User.firebase_uid == apple_sub) | (User.email == email)
    ).first()

    if user:
        if not user.firebase_uid:
            user.firebase_uid = apple_sub
            db.commit()
    else:
        username = (
            (request.firstName or "")
            + " "
            + (request.lastName or "")
        ).strip() or email.split("@")[0]

        user = User(
            username=username,
            email=email,
            password="apple_auth",
            firebase_uid=apple_sub,
            is_admin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({
        "user_id": user.id_user,
        "username": user.username,
        "is_admin": user.is_admin,
    })

    return {
        "status": "success",
        "user": {
            "id": user.id_user,
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_admin,
        },
        "token": token,
    }

def send_reset_email(to_email: str, code: str):
    """Trimite codul de resetare pe email."""
    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email
    msg["Subject"] = "StuddAI — Cod de resetare parolă"

    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 40px;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
            <h2 style="color: #f97316; margin-bottom: 8px;">StuddAI</h2>
            <p style="color: #374151; font-size: 15px;">Ai solicitat resetarea parolei. Folosește codul de mai jos:</p>
            <div style="background: #eef2ff; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">{code}</span>
            </div>
            <p style="color: #6b7280; font-size: 13px;">Codul expiră în <strong>10 minute</strong>.</p>
            <p style="color: #6b7280; font-size: 13px;">Dacă nu ai solicitat resetarea, ignoră acest email.</p>
        </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(msg)


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Trimite un cod de 6 cifre pe email-ul utilizatorului."""
    # Verifică dacă email-ul există
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Nu dezvăluim dacă email-ul există sau nu (securitate)
        # Returnăm succes oricum
        return {"message": "Dacă email-ul există, vei primi un cod de verificare."}

    # Verifică dacă user-ul e logat cu Apple (nu are parolă)
    if user.password == "apple_auth":
        raise HTTPException(
            status_code=400,
            detail="Acest cont folosește autentificare Apple. Nu poți reseta parola."
        )

    # Generează cod de 6 cifre
    code = str(random.randint(100000, 999999))

    # Salvează codul cu expirare de 10 minute
    reset_codes[request.email] = {
        "code": code,
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
    }

    # Trimite email-ul
    try:
        send_reset_email(request.email, code)
    except Exception as e:
        print(f"Eroare trimitere email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Nu am putut trimite email-ul. Încearcă din nou."
        )

    return {"message": "Dacă email-ul există, vei primi un cod de verificare."}

@router.post("/verify-reset-code")
def verify_reset_code(request: VerifyResetCodeRequest):
    """Verifică dacă codul introdus este valid și nu a expirat."""
    stored = reset_codes.get(request.email)

    if not stored:
        raise HTTPException(
            status_code=400,
            detail="Nu a fost solicitat niciun cod pentru acest email."
        )

    if datetime.utcnow() > stored["expires_at"]:
        del reset_codes[request.email]
        raise HTTPException(
            status_code=400,
            detail="Codul a expirat. Solicită un cod nou."
        )

    if stored["code"] != request.code:
        raise HTTPException(
            status_code=400,
            detail="Codul introdus este incorect."
        )

    return {"message": "Codul este valid. Poți seta o parolă nouă."}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Resetează parola utilizatorului după verificarea codului."""
    # Verifică din nou codul
    stored = reset_codes.get(request.email)

    if not stored:
        raise HTTPException(status_code=400, detail="Sesiunea a expirat. Încearcă din nou.")

    if datetime.utcnow() > stored["expires_at"]:
        del reset_codes[request.email]
        raise HTTPException(status_code=400, detail="Codul a expirat.")

    if stored["code"] != request.code:
        raise HTTPException(status_code=400, detail="Codul este incorect.")

    # Găsește user-ul
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizatorul nu a fost găsit.")

    # Validare parolă nouă
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Parola trebuie să aibă minim 6 caractere."
        )

    # Hash parola nouă
    parola_bytes = request.new_password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(parola_bytes, salt).decode("utf-8")

    user.password = hashed
    db.commit()

    # Șterge codul folosit
    del reset_codes[request.email]

    return {"message": "Parola a fost resetată cu succes!"}