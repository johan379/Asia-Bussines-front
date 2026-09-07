"""Confirmación de separación de stock en Apartados.

Una cotización (Apartado) puede tener ítems POR_STOCK y POR_ROLLO a la vez.
Antes de registrar la producción del ítem de rollo, alguien debe confirmar
que el stock de esa misma cotización ya fue separado físicamente -- se
guarda a nivel de Apartado (no por ítem) porque los ítems de un apartado se
crean todos juntos y la confirmación es una sola acción por cotización.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260907_01"
down_revision = "20260903_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("apartados", sa.Column("stock_separado_confirmado", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("apartados", sa.Column("stock_separado_por", sa.String(length=150), nullable=False, server_default=""))
    op.add_column("apartados", sa.Column("stock_separado_en", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("apartados", "stock_separado_en")
    op.drop_column("apartados", "stock_separado_por")
    op.drop_column("apartados", "stock_separado_confirmado")
