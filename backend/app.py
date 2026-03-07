from fastapi import FastAPI, HTTPException, Depends
from database.database import Base, engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from database.models.user import User
from schemas import UserCreate, UserLogin
from sqlalchemy.orm import Session
import bcrypt

# Generăm tabelele în baza de date
Base.metadata.create_all(bind=engine)


# Funcție esențială: Deschide și închide conexiunea cu baza de date pentru fiecare cerere
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(
    title="API Disertație RAG",
    description="Backend-ul pentru aplicația de învățare a studenților"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081/", "http://127.0.0.1:8081/"],  # Permite cereri de oriunde (ex: din React Native, browser etc.)
    allow_credentials=True,
    allow_methods=["*"],  # Permite toate metodele (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Permite toate headerele (cum ar fi 'Content-Type: application/json')
)

@app.get("/")
def read_root():
    return {"mesaj": "Salut! Serverul FastAPI funcționează perfect!"}


@app.get("/status")
def check_status():
    return {"status": "activ", "baza_de_date": "neconectata_inca"}

@app.post("/register")
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

@app.post("/login")
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    print(f"Date primite pentru autentificare: {login_data}")
    db_user = db.query(User).filter(User.email == login_data.email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Email sau parolă incorectă.")

    parola_bytes = login_data.password.encode('utf-8')
    parola_stocata_bytes = db_user.password.encode('utf-8')

    if not bcrypt.checkpw(parola_bytes, parola_stocata_bytes):
        raise HTTPException(status_code=400, detail="Email sau parolă incorectă.")

    return {
        "message": "Autentificare reușită!",
        "user": {
            "id": db_user.id_user,
            "username": db_user.username,
            "email": db_user.email
        }
    }