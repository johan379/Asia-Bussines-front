"""Agrega `tipo_producto` a `productos` ("caballete" | "flanche" | ""):
fuente estructural confiable de qué producto seccionado es un stock, para
que Inventario sepa qué divisor de `ancho_rollo` mostrar (÷3 caballete, ÷5
flanche) sin depender de comparar el texto de `familia`. Nullable con
default "" — no afecta ningún registro existente (todo el stock previo a
esta migración queda sin tipo, como los productos manuales/tejas).
"""

from alembic import op
import sqlalchemy as sa


revision = "20260831_05"
down_revision = "20260831_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("tipo_producto", sa.String(20), nullable=False, server_default=""))
    # Backfill: stock real de caballetes ya generado antes de que existiera
    # esta columna (identificable de forma inequívoca por su familia fija,
    # que solo Producción asigna en ese flujo) no debe quedar sin tipo.
    op.execute("UPDATE productos SET tipo_producto = 'caballete' WHERE familia = 'CABALLETES'")


def downgrade() -> None:
    op.drop_column("productos", "tipo_producto")
