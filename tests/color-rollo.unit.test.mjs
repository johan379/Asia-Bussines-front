import assert from "node:assert/strict";
import test from "node:test";
import { claseColorMaterial } from "../src/Utils/colorRollo.ts";

test("unidad: asigna clases correctas para colores conocidos", () => {
  assert.equal(claseColorMaterial("Azul"), "azul");
  assert.equal(claseColorMaterial("BLANCO"), "blanco");
  assert.equal(claseColorMaterial("negro"), "negro");
  assert.equal(claseColorMaterial("Rojo"), "rojo");
});

test("unidad: normaliza espacios y tildes en el color", () => {
  assert.equal(claseColorMaterial("  Gris  "), "gris");
  assert.equal(claseColorMaterial("Platá"), "plata");
});

test("unidad: usa estilo alterno para color vacío o desconocido", () => {
  assert.equal(claseColorMaterial(""), "otro");
  assert.equal(claseColorMaterial(null), "otro");
  assert.equal(claseColorMaterial("Cobre"), "otro");
});
