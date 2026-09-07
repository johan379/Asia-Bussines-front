"""Agrega el módulo de Apartados (reserva de material por cotización de cliente).

Crea `apartados` y `apartado_items`, y liga `producciones` a su apartado de
origen (nullable, para no afectar la producción libre existente).
"""

from alembic import op
import sqlalchemy as sa


revision = "20260824_01"
down_revision = "20260818_01"
branch_labels = None
depends_on = None


estado_apartado = sa.Enum(
    "APARTADO", "ENVIADO_A_PRODUCCION", "EN_PRODUCCION", "PRODUCCION_TERMINADA",
    "ENTREGADO", "CANCELADO", name="estadoapartado",
)


def upgrade() -> None:
    op.create_table(
        "apartados",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bodega_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
        sa.Column("numero_cotizacion", sa.String(32), nullable=False),
        sa.Column("cliente", sa.String(150), nullable=False, server_default=""),
        sa.Column("creado_por", sa.String(150), nullable=False, server_default=""),
        sa.Column("fecha_creacion", sa.DateTime(timezone=True), nullable=False),
        sa.Column("estado", estado_apartado, nullable=False, server_default="APARTADO"),
        sa.Column("enviado_a_produccion_por", sa.String(150), nullable=False, server_default=""),
        sa.Column("fecha_enviado_a_produccion", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelado_por", sa.String(150), nullable=False, server_default=""),
        sa.Column("fecha_cancelado", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fecha_entregado", sa.DateTime(timezone=True), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=False, server_default=""),
        sa.UniqueConstraint("bodega_id", "numero_cotizacion", name="uq_apartados_bodega_cotizacion"),
    )
    op.create_index("ix_apartados_bodega_id", "apartados", ["bodega_id"])
    op.create_index("ix_apartados_bodega_estado", "apartados", ["bodega_id", "estado"])

    op.create_table(
        "apartado_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("apartado_id", sa.Integer(), sa.ForeignKey("apartados.id"), nullable=False),
        sa.Column("codigo_interno", sa.String(60), nullable=False),
        sa.Column("descripcion", sa.String(255), nullable=False, server_default=""),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("medida", sa.Float(), nullable=False),
        sa.Column("metros_requeridos", sa.Float(), nullable=False),
        sa.Column("metros_consumidos", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_apartado_items_apartado_id", "apartado_items", ["apartado_id"])

    op.add_column("producciones", sa.Column("apartado_item_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_producciones_apartado_item_id", "producciones", "apartado_items", ["apartado_item_id"], ["id"]
    )
    op.create_index("ix_producciones_apartado_item_id", "producciones", ["apartado_item_id"])
    # Antes solo alcanzaba para el código autogenerado (ej. "P1A2B3C4"); ahora
    # también puede ser la cotización que escribe la encargada (ej. "COT-00125").
    op.alter_column("producciones", "cotizacion", existing_type=sa.String(10), type_=sa.String(32), existing_nullable=False)


def downgrade() -> None:
    op.alter_column("producciones", "cotizacion", existing_type=sa.String(32), type_=sa.String(10), existing_nullable=False)
    # MySQL no permite soltar un índice mientras una FK lo necesita: la FK va primero.
    op.drop_constraint("fk_producciones_apartado_item_id", "producciones", type_="foreignkey")
    op.drop_index("ix_producciones_apartado_item_id", table_name="producciones")
    op.drop_column("producciones", "apartado_item_id")

    # Dropear la tabla ya se lleva sus propios índices y FK; dropearlos antes
    # falla en MySQL igual que con el índice de producciones arriba.
    op.drop_table("apartado_items")
    op.drop_table("apartados")

    estado_apartado.drop(op.get_bind(), checkfirst=True)
