from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.sql import expression
from database.database import Base

class User(Base):
    __tablename__ = "users"

    # Traducerea caracteristicilor tale din Sequelize în SQLAlchemy
    id_user = Column(Integer, primary_key=True, autoincrement=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    is_admin = Column(Boolean, default=False, server_default=expression.false(), nullable=False)