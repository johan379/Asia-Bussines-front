type ValorApi = string | number | boolean | null | undefined;
type RegistroApi = Record<string, unknown>;
type BodegasPorId = Record<number, string>;

const numero = (valor: unknown) => Number(valor);
const texto = (valor: unknown) => typeof valor === "string" ? valor : "";

export function productoDesdeApi(p: RegistroApi) {
  return { id: numero(p.id), bodegaId: numero(p.bodega_id), codigoImportacion: texto(p.codigo_importacion),
    codigo: texto(p.codigo), descripcion: texto(p.descripcion), familia: texto(p.familia), calibre: texto(p.calibre),
    entrada: numero(p.entrada), stock: numero(p.stock),
    pesoNeto: p.peso_neto == null ? null : numero(p.peso_neto), rolloId: p.rollo_id == null ? null : numero(p.rollo_id),
    identificadorRollo: texto(p.identificador_rollo) };
}

export function movimientoDesdeApi(m: RegistroApi) {
  return { id: numero(m.id), fecha: texto(m.fecha), tipo: texto(m.tipo), motivo: texto(m.motivo),
    productoCodigo: texto(m.producto_codigo), productoDescripcion: texto(m.producto_descripcion),
    bodegaOrigenId: numero(m.bodega_origen_id), bodegaDestinoId: numero(m.bodega_destino_id),
    cantidad: numero(m.cantidad), usuario: texto(m.usuario), observaciones: texto(m.observaciones),
    cotizacion: texto(m.cotizacion) };
}

export function solicitudDesdeApi(s: RegistroApi, bodegasPorId: BodegasPorId = {}) {
  const solicitanteId = numero(s.bodega_solicitante_id);
  const propietariaId = numero(s.bodega_propietaria_id);
  return { id: numero(s.id), fecha: texto(s.fecha), estado: texto(s.estado), tipoOperacion: texto(s.tipo_operacion),
    cantidad: numero(s.cantidad), productoCodigo: texto(s.producto_codigo), productoDescripcion: texto(s.producto_descripcion),
    bodegaSolicitanteId: solicitanteId, bodegaSolicitanteNombre: bodegasPorId[solicitanteId] || "",
    bodegaPropietariaId: propietariaId, bodegaPropietariaNombre: bodegasPorId[propietariaId] || "",
    solicitadoPor: texto(s.solicitado_por), observaciones: texto(s.observaciones) };
}

export function rolloDesdeApi(r: RegistroApi) {
  const historial = Array.isArray(r.historial_consumos) ? r.historial_consumos : [];
  return { id: numero(r.id), bodegaId: numero(r.bodega_id), codigoInterno: texto(r.codigo_interno),
    identificadorRollo: texto(r.identificador_rollo), codigoProveedor: texto(r.codigo_proveedor),
    descripcion: texto(r.descripcion), familia: texto(r.familia), colorMaterial: texto(r.color_material),
    calibre: r.calibre, pesoNeto: r.peso_neto == null ? null : numero(r.peso_neto),
    metrosProveedor: r.metros_proveedor, metrosCalculados: r.metros_calculados,
    metrosDisponibles: r.metros_disponibles, metrosConsumidos: r.metros_consumidos,
    fechaIngreso: texto(r.fecha_ingreso), estado: texto(r.estado), observaciones: texto(r.observaciones),
    proveedor: texto(r.proveedor), lote: texto(r.lote),
    historialConsumos: historial.map((h) => ({
      fecha: texto(h.fecha), cantidad: numero(h.cantidad), usuario: texto(h.usuario), observaciones: texto(h.observaciones),
    })) };
}

export function alertaIaDesdeApi(a: RegistroApi) {
  return { id: numero(a.id), nivel: texto(a.nivel), tipo: texto(a.tipo), titulo: texto(a.titulo), mensaje: texto(a.mensaje),
    productoId: a.producto_id == null ? null : numero(a.producto_id), productoCodigo: texto(a.producto_codigo),
    productoDescripcion: texto(a.producto_descripcion), fecha: texto(a.fecha) };
}

export function produccionDesdeApi(p: RegistroApi) {
  const rollos = Array.isArray(p.rollos_utilizados) ? p.rollos_utilizados : [];
  return { id: numero(p.id), codigoUnico: texto(p.codigo_unico), fecha: texto(p.fecha), usuario: texto(p.usuario),
    responsable: texto(p.responsable), bodegaId: numero(p.bodega_id), productoFabricado: texto(p.producto_fabricado),
    modelo: texto(p.modelo), medidaProducto: texto(p.medida_producto), cantidadProductos: numero(p.cantidad_productos),
    codigoClasificacion: texto(p.codigo_clasificacion), totalMetrosConsumidos: numero(p.total_metros_consumidos),
    saldoCodigo: numero(p.saldo_codigo), observaciones: texto(p.observaciones),
    rollosUtilizados: rollos.map((r) => ({ rolloId: numero(r.rollo_id), identificadorRollo: texto(r.identificador_rollo), metrosConsumidos: numero(r.metros_consumidos) })) };
}
