"""Agrega UniqueConstraint(bodega_id, codigo) a productos: hasta ahora la
unicidad de código por bodega la garantizaba solo el check-then-insert de la
aplicación (services/carga_productos.py, movimientos.py, etc.), sin respaldo
a nivel de base de datos -- dos cargas simultáneas del mismo código podían
crear un duplicado.

Nota: por semántica SQL estándar (igual en MySQL y Postgres), esta
constraint NO cubre bodega_id NULL (el pool sin asignar de Admin
Inventario) -- NULL nunca se considera igual a otro NULL en una constraint
UNIQUE, así que varias filas con el mismo codigo y bodega_id NULL siguen
siendo válidas para la base de datos. Para bodegas reales sí queda
completamente protegido.
"""

from alembic import op

revision = "20260910_01"
down_revision = "20260908_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint("uq_productos_bodega_codigo", "productos", ["bodega_id", "codigo"])


def downgrade() -> None:
    op.drop_constraint("uq_productos_bodega_codigo", "productos", type_="unique")
