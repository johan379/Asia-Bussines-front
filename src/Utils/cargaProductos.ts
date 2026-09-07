export const CAMPOS_REQUERIDOS_CARGA_PRODUCTOS = ["codigo", "descripcion", "stock"];
export const ETIQUETAS_CAMPOS_CARGA_PRODUCTOS = {
  codigo: "Código", referencia: "Referencia (opcional)", descripcion: "Descripción",
  calibre: "Calibre (opcional)", entrada: "Entrada (opcional)", stock: "Cantidad / Stock",
  familia: "Familia (opcional)",
};
export const TODOS_LOS_CAMPOS_CARGA_PRODUCTOS = Object.keys(ETIQUETAS_CAMPOS_CARGA_PRODUCTOS);
