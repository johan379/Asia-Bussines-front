from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.usuario import RolUsuario


class UsuarioCreate(BaseModel):
    correo: EmailStr
    contrasena: str
    rol: RolUsuario
    bodega_id: int | None = None


class UsuarioResponse(BaseModel):
    id: int
    correo: str
    rol: RolUsuario
    bodega_id: int | None
    activo: bool

    class Config:
        from_attributes = True


class UsuarioActualizar(BaseModel):
    """Body de PATCH /usuarios/{id} — SUPERADMIN reasigna rol y/o bodega."""
    model_config = ConfigDict(from_attributes=True)
    rol: RolUsuario
    bodega_id: int | None = None


class RestablecerContrasenaRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    contrasena_nueva: str
