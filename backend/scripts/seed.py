"""
Poblar datos iniciales de desarrollo: bodegas, usuarios demo y tablas de
equivalencias básicas. Ejecutar una sola vez tras correr las migraciones:

    python -m scripts.seed
"""

from app.core.security import hashear_contrasena
from app.db.session import SessionLocal
from app.models.bodega import Bodega
from app.models.equivalencias import (
    TablaColorEquivalencia,
    TablaEspesorEquivalencia,
    TablaTipoMaterialEquivalencia,
)
from app.models.usuario import RolUsuario, Usuario

BODEGAS = ["Ricaurte", "Santander"]

USUARIOS_DEMO = [
    ("ricaurteplanta@gmail.com", "Ricaurte", RolUsuario.JEFE_PLANTA),
    ("ricaurte@gmail.com", "Ricaurte", RolUsuario.ADMINISTRATIVO),
    ("santanderplanta@gmail.com", "Santander", RolUsuario.JEFE_PLANTA),
    ("santander@gmail.com", "Santander", RolUsuario.ADMINISTRATIVO),
    # Sin bodega fija a propósito: ve y reparte material entre todas las sedes.
    ("admininventario@gmail.com", None, RolUsuario.ADMIN_INVENTARIO),
]

COLORES = [
    ("RAL5017", "Azul", "A"),
    ("RAL9003", "Blanco", "B"),
    ("RAL9005", "Negro", "N"),
    ("RAL7016", "Gris", "G"),
]

ESPESORES = [
    (0.2, 523.77, 1.909), (0.21, 498.83, 2.005), (0.22, 476.15, 2.1),
    (0.25, 419.02, 2.387), (0.3, 349.18, 2.864), (0.32, 327.36, 3.055),
    (0.4, 261.89, 3.818), (0.5, 209.5, 4.773), (0.7, 151.6, 6.596),
]

CONTRASENA_DEMO = "123456789"


def ejecutar() -> None:
    db = SessionLocal()
    try:
        bodegas_por_nombre = {}
        for nombre in BODEGAS:
            bodega = db.query(Bodega).filter_by(nombre=nombre).first()
            if not bodega:
                bodega = Bodega(nombre=nombre)
                db.add(bodega)
                db.flush()
            bodegas_por_nombre[nombre] = bodega

        for correo, nombre_bodega, rol in USUARIOS_DEMO:
            bodega_id = bodegas_por_nombre[nombre_bodega].id if nombre_bodega else None
            usuario_existente = db.query(Usuario).filter_by(correo=correo).first()
            if usuario_existente:
                usuario_existente.contrasena_hash = hashear_contrasena(CONTRASENA_DEMO)
                usuario_existente.rol = rol
                usuario_existente.bodega_id = bodega_id
            else:
                db.add(
                    Usuario(
                        correo=correo,
                        contrasena_hash=hashear_contrasena(CONTRASENA_DEMO),
                        rol=rol,
                        bodega_id=bodega_id,
                    )
                )

        if db.query(TablaTipoMaterialEquivalencia).count() == 0:
            db.add(TablaTipoMaterialEquivalencia(nombre="Lamina", codigo_interno="L"))

        for ral, nombre, codigo in COLORES:
            if not db.query(TablaColorEquivalencia).filter_by(ral=ral).first():
                db.add(TablaColorEquivalencia(ral=ral, nombre=nombre, codigo_interno=codigo))

        espesores_existentes = {round(float(e.espesor), 3) for e in db.query(TablaEspesorEquivalencia).all()}
        for espesor, mt_ton, peso_m in ESPESORES:
            if round(float(espesor), 3) not in espesores_existentes:
                db.add(TablaEspesorEquivalencia(espesor=espesor, mt_por_ton=mt_ton, peso_por_metro=peso_m))
                espesores_existentes.add(round(float(espesor), 3))

        db.commit()
        print("Datos iniciales creados correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    ejecutar()
