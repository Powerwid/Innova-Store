import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  completarPagoAutomatico,
  pagoPredeterminado,
} from "../src/modules/operaciones/pagos-compra.ts";

const medios = [
  { idMedioPago: 3, nombre: "Yape" },
  { idMedioPago: 99, nombre: "Fraccionado" },
  { idMedioPago: 1, nombre: "Efectivo" },
];

describe("Pagos predeterminados de compras", () => {
  it("abre efectivo con el saldo completo, aunque no sea el primero del catálogo", () => {
    assert.deepStrictEqual(pagoPredeterminado(medios, 203.5), [
      { idMedioPago: 1, monto: "203.50" },
    ]);
  });
  it("usa un medio real si no hay efectivo y maneja un catálogo vacío", () => {
    assert.deepStrictEqual(pagoPredeterminado(medios.slice(0, 2), 10), [
      { idMedioPago: 3, monto: "10.00" },
    ]);
    assert.deepStrictEqual(pagoPredeterminado([medios[1]!], 10), []);
  });
  it("actualiza el importe al agregar productos y conserva el medio seleccionado", () => {
    assert.deepStrictEqual(
      completarPagoAutomatico(
        [{ idMedioPago: 3, monto: "161.50" }],
        203.5,
        true,
      ),
      [{ idMedioPago: 3, monto: "203.50" }],
    );
  });
  it("conserva un pago parcial introducido por el usuario", () => {
    const pago = [{ idMedioPago: 1, monto: "30.00" }];
    assert.strictEqual(completarPagoAutomatico(pago, 203.5, false), pago);
  });
  it("conserva la distribución en varios medios y permite una compra sin pago inicial", () => {
    const pagos = [
      { idMedioPago: 1, monto: "30.00" },
      { idMedioPago: 3, monto: "173.50" },
    ];
    assert.strictEqual(completarPagoAutomatico(pagos, 203.5, true), pagos);
    assert.deepStrictEqual(completarPagoAutomatico([], 203.5, true), []);
  });
});
