"""Agrega la tabla de unidades de medida por familia de producto.

Tabla de referencia global (no por bodega), igual que las tablas de
equivalencias de Recepción — resuelve qué unidad ("unidades", "metros",
"kg", etc.) mostrar junto a la cantidad de un `Producto` según su familia
(texto libre). Sin datos semilla: se configura desde el panel nuevo.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260826_01"
down_revision = "20260825_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tabla_unidades_familia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("familia", sa.String(50), nullable=False, unique=True),
        sa.Column("unidad", sa.String(20), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("tabla_unidades_familia")
