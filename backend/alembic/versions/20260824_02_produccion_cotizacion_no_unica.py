"""Permite varias producciones por cotización.

Una cotización puede tener varios ítems apartados (cada uno produciéndose por
separado) o varias entregas parciales del mismo ítem, así que
`producciones.cotizacion` nunca debió ser única — con la restricción puesta,
la segunda producción de una misma cotización fallaba con un error 500.
"""

import sqlalchemy as sa
from alembic import op


revision = "20260824_02"
down_revision = "20260824_01"
branch_labels = None
depends_on = None


def _restriccion_unica_cotizacion(inspector) -> tuple[str, bool]:
    """Devuelve (nombre, es_constraint). El índice único original se creó con
    `Column(unique=True)`, sin nombre explícito -- cada motor lo materializa
    distinto: MySQL lo trata como una UNIQUE KEY normal (se suelta con DROP
    INDEX); Postgres lo trata como una restricción real respaldada por un
    índice (hay que soltar la restricción, no el índice directamente -- si
    no, falla con "DependentObjectsStillExist")."""
    for uq in inspector.get_unique_constraints("producciones"):
        if uq["column_names"] == ["cotizacion"]:
            return uq["name"], True
    for idx in inspector.get_indexes("producciones"):
        if idx.get("unique") and idx["column_names"] == ["cotizacion"]:
            return idx["name"], False
    raise RuntimeError("No se encontró la restricción única de 'cotizacion' en producciones.")


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    nombre, es_constraint = _restriccion_unica_cotizacion(inspector)
    if es_constraint:
        op.drop_constraint(nombre, "producciones", type_="unique")
    else:
        op.drop_index(nombre, table_name="producciones")
    op.create_index("ix_producciones_cotizacion", "producciones", ["cotizacion"])


def downgrade() -> None:
    op.drop_index("ix_producciones_cotizacion", table_name="producciones")
    op.create_index("cotizacion", "producciones", ["cotizacion"], unique=True)
