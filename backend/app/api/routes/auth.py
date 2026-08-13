from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import crear_token_acceso, verificar_contrasena
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, SesionResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    usuario = db.query(Usuario).filter(Usuario.correo == datos.correo).first()

    if usuario is None or not verificar_contrasena(datos.contrasena, usuario.contrasena_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos.")

    token = crear_token_acceso({"sub": str(usuario.id)})

    return TokenResponse(
        access_token=token,
        sesion=SesionResponse(
            correo=usuario.correo,
            bodega_id=usuario.bodega_id,
            bodega_nombre=usuario.bodega.nombre,
            rol=usuario.rol,
        ),
    )
