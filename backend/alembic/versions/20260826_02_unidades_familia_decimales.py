"""Agrega `permite_decimales` a la tabla de unidades por familia, para
validar cantidades enteras (ej. tornillos) vs. decimales (ej. metros).
"""

from alembic import op
import sqlalchemy as sa


revision = "20260826_02"
down_revision = "20260826_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tabla_unidades_familia",
        sa.Column("permite_decimales", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("tabla_unidades_familia", "permite_decimales")
