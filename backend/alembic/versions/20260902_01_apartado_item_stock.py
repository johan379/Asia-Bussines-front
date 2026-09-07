"""Agrega soporte para Apartados de productos manejados por STOCK
(`ModalidadApartado.POR_STOCK`), conviviendo con los apartados por rollo
existentes (`POR_ROLLO`) dentro del mismo `Apartado` — la modalidad vive en
`ApartadoItem`, nunca en `Apartado`.

`codigo_interno`/`medida`/`metros_requeridos` pasan a nullable porque solo
tienen sentido para POR_ROLLO; el backfill marca todo lo existente como
`por_rollo` (cero cambio de significado para los apartados de rollo ya
creados). `producto_id` (FK a `productos.id`) es la identidad para POR_STOCK.
`stock_descontado` es la guarda de idempotencia: se marca `true` la única vez
que `marcar_produccion_terminada` descuenta `Producto.stock` para ese ítem.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260902_01"
down_revision = "20260831_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("apartado_items", sa.Column("modalidad", sa.String(20), nullable=False, server_default="por_rollo"))
    op.add_column("apartado_items", sa.Column("producto_id", sa.Integer(), sa.ForeignKey("productos.id"), nullable=True))
    op.add_column("apartado_items", sa.Column("stock_descontado", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("apartado_items", "codigo_interno", existing_type=sa.String(60), nullable=True)
    op.alter_column("apartado_items", "medida", existing_type=sa.Float(), nullable=True)
    op.alter_column("apartado_items", "metros_requeridos", existing_type=sa.Float(), nullable=True)


def downgrade() -> None:
    # Protección explícita: si ya existen ApartadoItem POR_STOCK, esas filas
    # tienen codigo_interno/medida/metros_requeridos en NULL legítimamente —
    # revertir el NOT NULL las rompería. Se aborta el downgrade en vez de
    # perder o corromper datos en silencio.
    conexion = op.get_bind()
    hay_stock = conexion.execute(
        sa.text("SELECT COUNT(*) FROM apartado_items WHERE modalidad = 'por_stock'")
    ).scalar()
    if hay_stock:
        raise RuntimeError(
            f"No se puede revertir esta migración: existen {hay_stock} ApartadoItem POR_STOCK, "
            "que quedarían con codigo_interno/medida/metros_requeridos NULL y romperían el NOT NULL "
            "que este downgrade intenta restaurar. Elimínalos o conviértelos manualmente antes de "
            "hacer downgrade."
        )
    op.drop_column("apartado_items", "stock_descontado")
    op.drop_column("apartado_items", "producto_id")
    op.drop_column("apartado_items", "modalidad")
    op.alter_column("apartado_items", "codigo_interno", existing_type=sa.String(60), nullable=False)
    op.alter_column("apartado_items", "medida", existing_type=sa.Float(), nullable=False)
    op.alter_column("apartado_items", "metros_requeridos", existing_type=sa.Float(), nullable=False)
