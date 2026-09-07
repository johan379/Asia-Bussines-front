"""Agrega `codigo_rollo_origen` a `productos`, para el stock de Caballetes
(y futuros productos derivados de rollo): la familia de un caballete es fija
("CABALLETES"), así que esta columna aparte es la que conserva de qué rollo
salió. Nullable con default "" — no afecta ningún registro existente.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260831_01"
down_revision = "20260829_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("codigo_rollo_origen", sa.String(50), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("productos", "codigo_rollo_origen")
