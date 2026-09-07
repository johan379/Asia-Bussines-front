"""Agrega `referencia` a `productos` — otro código de identificación además
del código interno (ej. referencia del fabricante), para productos por
unidad (tornillos, capuchones, etc.), igual que los rollos tienen su propio
identificador además del código de clasificación.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260827_01"
down_revision = "20260826_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("referencia", sa.String(50), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("productos", "referencia")
