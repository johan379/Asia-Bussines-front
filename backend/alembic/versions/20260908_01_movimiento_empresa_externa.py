"""Empresa externa en movimientos (salida de rollo a un tercero).

No agrega un TipoMovimiento nuevo (evita ALTER TYPE en Postgres / ALTER
ENUM en MySQL): reutiliza tipo=SALIDA con motivo="intercambio_externo",
igual que motivo="produccion" ya distingue el consumo dentro de SALIDA.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260908_01"
down_revision = "20260907_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("movimientos", sa.Column("empresa_externa", sa.String(length=150), nullable=False, server_default=""))
    op.create_index("ix_movimientos_empresa_externa", "movimientos", ["empresa_externa"])


def downgrade() -> None:
    op.drop_index("ix_movimientos_empresa_externa", table_name="movimientos")
    op.drop_column("movimientos", "empresa_externa")
