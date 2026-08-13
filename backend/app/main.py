from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router_api
from app.core.config import settings

app = FastAPI(
    title="Arquitejas — API de Inventario",
    version="1.0.0",
    description="API del sistema de inventario multi-bodega de Arquitejas.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.lista_origenes_permitidos,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_api)


@app.get("/", tags=["Salud"])
def estado() -> dict:
    return {"servicio": "arquitejas-api", "entorno": settings.ENTORNO, "estado": "ok"}
