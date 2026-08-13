export function claseColorMaterial(color) {
  const normalizado = String(color || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const colores = {
    azul: "azul",
    blanco: "blanco",
    negro: "negro",
    rojo: "rojo",
    verde: "verde",
    amarillo: "amarillo",
    gris: "gris",
    plata: "plata",
    natural: "natural",
  };

  return colores[normalizado] || "otro";
}
