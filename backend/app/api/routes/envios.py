from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, requiere_rol, usuario_actual
from app.models.envio import Envio, EstadoEnvio
from app.models.usuario import RolUsuario, Usuario
from app.schemas.envios import EnvioCrear, EnvioResponse
from app.services import envios as srv

router = APIRouter(prefix="/envios", tags=["Envíos (Admin Inventario)"])


@router.post("", response_model=EnvioResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(requiere_rol(RolUsuario.ADMIN_INVENTARIO))])
def crear_envio(datos: EnvioCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> Envio:
    envio = srv.crear_envio(db, datos, usuario)
    db.commit()
    db.refresh(envio)
    return envio


@router.get("/recibidos", response_model=list[EnvioResponse])
def envios_pendientes_para_mi(
    db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual),
) -> list[Envio]:
    """Envíos pendientes de confirmar para la bodega del usuario (cualquier
    rol de sede; para Admin Inventario, que no tiene bodega, siempre vacío)."""
    return (
        db.query(Envio)
        .options(joinedload(Envio.items))
        .filter(Envio.bodega_destino_id == usuario.bodega_id, Envio.estado == EstadoEnvio.PENDIENTE_CONFIRMACION)
        .order_by(Envio.fecha_envio.desc())
        .all()
    )


@router.get("/enviados", response_model=list[EnvioResponse],
            dependencies=[Depends(requiere_rol(RolUsuario.ADMIN_INVENTARIO))])
def historial_envios(db: Session = Depends(get_db)) -> list[Envio]:
    """Historial completo de envíos para Admin Inventario. No se filtra por
    quién lo creó: el material sin asignar es un pool compartido de la
    cuenta Admin Inventario, no de un usuario individual."""
    return (
        db.query(Envio)
        .options(joinedload(Envio.items))
        .order_by(Envio.fecha_envio.desc())
        .all()
    )


@router.patch("/{envio_id}/confirmar", response_model=EnvioResponse,
              dependencies=[Depends(requiere_rol(RolUsuario.ADMINISTRATIVO))])
def confirmar_envio(envio_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> Envio:
    envio = srv.confirmar_envio_recibido(db, envio_id, usuario)
    db.commit()
    db.refresh(envio)
    return envio


@router.patch("/{envio_id}/no-llego", response_model=EnvioResponse,
              dependencies=[Depends(requiere_rol(RolUsuario.ADMINISTRATIVO))])
def marcar_no_llego(envio_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> Envio:
    envio = srv.marcar_envio_no_llego(db, envio_id, usuario)
    db.commit()
    db.refresh(envio)
    return envio
