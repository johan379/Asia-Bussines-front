"""Agrega `stock_minimo` (opcional, por producto individual) a `productos`,
para la alerta de stock bajo en Inventario. NULL = sin alerta configurada.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260826_03"
down_revision = "20260826_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("stock_minimo", sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("productos", "stock_minimo")
