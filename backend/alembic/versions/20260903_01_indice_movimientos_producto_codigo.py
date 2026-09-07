"""Agrega un índice a `movimientos.producto_codigo`, el campo por el que casi
todas las consultas de Kardex por producto filtran y que hasta ahora no
tenía ningún índice (ni siquiera uno automático de FK, porque no es una FK).

Nota: `apartado_items.producto_id` NO necesita un índice nuevo aquí — ya
tiene uno automático creado por InnoDB para soportar su FK a `productos.id`
(agregada en la migración 20260902_01), confirmado con `SHOW INDEX`.
"""

from alembic import op


revision = "20260903_01"
down_revision = "20260902_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_movimientos_producto_codigo", "movimientos", ["producto_codigo"])


def downgrade() -> None:
    op.drop_index("ix_movimientos_producto_codigo", table_name="movimientos")
