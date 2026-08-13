from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hashear_contrasena
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioResponse

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(datos: UsuarioCreate, db: Session = Depends(get_db)) -> Usuario:
    existente = db.query(Usuario).filter(Usuario.correo == datos.correo).first()
    if existente is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ese correo ya está registrado.")

    usuario = Usuario(
        correo=datos.correo,
        contrasena_hash=hashear_contrasena(datos.contrasena),
        rol=datos.rol,
        bodega_id=datos.bodega_id,
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo crear el usuario (revisa bodega_id).")
    db.refresh(usuario)
    return usuario