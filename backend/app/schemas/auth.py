from pydantic import BaseModel, EmailStr

from app.models.usuario import RolUsuario


class LoginRequest(BaseModel):
    correo: EmailStr
    contrasena: str


class SesionResponse(BaseModel):
    correo: str
    bodega_id: int
    bodega_nombre: str
    rol: RolUsuario


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    sesion: SesionResponse
