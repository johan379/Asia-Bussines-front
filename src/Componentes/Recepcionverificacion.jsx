import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

// ============================================================================
// Módulo de Recepción, Verificación y Clasificación automática de material.
// Implementa el flujo descrito en "Prompt_Modulo_Recepcion_Verificacion_
// Clasificacion.docx":
//
//   1) Cargar el Excel del proveedor (bodega = la de la sesión, siempre).
//   2) Leer automáticamente cada fila: rollo, espesor, ancho, net weight,
//      gross weight, coil meters, color TOP/BACK, código de proveedor, tipo
//      de material.
//   3) Cada rollo conserva su identificador único (el que trae el proveedor,
//      ej. 6010905CX) SEPARADO del código de clasificación interno (ej.
//      LA50170,25), que puede repetirse entre varios rollos.
//   4) Clasificación automática: tipo + color + RAL + espesor, usando
//      tablas de equivalencias configurables.
//   5-6) Tablas de equivalencias: colores, tipos de material y espesor
//      (metros por tonelada / peso por metro).
//   7-9) Metros calculados = Net Weight (en toneladas) × MT x TON del
//      espesor. Se compara contra los Coil Meters reportados por el
//      proveedor con un margen de tolerancia configurable.
//   10-11) Resultado individual por rollo y estado general de la recepción.
//   12) Confirmación: registra todo en el inventario (por ahora, en memoria).
//   13) Historial: cada recepción confirmada queda disponible para consulta.
//
// TODO backend: cuando exista API real, este hook debe:
// - Subir el archivo Excel a un endpoint (ej. POST /api/recepciones) y dejar
//   que el backend lo procese, en vez de leerlo en el navegador.
// - Guardar las tablas de equivalencias en el backend (hoy viven en useState
//   y se pierden al recargar), para que sean compartidas entre bodegas.
// - Al confirmar, crear el movimiento de entrada real y actualizar el
//   inventario (hoy solo se guarda en memoria, en "historialRecepciones").
// - Guardar el archivo original en almacenamiento (hoy solo se conserva la
//   referencia del File en memoria, para trazabilidad durante la sesión).
//
// La bodega de destino SIEMPRE es la de la sesión activa (sesion.bodegaId),
// nunca se selecciona manualmente, tal como pide el punto 1 del requerimiento.
// ============================================================================

// ---------------------------------------------------------------------------
// TABLAS DE EQUIVALENCIAS (puntos 5 y 6 del requerimiento)
// Son datos de ejemplo/configuración inicial. Deben poder administrarse
// (agregar/editar) desde la pantalla — ver agregarEquivalenciaColor,
// agregarEquivalenciaTipo y agregarEquivalenciaEspesor más abajo.
// ---------------------------------------------------------------------------

// Equivalencia de colores: código RAL del proveedor -> nombre + código interno.
// Regla (ver "Especificacion_Clasificacion_Codigo_Interno.docx"): el código
// interno de cada color es simplemente su INICIAL (primera letra del
// nombre en mayúscula) — Azul=A, Blanco=B, Negro=N, Gris=G, etc.
const TABLA_COLORES_DEMO = [
  { ral: "RAL5017", nombre: "Azul", codigoInterno: "A" },
  { ral: "RAL9003", nombre: "Blanco", codigoInterno: "B" },
  { ral: "RAL9005", nombre: "Negro", codigoInterno: "N" },
  { ral: "RAL7016", nombre: "Gris", codigoInterno: "G" },
];

// Equivalencia de tipo de material -> código interno.
const TABLA_TIPOS_MATERIAL_DEMO = [{ nombre: "Lamina", codigoInterno: "L" }];

// Equivalencia de espesor -> metros por tonelada y peso por metro.
// Ambos valores son equivalentes entre sí (1 tonelada = 1000 kg), se guardan
// los dos porque el requerimiento los presenta como una sola tabla.
const TABLA_ESPESOR_DEMO = [
  { espesor: 0.2, mtPorTon: 523.77, pesoPorMetro: 1.909 },
  { espesor: 0.21, mtPorTon: 498.83, pesoPorMetro: 2.005 },
  { espesor: 0.22, mtPorTon: 476.15, pesoPorMetro: 2.1 },
  { espesor: 0.25, mtPorTon: 419.02, pesoPorMetro: 2.387 },
  { espesor: 0.3, mtPorTon: 349.18, pesoPorMetro: 2.864 },
  { espesor: 0.32, mtPorTon: 327.36, pesoPorMetro: 3.055 },
  { espesor: 0.4, mtPorTon: 261.89, pesoPorMetro: 3.818 },
  { espesor: 0.5, mtPorTon: 209.5, pesoPorMetro: 4.773 },
  { espesor: 0.7, mtPorTon: 151.6, pesoPorMetro: 6.596 },
];

// Alias de encabezados que el sistema reconoce automáticamente en el Excel
// del proveedor (punto 2 del requerimiento). Se comparan ya normalizados
// (minúsculas, sin tildes).
const ALIAS_CAMPOS = {
  rollo: [
    "codigo",
    "codigo de rollo",
    "numero de rollo",
    "n rollo",
    "no rollo",
    "rollo",
    "identificador de rollo",
    "id rollo",
    "coil",
    "coil no",
  ],
  espesor: ["espesor", "thickness", "calibre"],
  ancho: ["ancho", "width"],
  netWeight: ["net weight", "net weight (mt)", "netweight", "peso neto"],
  grossWeight: ["gross weight", "gross weight (mt)", "grossweight", "peso bruto"],
  coilMeters: ["coil meters", "coil meter", "metros", "metros reportados", "metraje", "mts"],
  colorTop: ["color top", "top", "color superior"],
  colorBack: ["color back", "back", "color inferior"],
  codigoProveedor: ["codigo proveedor", "codigo del proveedor", "supplier code"],
  tipoMaterial: [
    "tipo de material",
    "tipo material",
    "material",
    "informacion del material",
    "descripcion",
  ],
  proveedor: ["proveedor", "empresa proveedora", "supplier"],
  lote: ["lote", "batch"],
};

// Campos que el requerimiento pide sí o sí para poder calcular e identificar
// el rollo (punto 2 y 7). El tipo/color son necesarios para CLASIFICAR, pero
// no bloquean el cálculo de metros si faltan (se muestra sin clasificar).
const CAMPOS_REQUERIDOS = ["rollo", "espesor", "netWeight", "coilMeters"];

const ETIQUETAS_CAMPOS = {
  rollo: "Identificador único del rollo",
  espesor: "Espesor",
  ancho: "Ancho",
  netWeight: "Net Weight (MT)",
  grossWeight: "Gross Weight (MT)",
  coilMeters: "Coil Meters (reportado)",
  colorTop: "Color TOP",
  colorBack: "Color BACK",
  codigoProveedor: "Código del proveedor",
  tipoMaterial: "Información del material / Tipo (opcional si solo manejas Lámina)",
  proveedor: "Proveedor",
  lote: "Lote",
};

const TODOS_LOS_CAMPOS = Object.keys(ETIQUETAS_CAMPOS);

const TOLERANCIA_PORCENTAJE_DEFECTO = 2;

// ---------------------------------------------------------------------------
// IMPORTACIÓN AUTOMÁTICA DE TABLAS DE EQUIVALENCIAS DESDE EL EXCEL (puntos 5 y 6)
// Si el Excel que sube el usuario trae sus propias hojas de equivalencias
// (ej. "Equivalencias" y "Equivalencias color"), el sistema las detecta por
// el nombre de la hoja y las importa automáticamente, en vez de depender solo
// de las tablas de ejemplo quemadas en el código (TABLA_ESPESOR_DEMO, etc.).
// Así cualquier archivo de proveedor con espesores distintos a los de la
// demo (ej. 0.23, 0.27, 0.29...) funciona sin que el usuario tenga que
// agregarlos a mano uno por uno.
// ---------------------------------------------------------------------------

// Alias de encabezados de la hoja de equivalencias de espesor.
const ALIAS_CAMPOS_EQUIVALENCIA_ESPESOR = {
  espesor: ["espesor", "espesor (mm)", "thickness", "calibre"],
  mtPorTon: ["mt x ton", "mt/ton", "metros por tonelada", "mtporton", "mts x ton", "mt por ton"],
  pesoPorMetro: [
    "peso x metro (kg/m)",
    "peso x metro",
    "peso por metro",
    "kg/m",
    "peso por metro (kg/m)",
  ],
  tipoMaterial: ["tipo material", "tipo de material", "material"],
  codigoTipo: ["codigo tipo", "codigo tipo material", "codigo interno"],
};

// Alias de encabezados de la hoja de equivalencias de color.
const ALIAS_CAMPOS_EQUIVALENCIA_COLOR = {
  ral: ["codigo ral", "ral", "codigo del proveedor", "codigo proveedor"],
  nombre: ["color", "nombre"],
  codigoInterno: ["codigo interno", "codigo"],
};

// Busca, entre las hojas del libro de Excel, la que corresponde a la tabla
// de equivalencias de espesor (todas menos la de color) y la de color.
function detectarHojasDeEquivalencias(nombresHojas) {
  const normalizados = nombresHojas.map((n) => ({ original: n, norm: normalizarTexto(n) }));
  const hojaColor = normalizados.find(
    (h) => h.norm.includes("equivalencia") && h.norm.includes("color")
  );
  const hojaEspesor = normalizados.find(
    (h) => h.norm.includes("equivalencia") && !h.norm.includes("color")
  );
  return {
    hojaEspesor: hojaEspesor?.original || null,
    hojaColor: hojaColor?.original || null,
  };
}

// Usando los mismos alias de arriba, adivina a qué columna del Excel
// corresponde cada campo (reutiliza la misma estrategia que autoDetectarMapeo).
function autoDetectarMapeoConAlias(encabezados, aliasCampos) {
  const mapeo = {};
  for (const campo of Object.keys(aliasCampos)) {
    const alias = aliasCampos[campo] || [];
    const encontrado = encabezados.find((enc) => alias.includes(normalizarTexto(enc)));
    mapeo[campo] = encontrado || "";
  }
  return mapeo;
}

// Lee la hoja de equivalencias de espesor del Excel y devuelve las filas de
// espesor (mt x ton / peso x metro) y de tipo de material listas para
// combinarse con las tablas existentes.
function leerHojaEquivalenciaEspesor(hoja) {
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });
  if (filas.length === 0) return { filasEspesor: [], filasTipo: [] };

  const encabezados = Object.keys(filas[0]);
  const mapeo = autoDetectarMapeoConAlias(encabezados, ALIAS_CAMPOS_EQUIVALENCIA_ESPESOR);
  if (!mapeo.espesor) return { filasEspesor: [], filasTipo: [] };

  const filasEspesor = [];
  const filasTipo = [];

  for (const fila of filas) {
    const espesor = numeroDesde(fila[mapeo.espesor]);
    if (espesor === null) continue;

    const mtPorTon = mapeo.mtPorTon ? numeroDesde(fila[mapeo.mtPorTon]) : null;
    const pesoPorMetro = mapeo.pesoPorMetro ? numeroDesde(fila[mapeo.pesoPorMetro]) : null;
    if (mtPorTon !== null || pesoPorMetro !== null) {
      filasEspesor.push({ espesor, mtPorTon, pesoPorMetro });
    }

    const tipoMaterial = mapeo.tipoMaterial ? String(fila[mapeo.tipoMaterial] ?? "").trim() : "";
    const codigoTipo = mapeo.codigoTipo ? String(fila[mapeo.codigoTipo] ?? "").trim() : "";
    if (tipoMaterial && codigoTipo) {
      filasTipo.push({ nombre: tipoMaterial, codigoInterno: codigoTipo });
    }
  }

  return { filasEspesor, filasTipo };
}

// Lee la hoja de equivalencias de color del Excel.
function leerHojaEquivalenciaColor(hoja) {
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });
  if (filas.length === 0) return [];

  const encabezados = Object.keys(filas[0]);
  const mapeo = autoDetectarMapeoConAlias(encabezados, ALIAS_CAMPOS_EQUIVALENCIA_COLOR);
  if (!mapeo.ral) return [];

  const filasColor = [];
  for (const fila of filas) {
    const ral = String(fila[mapeo.ral] ?? "").trim();
    if (!ral) continue;
    const nombre = mapeo.nombre ? String(fila[mapeo.nombre] ?? "").trim() : "";
    const codigoInterno = mapeo.codigoInterno ? String(fila[mapeo.codigoInterno] ?? "").trim() : "";
    if (!codigoInterno) continue;
    filasColor.push({ ral, nombre, codigoInterno });
  }
  return filasColor;
}

// Convierte un texto a minúsculas y sin tildes, para comparar encabezados
// del Excel aunque estén escritos distinto.
function normalizarTexto(texto) {
  return (texto ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Normaliza un código RAL para comparar sin importar espacios, mayúsculas o
// si el usuario escribió el número solo (ej. "5017" en vez de "RAL5017").
function normalizarRal(valor) {
  const limpio = (valor ?? "").toString().toUpperCase().replace(/\s+/g, "");
  if (!limpio) return "";
  return limpio.startsWith("RAL") ? limpio : `RAL${limpio}`;
}

// Intenta adivinar automáticamente qué columna del Excel corresponde a cada
// campo del sistema, usando la lista de alias.
function autoDetectarMapeo(encabezados) {
  const mapeo = {};
  for (const campo of TODOS_LOS_CAMPOS) {
    const alias = ALIAS_CAMPOS[campo] || [];
    const encontrado = encabezados.find((enc) => alias.includes(normalizarTexto(enc)));
    mapeo[campo] = encontrado || "";
  }
  return mapeo;
}

// Convierte un valor de celda de Excel a número, aceptando coma o punto decimal.
function numeroDesde(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const n = Number(String(valor).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function redondear(numero, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round(numero * factor) / factor;
}

// Busca en la tabla de espesores la fila que corresponde al espesor del
// rollo (con una pequeña tolerancia numérica por errores de redondeo).
function buscarEquivalenciaEspesor(espesor, tablaEspesor) {
  if (espesor === null) return null;
  return tablaEspesor.find((e) => Math.abs(e.espesor - espesor) < 0.005) || null;
}

// Busca el código interno de color a partir del RAL que puso el proveedor.
function buscarEquivalenciaColor(colorTop, tablaColores) {
  const ralNormalizado = normalizarRal(colorTop);
  if (!ralNormalizado) return null;
  return tablaColores.find((c) => normalizarRal(c.ral) === ralNormalizado) || null;
}

// Busca el código interno de tipo de material a partir del texto que trae
// el Excel (ej. "Lámina"). Si esa columna no trae un texto que coincida con
// ningún tipo conocido (por ejemplo, porque en realidad trae el código de
// color y no el tipo, como reportó el proveedor) pero en el sistema solo
// hay UN tipo configurado, se usa ese por defecto: no hay ambigüedad
// posible si no existe otra opción entre la cual elegir.
function buscarEquivalenciaTipo(tipoMaterial, tablaTipos) {
  const textoNormalizado = normalizarTexto(tipoMaterial);
  const porNombre = tablaTipos.find((t) => normalizarTexto(t.nombre) === textoNormalizado);
  if (porNombre) return porNombre;
  if (tablaTipos.length === 1) return tablaTipos[0];
  return null;
}

// ----------------------------------------------------------------------
// PUNTO 4 DEL REQUERIMIENTO — Clasificación automática.
// Formato exacto según "Especificacion_Clasificacion_Codigo_Interno.docx":
//   L (Lámina) + Inicial del color + Código RAL + Espesor
// Ejemplo: L + A (Azul) + 5017 + 0,25  →  "LA50170,25"
// Si cambia el RAL o el espesor, el código resultante cambia automáticamente
// (es una nueva clasificación), tal como pide el documento.
// El usuario NUNCA escribe este código a mano: siempre lo arma el sistema.
// ----------------------------------------------------------------------
function clasificarRollo(rollo, tablas) {
  const tipoInfo = buscarEquivalenciaTipo(rollo.tipoMaterial, tablas.tipos);
  const colorInfo = buscarEquivalenciaColor(rollo.colorTop, tablas.colores);

  if (!tipoInfo || !colorInfo || rollo.espesor === null) {
    return { codigoClasificacion: "", clasificado: false, tipoInfo, colorInfo };
  }

  const ralNumero = normalizarRal(rollo.colorTop).replace("RAL", "");
  const espesorTexto = String(rollo.espesor).replace(".", ",");
  const codigoClasificacion = `${tipoInfo.codigoInterno}${colorInfo.codigoInterno}${ralNumero}${espesorTexto}`;

  return { codigoClasificacion, clasificado: true, tipoInfo, colorInfo };
}

// ----------------------------------------------------------------------
// PUNTOS 7, 8 y 9 DEL REQUERIMIENTO: cálculo automático de metros y
// verificación contra lo reportado por el proveedor, con tolerancia.
// Metros calculados = Net Weight (en toneladas) × MT x TON del espesor.
// ----------------------------------------------------------------------
function calcularVerificacionRollo(rollo, tablas, toleranciaPorcentaje) {
  const equivalenciaEspesor = buscarEquivalenciaEspesor(rollo.espesor, tablas.espesor);

  if (!equivalenciaEspesor || rollo.netWeight === null) {
    return {
      ...rollo,
      mtPorTon: null,
      pesoPorMetro: equivalenciaEspesor?.pesoPorMetro ?? null,
      metrosCalculados: null,
      diferencia: null,
      resultado: "faltan_datos",
    };
  }

  const metrosCalculados = rollo.netWeight * equivalenciaEspesor.mtPorTon;
  const diferencia = metrosCalculados - (rollo.coilMeters ?? 0);
  const margenTolerancia = (rollo.coilMeters ?? 0) * (toleranciaPorcentaje / 100);

  let resultado = "correcto";
  if (Math.abs(diferencia) > margenTolerancia) {
    resultado = diferencia > 0 ? "adicional" : "faltante";
  }

  return {
    ...rollo,
    mtPorTon: equivalenciaEspesor.mtPorTon,
    pesoPorMetro: equivalenciaEspesor.pesoPorMetro,
    metrosCalculados: redondear(metrosCalculados),
    diferencia: redondear(diferencia),
    resultado,
  };
}

// Combina clasificación + cálculo de metros para un rollo recién leído
// del Excel (una sola pasada, para no repetir las búsquedas en las tablas).
function procesarRollo(rolloBase, tablas, toleranciaPorcentaje) {
  const { codigoClasificacion, clasificado } = clasificarRollo(rolloBase, tablas);
  const conCalculo = calcularVerificacionRollo(rolloBase, tablas, toleranciaPorcentaje);
  return {
    ...conCalculo,
    codigoClasificacion,
    clasificado,
    // Un rollo se marca "nuevo" cuando su combinación tipo/color todavía no
    // está configurada en las tablas de equivalencias (punto 5): eso es lo
    // que realmente hay que "dar de alta" para poder clasificarlo.
    esMaterialNuevo: !clasificado,
  };
}

let siguienteIdRecepcion = 1;

// Hook principal del módulo de Recepción, Verificación y Clasificación.
// Controla los 4 pasos: cargar archivo, mapear columnas, verificar/clasificar
// y confirmar.
export function useControladorRecepcion(sesion) {
  const [paso, setPaso] = useState("carga"); // carga | mapeo | verificacion
  const [nombreArchivo, setNombreArchivo] = useState("");
  // Se conserva la referencia al archivo original para trazabilidad
  // (punto 1 del requerimiento). Cuando exista backend, este File se sube
  // tal cual al endpoint de recepciones.
  const [archivoOriginal, setArchivoOriginal] = useState(null);
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");

  const [encabezados, setEncabezados] = useState([]);
  const [filasCrudas, setFilasCrudas] = useState([]);
  const [mapeoColumnas, setMapeoColumnas] = useState({});

  const [toleranciaPorcentaje, setToleranciaPorcentaje] = useState(TOLERANCIA_PORCENTAJE_DEFECTO);

  // -------------------- Tablas de equivalencias (puntos 5 y 6) --------------------
  // Viven en el estado del hook para que sean editables desde la pantalla.
  // TODO backend: persistir en el servidor para que las use toda la empresa,
  // no solo esta sesión del navegador.
  const [tablaColores, setTablaColores] = useState(TABLA_COLORES_DEMO);
  const [tablaTipos, setTablaTipos] = useState(TABLA_TIPOS_MATERIAL_DEMO);
  const [tablaEspesor, setTablaEspesor] = useState(TABLA_ESPESOR_DEMO);

  const tablas = useMemo(
    () => ({ colores: tablaColores, tipos: tablaTipos, espesor: tablaEspesor }),
    [tablaColores, tablaTipos, tablaEspesor]
  );

  // Mensaje informativo: cuántas equivalencias se importaron automáticamente
  // desde las hojas del Excel del proveedor (si las trae), para que el
  // usuario sepa por qué las tablas cambiaron al cargar el archivo.
  const [notaImportacionEquivalencias, setNotaImportacionEquivalencias] = useState("");

  const [busquedaClasificacion, setBusquedaClasificacion] = useState("");

  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState("");
  const [estadoFinal, setEstadoFinal] = useState(null); // null hasta confirmar

  const [historialRecepciones, setHistorialRecepciones] = useState([]);

  // -------------------- Paso 1: cargar archivo --------------------
  // Lee el archivo Excel que sube el usuario y lo convierte en filas de datos.
  async function cargarArchivo(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    setErrorArchivo("");
    setProcesandoArchivo(true);
    setNombreArchivo(archivo.name);
    setArchivoOriginal(archivo);

    try {
      const datos = await archivo.arrayBuffer();
      const libro = XLSX.read(datos, { type: "array" });

      // Detecta si el Excel trae sus propias hojas de equivalencias
      // (ej. "Equivalencias" y "Equivalencias color"); si las trae, la hoja
      // de datos del proveedor es la que sobra, no necesariamente la primera.
      const { hojaEspesor, hojaColor } = detectarHojasDeEquivalencias(libro.SheetNames);
      const nombreHojaRollos =
        libro.SheetNames.find((n) => n !== hojaEspesor && n !== hojaColor) || libro.SheetNames[0];

      const hoja = libro.Sheets[nombreHojaRollos];
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

      if (filas.length === 0) {
        setErrorArchivo("El archivo no contiene filas de datos.");
        setProcesandoArchivo(false);
        return;
      }

      // Importa automáticamente las tablas de equivalencias que traiga el
      // Excel (si las trae), agregando o actualizando cada fila sobre las
      // tablas ya configuradas — así no se pierde nada que se haya
      // administrado a mano, y lo que traiga el archivo queda al día.
      let equivalenciasEspesorImportadas = 0;
      let equivalenciasColorImportadas = 0;

      if (hojaEspesor) {
        const { filasEspesor, filasTipo } = leerHojaEquivalenciaEspesor(libro.Sheets[hojaEspesor]);
        for (const fila of filasEspesor) {
          agregarEquivalenciaEspesor(String(fila.espesor), {
            mtPorTonTexto: fila.mtPorTon !== null ? String(fila.mtPorTon) : "",
            pesoPorMetroTexto: fila.pesoPorMetro !== null ? String(fila.pesoPorMetro) : "",
          });
        }
        for (const fila of filasTipo) {
          agregarEquivalenciaTipo(fila.nombre, fila.codigoInterno);
        }
        equivalenciasEspesorImportadas = filasEspesor.length;
      }

      if (hojaColor) {
        const filasColor = leerHojaEquivalenciaColor(libro.Sheets[hojaColor]);
        for (const fila of filasColor) {
          agregarEquivalenciaColor(fila.ral, fila.nombre, fila.codigoInterno);
        }
        equivalenciasColorImportadas = filasColor.length;
      }

      if (equivalenciasEspesorImportadas > 0 || equivalenciasColorImportadas > 0) {
        const partes = [];
        if (equivalenciasEspesorImportadas > 0) {
          partes.push(`${equivalenciasEspesorImportadas} de espesor`);
        }
        if (equivalenciasColorImportadas > 0) {
          partes.push(`${equivalenciasColorImportadas} de color`);
        }
        setNotaImportacionEquivalencias(
          `Se importaron equivalencias del archivo: ${partes.join(" y ")}.`
        );
      } else {
        setNotaImportacionEquivalencias("");
      }

      const encabezadosDetectados = Object.keys(filas[0]);
      setEncabezados(encabezadosDetectados);
      setFilasCrudas(filas);
      setMapeoColumnas(autoDetectarMapeo(encabezadosDetectados));
      setEstadoFinal(null);
      setPaso("mapeo");
    } catch (err) {
      setErrorArchivo(
        "No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx o .xls)."
      );
    } finally {
      setProcesandoArchivo(false);
      // Permite volver a seleccionar el mismo archivo si el usuario lo corrige.
      evento.target.value = "";
    }
  }

  // -------------------- Paso 2: mapeo de columnas --------------------
  function actualizarMapeoColumna(campoSistema, encabezadoElegido) {
    setMapeoColumnas((actual) => ({ ...actual, [campoSistema]: encabezadoElegido }));
  }

  const faltanCamposRequeridos = CAMPOS_REQUERIDOS.some((campo) => !mapeoColumnas[campo]);

  function confirmarMapeo() {
    if (faltanCamposRequeridos) return;
    setPaso("verificacion");
  }

  function volverAMapeo() {
    setPaso("mapeo");
  }

  // -------------------- Paso 3: verificación y clasificación --------------------
  // Cada rollo se recalcula automáticamente (useMemo) cada vez que cambian las
  // filas crudas, el mapeo de columnas, las tablas de equivalencias o la
  // tolerancia. Así no hay que "recalcular a mano" en cada función, como
  // pasaba antes: siempre es una única fuente de verdad derivada.
  const rollosCompletos = useMemo(() => {
    if (paso === "carga" || filasCrudas.length === 0) return [];

    return filasCrudas.map((fila, indice) => {
      const leerCampo = (campo) => (mapeoColumnas[campo] ? fila[mapeoColumnas[campo]] : "");

      const rolloBase = {
        id: indice + 1,
        rollo: String(leerCampo("rollo") ?? "").trim(),
        espesor: numeroDesde(leerCampo("espesor")),
        ancho: numeroDesde(leerCampo("ancho")),
        netWeight: numeroDesde(leerCampo("netWeight")),
        grossWeight: numeroDesde(leerCampo("grossWeight")),
        coilMeters: numeroDesde(leerCampo("coilMeters")),
        colorTop: String(leerCampo("colorTop") ?? "").trim(),
        colorBack: String(leerCampo("colorBack") ?? "").trim(),
        codigoProveedor: String(leerCampo("codigoProveedor") ?? "").trim(),
        tipoMaterial: String(leerCampo("tipoMaterial") ?? "").trim(),
        proveedor: String(leerCampo("proveedor") ?? "").trim(),
        lote: String(leerCampo("lote") ?? "").trim(),
      };

      return procesarRollo(rolloBase, tablas, toleranciaPorcentaje);
    });
  }, [filasCrudas, mapeoColumnas, tablas, toleranciaPorcentaje, paso]);

  // Punto 3 del requerimiento: al buscar un código de clasificación, se deben
  // mostrar todos los rollos asociados a ese código. Este filtro también
  // permite buscar directamente por el identificador único del rollo.
  const rollos = useMemo(() => {
    if (!busquedaClasificacion.trim()) return rollosCompletos;
    const texto = normalizarTexto(busquedaClasificacion);
    return rollosCompletos.filter(
      (r) =>
        normalizarTexto(r.codigoClasificacion).includes(texto) ||
        normalizarTexto(r.rollo).includes(texto)
    );
  }, [rollosCompletos, busquedaClasificacion]);

  function actualizarTolerancia(valorTexto) {
    const valor = numeroDesde(valorTexto);
    if (valor === null || valor < 0) return;
    setToleranciaPorcentaje(valor);
  }

  // -------------------- Administración de tablas de equivalencias --------------------
  // Estas 3 funciones son las que cumplen el punto 5/6 del requerimiento:
  // "las tablas de equivalencias deben poder ser administradas por usuarios
  // autorizados para agregar, editar o modificar códigos".
  // Agrega/edita un color de la tabla de equivalencias. Por regla del
  // documento de clasificación, la inicial del color SIEMPRE es la primera
  // letra de su nombre (Azul→A, Negro→N, Gris→G...), así que si no se
  // escribe un código a mano, el sistema lo calcula solo a partir del
  // nombre. Esto evita códigos inventados o inconsistentes.
  function agregarEquivalenciaColor(ral, nombre, codigoInterno) {
    const ralNormalizado = normalizarRal(ral);
    const inicialAutomatica = (nombre ?? "").trim().charAt(0).toUpperCase();
    const codigo = (codigoInterno ?? "").trim().toUpperCase() || inicialAutomatica;
    if (!ralNormalizado || !codigo) return;
    setTablaColores((actual) => {
      const existe = actual.some((c) => normalizarRal(c.ral) === ralNormalizado);
      if (existe) {
        return actual.map((c) =>
          normalizarRal(c.ral) === ralNormalizado ? { ral: ralNormalizado, nombre, codigoInterno: codigo } : c
        );
      }
      return [...actual, { ral: ralNormalizado, nombre, codigoInterno: codigo }];
    });
  }

  function agregarEquivalenciaTipo(nombre, codigoInterno) {
    const textoNormalizado = normalizarTexto(nombre);
    if (!textoNormalizado || !codigoInterno) return;
    setTablaTipos((actual) => {
      const existe = actual.some((t) => normalizarTexto(t.nombre) === textoNormalizado);
      if (existe) {
        return actual.map((t) =>
          normalizarTexto(t.nombre) === textoNormalizado ? { nombre, codigoInterno } : t
        );
      }
      return [...actual, { nombre, codigoInterno }];
    });
  }

  // Agrega/edita una fila de la tabla de espesores. Se puede indicar
  // directamente "Metros por tonelada" o el "Peso por metro (kg/m)"; el
  // sistema calcula el otro valor automáticamente (son equivalentes:
  // 1 tonelada = 1000 kg).
  function agregarEquivalenciaEspesor(espesorTexto, { mtPorTonTexto, pesoPorMetroTexto }) {
    const espesor = numeroDesde(espesorTexto);
    if (espesor === null) return;

    let mtPorTon = numeroDesde(mtPorTonTexto);
    let pesoPorMetro = numeroDesde(pesoPorMetroTexto);

    if (mtPorTon === null && pesoPorMetro !== null && pesoPorMetro > 0) {
      mtPorTon = redondear(1000 / pesoPorMetro);
    } else if (pesoPorMetro === null && mtPorTon !== null && mtPorTon > 0) {
      pesoPorMetro = redondear(1000 / mtPorTon);
    }

    if (mtPorTon === null || pesoPorMetro === null) return;

    setTablaEspesor((actual) => {
      const existe = actual.some((e) => Math.abs(e.espesor - espesor) < 0.005);
      if (existe) {
        return actual.map((e) =>
          Math.abs(e.espesor - espesor) < 0.005 ? { espesor, mtPorTon, pesoPorMetro } : e
        );
      }
      return [...actual, { espesor, mtPorTon, pesoPorMetro }].sort((a, b) => a.espesor - b.espesor);
    });
  }

  // Resumen de resultados por rollo (punto 10), usado para las tarjetas de
  // conteo en pantalla.
  const resumenVerificacion = useMemo(() => {
    return {
      total: rollos.length,
      correctos: rollos.filter((r) => r.resultado === "correcto").length,
      faltantes: rollos.filter((r) => r.resultado === "faltante").length,
      adicionales: rollos.filter((r) => r.resultado === "adicional").length,
      pendientesDatos: rollos.filter((r) => r.resultado === "faltan_datos").length,
      materialesNuevos: rollos.filter((r) => r.esMaterialNuevo).length,
    };
  }, [rollos]);

  // Punto 11: estado general de la recepción.
  const estadoRecepcion = useMemo(() => {
    if (paso !== "verificacion") return "pendiente_verificacion";
    if (estadoFinal) return estadoFinal;
    if (rollosCompletos.length === 0) return "pendiente_verificacion";
    if (rollosCompletos.some((r) => r.resultado === "faltan_datos")) return "pendiente_verificacion";
    if (rollosCompletos.some((r) => r.resultado === "faltante" || r.resultado === "adicional")) {
      return "verificada_con_diferencias";
    }
    return "verificada_sin_diferencias";
  }, [paso, estadoFinal, rollosCompletos]);

  const puedeConfirmar =
    rollosCompletos.length > 0 &&
    resumenVerificacion.pendientesDatos === 0 &&
    !confirmando &&
    estadoFinal !== "registrada_en_inventario";

  // -------------------- Paso 4: confirmar recepción --------------------
  // Punto 12 del requerimiento: registra los rollos en el inventario con
  // toda la trazabilidad (código interno, código único, bodega, metros
  // reportados/calculados, diferencia, resultado, TOP/BACK, proveedor,
  // fecha y archivo original).
  async function confirmarRecepcion() {
    if (!puedeConfirmar) return;

    setConfirmando(true);
    setErrorConfirmacion("");

    try {
      // TODO backend: reemplazar esto por POST /api/recepciones con el
      // archivoOriginal, los rollos y sesion.bodegaId; el backend debe crear
      // el movimiento de entrada y actualizar el stock real.
      await new Promise((resolve) => setTimeout(resolve, 500));

      const proveedorPrincipal =
        rollosCompletos.find((r) => r.proveedor)?.proveedor || "No especificado";

      const recepcionConfirmada = {
        id: siguienteIdRecepcion++,
        fecha: new Date().toISOString(),
        bodegaId: sesion?.bodegaId ?? null,
        bodega: sesion?.bodegaNombre || "—",
        encargado: sesion?.correo || "—",
        proveedor: proveedorPrincipal,
        archivoOrigen: nombreArchivo,
        tolerancia: toleranciaPorcentaje,
        resumen: resumenVerificacion,
        rollos: rollosCompletos,
        estado: "registrada_en_inventario",
      };

      setHistorialRecepciones((actual) => [recepcionConfirmada, ...actual]);
      setEstadoFinal("registrada_en_inventario");
    } catch (err) {
      setErrorConfirmacion("No se pudo confirmar la recepción. Intenta de nuevo.");
    } finally {
      setConfirmando(false);
    }
  }

  // Reinicia todo el proceso para cargar un nuevo archivo desde cero.
  function iniciarNuevaRecepcion() {
    setPaso("carga");
    setNombreArchivo("");
    setArchivoOriginal(null);
    setErrorArchivo("");
    setEncabezados([]);
    setFilasCrudas([]);
    setMapeoColumnas({});
    setBusquedaClasificacion("");
    setEstadoFinal(null);
    setErrorConfirmacion("");
    setNotaImportacionEquivalencias("");
  }

  return {
    // Paso 1 — carga
    paso,
    nombreArchivo,
    procesandoArchivo,
    errorArchivo,
    cargarArchivo,
    notaImportacionEquivalencias,

    // Paso 2 — mapeo
    encabezados,
    mapeoColumnas,
    actualizarMapeoColumna,
    confirmarMapeo,
    faltanCamposRequeridos,
    volverAMapeo,
    CAMPOS_REQUERIDOS,
    ETIQUETAS_CAMPOS,
    TODOS_LOS_CAMPOS,

    // Paso 3 — verificación y clasificación
    rollos,
    busquedaClasificacion,
    setBusquedaClasificacion,
    toleranciaPorcentaje,
    actualizarTolerancia,
    resumenVerificacion,
    estadoRecepcion,

    // Tablas de equivalencias (administrables)
    tablaColores,
    tablaTipos,
    tablaEspesor,
    agregarEquivalenciaColor,
    agregarEquivalenciaTipo,
    agregarEquivalenciaEspesor,

    // Paso 4 — confirmación
    confirmarRecepcion,
    confirmando,
    errorConfirmacion,
    puedeConfirmar,
    iniciarNuevaRecepcion,

    // Historial de recepciones (de esta sesión, en memoria)
    historialRecepciones,
  };
}