"""Agrega el módulo de Envíos (despacho de Admin Inventario hacia una sede,
con confirmación de llegada por parte del destino).

Crea `envios` y `envio_items`. A diferencia de `solicitudes` (una bodega le
pide material a otra y esta aprueba antes de mover nada), aquí el origen
(siempre Admin Inventario) despacha primero y el destino confirma después —
por eso no hay columna de bodega origen, siempre es la misma cuenta.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260825_02"
down_revision = "20260825_01"
branch_labels = None
depends_on = None


estado_envio = sa.Enum("PENDIENTE_CONFIRMACION", "RECIBIDO", "NO_LLEGO", name="estadoenvio")


def upgrade() -> None:
    op.create_table(
        "envios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bodega_destino_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
        sa.Column("estado", estado_envio, nullable=False, server_default="PENDIENTE_CONFIRMACION"),
        sa.Column("enviado_por", sa.String(150), nullable=False, server_default=""),
        sa.Column("fecha_envio", sa.DateTime(timezone=True), nullable=False),
        sa.Column("respondido_por", sa.String(150), nullable=False, server_default=""),
        sa.Column("fecha_respuesta", sa.DateTime(timezone=True), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_envios_bodega_destino_id", "envios", ["bodega_destino_id"])
    op.create_index("ix_envios_bodega_destino_estado", "envios", ["bodega_destino_id", "estado"])

    op.create_table(
        "envio_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("envio_id", sa.Integer(), sa.ForeignKey("envios.id"), nullable=False),
        sa.Column("rollo_id", sa.Integer(), sa.ForeignKey("rollos.id"), nullable=True),
        sa.Column("producto_codigo", sa.String(60), nullable=True),
        sa.Column("descripcion", sa.String(255), nullable=False, server_default=""),
        sa.Column("cantidad", sa.Float(), nullable=True),
    )
    op.create_index("ix_envio_items_envio_id", "envio_items", ["envio_id"])


def downgrade() -> None:
    op.drop_table("envio_items")
    op.drop_table("envios")
    estado_envio.drop(op.get_bind(), checkfirst=True)
