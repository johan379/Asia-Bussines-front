from fastapi import APIRouter

from app.api.routes import auth, bodegas, ia, inventario, produccion, recepcion, rollos, usuarios

router_api = APIRouter()
router_api.include_router(auth.router)
router_api.include_router(usuarios.router)
router_api.include_router(inventario.router)
router_api.include_router(bodegas.router)
router_api.include_router(rollos.router)
router_api.include_router(produccion.router)
router_api.include_router(recepcion.router)
router_api.include_router(ia.router)