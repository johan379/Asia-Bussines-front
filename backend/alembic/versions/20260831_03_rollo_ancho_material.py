"""Agrega `ancho_material` a `rollos` (default 122 m): Producción de
Caballetes lo necesita para calcular el ancho de cada sección
(ancho ÷ 3), sin asumir el mismo valor para todos los rollos — editable por
fila, igual que `familia`, para el rollo especial que mida distinto.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260831_03"
down_revision = "20260831_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("rollos", sa.Column("ancho_material", sa.Float(), nullable=False, server_default="122"))


def downgrade() -> None:
    op.drop_column("rollos", "ancho_material")
