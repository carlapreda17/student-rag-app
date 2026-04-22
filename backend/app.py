from fastapi import FastAPI, HTTPException, Depends
from database.database import Base, engine
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from src.routers.auth_routes import router as auth_router
from src.routers.rag_routes import router as rag_router
from src.routers.doc_routes import router as doc_router
from src.routers.admin_routes import router as admin_router
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth


load_dotenv()  
ORIGIN = os.getenv("ORIGIN", "*")  

# Generăm tabelele în baza de date
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Disertație RAG",
    description="Backend-ul pentru aplicația de învățare a studenților"
)

if not firebase_admin._apps:
    cred = credentials.Certificate("studdai-9f432-firebase-adminsdk-fbsvc-6eb054e329.json")
    firebase_admin.initialize_app(cred)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ORIGIN, "http://localhost:8081",  "http://localhost:5173"],  # Permite cereri de oriunde (ex: din React Native, browser etc.)
    allow_credentials=True,
    allow_methods=["*"],  # Permite toate metodele (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Permite toate headerele (cum ar fi 'Content-Type: application/json')
)

app.include_router(auth_router)
app.include_router(rag_router)
app.include_router(doc_router)
app.include_router(admin_router)

@app.get("/")
def read_root():
    return {"mesaj": "Salut! Serverul FastAPI funcționează perfect!"}


@app.get("/status")
def check_status():
    return {"status": "activ", "baza_de_date": "neconectata_inca"}

