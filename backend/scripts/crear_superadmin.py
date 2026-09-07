"""Crea la cuenta SUPERADMIN inicial. Se ejecuta UNA sola vez, directamente
contra la base de datos, con acceso al servidor — a propósito NO existe (ni
existirá) ningún endpoint HTTP para crear un SUPERADMIN, para no abrir una
vía de escalada de privilegios.

Requiere las variables de entorno SUPERADMIN_CORREO y SUPERADMIN_CONTRASENA.
Si falta cualquiera de las dos, no crea nada — no hay contraseña por
defecto ni hardcodeada.

    SUPERADMIN_CORREO=admin@empresa.com SUPERADMIN_CONTRASENA=una-clave-larga-y-real \
        python -m scripts.crear_superadmin
"""

import os
import sys

from app.core.security import hashear_contrasena
from app.db.session import SessionLocal
from app.models.usuario import RolUsuario, Usuario


def ejecutar() -> None:
    correo = os.environ.get("SUPERADMIN_CORREO")
    contrasena = os.environ.get("SUPERADMIN_CONTRASENA")
    if not correo or not contrasena:
        print("Faltan SUPERADMIN_CORREO y/o SUPERADMIN_CONTRASENA en el entorno — no se creó ninguna cuenta.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existente = db.query(Usuario).filter_by(correo=correo).first()
        if existente is not None:
            print(f"Ya existe una cuenta con el correo {correo} — no se modificó nada.")
            sys.exit(1)

        db.add(Usuario(
            correo=correo,
            contrasena_hash=hashear_contrasena(contrasena),
            rol=RolUsuario.SUPERADMIN,
            bodega_id=None,
        ))
        db.commit()
        print(f"Cuenta SUPERADMIN creada correctamente: {correo}")
    finally:
        db.close()


if __name__ == "__main__":
    ejecutar()
