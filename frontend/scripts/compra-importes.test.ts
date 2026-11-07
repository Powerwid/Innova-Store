import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pagoValido,
  totalCompraCentavos,
  totalPagosCentavos,
} from "../src/modules/operaciones/compra-importes.ts";
describe("Importes de una nueva compra", () => {
  const detalles = [
    { cantidad: "37", precioUnitario: "3" },
    { cantidad: "13", precioUnitario: "1.5" },
    { cantidad: "31", precioUnitario: "1" },
  ];
  it("acepta pagos completos repartidos entre varios medios", () => {
    assert.strictEqual(
      totalPagosCentavos([{ monto: "111.00" }, { monto: "50.50" }]),
      totalCompraCentavos(detalles),
    );
  });
  it("rechaza un exceso real de un centavo", () => {
    assert.strictEqual(
      totalPagosCentavos([{ monto: "161.51" }]) > totalCompraCentavos(detalles),
      true,
    );
  });
  it("acepta el total visible cuando hay fracciones de centavo", () => {
    // Antes: 1 × 1.006 = 1.006, visible 1.01, pero 1.01 > 1.006 + .001.
    assert.strictEqual(
      totalCompraCentavos([{ cantidad: "1", precioUnitario: "1.006" }]),
      101n,
    );
    assert.strictEqual(
      totalCompraCentavos([{ cantidad: "2", precioUnitario: "0.0075" }]),
      2n,
    );
  });
  it("redondea después de sumar, usando la precisión enviada al servidor", () => {
    assert.strictEqual(
      totalCompraCentavos([
        { cantidad: "1", precioUnitario: "0.004" },
        { cantidad: "1", precioUnitario: "0.004" },
      ]),
      1n,
    );
    assert.strictEqual(
      totalCompraCentavos([{ cantidad: "0.333", precioUnitario: "3" }]),
      100n,
    );
    assert.strictEqual(
      totalCompraCentavos([{ cantidad: "1.00049", precioUnitario: "1.00494" }]),
      100n,
    );
  });
  for (const monto of ["", "-1", "NaN", "Infinity", "0", "1.001"])
    it(`rechaza un pago inválido: ${monto}`, () => {
      assert.strictEqual(pagoValido(monto), false);
    });
});
