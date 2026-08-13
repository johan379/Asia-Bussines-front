import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";

// Esta suite debe ejecutarse contra la base de pruebas. Crea sus propios
// materiales y rollos con prefijo E2E- para que ningún escenario se omita.
const apiUrl = process.env.API_URL || "http://localhost:8000";
const codigoBase = `E2E-BASE-${Date.now()}`;
const codigoSolicitud = `${codigoBase}-SOLICITUD`;

const cuentas = {
  ricaurteAdmin: { email: process.env.RICAURTE_ADMIN_EMAIL || "ricaurte@gmail.com", password: process.env.RICAURTE_ADMIN_PASSWORD || "123456789" },
  ricaurtePlanta: { email: process.env.RICAURTE_PLANTA_EMAIL || "ricaurteplanta@gmail.com", password: process.env.RICAURTE_PLANTA_PASSWORD || "123456789" },
  santanderAdmin: { email: process.env.SANTANDER_ADMIN_EMAIL || "santander@gmail.com", password: process.env.SANTANDER_ADMIN_PASSWORD || "123456789" },
};

async function iniciarSesion(page, cuenta) {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).waitFor({ state: "visible" });
}

async function abrirModulo(page, nombre, ruta) {
  await page.getByRole("link", { name: nombre }).click();
  await expect(page).toHaveURL(new RegExp(`${ruta}$`));
}

function archivoRecepcionPrueba(codigo) {
  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.aoa_to_sheet([
    ["Rollo", "Espesor", "Net Weight", "Coil Meters", "Color TOP", "Tipo Material", "Proveedor", "Lote"],
    [`${codigo}-01`, 0.27, 1.2, 1200, "AZUL-E2E", "LaminaE2E", "Proveedor E2E", "LOTE-E2E"],
    [`${codigo}-02`, 0.27, 0.8, 800, "AZUL-E2E", "LaminaE2E", "Proveedor E2E", "LOTE-E2E"],
  ]);
  XLSX.utils.book_append_sheet(libro, hoja, "Rollos");
  return XLSX.write(libro, { bookType: "xlsx", type: "buffer" });
}

async function iniciarSesionApi(request, cuenta) {
  const respuesta = await request.post(`${apiUrl}/auth/login`, {
    data: { correo: cuenta.email, contrasena: cuenta.password },
  });
  expect(respuesta.ok(), `No se pudo iniciar sesión como ${cuenta.email}`).toBeTruthy();
  const { access_token: token } = await respuesta.json();
  return { Authorization: `Bearer ${token}` };
}

async function guardarEquivalenciasPrueba(request, headers) {
  for (const [ruta, datos] of [
    ["/recepcion/equivalencias/colores", { ral: "AZUL-E2E", nombre: "Azul E2E", codigo_interno: "AZ" }],
    ["/recepcion/equivalencias/tipos", { nombre: "LaminaE2E", codigo_interno: "L" }],
    ["/recepcion/equivalencias/espesor", { espesor: 0.27, mt_por_ton: 1000, peso_por_metro: 1 }],
  ]) {
    const respuesta = await request.post(`${apiUrl}${ruta}`, { headers, data: datos });
    expect(respuesta.ok(), `${ruta}: ${await respuesta.text()}`).toBeTruthy();
  }
}

async function crearRolloDePrueba(request, headers, codigo) {
  const previo = await request.post(`${apiUrl}/recepcion/previsualizar`, {
    headers,
    multipart: {
      archivo: {
        name: `${codigo}.xlsx`,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: archivoRecepcionPrueba(codigo),
      },
    },
  });
  expect(previo.ok(), `No se pudo cargar ${codigo}: ${await previo.text()}`).toBeTruthy();
  const { mapeo_sugerido } = await previo.json();
  const verificacion = await request.post(`${apiUrl}/recepcion/verificar`, {
    headers,
    data: { mapeo: mapeo_sugerido, tolerancia_porcentaje: 2 },
  });
  expect(verificacion.ok(), `No se pudo verificar ${codigo}: ${await verificacion.text()}`).toBeTruthy();
  const confirmar = await request.post(`${apiUrl}/recepcion/confirmar`, {
    headers,
    data: { tolerancia_porcentaje: 2, proveedor_principal: "Proveedor E2E" },
  });
  expect(confirmar.ok(), `No se pudo confirmar ${codigo}: ${await confirmar.text()}`).toBeTruthy();
}

async function crearProductoDePrueba(request, headers) {
  const respuesta = await request.post(`${apiUrl}/inventario/productos`, {
    headers,
    data: {
      codigo_importacion: codigoSolicitud,
      codigo: codigoSolicitud,
      descripcion: "Material para validar solicitud E2E",
      familia: "Pruebas E2E",
      calibre: "0.27",
      entrada: 5,
      stock: 5,
    },
  });
  expect(respuesta.ok(), `No se pudo crear material E2E: ${await respuesta.text()}`).toBeTruthy();
}

test.beforeAll(async ({ request }) => {
  const respuesta = await fetch(`${apiUrl}/openapi.json`).catch(() => null);
  if (!respuesta?.ok) throw new Error(`El backend no responde en ${apiUrl}.`);
  const headersRicaurte = await iniciarSesionApi(request, cuentas.ricaurteAdmin);
  const headersSantander = await iniciarSesionApi(request, cuentas.santanderAdmin);
  await guardarEquivalenciasPrueba(request, headersRicaurte);
  await crearRolloDePrueba(request, headersRicaurte, `${codigoBase}-RICAURTE`);
  await crearRolloDePrueba(request, headersSantander, `${codigoBase}-SANTANDER`);
  await crearProductoDePrueba(request, headersSantander);
  if (!respuesta?.ok) throw new Error(`El backend no responde en ${apiUrl}. Inícialo antes de probar.`);
});

test.describe("Acceso y roles", () => {
  test("protege rutas privadas y permite iniciar sesión", async ({ page }) => {
    await page.goto("/inventario");
    await expect(page).toHaveURL(/\/$/);
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await expect(page).toHaveURL(/\/inventario$/);
    await expect(page.getByRole("link", { name: "Hoja de Vida" })).toBeVisible();
  });

  test("el jefe de planta ve producción y las rutas administrativas lo redirigen", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurtePlanta);
    await expect(page).toHaveURL(/\/produccion$/);
    await expect(page.getByRole("link", { name: "Registrar Producción" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Inventario" })).toBeVisible();
    await page.goto("/rollos");
    await expect(page).toHaveURL(/\/produccion$/);
  });

});

test.describe("Interfaz, accesibilidad y compatibilidad", () => {
  test("los controles visibles tienen nombre accesible y la vista móvil no desborda", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Asistente de IA", "/ia");
    const botonesSinNombre = await page.locator("button:visible").evaluateAll((botones) =>
      botones
        .filter((boton) => !boton.getAttribute("aria-label") && !boton.textContent?.trim())
        .map((boton) => boton.outerHTML)
    );
    expect(botonesSinNombre).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: "Asistente de operaciones" })).toBeVisible();
    const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(desborda).toBeFalsy();
  });
});

test.describe("Inventario y reportes", () => {
  test("muestra productos individuales, busca y limpia historial", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    const buscador = page.getByPlaceholder("Buscar por código, código de importación o descripción...");
    await expect(buscador).toBeVisible();
    await Promise.all([
      page.waitForResponse((respuesta) =>
        respuesta.url().includes("/inventario/productos?") && respuesta.url().includes("__SIN_COINCIDENCIA_E2E__")
      ),
      buscador.fill("__SIN_COINCIDENCIA_E2E__"),
    ]);
    await expect(page.getByText("No se encontraron productos que coincidan con la búsqueda.")).toBeVisible();
    await buscador.fill("");
    await page.getByRole("button", { name: "Historial" }).click();
    await expect(page.getByRole("heading", { name: "Historial de movimientos" })).toBeVisible();
    await page.getByPlaceholder("Ej: PRD-001").fill("__SIN_COINCIDENCIA_E2E__");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.getByText("No hay movimientos que coincidan con los filtros.")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(page.getByPlaceholder("Ej: PRD-001")).toHaveValue("");
  });

  test("filtra movimientos y ofrece exportación", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Reportes", "/reportes");
    await expect(page.getByRole("heading", { name: "Movimientos", exact: true })).toBeVisible();
    const filtroTipo = page.locator(".reportes-filtros-grid select");
    await filtroTipo.selectOption("entrada");
    await expect(page.locator(".reportes-tipo-badge.tipo-salida")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Exportar a Excel/ })).toBeEnabled();
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(filtroTipo).toHaveValue("");
  });
});

test.describe("Recepción y rollos", () => {
  test("abre recepción, tablas de equivalencias y controles de carga", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Recepción y Verificación", "/recepcion");
    await expect(page.getByRole("heading", { name: "Cargar archivo del proveedor" })).toBeVisible();
    await expect(page.getByText("Seleccionar archivo Excel")).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await expect(page.getByText(/Formatos aceptados: .xlsx, .xls/i)).toBeVisible();
  });

  test("rollos conserva filtros, color y peso individual", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Rollos almacenados", "/rollos");
    const codigo = page.getByLabel("Código interno");
    await Promise.all([
      page.waitForResponse((respuesta) =>
        respuesta.url().includes("/rollos?") && respuesta.url().includes("__SIN_COINCIDENCIA_E2E__")
      ),
      codigo.fill("__SIN_COINCIDENCIA_E2E__"),
    ]);
    await expect(page.getByText("No hay rollos que coincidan con la búsqueda.")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(codigo).toHaveValue("");
    await codigo.fill("L1000AZ0.27");
    const grupo = page.locator(".rollos-grupo-header").first();
    await expect(grupo).toBeVisible();
    await grupo.click();
    await expect(page.getByRole("columnheader", { name: "Peso neto (t)" })).toBeVisible();
    await expect(page.locator(".rollos-color-etiqueta").first()).toBeVisible();
  });

  test("validaciones de consumo no guardan cambios", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Rollos almacenados", "/rollos");
    await page.getByLabel("Código interno").fill("L1000AZ0.27");
    await page.getByLabel("Estado").selectOption("cerrado");
    const grupo = page.locator(".rollos-grupo-header").first();
    await expect(grupo).toBeVisible();
    await grupo.click();
    await page.getByRole("button", { name: "Registrar consumo" }).first().click();
    await page.getByLabel("Metros a consumir").fill("0");
    await page.getByRole("button", { name: "Registrar consumo" }).last().click();
    await expect(page.getByText("La cantidad debe ser mayor a cero.")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
  });
});

test.describe("Bodegas e intercambio", () => {
  test("busca otra bodega, consulta inventario y filtra resultados", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Bodegas", "/bodegas");
    const buscador = page.getByPlaceholder("Buscar bodega por nombre...");
    await buscador.fill("Santander");
    await page.getByRole("button", { name: "Filtrar" }).click();
    const bodega = page.getByRole("button", { name: /Santander/ });
    await expect(bodega).toBeVisible();
    await bodega.click();
    await expect(page.getByRole("heading", { name: /Inventario de/ })).toBeVisible();
    await page.getByPlaceholder("Buscar producto por nombre o código...").fill("__SIN_COINCIDENCIA_E2E__");
    await expect(page.getByText("Ningún producto coincide con esa búsqueda en esta bodega.")).toBeVisible();
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  });

  test("modal de solicitud valida y cancelar no crea intercambio", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Bodegas", "/bodegas");
    await page.getByPlaceholder("Buscar bodega por nombre...").fill("Santander");
    await page.getByRole("button", { name: "Filtrar" }).click();
    const bodega = page.getByRole("button", { name: /Santander/ });
    await expect(bodega).toBeVisible();
    await bodega.click();
    await page.getByPlaceholder("Buscar producto por nombre o código...").fill(codigoSolicitud);
    const solicitar = page.getByRole("button", { name: /Solicitar/ }).first();
    await expect(solicitar).toBeEnabled();
    await solicitar.click();
    const cantidad = page.getByLabel("Cantidad");
    expect(await cantidad.evaluate((element) => element.readOnly)).toBeFalsy();
    await cantidad.fill("0");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByText("La cantidad debe ser mayor a cero.")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByLabel("Cantidad")).toHaveCount(0);
  });
});

test.describe("Asistente y producción", () => {
  test("el asistente responde una consulta de inventario", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Asistente de IA", "/ia");
    await expect(page.getByRole("heading", { name: "Asistente de operaciones" })).toBeVisible();
    await page.getByPlaceholder(/Pregunta por el inventario/i).fill("¿Cómo está el stock de mi bodega?");
    await page.getByRole("button", { name: "Enviar pregunta" }).click();
    await expect(page.locator(".ia-mensaje-ia").last()).toBeVisible();
  });

  test("producción valida búsqueda y selección de rollos", async ({ page }) => {
    await iniciarSesion(page, cuentas.ricaurtePlanta);
    await expect(page.getByRole("heading", { name: "Registrar Producción" })).toBeVisible();
    await page.getByRole("button", { name: "Registrar Producción" }).click();
    await expect(page.getByText("Busca un código de clasificación.")).toBeVisible();
    await page.getByPlaceholder("Ej. LA50030,25").fill("__SIN_COINCIDENCIA_E2E__");
    await expect(page.getByText("No hay rollos registrados con ese código en tu bodega.")).toBeVisible();
  });
});

test.describe("Flujos con escritura en la base de pruebas", () => {
  test("dos consumos simultaneos no pueden agotar dos veces el mismo rollo", async ({ request }) => {
    const codigo = `E2E-CONS-${Date.now()}`;
    const headers = await iniciarSesionApi(request, cuentas.ricaurteAdmin);
    await crearRolloDePrueba(request, headers, codigo);
    const lista = await request.get(`${apiUrl}/rollos?codigo_interno=L1000AZ0.27`, { headers });
    expect(lista.ok(), await lista.text()).toBeTruthy();
    const rollo = (await lista.json()).find((item) => item.identificador_rollo.startsWith(codigo));
    expect(rollo).toBeTruthy();
    const consumo = () => request.post(`${apiUrl}/rollos/${rollo.id}/consumo`, {
      headers,
      data: { cantidad: Number(rollo.metros_disponibles), observaciones: "Prueba E2E simultanea" },
    });
    const respuestas = await Promise.all([consumo(), consumo()]);
    expect(respuestas.map((respuesta) => respuesta.status()).sort()).toEqual([200, 400]);
    const actualizado = await request.get(`${apiUrl}/rollos?codigo_interno=L1000AZ0.27`, { headers });
    const rolloFinal = (await actualizado.json()).find((item) => item.id === rollo.id);
    expect(Number(rolloFinal.metros_disponibles)).toBe(0);
    expect(Number(rolloFinal.metros_consumidos)).toBe(Number(rollo.metros_disponibles));
  });

  test("recibe y registra dos rollos individuales desde un Excel", async ({ page, request }) => {
    const codigo = `E2E-REC-${Date.now()}`;
    const loginRicaurte = await request.post(`${apiUrl}/auth/login`, {
      data: { correo: cuentas.ricaurteAdmin.email, contrasena: cuentas.ricaurteAdmin.password },
    });
    expect(loginRicaurte.ok()).toBeTruthy();
    const { access_token: tokenRicaurte } = await loginRicaurte.json();
    const headers = { Authorization: `Bearer ${tokenRicaurte}` };

    for (const [ruta, datos] of [
      ["/recepcion/equivalencias/colores", { ral: "AZUL-E2E", nombre: "Azul E2E", codigo_interno: "AZ" }],
      ["/recepcion/equivalencias/tipos", { nombre: "LaminaE2E", codigo_interno: "L" }],
      ["/recepcion/equivalencias/espesor", { espesor: 0.27, mt_por_ton: 1000, peso_por_metro: 1 }],
    ]) {
      const respuesta = await request.post(`${apiUrl}${ruta}`, { headers, data: datos });
      expect(respuesta.ok(), `${ruta}: ${await respuesta.text()}`).toBeTruthy();
    }

    await iniciarSesion(page, cuentas.ricaurteAdmin);
    await abrirModulo(page, "Recepción y Verificación", "/recepcion");
    await page.locator('input[type="file"]').setInputFiles({
      name: `${codigo}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: archivoRecepcionPrueba(codigo),
    });
    await expect(page.getByRole("heading", { name: "Verifica las columnas detectadas" })).toBeVisible();
    await page.getByRole("button", { name: "Calcular y verificar" }).click();
    await expect(page.getByRole("heading", { name: "Resultado de la verificación" })).toBeVisible();
    await expect(page.getByText(`${codigo}-01`)).toBeVisible();
    await page.getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(page.getByText(/Recepción confirmada/i)).toBeVisible();

    const rollos = await request.get(`${apiUrl}/rollos?codigo_interno=L1000AZ0.27`, { headers });
    expect(rollos.ok()).toBeTruthy();
    const datosRollos = await rollos.json();
    const recibidos = datosRollos.filter((rollo) => rollo.identificador_rollo.startsWith(codigo));
    expect(recibidos).toHaveLength(2);
    expect(recibidos.map((rollo) => Number(rollo.peso_neto)).sort()).toEqual([0.8, 1.2]);
  });

  test("crea producto de prueba, registra intercambio y comprueba el traslado", async ({ browser, request }) => {
    const codigo = `E2E-INT-${Date.now()}`;
    const loginSantander = await request.post(`${apiUrl}/auth/login`, {
      data: { correo: cuentas.santanderAdmin.email, contrasena: cuentas.santanderAdmin.password },
    });
    expect(loginSantander.ok()).toBeTruthy();
    const sesionSantander = await loginSantander.json();
    const tokenSantander = sesionSantander.access_token;

    const crearProducto = await request.post(`${apiUrl}/inventario/productos`, {
      headers: { Authorization: `Bearer ${tokenSantander}` },
      data: {
        codigo_importacion: codigo,
        codigo,
        descripcion: "Material creado por prueba E2E de intercambio",
        familia: "Pruebas E2E",
        calibre: "0.27",
        entrada: 5,
        stock: 5,
      },
    });
    expect(crearProducto.ok()).toBeTruthy();

    const solicitante = await browser.newPage();
    const propietaria = await browser.newPage();
    await iniciarSesion(solicitante, cuentas.ricaurteAdmin);
    await abrirModulo(solicitante, "Bodegas", "/bodegas");
    await solicitante.getByPlaceholder("Buscar bodega por nombre...").fill("Santander");
    await solicitante.getByRole("button", { name: "Filtrar" }).click();
    await solicitante.getByRole("button", { name: /Santander/ }).click();
    await solicitante.getByPlaceholder("Buscar producto por nombre o código...").fill(codigo);
    const filaProducto = solicitante.locator(".bodegas-tabla tbody tr", { hasText: codigo });
    await expect(filaProducto).toBeVisible();
    const solicitar = filaProducto.getByRole("button", { name: /Solicitar/ });
    await solicitar.click();
    const formularioSolicitud = solicitante.locator(".bodegas-modal form");
    await formularioSolicitud.locator("select").selectOption("intercambio");
    const cantidad = formularioSolicitud.locator('input[type="number"]');
    if (!(await cantidad.evaluate((element) => element.readOnly))) await cantidad.fill("1");
    await solicitante.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(solicitante.getByText(/Solicitud enviada/i)).toBeVisible();

    await iniciarSesion(propietaria, cuentas.santanderAdmin);
    await abrirModulo(propietaria, "Bodegas", "/bodegas");
    const solicitudCreada = propietaria.locator(".bodegas-notificacion", { hasText: codigo });
    await expect(solicitudCreada).toBeVisible();
    await solicitudCreada.getByRole("button", { name: "Aceptar" }).click();
    await expect(solicitudCreada).toHaveCount(0);

    const inventarioSantander = await request.get(`${apiUrl}/inventario/productos?busqueda=${codigo}`, {
      headers: { Authorization: `Bearer ${tokenSantander}` },
    });
    expect(inventarioSantander.ok()).toBeTruthy();
    const productosSantander = await inventarioSantander.json();
    expect(Number(productosSantander[0]?.stock)).toBe(4);

    await solicitante.close();
    await propietaria.close();
  });

  test("un traslado completo retira el producto del inventario activo de origen", async ({ request }) => {
    const codigo = `E2E-AGOTADO-${Date.now()}`;
    const headersRicaurte = await iniciarSesionApi(request, cuentas.ricaurteAdmin);
    const headersSantander = await iniciarSesionApi(request, cuentas.santanderAdmin);
    const creado = await request.post(`${apiUrl}/inventario/productos`, {
      headers: headersSantander,
      data: {
        codigo_importacion: codigo,
        codigo,
        descripcion: "Producto agotado por traslado E2E",
        familia: "Pruebas E2E",
        calibre: "0.27",
        entrada: 1,
        stock: 1,
      },
    });
    expect(creado.ok(), await creado.text()).toBeTruthy();
    const producto = await creado.json();
    const solicitudRespuesta = await request.post(`${apiUrl}/bodegas/solicitudes`, {
      headers: headersRicaurte,
      data: { producto_id: producto.id, cantidad: 1, tipo_operacion: "intercambio" },
    });
    expect(solicitudRespuesta.ok(), await solicitudRespuesta.text()).toBeTruthy();
    const solicitud = await solicitudRespuesta.json();
    const aceptada = await request.patch(`${apiUrl}/bodegas/solicitudes/${solicitud.id}/aceptar`, {
      headers: headersSantander,
    });
    expect(aceptada.ok(), await aceptada.text()).toBeTruthy();

    const origen = await request.get(`${apiUrl}/inventario/productos?busqueda=${codigo}`, {
      headers: headersSantander,
    });
    expect(origen.ok()).toBeTruthy();
    expect((await origen.json())).toHaveLength(0);
    const destino = await request.get(`${apiUrl}/inventario/productos?busqueda=${codigo}`, {
      headers: headersRicaurte,
    });
    expect(destino.ok()).toBeTruthy();
    expect(Number((await destino.json())[0]?.stock)).toBe(1);

    const panelOtraBodega = await request.get(`${apiUrl}/bodegas/${producto.bodega_id}/inventario?busqueda=${codigo}`, {
      headers: headersRicaurte,
    });
    expect(panelOtraBodega.ok()).toBeTruthy();
    expect(await panelOtraBodega.json()).toHaveLength(0);
  });

  test("dos solicitudes simultáneas no pueden reservar el mismo rollo", async ({ request }) => {
    const codigo = `E2E-CON-${Date.now()}`;
    const headersRicaurte = await iniciarSesionApi(request, cuentas.ricaurteAdmin);
    const headersSantander = await iniciarSesionApi(request, cuentas.santanderAdmin);
    await crearRolloDePrueba(request, headersSantander, codigo);

    const lista = await request.get(`${apiUrl}/rollos`, {
      headers: headersSantander,
    });
    expect(lista.ok(), await lista.text()).toBeTruthy();
    const rollos = await lista.json();
    const rollo = rollos.find((item) => item.identificador_rollo.startsWith(codigo));
    expect(rollo).toBeTruthy();

    const datosSolicitud = {
      rollo_id: rollo.id,
      tipo_operacion: "intercambio",
      observaciones: "Prueba E2E de concurrencia",
    };
    const respuestas = await Promise.all([
      request.post(`${apiUrl}/bodegas/solicitudes`, { headers: headersRicaurte, data: datosSolicitud }),
      request.post(`${apiUrl}/bodegas/solicitudes`, { headers: headersRicaurte, data: datosSolicitud }),
    ]);
    const estados = respuestas.map((respuesta) => respuesta.status()).sort();
    expect(estados).toEqual([201, 409]);

    const creada = respuestas.find((respuesta) => respuesta.status() === 201);
    const solicitud = await creada.json();
    const rechazo = await request.patch(`${apiUrl}/bodegas/solicitudes/${solicitud.id}/rechazar`, {
      headers: headersSantander,
    });
    expect(rechazo.ok(), await rechazo.text()).toBeTruthy();
  });
});
