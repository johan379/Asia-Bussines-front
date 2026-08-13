import * as XLSX from "xlsx";

export function exportarArregloAExcel(datos, nombreArchivo = "Reporte_Inventario.xlsx", nombreHoja = "Reporte") {
  if (!datos || datos.length === 0) return;

  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  XLSX.writeFile(libro, nombreArchivo);
}
