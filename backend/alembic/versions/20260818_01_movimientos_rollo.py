"""Añade el código de rollo consumido a los movimientos de inventario.

Permite que Reportes e Historial muestren el identificador único del rollo
usado en una salida por producción, en vez de solo el código de clasificación.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260818_01"
down_revision = "20260813_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("movimientos", sa.Column("rollo_id", sa.Integer(), nullable=True))
    op.add_column(
        "movimientos",
        sa.Column("identificador_rollo", sa.String(60), nullable=False, server_default=""),
    )
    op.create_foreign_key(
        "fk_movimientos_rollo_id", "movimientos", "rollos", ["rollo_id"], ["id"]
    )
    op.create_index("ix_movimientos_rollo_id", "movimientos", ["rollo_id"])


def downgrade() -> None:
    op.drop_index("ix_movimientos_rollo_id", table_name="movimientos")
    op.drop_constraint("fk_movimientos_rollo_id", "movimientos", type_="foreignkey")
    op.drop_column("movimientos", "identificador_rollo")
    op.drop_column("movimientos", "rollo_id")
