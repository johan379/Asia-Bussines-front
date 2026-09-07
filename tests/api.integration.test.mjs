import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

const apiUrl = process.env.API_URL || "http://localhost:8000";
const admin = {
  correo: process.env.RICAURTE_ADMIN_EMAIL || "ricaurte@gmail.com",
  contrasena: process.env.RICAURTE_ADMIN_PASSWORD || "123456789",
};
const santander = {
  correo: process.env.SANTANDER_ADMIN_EMAIL || "santander@gmail.com",
  contrasena: process.env.SANTANDER_ADMIN_PASSWORD || "123456789",
};
const plantaRicaurte = {
  correo: process.env.RICAURTE_PLANTA_EMAIL || "ricaurteplanta@gmail.com",
  contrasena: process.env.RICAURTE_PLANTA_PASSWORD || "123456789",
};

async function pedir(ruta, opciones = {}) {
  return fetch(`${apiUrl}${ruta}`, opciones);
}

async function tokenAdmin() {
  return (await iniciarSesion(admin)).access_token;
}

async function tokenPlanta() {
  return (await iniciarSesion(plantaRicaurte)).access_token;
}

async function tokenSantander() {
  return (await iniciarSesion(santander)).access_token;
}

async function iniciarSesion(cuenta) {
  const respuesta = await pedir("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuenta),
  });
  assert.equal(respuesta.status, 200, "La cuenta de prueba administrativa debe poder autenticarse.");
  return respuesta.json();
}

test("disponibilidad: OpenAPI responde y publica los módulos principales", async () => {
  const respuesta = await pedir("/openapi.json");
  assert.equal(respuesta.status, 200);
  const documento = await respuesta.json();
  for (const ruta of ["/auth/login", "/inventario/productos", "/rollos", "/bodegas", "/ia/chat"]) {
    assert.ok(documento.paths[ruta], `Falta ${ruta} en OpenAPI.`);
  }
});

test("salud: la API confirma conectividad con la base de datos", async () => {
  const respuesta = await pedir("/health");
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).base_de_datos, "ok");
});

test("seguridad: rechaza credenciales inválidas y API privada sin token", async () => {
  const loginInvalido = await pedir("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: admin.correo, contrasena: "clave-invalida" }),
  });
  assert.equal(loginInvalido.status, 401);

  const sinToken = await pedir("/inventario/productos");
  assert.equal(sinToken.status, 401);
});

test("integración BD: inventario, rollos y bodegas devuelven datos aislados por sesión", async () => {
  const token = await tokenAdmin();
  const headers = { Authorization: `Bearer ${token}` };
  const [productos, rollos, bodegas] = await Promise.all([
    pedir("/inventario/productos", { headers }),
    pedir("/rollos", { headers }),
    pedir("/bodegas", { headers }),
  ]);
  assert.equal(productos.status, 200);
  assert.equal(rollos.status, 200);
  assert.equal(bodegas.status, 200);
  assert.ok(Array.isArray(await productos.json()));
  assert.ok(Array.isArray(await rollos.json()));
  assert.ok(Array.isArray(await bodegas.json()));
});

test("rendimiento: inventario paginado conserva el contrato sin cargar una lista completa", async () => {
  const token = await tokenAdmin();
  const respuesta = await pedir("/inventario/productos?paginado=true&pagina=1&tamano=2", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(respuesta.status, 200);
  const pagina = await respuesta.json();
  assert.ok(Array.isArray(pagina.items));
  assert.ok(pagina.items.length <= 2);
  assert.equal(pagina.pagina, 1);
  assert.equal(pagina.tamano, 2);
});

test("entrada manual: crea un producto nuevo y registra su primer ingreso", async () => {
  const token = await tokenAdmin();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const codigo = `ENTRADA-${Date.now()}`;
  const respuesta = await pedir("/inventario/movimientos", {
    method: "POST",
    headers,
    body: JSON.stringify({
      tipo: "entrada", motivo: "compra_proveedor", cantidad: 24,
      codigo, descripcion: "Tornillo de prueba", familia: "Tornillos", calibre: "3/8",
      observaciones: "Primera entrada manual",
    }),
  });
  assert.equal(respuesta.status, 201);
  const movimiento = await respuesta.json();
  assert.equal(movimiento.producto_codigo, codigo);
  const inventario = await pedir(`/inventario/productos?busqueda=${codigo}`, { headers: { Authorization: `Bearer ${token}` } });
  const productos = await inventario.json();
  assert.equal(productos[0]?.codigo, codigo);
  assert.equal(Number(productos[0]?.stock), 24);
});

test("validación de datos: rechaza solicitudes incompletas sin escribir en la BD", async () => {
  const token = await tokenAdmin();
  const respuesta = await pedir("/bodegas/solicitudes", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tipo_operacion: "intercambio" }),
  });
  assert.ok([400, 422].includes(respuesta.status), `Estado inesperado: ${respuesta.status}`);
});

test("recuperación ante errores: un rollo inexistente no rompe el backend", async () => {
  const token = await tokenAdmin();
  const respuesta = await pedir("/rollos/999999999/consumo", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cantidad: 1, observaciones: "Prueba de recuperación" }),
  });
  assert.equal(respuesta.status, 404);
  assert.equal((await pedir("/openapi.json")).status, 200);
});

test("concurrencia: dos salidas no pueden descontar el mismo stock", async () => {
  const token = await tokenAdmin();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const codigo = `CONC-${Date.now()}`;
  const creado = await pedir("/inventario/productos", {
    method: "POST", headers,
    body: JSON.stringify({ codigo_importacion: codigo, codigo, descripcion: "Producto temporal de concurrencia", familia: "Pruebas", calibre: "0.25", entrada: 1, stock: 1 }),
  });
  assert.equal(creado.status, 201);
  const producto = await creado.json();
  const salida = () => pedir("/inventario/movimientos", {
    method: "POST", headers,
    body: JSON.stringify({ tipo: "salida", motivo: "merma", producto_id: producto.id, cantidad: 1, observaciones: "Prueba simultanea" }),
  });
  const respuestas = await Promise.all([salida(), salida()]);
  const estados = respuestas.map((respuesta) => respuesta.status).sort();
  assert.deepEqual(estados, [201, 400], "Solo una salida debe consumir la ultima unidad.");
  const consulta = await pedir(`/inventario/productos?busqueda=${codigo}`, { headers: { Authorization: `Bearer ${token}` } });
  const productos = await consulta.json();
  assert.equal(Number(productos[0]?.stock), 0, "El stock final no debe ser negativo.");
});

test("aislamiento: cada sesión ve solo sus movimientos y las transferencias compartidas", async () => {
  const [sesionRicaurte, sesionSantander] = await Promise.all([iniciarSesion(admin), iniciarSesion(santander)]);
  const headersRicaurte = { Authorization: `Bearer ${sesionRicaurte.access_token}`, "Content-Type": "application/json" };
  const headersSantander = { Authorization: `Bearer ${sesionSantander.access_token}`, "Content-Type": "application/json" };
  const exclusivo = `AISLADO-${Date.now()}`;
  const creado = await pedir("/inventario/productos", {
    method: "POST", headers: headersSantander,
    body: JSON.stringify({ codigo_importacion: exclusivo, codigo: exclusivo, descripcion: "Solo Santander", familia: "Pruebas", calibre: "0.25", entrada: 2, stock: 2 }),
  });
  assert.equal(creado.status, 201);
  const producto = await creado.json();
  const salida = await pedir("/inventario/movimientos", {
    method: "POST", headers: headersSantander,
    body: JSON.stringify({ tipo: "salida", motivo: "merma", producto_id: producto.id, cantidad: 1, observaciones: "Movimiento exclusivo" }),
  });
  assert.equal(salida.status, 201);
  const [historialRicaurte, historialSantander] = await Promise.all([
    pedir(`/inventario/historial?codigo_producto=${exclusivo}`, { headers: headersRicaurte }),
    pedir(`/inventario/historial?codigo_producto=${exclusivo}`, { headers: headersSantander }),
  ]);
  assert.equal((await historialRicaurte.json()).length, 0, "Ricaurte no debe ver movimientos exclusivos de Santander.");
  assert.equal((await historialSantander.json()).length, 1, "Santander debe ver su propio movimiento.");
  const traslado = await pedir("/inventario/movimientos", {
    method: "POST", headers: headersSantander,
    body: JSON.stringify({ tipo: "traslado", motivo: "traslado_prueba", producto_id: producto.id, bodega_destino_id: sesionRicaurte.sesion.bodega_id, cantidad: 1, observaciones: "Transferencia compartida" }),
  });
  assert.equal(traslado.status, 201);
  const [compartidoRicaurte, compartidoSantander] = await Promise.all([
    pedir(`/inventario/historial?codigo_producto=${exclusivo}`, { headers: headersRicaurte }),
    pedir(`/inventario/historial?codigo_producto=${exclusivo}`, { headers: headersSantander }),
  ]);
  assert.ok((await compartidoRicaurte.json()).some((movimiento) => movimiento.tipo === "traslado"));
  assert.ok((await compartidoSantander.json()).some((movimiento) => movimiento.tipo === "traslado"));
});

test("apartados: rechaza reservar un código sin material disponible", async () => {
  const token = await tokenAdmin();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const codigoInexistente = `SIN-MATERIAL-${Date.now()}`;
  const respuesta = await pedir("/apartados", {
    method: "POST", headers,
    body: JSON.stringify({
      numero_cotizacion: `COT-TEST-${Date.now()}`, cliente: "Cliente de prueba",
      items: [{ codigo_interno: codigoInexistente, descripcion: "Producto de prueba", cantidad: 10, medida: 6 }],
    }),
  });
  assert.equal(respuesta.status, 400);
  const cuerpo = await respuesta.json();
  assert.match(cuerpo.detail, /material suficiente/);
});

test("apartados: exige al menos un producto solicitado", async () => {
  const token = await tokenAdmin();
  const respuesta = await pedir("/apartados", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ numero_cotizacion: `COT-VACIO-${Date.now()}`, cliente: "X", items: [] }),
  });
  assert.equal(respuesta.status, 400);
});

test("apartados: jefe_planta no puede crear, cancelar ni enviar a producción", async () => {
  const token = await tokenPlanta();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const crear = await pedir("/apartados", {
    method: "POST", headers,
    body: JSON.stringify({ numero_cotizacion: `COT-ROL-${Date.now()}`, cliente: "X", items: [{ codigo_interno: "X", descripcion: "", cantidad: 1, medida: 1 }] }),
  });
  assert.equal(crear.status, 403);
  assert.equal((await pedir("/apartados/1/cancelar", { method: "PATCH", headers })).status, 403);
  assert.equal((await pedir("/apartados/1/enviar-a-produccion", { method: "PATCH", headers })).status, 403);
});

test("apartados: administrativo no puede marcar producción terminada (rol de planta)", async () => {
  const token = await tokenAdmin();
  const respuesta = await pedir("/apartados/1/marcar-terminado", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(respuesta.status, 403);
});

test("apartados: acciones sobre un apartado inexistente devuelven 404, no 500", async () => {
  const token = await tokenAdmin();
  const headers = { Authorization: `Bearer ${token}` };
  assert.equal((await pedir("/apartados/999999999", { headers })).status, 404);
  assert.equal((await pedir("/apartados/999999999/cancelar", { method: "PATCH", headers })).status, 404);
  assert.equal((await pedir("/apartados/999999999/enviar-a-produccion", { method: "PATCH", headers })).status, 404);
});

test("apartados: listar respeta la sesión y ambos roles pueden consultar", async () => {
  const [tokenA, tokenP] = await Promise.all([tokenAdmin(), tokenPlanta()]);
  const [respuestaAdmin, respuestaPlanta] = await Promise.all([
    pedir("/apartados", { headers: { Authorization: `Bearer ${tokenA}` } }),
    pedir("/apartados", { headers: { Authorization: `Bearer ${tokenP}` } }),
  ]);
  assert.equal(respuestaAdmin.status, 200);
  assert.equal(respuestaPlanta.status, 200);
  assert.ok(Array.isArray(await respuestaAdmin.json()));
  assert.ok(Array.isArray(await respuestaPlanta.json()));
});

// Las siguientes 4 pruebas cubren la lógica de negocio más compleja
// construida para Caballetes/Flanches/Porcelanato/Apartados — hasta ahora
// solo se había verificado con scripts manuales que se borraban después de
// cada sesión. Cada una crea su propio rollo pequeño (mismo código interno
// ya clasificado "LA50170,20", para que /rollos lo acepte sin necesitar una
// tabla de equivalencias nueva) con un identificador único de prueba, así
// nunca tocan el material real de la bodega.

async function crearRolloDePrueba(headers, metrosDisponibles) {
  const identificador = `TEST-AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const respuesta = await pedir("/rollos", {
    method: "POST", headers,
    body: JSON.stringify({
      codigo_interno: "LA50170,20", identificador_rollo: identificador,
      descripcion: "Rollo de prueba (test automatizado)", calibre: 0.2,
      metros_disponibles: metrosDisponibles,
    }),
  });
  const cuerpo = await respuesta.json();
  assert.equal(respuesta.status, 201, `No se pudo crear el rollo de prueba: ${JSON.stringify(cuerpo)}`);
  return cuerpo;
}

test("caballetes: 4 unidades de 6 m -> 2 cortes, 6 producidas, 2 de sobrante como stock", async () => {
  const tokenA = await tokenAdmin();
  const tokenP = await tokenPlanta();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const headersP = { Authorization: `Bearer ${tokenP}`, "Content-Type": "application/json" };
  const rollo = await crearRolloDePrueba(headersA, 12);

  const respuesta = await pedir("/produccion", {
    method: "POST", headers: headersP,
    body: JSON.stringify({
      tipo_producto: "caballete", responsable: "Test automatizado", producto_fabricado: "Caballete",
      modelo: "Estandar", medida_producto: "6m", cantidad_productos: 4, observaciones: "",
      rollos: [{ rollo_id: rollo.id, metros: 12 }],
      color: "Gris", ral: "", calibre: "0.2", metros_por_unidad: 6,
      stock_adicional: [{ calidad: "primera", cantidad: 2 }],
    }),
  });
  const produccion = await respuesta.json();
  assert.equal(respuesta.status, 201, `Fallo al registrar producción: ${JSON.stringify(produccion)}`);
  assert.equal(produccion.total_metros_consumidos, 12, "2 cortes x 6 m = 12 m consumidos, ni más ni menos.");
  assert.equal(
    produccion.productos_stock.reduce((suma, p) => suma + p.stock, 0), 2,
    "6 producidos - 4 necesarios = 2 deben quedar como stock adicional.",
  );
  assert.equal(produccion.productos_stock[0]?.tipo_producto, "caballete");
});

test("porcelanato: 20 m² solicitados a 1.44 m²/caja -> ceil = 14 cajas, descuenta cajas no m²", async () => {
  const token = await tokenAdmin();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const codigo = `TEST-PORC-${Date.now()}`;
  const creado = await pedir("/inventario/productos", {
    method: "POST", headers,
    body: JSON.stringify({
      codigo, descripcion: "Porcelanato de prueba", familia: "PORCELANATO", calibre: "60x60",
      entrada: 50, stock: 50, metros_por_unidad: 1.44,
    }),
  });
  assert.equal(creado.status, 201);
  const producto = await creado.json();
  assert.equal(producto.tipo_producto, "conversion", "m² por caja configurado a mano -> tipo_producto=conversion.");

  const cajasNecesarias = Math.ceil(20 / 1.44);
  assert.equal(cajasNecesarias, 14, "20 / 1.44 = 13.888... redondeado SIEMPRE hacia arriba, nunca al más cercano.");
  const salida = await pedir("/inventario/movimientos", {
    method: "POST", headers,
    body: JSON.stringify({ tipo: "salida", motivo: "venta", producto_id: producto.id, cantidad: cajasNecesarias, observaciones: "20 m² solicitados" }),
  });
  assert.equal(salida.status, 201);
  const consulta = await pedir(`/inventario/productos?busqueda=${codigo}`, { headers });
  const actual = (await consulta.json())[0];
  assert.equal(Number(actual.stock), 36, "50 - 14 cajas = 36 (nunca 50 - 20, los m² no son la unidad de descuento).");
});

test("apartados: reservado nunca queda negativo aunque la producción exceda lo pedido (caballetes)", async () => {
  const tokenA = await tokenAdmin();
  const tokenP = await tokenPlanta();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const headersP = { Authorization: `Bearer ${tokenP}`, "Content-Type": "application/json" };
  const rollo = await crearRolloDePrueba(headersA, 12);

  const apartado = await pedir("/apartados", {
    method: "POST", headers: headersA,
    body: JSON.stringify({
      numero_cotizacion: `TEST-RESERVA-${Date.now()}`, cliente: "Cliente de prueba",
      items: [{ codigo_interno: "LA50170,20", descripcion: "caballete", cantidad: 4, medida: 6 }],
    }),
  });
  assert.equal(apartado.status, 201);
  const { id: apartadoId, items } = await apartado.json();
  await pedir(`/apartados/${apartadoId}/enviar-a-produccion`, { method: "PATCH", headers: headersA });

  const produccion = await pedir("/produccion", {
    method: "POST", headers: headersP,
    body: JSON.stringify({
      apartado_item_id: items[0].id, tipo_producto: "caballete", responsable: "Test automatizado",
      producto_fabricado: "Caballete", modelo: "Estandar", medida_producto: "6m", cantidad_productos: 4,
      observaciones: "", rollos: [{ rollo_id: rollo.id, metros: 12 }],
      color: "Gris", ral: "", calibre: "0.2", metros_por_unidad: 6,
      stock_adicional: [{ calidad: "primera", cantidad: 2 }],
    }),
  });
  const cuerpoProduccion = await produccion.json();
  assert.equal(produccion.status, 201, `Fallo al registrar producción: ${JSON.stringify(cuerpoProduccion)}`);

  const detalle = await pedir(`/apartados/${apartadoId}`, { headers: headersA });
  const { items: itemsFinales } = await detalle.json();
  const reservado = itemsFinales[0].metros_requeridos - itemsFinales[0].metros_consumidos;
  assert.equal(reservado, 0, "El reservado debe quedar exactamente en 0, nunca negativo.");
});

test("tejas: stock adicional se limita al excedente real y no se pierde", async () => {
  const tokenA = await tokenAdmin();
  const tokenP = await tokenPlanta();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const headersP = { Authorization: `Bearer ${tokenP}`, "Content-Type": "application/json" };
  const rollo = await crearRolloDePrueba(headersA, 68);

  const apartado = await pedir("/apartados", {
    method: "POST", headers: headersA,
    body: JSON.stringify({
      numero_cotizacion: `TEST-TEJA-${Date.now()}`, cliente: "Cliente de prueba",
      items: [{ codigo_interno: "LA50170,20", descripcion: "teja", cantidad: 10, medida: 6 }],
    }),
  });
  assert.equal(apartado.status, 201);
  const { id: apartadoId, items } = await apartado.json();
  await pedir(`/apartados/${apartadoId}/enviar-a-produccion`, { method: "PATCH", headers: headersA });

  const produccion = await pedir("/produccion", {
    method: "POST", headers: headersP,
    body: JSON.stringify({
      apartado_item_id: items[0].id, responsable: "Test automatizado", producto_fabricado: "Teja",
      modelo: "Estandar", medida_producto: "6m", cantidad_productos: 10, observaciones: "",
      rollos: [{ rollo_id: rollo.id, metros: 68 }],
      color: "Rojo", ral: "RAL 3000", calibre: "26", metros_por_unidad: 8,
      stock_adicional: [{ calidad: "primera", cantidad: 1 }],
    }),
  });
  const { metros_excedente, productos_stock } = await produccion.json();
  assert.equal(produccion.status, 201, `Fallo al registrar producción: ${JSON.stringify({ metros_excedente, productos_stock })}`);
  assert.equal(metros_excedente, 8, "68 m consumidos - 60 m del apartado = 8 m de excedente.");
  assert.equal(productos_stock.length, 1);
  assert.equal(productos_stock[0].stock, 1, "La unidad extra no debe perderse: debe quedar como stock adicional.");

  const detalle = await pedir(`/apartados/${apartadoId}`, { headers: headersA });
  const { items: itemsFinales } = await detalle.json();
  assert.equal(itemsFinales[0].metros_consumidos, 60, "El apartado nunca se carga más allá de lo que pedía.");
});

// ---------------------------------------------------------------------
// Recepción / Verificación / Clasificación — antes sin cobertura
// automatizada. Reutiliza equivalencias YA EXISTENTES en la base real
// (Lámina/"L", Azul RAL5017/"A", espesor 0.2 mm -> 523.77 mt/t) en vez
// de crear filas nuevas: las tablas de equivalencia no tienen endpoint
// de borrado, y crear datos de prueba ahí ensuciaría permanentemente el
// panel de administración real.
// ---------------------------------------------------------------------

function construirExcelRecepcion(filas) {
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Recepcion");
  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" });
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function subirArchivoRecepcion(token, filas, nombreArchivo = "recepcion-prueba.xlsx") {
  const formData = new FormData();
  formData.append("archivo", construirExcelRecepcion(filas), nombreArchivo);
  // Sin Content-Type manual: fetch/undici debe fijar el boundary multipart él mismo.
  return pedir("/recepcion/previsualizar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

test("recepcion: rechaza archivos que no sean Excel", async () => {
  const token = await tokenAdmin();
  const formData = new FormData();
  formData.append("archivo", new Blob(["no soy un excel"], { type: "text/plain" }), "notas.txt");
  const respuesta = await pedir("/recepcion/previsualizar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  assert.equal(respuesta.status, 415, "Un archivo que no sea .xlsx/.xls debe rechazarse antes de intentar leerlo.");
});

test("recepcion: un jefe de planta no puede subir archivos de recepción", async () => {
  const token = await tokenPlanta();
  const respuesta = await subirArchivoRecepcion(token, [
    { "Rollo": "X", "Espesor": 0.2, "Net Weight": 1, "Coil Meters": 500, "Color Top": "Azul", "Tipo de Material": "Lamina" },
  ]);
  assert.equal(respuesta.status, 403, "Recepción es exclusiva de Administrativo/Admin Inventario; Jefe de Planta no debe poder subir archivos.");
});

test("recepcion: verificar sin haber subido antes un archivo devuelve error de secuencia", async () => {
  const token = await tokenSantander();
  const respuesta = await pedir("/recepcion/verificar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      mapeo: { rollo: "Rollo", espesor: "Espesor", net_weight: "Net Weight", coil_meters: "Coil Meters" },
      tolerancia_porcentaje: 2,
    }),
  });
  assert.equal(respuesta.status, 400, "No debe poder verificar sin haber previsualizado un archivo primero.");
});

test("recepcion: confirmar sin haber verificado el archivo devuelve error de secuencia", async () => {
  const token = await tokenAdmin();
  // previsualizar dirties la caché sin dejarla nunca vacía; confirmar sin
  // pasar antes por /verificar debe fallar igual, aunque sí exista un
  // archivo ya subido en caché para este usuario.
  const previsualizacion = await subirArchivoRecepcion(token, [
    { "Rollo": "X", "Espesor": 0.2, "Net Weight": 1, "Coil Meters": 500, "Color Top": "Azul", "Tipo de Material": "Lamina" },
  ]);
  assert.equal(previsualizacion.status, 200);
  const confirmacion = await pedir("/recepcion/confirmar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tolerancia_porcentaje: 2, proveedor_principal: "" }),
  });
  assert.equal(confirmacion.status, 400, "No debe poder confirmar sin haber pasado por /verificar, aunque ya haya un archivo en caché.");
});

test("recepcion: flujo completo previsualizar -> verificar -> confirmar clasifica ok/diferencia y crea rollos + movimiento de entrada", async () => {
  const token = await tokenAdmin();
  const sufijo = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const idOk = `TEST-RECEP-OK-${sufijo}`;
  const idDif = `TEST-RECEP-DIF-${sufijo}`;
  const filas = [
    { "Rollo": idOk, "Espesor": 0.2, "Net Weight": 1, "Coil Meters": 523.77, "Color Top": "Azul", "Tipo de Material": "Lamina" },
    { "Rollo": idDif, "Espesor": 0.2, "Net Weight": 1, "Coil Meters": 400, "Color Top": "Azul", "Tipo de Material": "Lamina" },
  ];

  const previsualizacion = await subirArchivoRecepcion(token, filas);
  const cuerpoPrevio = await previsualizacion.json();
  assert.equal(previsualizacion.status, 200, `Fallo al previsualizar: ${JSON.stringify(cuerpoPrevio)}`);
  assert.equal(cuerpoPrevio.filas_totales, 2);
  assert.equal(cuerpoPrevio.mapeo_sugerido.rollo, "Rollo", "El auto-mapeo debe reconocer la columna Rollo sin ayuda manual.");
  assert.equal(cuerpoPrevio.mapeo_sugerido.coil_meters, "Coil Meters");

  const verificacion = await pedir("/recepcion/verificar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mapeo: cuerpoPrevio.mapeo_sugerido, tolerancia_porcentaje: 2 }),
  });
  const cuerpoVerificacion = await verificacion.json();
  assert.equal(verificacion.status, 200, `Fallo al verificar: ${JSON.stringify(cuerpoVerificacion)}`);
  const filaOk = cuerpoVerificacion.rollos.find((r) => r.rollo === idOk);
  const filaDif = cuerpoVerificacion.rollos.find((r) => r.rollo === idDif);
  assert.equal(filaOk.clasificado, true, "Lámina/Azul RAL5017/0.2mm ya existen en las tablas de equivalencias: debe autoclasificar.");
  assert.equal(filaOk.resultado, "ok", "1 t x 523.77 mt/t = 523.77 m, igual a lo reportado: dentro de la tolerancia del 2%.");
  assert.equal(filaDif.resultado, "diferencia", "523.77 calculados vs 400 reportados = ~31% de diferencia, supera el 2% de tolerancia.");
  assert.equal(cuerpoVerificacion.resumen.ok, 1);
  assert.equal(cuerpoVerificacion.resumen.con_diferencia, 1);
  assert.equal(cuerpoVerificacion.estado_recepcion, "verificada_con_diferencias", "Con al menos una fila en diferencia, el estado general no puede ser 'sin diferencias'.");

  const confirmacion = await pedir("/recepcion/confirmar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tolerancia_porcentaje: 2, proveedor_principal: "" }),
  });
  const recepcion = await confirmacion.json();
  assert.equal(confirmacion.status, 201, `Fallo al confirmar: ${JSON.stringify(recepcion)}`);
  assert.equal(recepcion.estado, "registrada_en_inventario");

  const rollosRespuesta = await pedir(`/rollos?identificador_rollo=${encodeURIComponent(sufijo)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listaRollos = await rollosRespuesta.json();
  assert.equal(listaRollos.length, 2, "Cada fila verificada debe crear su propio rollo independiente, nunca fusionados entre sí.");
  const rolloOk = listaRollos.find((r) => r.identificador_rollo === idOk);
  assert.equal(Number(rolloOk.metros_disponibles), 523.77);
  assert.equal(rolloOk.familia, "Rollos de acero");

  const confirmarDeNuevo = await pedir("/recepcion/confirmar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tolerancia_porcentaje: 2, proveedor_principal: "" }),
  });
  assert.equal(confirmarDeNuevo.status, 400, "Tras confirmar, la caché se limpia: un segundo confirmar sin volver a subir/verificar debe fallar (evita duplicar la recepción).");

  const historial = await pedir(`/inventario/historial?codigo_rollo=${encodeURIComponent(idOk)}`, { headers: { Authorization: `Bearer ${token}` } });
  const movimientos = await historial.json();
  assert.equal(movimientos.length, 1);
  assert.equal(movimientos[0].tipo, "entrada");
  assert.equal(movimientos[0].motivo, "recepcion_proveedor");
});

test("recepcion: guardar una equivalencia de espesor ya existente actualiza en vez de duplicar", async () => {
  const token = await tokenAdmin();
  const antes = await (await pedir("/recepcion/equivalencias", { headers: { Authorization: `Bearer ${token}` } })).json();
  const filaExistente = antes.espesores.find((e) => Math.round(e.espesor * 100) === 20);
  assert.ok(filaExistente, "Se esperaba que ya existiera una equivalencia de espesor 0.2 (la misma que usa la prueba de flujo completo de recepción).");

  const respuesta = await pedir("/recepcion/equivalencias/espesor", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ espesor: 0.2, mt_por_ton: filaExistente.mt_por_ton, peso_por_metro: filaExistente.peso_por_metro }),
  });
  const actualizada = await respuesta.json();
  assert.equal(respuesta.status, 201);
  assert.equal(actualizada.id, filaExistente.id, "Debe actualizar la fila existente (mismo id), no crear una segunda entrada para el mismo espesor.");

  const despues = await (await pedir("/recepcion/equivalencias", { headers: { Authorization: `Bearer ${token}` } })).json();
  assert.equal(despues.espesores.length, antes.espesores.length, "El total de filas de espesor no debe crecer al reenviar un valor ya existente.");
});

// ---------------------------------------------------------------------
// Bodegas / Transferencias — antes sin cobertura automatizada. `admin`
// es Administrativo de Ricaurte y `santander` es Administrativo de
// Santander (ver seed.py): dos bodegas reales distintas, necesarias
// para probar transferencias entre sedes de verdad.
// ---------------------------------------------------------------------

async function crearProductoDePrueba(headers, overrides = {}) {
  const codigo = `TEST-TRANSF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const respuesta = await pedir("/inventario/productos", {
    method: "POST", headers,
    body: JSON.stringify({
      codigo, descripcion: "Producto de prueba (test automatizado)", familia: "TEST-TRANSFERENCIAS",
      entrada: 20, stock: 20, ...overrides,
    }),
  });
  const cuerpo = await respuesta.json();
  assert.equal(respuesta.status, 201, `No se pudo crear el producto de prueba: ${JSON.stringify(cuerpo)}`);
  return cuerpo;
}

test("bodegas: solicitar transferencia de un producto de la propia bodega se rechaza", async () => {
  const tokenA = await tokenAdmin();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const producto = await crearProductoDePrueba(headersA);

  const respuesta = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: headersA,
    body: JSON.stringify({ producto_id: producto.id, cantidad: 1 }),
  });
  assert.equal(respuesta.status, 400, "No tiene sentido solicitar a otra bodega un producto que ya está en la propia.");
});

test("bodegas: solicitar más cantidad de la disponible en la otra bodega se rechaza", async () => {
  const tokenS = await tokenSantander();
  const headersS = { Authorization: `Bearer ${tokenS}`, "Content-Type": "application/json" };
  const productoSantander = await crearProductoDePrueba(headersS, { stock: 5, entrada: 5 });

  const tokenA = await tokenAdmin();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const respuesta = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: headersA,
    body: JSON.stringify({ producto_id: productoSantander.id, cantidad: 999 }),
  });
  assert.equal(respuesta.status, 400, "La cantidad solicitada no puede superar el stock real de la bodega propietaria.");
});

test("bodegas: un jefe de planta no puede crear solicitudes de transferencia", async () => {
  const tokenS = await tokenSantander();
  const headersS = { Authorization: `Bearer ${tokenS}`, "Content-Type": "application/json" };
  const productoSantander = await crearProductoDePrueba(headersS);

  const tokenP = await tokenPlanta();
  const respuesta = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: { Authorization: `Bearer ${tokenP}`, "Content-Type": "application/json" },
    body: JSON.stringify({ producto_id: productoSantander.id, cantidad: 1 }),
  });
  assert.equal(respuesta.status, 403, "Crear solicitudes de transferencia es exclusivo de Administrativo.");
});

test("transferencias: aceptar una solicitud parcial mueve stock entre bodegas sin vaciar el producto origen", async () => {
  const tokenS = await tokenSantander();
  const tokenA = await tokenAdmin();
  const headersS = { Authorization: `Bearer ${tokenS}`, "Content-Type": "application/json" };
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const productoOrigen = await crearProductoDePrueba(headersS, { stock: 20, entrada: 20 });

  const solicitud = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: headersA,
    body: JSON.stringify({ producto_id: productoOrigen.id, cantidad: 8, observaciones: "Prueba automatizada" }),
  });
  const cuerpoSolicitud = await solicitud.json();
  assert.equal(solicitud.status, 201, `Fallo al crear la solicitud: ${JSON.stringify(cuerpoSolicitud)}`);
  assert.equal(cuerpoSolicitud.estado, "pendiente");
  assert.equal(cuerpoSolicitud.bodega_propietaria_id, productoOrigen.bodega_id);

  const aceptar = await pedir(`/bodegas/solicitudes/${cuerpoSolicitud.id}/aceptar`, { method: "PATCH", headers: headersS });
  const cuerpoAceptado = await aceptar.json();
  assert.equal(aceptar.status, 200, `Fallo al aceptar la solicitud: ${JSON.stringify(cuerpoAceptado)}`);
  assert.equal(cuerpoAceptado.estado, "aceptada");

  const origenActual = (await (await pedir(`/inventario/productos?busqueda=${productoOrigen.codigo}`, { headers: headersS })).json())[0];
  assert.equal(Number(origenActual.stock), 12, "20 - 8 aceptadas = 12: una transferencia parcial no debe vaciar el producto origen.");

  const destinoActual = (await (await pedir(`/inventario/productos?busqueda=${productoOrigen.codigo}`, { headers: headersA })).json())[0];
  assert.equal(Number(destinoActual.stock), 8, "La bodega solicitante debe recibir exactamente la cantidad aceptada.");
  assert.equal(destinoActual.referencia, productoOrigen.referencia, "El producto creado en destino debe heredar la referencia del producto origen.");
});

test("transferencias: aceptar una solicitud por el stock completo conserva el producto origen con stock 0 (no lo elimina)", async () => {
  const tokenS = await tokenSantander();
  const tokenA = await tokenAdmin();
  const headersS = { Authorization: `Bearer ${tokenS}`, "Content-Type": "application/json" };
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const productoOrigen = await crearProductoDePrueba(headersS, { stock: 6, entrada: 6, stock_minimo: 2 });

  const solicitud = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: headersA,
    body: JSON.stringify({ producto_id: productoOrigen.id, cantidad: 6 }),
  });
  const cuerpoSolicitud = await solicitud.json();
  assert.equal(solicitud.status, 201, `Fallo al crear la solicitud: ${JSON.stringify(cuerpoSolicitud)}`);

  const aceptar = await pedir(`/bodegas/solicitudes/${cuerpoSolicitud.id}/aceptar`, { method: "PATCH", headers: headersS });
  assert.equal(aceptar.status, 200);

  const origenActual = await (await pedir(`/inventario/productos?busqueda=${productoOrigen.codigo}`, { headers: headersS })).json();
  assert.equal(
    origenActual.length, 1,
    "transferencias.py ya no debe eliminar la fila del producto origen al llegar a 0 -- mismo comportamiento que movimientos.py/envios.py (decisión de negocio ya tomada: nunca borrar productos automáticamente).",
  );
  assert.equal(Number(origenActual[0].stock), 0);
  assert.equal(Number(origenActual[0].stock_minimo), 2, "La configuración (ej. stock_minimo) debe sobrevivir intacta, no perderse al llegar a 0.");
});

test("transferencias: solo la bodega propietaria puede aceptar o rechazar una solicitud", async () => {
  const tokenA = await tokenAdmin();
  const tokenS = await tokenSantander();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const headersS = { Authorization: `Bearer ${tokenS}`, "Content-Type": "application/json" };
  const productoOrigen = await crearProductoDePrueba(headersA, { stock: 10, entrada: 10 });

  const solicitud = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: headersS,
    body: JSON.stringify({ producto_id: productoOrigen.id, cantidad: 2 }),
  });
  const cuerpoSolicitud = await solicitud.json();
  assert.equal(solicitud.status, 201);

  const aceptarDesdeSolicitante = await pedir(`/bodegas/solicitudes/${cuerpoSolicitud.id}/aceptar`, { method: "PATCH", headers: headersS });
  assert.equal(aceptarDesdeSolicitante.status, 404, "La propia bodega solicitante no puede aceptar su solicitud: solo la propietaria del material puede.");

  const rechazarDesdeSolicitante = await pedir(`/bodegas/solicitudes/${cuerpoSolicitud.id}/rechazar`, { method: "PATCH", headers: headersS });
  assert.equal(rechazarDesdeSolicitante.status, 404, "Tampoco puede rechazar su propia solicitud: la decisión es exclusiva de la bodega propietaria.");

  // Limpieza mínima: rechazamos desde la bodega correcta para no dejar una solicitud pendiente colgada.
  await pedir(`/bodegas/solicitudes/${cuerpoSolicitud.id}/rechazar`, { method: "PATCH", headers: headersA });
});

test("transferencias: una solicitud ya procesada no se puede volver a aceptar ni rechazar", async () => {
  const tokenA = await tokenAdmin();
  const tokenS = await tokenSantander();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const headersS = { Authorization: `Bearer ${tokenS}`, "Content-Type": "application/json" };
  const productoOrigen = await crearProductoDePrueba(headersS, { stock: 10, entrada: 10 });

  const solicitud = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: headersA,
    body: JSON.stringify({ producto_id: productoOrigen.id, cantidad: 3 }),
  });
  const cuerpoSolicitud = await solicitud.json();
  assert.equal(solicitud.status, 201);

  const primerRechazo = await pedir(`/bodegas/solicitudes/${cuerpoSolicitud.id}/rechazar`, { method: "PATCH", headers: headersS });
  assert.equal(primerRechazo.status, 200);

  const segundoRechazo = await pedir(`/bodegas/solicitudes/${cuerpoSolicitud.id}/rechazar`, { method: "PATCH", headers: headersS });
  assert.equal(segundoRechazo.status, 400, "Una solicitud ya rechazada no puede volver a procesarse.");

  const intentoAceptar = await pedir(`/bodegas/solicitudes/${cuerpoSolicitud.id}/aceptar`, { method: "PATCH", headers: headersS });
  assert.equal(intentoAceptar.status, 400, "Tampoco puede aceptarse una solicitud que ya fue rechazada.");
});

test("transferencias: un rollo con una solicitud pendiente no admite una segunda solicitud simultánea", async () => {
  const tokenA = await tokenAdmin();
  const tokenS = await tokenSantander();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const headersS = { Authorization: `Bearer ${tokenS}`, "Content-Type": "application/json" };
  const rollo = await crearRolloDePrueba(headersA, 15); // queda en la bodega de admin (Ricaurte)

  const primeraSolicitud = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: headersS,
    body: JSON.stringify({ rollo_id: rollo.id }),
  });
  const cuerpoPrimera = await primeraSolicitud.json();
  assert.equal(primeraSolicitud.status, 201, `Fallo al crear la primera solicitud: ${JSON.stringify(cuerpoPrimera)}`);

  const segundaSolicitud = await pedir("/bodegas/solicitudes", {
    method: "POST", headers: headersS,
    body: JSON.stringify({ rollo_id: rollo.id }),
  });
  assert.equal(segundaSolicitud.status, 409, "El mismo rollo no puede tener dos solicitudes pendientes a la vez.");

  await pedir(`/bodegas/solicitudes/${cuerpoPrimera.id}/rechazar`, { method: "PATCH", headers: headersA });
});

// ---------------------------------------------------------------------
// Rollos: ciclo de vida "agotado" y hoja de vida por rollo. A diferencia
// de Producto, un Rollo nunca se elimina; al llegar a 0 metros disponibles
// pasa a estado "agotado", sale del inventario activo por defecto, y sigue
// consultable (con su historial) por separado.
// ---------------------------------------------------------------------

test("rollos: un rollo consumido hasta 0 pasa a agotado, sale del listado activo por defecto y se conserva", async () => {
  const tokenA = await tokenAdmin();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const rollo = await crearRolloDePrueba(headersA, 5);

  const consumo = await pedir(`/rollos/${rollo.id}/consumo`, {
    method: "POST", headers: headersA,
    body: JSON.stringify({ cantidad: 5, observaciones: "Consumo de prueba hasta agotar" }),
  });
  const rolloConsumido = await consumo.json();
  assert.equal(consumo.status, 200, `Fallo al registrar el consumo: ${JSON.stringify(rolloConsumido)}`);
  assert.equal(rolloConsumido.estado, "agotado", "Al llegar exactamente a 0 metros disponibles, recalcular_estado() debe marcarlo agotado.");

  const listadoActivo = await (await pedir(`/rollos?identificador_rollo=${encodeURIComponent(rollo.identificador_rollo)}`, { headers: headersA })).json();
  assert.equal(listadoActivo.length, 0, "Sin filtro de estado explícito ('inventario activo'), un rollo agotado no debe aparecer.");

  const listadoAgotados = await (await pedir(`/rollos?identificador_rollo=${encodeURIComponent(rollo.identificador_rollo)}&estado=agotado`, { headers: headersA })).json();
  assert.equal(listadoAgotados.length, 1, "Pidiendo estado=agotado explícitamente, el rollo sigue siendo consultable: nunca se borra.");
  assert.equal(listadoAgotados[0].id, rollo.id);
});

test("rollos: un rollo agotado no admite un nuevo consumo (protección contra metros negativos)", async () => {
  const tokenA = await tokenAdmin();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const rollo = await crearRolloDePrueba(headersA, 3);

  const primerConsumo = await pedir(`/rollos/${rollo.id}/consumo`, {
    method: "POST", headers: headersA,
    body: JSON.stringify({ cantidad: 3, observaciones: "" }),
  });
  assert.equal(primerConsumo.status, 200);

  const segundoConsumo = await pedir(`/rollos/${rollo.id}/consumo`, {
    method: "POST", headers: headersA,
    body: JSON.stringify({ cantidad: 1, observaciones: "" }),
  });
  const cuerpoSegundo = await segundoConsumo.json();
  assert.equal(segundoConsumo.status, 400, `Un rollo ya agotado (0 m disponibles) no debe admitir más consumo: ${JSON.stringify(cuerpoSegundo)}`);
});

test("rollos: la hoja de vida de un rollo (/rollos/{id}/historial) solo trae SUS movimientos, nunca los de otro rollo con la misma clasificación", async () => {
  const tokenA = await tokenAdmin();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const rolloA = await crearRolloDePrueba(headersA, 10);
  const rolloB = await crearRolloDePrueba(headersA, 10); // mismo codigo_interno "LA50170,20" que rolloA, rollo físico distinto

  await pedir(`/rollos/${rolloA.id}/consumo`, {
    method: "POST", headers: headersA,
    body: JSON.stringify({ cantidad: 4, observaciones: "Consumo exclusivo de A" }),
  });
  await pedir(`/rollos/${rolloB.id}/consumo`, {
    method: "POST", headers: headersA,
    body: JSON.stringify({ cantidad: 7, observaciones: "Consumo exclusivo de B" }),
  });

  const historialA = await (await pedir(`/rollos/${rolloA.id}/historial`, { headers: headersA })).json();
  const historialB = await (await pedir(`/rollos/${rolloB.id}/historial`, { headers: headersA })).json();

  assert.equal(historialA.length, 1);
  assert.equal(Number(historialA[0].cantidad), 4, "La hoja de vida de A debe traer solo su propio consumo, no el de B (misma clasificación).");
  assert.equal(historialA[0].identificador_rollo, rolloA.identificador_rollo);

  assert.equal(historialB.length, 1);
  assert.equal(Number(historialB[0].cantidad), 7, "La hoja de vida de B debe traer solo su propio consumo, no el de A.");
  assert.equal(historialB[0].identificador_rollo, rolloB.identificador_rollo);
});

test("rollos: un nuevo rollo de la misma clasificación que uno ya agotado crea un registro independiente, y sus metros sí se suman al total activo", async () => {
  const tokenA = await tokenAdmin();
  const headersA = { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" };
  const rolloAgotado = await crearRolloDePrueba(headersA, 2);
  await pedir(`/rollos/${rolloAgotado.id}/consumo`, {
    method: "POST", headers: headersA,
    body: JSON.stringify({ cantidad: 2, observaciones: "" }),
  });

  // Mismo codigo_interno ("LA50170,20") que el rollo ya agotado -- crear_rollo
  // lo permite porque encuentra un "hermano" con ese prefijo, sin importar su estado.
  const rolloNuevo = await crearRolloDePrueba(headersA, 9);

  const activosDeEstaClasificacion = await (await pedir("/rollos?codigo_interno=LA50170,20&tamano=100", { headers: headersA })).json();
  const idsActivos = activosDeEstaClasificacion.map((r) => r.id);
  assert.ok(idsActivos.includes(rolloNuevo.id), "El rollo nuevo debe aparecer en el inventario activo de su clasificación.");
  assert.ok(!idsActivos.includes(rolloAgotado.id), "El rollo agotado nunca debe reaparecer mezclado con los activos de la misma clasificación.");

  const totalActivo = activosDeEstaClasificacion.reduce((suma, r) => suma + Number(r.metros_disponibles), 0);
  assert.ok(totalActivo >= 9, "Los metros del rollo nuevo deben sumarse al total activo de la clasificación (el agotado aporta 0, nunca se resta ni se pierde el nuevo).");
});
