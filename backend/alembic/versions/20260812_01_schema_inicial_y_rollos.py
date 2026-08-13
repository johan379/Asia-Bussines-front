"""Esquema inicial explícito del inventario.

Esta revisión se aplica únicamente sobre una base vacía. Si una instalación
anterior ya tiene las tablas creadas por la versión histórica, se debe marcar
como aplicada con ``alembic stamp 20260812_01``; nunca ejecutar esta revisión
sobre tablas existentes.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260812_01"
down_revision = None
branch_labels = None
depends_on = None


rol_usuario = sa.Enum("JEFE_PLANTA", "ADMINISTRATIVO", name="rolusuario")
tipo_movimiento = sa.Enum("ENTRADA", "SALIDA", "TRASLADO", "TRANSFERENCIA", name="tipomovimiento")
estado_rollo = sa.Enum("CERRADO", "ABIERTO", "AGOTADO", name="estadorollo")
estado_solicitud = sa.Enum("PENDIENTE", "ACEPTADA", "RECHAZADA", name="estadosolicitud")
tipo_operacion = sa.Enum("SOLICITUD", "PRESTAMO", "INTERCAMBIO", name="tipooperacionsolicitud")


def upgrade() -> None:
    op.create_table(
        "bodegas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(120), nullable=False, unique=True),
    )
    op.create_table(
        "tabla_colores_equivalencia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ral", sa.String(30), nullable=False, unique=True),
        sa.Column("nombre", sa.String(60), nullable=False),
        sa.Column("codigo_interno", sa.String(10), nullable=False),
    )
    op.create_table(
        "tabla_tipos_material_equivalencia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(60), nullable=False, unique=True),
        sa.Column("codigo_interno", sa.String(10), nullable=False),
    )
    op.create_table(
        "tabla_espesor_equivalencia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("espesor", sa.Float(), nullable=False, unique=True),
        sa.Column("mt_por_ton", sa.Float(), nullable=False),
        sa.Column("peso_por_metro", sa.Float(), nullable=False),
    )
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("correo", sa.String(150), nullable=False, unique=True),
        sa.Column("contrasena_hash", sa.String(255), nullable=False),
        sa.Column("rol", rol_usuario, nullable=False),
        sa.Column("bodega_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
    )
    op.create_index("ix_usuarios_correo", "usuarios", ["correo"])
    op.create_table(
        "productos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bodega_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
        sa.Column("codigo_importacion", sa.String(50), nullable=False, server_default=""),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("descripcion", sa.String(255), nullable=False),
        sa.Column("familia", sa.String(50), nullable=False, server_default=""),
        sa.Column("calibre", sa.String(30), nullable=False, server_default=""),
        sa.Column("entrada", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("stock", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.create_index("ix_productos_bodega_id", "productos", ["bodega_id"])
    op.create_index("ix_productos_codigo", "productos", ["codigo"])
    op.create_table(
        "recepciones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("bodega_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
        sa.Column("encargado", sa.String(150), nullable=False, server_default=""),
        sa.Column("proveedor", sa.String(150), nullable=False, server_default=""),
        sa.Column("archivo_origen", sa.String(255), nullable=False, server_default=""),
        sa.Column("tolerancia_porcentaje", sa.Float(), nullable=False, server_default="2"),
        sa.Column("estado", sa.String(40), nullable=False, server_default="registrada_en_inventario"),
    )
    op.create_index("ix_recepciones_bodega_id", "recepciones", ["bodega_id"])
    op.create_table(
        "rollos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bodega_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
        sa.Column("recepcion_id", sa.Integer(), sa.ForeignKey("recepciones.id"), nullable=True),
        sa.Column("codigo_interno", sa.String(60), nullable=False),
        sa.Column("identificador_rollo", sa.String(60), nullable=False),
        sa.Column("codigo_proveedor", sa.String(60), nullable=False, server_default=""),
        sa.Column("descripcion", sa.String(255), nullable=False, server_default=""),
        sa.Column("familia", sa.String(50), nullable=False, server_default="Rollos de acero"),
        sa.Column("color_material", sa.String(60), nullable=False, server_default=""),
        sa.Column("calibre", sa.Float(), nullable=False, server_default="0"),
        sa.Column("peso_neto", sa.Float(), nullable=True),
        sa.Column("metros_proveedor", sa.Float(), nullable=False, server_default="0"),
        sa.Column("metros_calculados", sa.Float(), nullable=False, server_default="0"),
        sa.Column("metros_disponibles", sa.Float(), nullable=False, server_default="0"),
        sa.Column("metros_consumidos", sa.Float(), nullable=False, server_default="0"),
        sa.Column("fecha_ingreso", sa.DateTime(timezone=True), nullable=False),
        sa.Column("estado", estado_rollo, nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=False, server_default=""),
        sa.Column("proveedor", sa.String(120), nullable=False, server_default=""),
        sa.Column("lote", sa.String(60), nullable=False, server_default=""),
    )
    op.create_index("ix_rollos_bodega_id", "rollos", ["bodega_id"])
    op.create_index("ix_rollos_codigo_interno", "rollos", ["codigo_interno"])
    op.create_table(
        "movimientos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("tipo", tipo_movimiento, nullable=False),
        sa.Column("motivo", sa.String(60), nullable=False, server_default=""),
        sa.Column("producto_codigo", sa.String(60), nullable=False, server_default=""),
        sa.Column("producto_descripcion", sa.String(255), nullable=False, server_default=""),
        sa.Column("bodega_origen_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=True),
        sa.Column("bodega_destino_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=True),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("usuario", sa.String(150), nullable=False, server_default=""),
        sa.Column("observaciones", sa.Text(), nullable=False, server_default=""),
        sa.Column("cotizacion", sa.String(32), nullable=False, server_default=""),
    )
    op.create_table(
        "historial_consumos_rollo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rollo_id", sa.Integer(), sa.ForeignKey("rollos.id"), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("usuario", sa.String(150), nullable=False, server_default=""),
        sa.Column("observaciones", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_historial_consumos_rollo_rollo_id", "historial_consumos_rollo", ["rollo_id"])
    op.create_table(
        "producciones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("codigo_unico", sa.String(30), nullable=False, unique=True),
        sa.Column("cotizacion", sa.String(10), nullable=False, unique=True),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usuario", sa.String(150), nullable=False, server_default=""),
        sa.Column("responsable", sa.String(150), nullable=False, server_default=""),
        sa.Column("bodega_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
        sa.Column("producto_fabricado", sa.String(150), nullable=False, server_default=""),
        sa.Column("modelo", sa.String(80), nullable=False, server_default=""),
        sa.Column("medida_producto", sa.String(80), nullable=False, server_default=""),
        sa.Column("cantidad_productos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("codigo_clasificacion", sa.String(60), nullable=False, server_default=""),
        sa.Column("total_metros_consumidos", sa.Float(), nullable=False, server_default="0"),
        sa.Column("saldo_codigo", sa.Float(), nullable=False, server_default="0"),
        sa.Column("observaciones", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_producciones_bodega_id", "producciones", ["bodega_id"])
    op.create_table(
        "rollos_utilizados_produccion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("produccion_id", sa.Integer(), sa.ForeignKey("producciones.id"), nullable=False),
        sa.Column("rollo_id", sa.Integer(), sa.ForeignKey("rollos.id"), nullable=False),
        sa.Column("identificador_rollo", sa.String(60), nullable=False, server_default=""),
        sa.Column("metros_consumidos", sa.Float(), nullable=False),
    )
    op.create_table(
        "solicitudes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("estado", estado_solicitud, nullable=False),
        sa.Column("tipo_operacion", tipo_operacion, nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("producto_codigo", sa.String(60), nullable=False),
        sa.Column("producto_descripcion", sa.String(255), nullable=False, server_default=""),
        sa.Column("rollo_id", sa.Integer(), sa.ForeignKey("rollos.id"), nullable=True),
        sa.Column("bodega_solicitante_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
        sa.Column("bodega_propietaria_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=False),
        sa.Column("solicitado_por", sa.String(150), nullable=False, server_default=""),
        sa.Column("observaciones", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_solicitudes_rollo_id", "solicitudes", ["rollo_id"])


def downgrade() -> None:
    op.drop_index("ix_solicitudes_rollo_id", table_name="solicitudes")
    op.drop_table("solicitudes")
    op.drop_table("rollos_utilizados_produccion")
    op.drop_index("ix_producciones_bodega_id", table_name="producciones")
    op.drop_table("producciones")
    op.drop_index("ix_historial_consumos_rollo_rollo_id", table_name="historial_consumos_rollo")
    op.drop_table("historial_consumos_rollo")
    op.drop_table("movimientos")
    op.drop_index("ix_rollos_codigo_interno", table_name="rollos")
    op.drop_index("ix_rollos_bodega_id", table_name="rollos")
    op.drop_table("rollos")
    op.drop_index("ix_recepciones_bodega_id", table_name="recepciones")
    op.drop_table("recepciones")
    op.drop_index("ix_productos_codigo", table_name="productos")
    op.drop_index("ix_productos_bodega_id", table_name="productos")
    op.drop_table("productos")
    op.drop_index("ix_usuarios_correo", table_name="usuarios")
    op.drop_table("usuarios")
    op.drop_table("tabla_espesor_equivalencia")
    op.drop_table("tabla_tipos_material_equivalencia")
    op.drop_table("tabla_colores_equivalencia")
    op.drop_table("bodegas")
    bind = op.get_bind()
    for enum in (tipo_operacion, estado_solicitud, estado_rollo, tipo_movimiento, rol_usuario):
        enum.drop(bind, checkfirst=True)
