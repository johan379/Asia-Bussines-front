from pydantic import BaseModel, EmailStr

from app.models.usuario import RolUsuario


class UsuarioCreate(BaseModel):
    correo: EmailStr
    contrasena: str
    rol: RolUsuario
    bodega_id: int


class UsuarioResponse(BaseModel):
    id: int
    correo: str
    rol: RolUsuario
    bodega_id: int

    class Config:
        from_attributes = True