"""Añade índices para las consultas paginadas más frecuentes."""

from alembic import op


revision = "20260813_01"
down_revision = "20260812_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_rollos_bodega_fecha", "rollos", ["bodega_id", "fecha_ingreso"])
    op.create_index("ix_rollos_bodega_estado", "rollos", ["bodega_id", "estado"])
    op.create_index("ix_movimientos_origen_fecha", "movimientos", ["bodega_origen_id", "fecha"])
    op.create_index("ix_movimientos_destino_fecha", "movimientos", ["bodega_destino_id", "fecha"])


def downgrade() -> None:
    op.drop_index("ix_movimientos_destino_fecha", table_name="movimientos")
    op.drop_index("ix_movimientos_origen_fecha", table_name="movimientos")
    op.drop_index("ix_rollos_bodega_estado", table_name="rollos")
    op.drop_index("ix_rollos_bodega_fecha", table_name="rollos")
