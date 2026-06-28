from sqlalchemy import Column, Integer, Float, String
from app.database import Base


class StoreConfig(Base):
    __tablename__ = "store_config"

    id = Column(Integer, primary_key=True, default=1)
    name = Column(String(120), nullable=False, default="Chikenhot Lima Centro")
    address = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=False, default=-12.0464)
    longitude = Column(Float, nullable=False, default=-77.0428)
    phone = Column(String(30), nullable=True)
