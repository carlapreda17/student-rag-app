from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Specificăm numele fișierului bazei de date
SQLALCHEMY_DATABASE_URL = "sqlite:///./database/student-rag-app.db"


engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Creăm o fabrică de sesiuni (ne va ajuta mai târziu să adăugăm/citim date)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clasa de bază pe care o vom folosi pentru a crea tabelele
Base = declarative_base()