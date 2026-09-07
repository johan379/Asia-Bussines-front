"""Agrega `ancho_rollo` a `productos`: para el stock de Caballetes,
conserva el ancho del rollo de origen (ver Rollo.ancho_material) — solo
clasificatorio, no participa en ningún cálculo de metros. Nullable — no
afecta ningún registro existente.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260831_04"
down_revision = "20260831_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("ancho_rollo", sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("productos", "ancho_rollo")
