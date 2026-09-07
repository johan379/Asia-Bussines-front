"""Agrega `tipo_producto` a `producciones` ("teja" o "caballete"): la
pantalla de confirmación y la Hoja de Vida necesitan saber qué regla aplicó
cada producción después de guardada, no solo en el momento de la request.
Nullable con default "teja" — no afecta ningún registro existente (todas las
producciones previas a esta migración fueron tejas).
"""

from alembic import op
import sqlalchemy as sa


revision = "20260831_02"
down_revision = "20260831_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("producciones", sa.Column("tipo_producto", sa.String(20), nullable=False, server_default="teja"))


def downgrade() -> None:
    op.drop_column("producciones", "tipo_producto")
