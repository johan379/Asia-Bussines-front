"""Agrega el stock adicional que genera Producción cuando fabrica más
unidades de las que un apartado necesitaba: columnas nuevas en `productos`
(color, ral, calidad, motivo_segunda, metros_por_unidad, produccion_id,
fecha_produccion) y `metros_excedente` en `producciones`. Todas nullable/con
default — no afectan ningún registro existente.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260829_01"
down_revision = "20260828_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("color", sa.String(60), nullable=False, server_default=""))
    op.add_column("productos", sa.Column("ral", sa.String(20), nullable=False, server_default=""))
    op.add_column("productos", sa.Column("calidad", sa.String(20), nullable=True))
    op.add_column("productos", sa.Column("motivo_segunda", sa.String(255), nullable=False, server_default=""))
    op.add_column("productos", sa.Column("metros_por_unidad", sa.Numeric(10, 2), nullable=True))
    op.add_column("productos", sa.Column("produccion_id", sa.Integer(), nullable=True))
    op.add_column("productos", sa.Column("fecha_produccion", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        "fk_productos_produccion_id", "productos", "producciones", ["produccion_id"], ["id"],
    )

    op.add_column("producciones", sa.Column("metros_excedente", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("producciones", "metros_excedente")

    op.drop_constraint("fk_productos_produccion_id", "productos", type_="foreignkey")
    op.drop_column("productos", "fecha_produccion")
    op.drop_column("productos", "produccion_id")
    op.drop_column("productos", "metros_por_unidad")
    op.drop_column("productos", "motivo_segunda")
    op.drop_column("productos", "calidad")
    op.drop_column("productos", "ral")
    op.drop_column("productos", "color")
