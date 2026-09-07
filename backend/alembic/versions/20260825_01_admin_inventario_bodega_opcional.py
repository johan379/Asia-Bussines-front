"""Admin Inventario: bodega_id opcional + nuevo rol admin_inventario.

Admin Inventario es la única cuenta sin bodega fija: ve el inventario de
todas las sedes en un comparativo y reparte material entre ellas. `bodega_id
IS NULL` en rollos/productos/recepciones significa "de Admin Inventario, aún
sin repartir a ninguna sede" — nunca datos de Ricaurte ni Santander.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260825_01"
down_revision = "20260824_02"
branch_labels = None
depends_on = None


rol_usuario_anterior = sa.Enum("JEFE_PLANTA", "ADMINISTRATIVO", name="rolusuario")
rol_usuario_nuevo = sa.Enum("JEFE_PLANTA", "ADMINISTRATIVO", "ADMIN_INVENTARIO", name="rolusuario")


def upgrade() -> None:
    # Postgres modela los enums como tipos con nombre propio -- agregar un
    # valor nuevo requiere ALTER TYPE ... ADD VALUE. op.alter_column con un
    # nuevo sa.Enum(mismo name=) funciona en MySQL (el enum ahí es solo
    # metadata de columna) pero en Postgres terminaba sin error y SIN
    # agregar realmente "ADMIN_INVENTARIO" al tipo -- bug real descubierto
    # al migrar a Supabase.
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TYPE rolusuario ADD VALUE IF NOT EXISTS 'ADMIN_INVENTARIO'")
    else:
        op.alter_column("usuarios", "rol", existing_type=rol_usuario_anterior, type_=rol_usuario_nuevo, existing_nullable=False)
    op.alter_column("usuarios", "bodega_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("rollos", "bodega_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("productos", "bodega_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("recepciones", "bodega_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("recepciones", "bodega_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("productos", "bodega_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("rollos", "bodega_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("usuarios", "bodega_id", existing_type=sa.Integer(), nullable=False)
    # Postgres no soporta quitar un valor de un tipo ENUM (no existe ALTER
    # TYPE ... DROP VALUE) -- revertir esto ahí requeriría recrear el tipo
    # completo. No implementado: el downgrade no se usa en el despliegue
    # normal; en MySQL sigue funcionando igual que antes.
    if op.get_bind().dialect.name != "postgresql":
        op.alter_column("usuarios", "rol", existing_type=rol_usuario_nuevo, type_=rol_usuario_anterior, existing_nullable=False)
