import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope, ref } from 'vue'
import type {
  Almacen,
  Inventario,
  ProductoSucursal,
} from '../src/modules/logistica/logistica.types.ts'
import { draftTotal, usePosDrafts, type PosLine } from '../src/modules/pos/pos-drafts.ts'
import { parseQuantityInput, quantityInputUnit, quantityInputValue, quantityStep } from '../src/shared/utils/product-quantity.ts'
import {
  posLineCatalogIssue,
  posStockByProduct,
  resolvePosWarehouse,
} from '../src/modules/pos/pos-inventory.ts'

const createdAt = '2026-10-12T18:44:25.000Z'
const previousDate = '2026-10-08T18:44:25.000Z'
function warehouse(idAlmacen: number, tipo: Almacen['tipo'], nombre: string): Almacen {
  return {
    idAlmacen,
    tipo,
    nombre,
    idSucursal: 1,
    estado: true,
    direccion: null,
    createdAt,
    updatedAt: createdAt,
  }
}
function product(id: number, nombre: string, precioVenta: string): ProductoSucursal {
  return {
    idProductoSucursal: id,
    idProducto: id,
    idSucursal: 1,
    precioCompra: '10.00',
    precioVenta,
    estado: true,
    sucursal: { idSucursal: 1, nombre: 'Sucursal Principal' },
    producto: {
      idProducto: id,
      idTipoProducto: 1,
      idCategoria: 1,
      idUnidadMedida: 1,
      nombre,
      detalle: null,
      codigoBarras: null,
      imagen: null,
      estado: true,
      createdAt,
      updatedAt: createdAt,
      categoria: {
        idCategoria: 1,
        nombre: 'Frescos',
        color: null,
        estado: true,
        createdAt,
        updatedAt: createdAt,
      },
      tipoProducto: {
        idTipoProducto: 1,
        nombre: 'Fresco',
        estado: true,
        createdAt,
        updatedAt: createdAt,
      },
      unidadMedida: {
        idUnidadMedida: 1,
        nombre: 'Kilogramo',
        simbolo: 'KG',
        estado: true,
        createdAt,
        updatedAt: createdAt,
      },
    },
  }
}
function inventory(
  productoSucursal: ProductoSucursal,
  almacen: Almacen,
  stock: string,
): Inventario {
  return {
    idInventario: productoSucursal.idProductoSucursal * 10 + almacen.idAlmacen,
    idProductoSucursal: productoSucursal.idProductoSucursal,
    idAlmacen: almacen.idAlmacen,
    idSucursal: 1,
    stock,
    stockMinimo: '2.000',
    productoSucursal,
    almacen,
    createdAt,
    updatedAt: createdAt,
  }
}
const counter = warehouse(1, 'AREA_VENTA', 'Mostrador')
const depot = warehouse(2, 'ALMACEN', 'Depósito')
const chicken = product(3, 'Pollo fresco', '13.90')
const breast = product(23, 'Pechuga de pollo', '18.50')
const products = [chicken, breast]
const warehouses = [depot, counter]
const inventories = [
  inventory(chicken, counter, '60'),
  inventory(breast, counter, '50.25'),
  inventory(chicken, depot, '120'),
]

test('250 gramos se cobran como 0.250 kg y descuentan exactamente ese peso', () => {
  const parsed = parseQuantityInput('250', 'KG')
  assert.equal(parsed.ok, true)
  if (!parsed.ok) throw new Error(parsed.error)
  const quantity = parsed.quantity
  assert.equal(quantity, 0.25)
  assert.equal(quantity.toFixed(3), '0.250') // Payload esperado por la API.
  assert.equal(quantity * 29, 7.25)
  assert.equal(Number((60 - quantity).toFixed(3)), 59.75)
  assert.equal(quantityInputValue(quantity, 'KG'), '250')
  assert.equal(quantityInputUnit('KG'), 'g')
  const draft = { lines: [line({ quantity, price: 29 })] } as Parameters<typeof draftTotal>[0]
  assert.equal(draftTotal(draft), 7.25)
})

test('editar gramos varias veces no vuelve a dividir la cantidad almacenada', () => {
  let quantity = 1.375 // Carrito anterior, guardado en kg.
  for (let index = 0; index < 20; index++) {
    const parsed = parseQuantityInput(quantityInputValue(quantity, 'kg'), 'kg')
    assert.equal(parsed.ok, true)
    if (parsed.ok) quantity = parsed.quantity
  }
  assert.equal(quantity, 1.375)
  assert.equal(quantityInputValue(quantity, 'KG'), '1375')
  assert.equal(quantityStep('KG'), 0.1) // Los botones agregan o restan 100 g.
})

test('un gramo respeta la precisión del stock y no se aceptan fracciones de gramo', () => {
  const parsed = parseQuantityInput('1', 'KG')
  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.quantity.toFixed(3), '0.001')
    assert.ok(parsed.quantity > 0)
    assert.equal(parsed.quantity <= 0.001, true)
    assert.equal(parsed.quantity <= 0, false)
  }
  for (const input of ['', '0', '-250', '0.250', '0,250', '250.5', '1e3', 'NaN', '100000000000000']) {
    assert.equal(parseQuantityInput(input, 'KG').ok, false, input)
  }
  assert.equal(parseQuantityInput('99999999999999', 'KG').ok, true)
})

test('las unidades y los metros conservan su cantidad y admiten coma decimal', () => {
  assert.deepEqual(parseQuantityInput('1,5', 'M'), { ok: true, quantity: 1.5 })
  assert.deepEqual(parseQuantityInput('0.125', 'M'), { ok: true, quantity: 0.125 })
  assert.deepEqual(parseQuantityInput('2', 'UND'), { ok: true, quantity: 2 })
  assert.equal(quantityInputValue(1.5, 'M'), '1.5')
  assert.equal(quantityInputUnit('M'), 'M')
  assert.equal(quantityStep('M'), 1)
  assert.equal(parseQuantityInput('1.1234', 'M').ok, false)
})
function line(overrides: Partial<PosLine> = {}): PosLine {
  return {
    productId: chicken.idProductoSucursal,
    name: chicken.producto.nombre,
    productCreatedAt: createdAt,
    warehouseId: counter.idAlmacen,
    warehouseCreatedAt: createdAt,
    unit: 'KG',
    quantity: 2,
    price: 13.9,
    ...overrides,
  }
}

test('un carrito con un almacén eliminado muestra las existencias actuales de Mostrador', () => {
  const selected = resolvePosWarehouse(warehouses, 99)
  assert.equal(selected?.idAlmacen, 1)
  const stocks = posStockByProduct(inventories, selected?.idAlmacen ?? null)
  assert.equal(stocks.get(chicken.idProductoSucursal), 60)
  assert.equal(stocks.get(breast.idProductoSucursal), 50.25)
  // Mostrar el catálogo actual no convierte las líneas antiguas en ventas válidas.
  const savedLine = line({ warehouseId: 99 })
  assert.match(posLineCatalogIssue(savedLine, products, warehouses), /Almacén no disponible/)
  assert.equal(savedLine.warehouseId, 99)
})

test('sin carrito se prioriza el área de venta y se conserva un almacén vigente seleccionado', () => {
  assert.equal(resolvePosWarehouse(warehouses, null)?.idAlmacen, 1)
  const selected = resolvePosWarehouse(warehouses, 2)
  assert.equal(selected?.idAlmacen, 2)
  const stocks = posStockByProduct(inventories, selected?.idAlmacen ?? null)
  assert.equal(stocks.get(chicken.idProductoSucursal), 120)
  assert.equal(stocks.get(breast.idProductoSucursal) ?? 0, 0)
})

test('un almacén desactivado no oculta stock y una sucursal sin almacenes no inventa existencias', () => {
  assert.equal(resolvePosWarehouse([{ ...depot, estado: false }, counter], 2)?.idAlmacen, 1)
  assert.equal(resolvePosWarehouse([], 99), null)
  assert.equal(posStockByProduct(inventories, null).size, 0)
})

test('los IDs reutilizados después de resetear no permiten cobrar productos o almacenes distintos', () => {
  assert.match(
    posLineCatalogIssue(line({ productCreatedAt: previousDate }), products, warehouses),
    /producto guardado cambió/,
  )
  assert.match(
    posLineCatalogIssue(line({ warehouseCreatedAt: previousDate }), products, warehouses),
    /almacén guardado cambió/,
  )
  assert.equal(posLineCatalogIssue(line(), products, warehouses), '')
})

test('las líneas anteriores sin fechas se validan por nombre, unidad y precio', () => {
  const legacy = line({ productCreatedAt: undefined, warehouseCreatedAt: undefined })
  assert.equal(posLineCatalogIssue(legacy, products, warehouses), '')
  assert.match(
    posLineCatalogIssue({ ...legacy, name: 'DEMO LOG - Pollo fresco' }, products, warehouses),
    /producto guardado cambió/,
  )
  assert.match(
    posLineCatalogIssue({ ...legacy, unit: 'UND' }, products, warehouses),
    /producto guardado cambió/,
  )
  assert.match(posLineCatalogIssue({ ...legacy, price: 10 }, products, warehouses), /precio cambió/)
})

test('un refresco de stock no invalida las líneas vigentes y los productos inactivos siguen bloqueados', () => {
  assert.equal(posLineCatalogIssue(line(), products, warehouses), '')
  assert.equal(posStockByProduct([inventory(chicken, counter, '55.5')], 1).get(3), 55.5)
  assert.match(
    posLineCatalogIssue(line(), [{ ...chicken, estado: false }], warehouses),
    /Producto no disponible/,
  )
})

test('recuperar una sesión antigua conserva sus cantidades y permite consultar el catálogo actual', (context) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const savedLine = line({
    name: 'DEMO LOG - Pollo fresco',
    warehouseId: 99,
    productCreatedAt: undefined,
    warehouseCreatedAt: undefined,
  })
  const stored = new Map([
    [
      'innova-store:pos:v1:1:1',
      JSON.stringify({
        version: 1,
        activeId: 'saved-sale',
        nextNumber: 2,
        drafts: [
          {
            id: 'saved-sale',
            number: 1,
            reference: '',
            clientId: null,
            clientName: '',
            note: '',
            warehouseId: 99,
            onHold: false,
            openedAt: previousDate,
            lines: [savedLine],
          },
        ],
      }),
    ],
  ])
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  })
  const scope = effectScope()
  context.after(() => {
    scope.stop()
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  })
  const session = scope.run(() => usePosDrafts(ref<number | undefined>(1), ref<number | null>(1)))!
  assert.equal(session.storageError.value, '')
  assert.equal(session.active.value?.lines[0]?.quantity, 2)
  assert.equal(session.active.value?.lines[0]?.name, 'DEMO LOG - Pollo fresco')
  assert.match(
    posLineCatalogIssue(session.active.value!.lines[0]!, products, warehouses),
    /producto guardado cambió/,
  )
  const selected = resolvePosWarehouse(warehouses, session.active.value!.warehouseId)
  assert.equal(posStockByProduct(inventories, selected!.idAlmacen).get(3), 60)
  session.create(selected!.idAlmacen)
  assert.equal(session.active.value?.warehouseId, 1)
  assert.equal(session.active.value?.lines.length, 0)
  assert.equal(session.waiting.value.length, 1)
  assert.equal(session.waiting.value[0]?.lines[0]?.quantity, 2)
  session.numberActive()
  assert.equal(session.active.value?.number, 2)
})

test('el POS crea y recupera carritos por HTTP local sin crypto.randomUUID', (context) => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
  const stored = new Map<string, string>()
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues },
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  })
  const scope = effectScope()
  context.after(() => {
    scope.stop()
    if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
    else Reflect.deleteProperty(globalThis, 'crypto')
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  })
  const session = scope.run(() => usePosDrafts(ref<number | undefined>(1), ref<number | null>(1)))!
  session.create(1)
  const firstId = session.active.value!.id
  assert.match(firstId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.equal(session.active.value?.number, 0)
  session.create(1)
  assert.equal(session.active.value?.id, firstId)
  assert.equal(session.drafts.value.length, 1)
  session.active.value!.lines.push(line({ quantity: 0.25 }))
  session.numberActive()
  session.create(1)
  assert.notEqual(session.active.value?.id, firstId)
  assert.equal(session.active.value?.number, 0)
  assert.equal(session.waiting.value[0]?.id, firstId)
  assert.equal(session.waiting.value[0]?.number, 1)
  assert.equal(session.storageError.value, '')
  const restored = scope.run(() => usePosDrafts(ref<number | undefined>(1), ref<number | null>(1)))!
  assert.equal(restored.active.value?.id, session.active.value?.id)
  assert.equal(restored.waiting.value[0]?.lines[0]?.quantity, 0.25)
  assert.equal(quantityInputValue(restored.waiting.value[0]!.lines[0]!.quantity, 'KG'), '250')
})
