import assert from "node:assert/strict";
import test from "node:test";

const apiUrl = process.env.API_URL || "http://localhost:8000";
const admin = {
  correo: process.env.RICAURTE_ADMIN_EMAIL || "ricaurte@gmail.com",
  contrasena: process.env.RICAURTE_ADMIN_PASSWORD || "123456789",
};
const santander = {
  correo: process.env.SANTANDER_ADMIN_EMAIL || "santander@gmail.com",
  contrasena: process.env.SANTANDER_ADMIN_PASSWORD || "123456789",
};

async function pedir(ruta, opciones = {}) {
  return fetch(`${apiUrl}${ruta}`, opciones);
}

async function tokenAdmin() {
  return (await iniciarSesion(admin)).access_token;
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
