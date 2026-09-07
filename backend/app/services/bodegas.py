"""Administración de bodegas: creación. Exclusivo de SUPERADMIN — mismo
patrón que app/services/usuarios.py para la administración de cuentas."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.bodega import Bodega


def crear_bodega(db: Session, *, nombre: str) -> Bodega:
    nombre_limpio = nombre.strip()
    if not nombre_limpio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de la bodega es obligatorio.")

    existente = db.query(Bodega).filter(Bodega.nombre == nombre_limpio).first()
    if existente is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una bodega con ese nombre.")

    bodega = Bodega(nombre=nombre_limpio)
    db.add(bodega)
    return bodega
