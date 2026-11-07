import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { fechaPeru } from '../src/modules/reportes/reportes.service.js';

export async function verificarReportes(
  base: string,
  cookie: string,
  idSucursal: number,
  idCaja: number,
  noPermissionsCookie: string,
  northCookie: string,
) {
  const date = fechaPeru();
  const query = `idSucursal=${idSucursal}&desde=${date}&hasta=${date}&limite=1`;
  async function json(path: string, session = cookie) {
    const response = await fetch(`${base}/api/reportes/${path}`, {
      headers: { cookie: session },
    });
    return { status: response.status, result: await response.json() };
  }
  const ventas = await json(`ventas?${query}`);
  assert.equal(ventas.status, 200, JSON.stringify(ventas.result));
  assert.equal(ventas.result.total, 2);
  assert.equal(ventas.result.data.length, 1);
  assert.deepEqual(
    ventas.result.resumen.map((m: any) => m.valor),
    ['9.00', '4.50', '4.50', '4.50'],
  );
  const segundaPagina = await json(`ventas?${query}&pagina=2`);
  assert.notEqual(segundaPagina.result.data[0].id, ventas.result.data[0].id);
  const productos = await json(`productos?${query}`);
  assert.equal(productos.status, 200, JSON.stringify(productos.result));
  assert.equal(productos.result.total, 1);
  assert.equal(productos.result.data[0].cantidad, '2.000');
  assert.equal(productos.result.data[0].unidad, 'KG');
  assert.equal(productos.result.data[0].importe, '9.00');
  const compras = await json(`compras?${query}`);
  assert.equal(compras.status, 200, JSON.stringify(compras.result));
  assert.equal(compras.result.total, 0);
  assert.ok(compras.result.resumen.every((m: any) => Number(m.valor) === 0));
  const caja = await json(`caja?${query}`);
  assert.equal(caja.status, 200, JSON.stringify(caja.result));
  assert.equal(caja.result.data[0].ventas, '4.50');
  assert.equal(caja.result.data[0].egresos, '0.00');
  assert.equal(
    caja.result.data[0].neto,
    '4.50',
    'El flujo no incluye el crédito compensatorio ni el fondo de apertura',
  );
  const stock = await json(`inventario?idSucursal=${idSucursal}&limite=1`);
  assert.equal(stock.status, 200, JSON.stringify(stock.result));
  assert.ok(stock.result.total > 25);
  assert.equal(stock.result.data.length, 1);
  assert.equal(Number(stock.result.resumen[0].valor), stock.result.total);
  const critico = await json(
    `inventario?idSucursal=${idSucursal}&estado=critico`,
  );
  assert.equal(critico.status, 200);
  assert.ok(
    critico.result.data.every((r: any) => Number(r.stock) <= Number(r.minimo)),
  );
  const deuda = await json(`deudas?idSucursal=${idSucursal}&estado=pendiente`);
  assert.equal(deuda.status, 200, JSON.stringify(deuda.result));
  assert.equal(deuda.result.total, 1);
  assert.equal(deuda.result.data[0].saldo, '4.50');
  assert.equal(deuda.result.data[0].cliente, 'Ana Prueba');
  assert.equal(
    (await json(`ventas?${query}`, noPermissionsCookie)).status,
    403,
  );
  assert.equal((await json(`ventas?${query}`, northCookie)).status, 403);
  assert.equal(
    (await json(`ventas?desde=${date}&hasta=${date}`, northCookie)).result
      .total,
    0,
  );
  assert.equal((await json(`ventas?${query}`, '')).status, 401);
  assert.equal(
    (await json('ventas?desde=2026-02-30&hasta=2026-03-01')).status,
    400,
  );
  assert.equal(
    (await json('ventas?desde=2026-10-08&hasta=2026-10-07')).status,
    400,
  );
  assert.equal((await json(`inventario?${query}`)).status, 400);
  assert.equal(
    (
      await json(
        `productos?${query}&buscar=${encodeURIComponent("' OR 1=1 --")}`,
      )
    ).result.total,
    0,
  );
  assert.equal(
    (await json(`ventas?${query}&buscar=%25`)).result.total,
    0,
    'La búsqueda de % no actúa como comodín',
  );
  await mkdir('tmp/pdfs', { recursive: true });
  for (const tipo of [
    'ventas',
    'productos',
    'compras',
    'caja',
    'inventario',
    'deudas',
  ]) {
    const params = ['inventario', 'deudas'].includes(tipo)
      ? `idSucursal=${idSucursal}&limite=1`
      : query;
    for (const format of ['pdf', 'ticket']) {
      const pdf = await fetch(
        `${base}/api/reportes/${tipo}/exportar/${format}?${params}`,
        { headers: { cookie } },
      );
      assert.equal(
        pdf.status,
        200,
        `Exportación ${format} ${tipo}: ${pdf.status === 200 ? '' : await pdf.clone().text()}`,
      );
      assert.match(pdf.headers.get('content-type') || '', /application\/pdf/);
      await writeFile(
        `tmp/pdfs/reporte-${tipo}${format === 'ticket' ? '-ticket' : ''}.pdf`,
        Buffer.from(await pdf.arrayBuffer()),
      );
    }
  }
  const excel = await fetch(
    `${base}/api/reportes/ventas/exportar/excel?${query}`,
    { headers: { cookie } },
  );
  assert.equal(excel.status, 200);
  const buffer = Buffer.from(await excel.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Reporte')!;
  assert.equal(
    sheet.rowCount,
    11,
    'La exportación incluye las dos ventas aunque la página muestre una',
  );
  assert.equal(sheet.getCell('E10').value, 4.5);
  assert.equal(sheet.getCell('E11').value, 4.5);
  assert.ok(sheet.autoFilter);
  assert.equal(sheet.views[0]?.state, 'frozen');
  await writeFile('tmp/pdfs/reporte-ventas.xlsx', buffer);
  const cajaData = await fetch(`${base}/api/cajas/${idCaja}/reporte`, {
    headers: { cookie },
  });
  assert.equal(cajaData.status, 200);
  const cashReport = await cajaData.json();
  await writeFile('tmp/pdfs/caja-datos.json', JSON.stringify(cashReport));
  assert.equal(
    cashReport.report.resumen.find((m: any) => m.titulo === 'Saldo esperado')
      .valor,
    '204.50',
  );
  assert.equal(
    cashReport.secciones.find((s: any) => s.titulo === 'Ventas').data.length,
    2,
  );
  const products = cashReport.secciones.find(
    (s: any) => s.titulo === 'Productos vendidos',
  ).data;
  assert.equal(products[0].cantidad, '2.000');
  assert.equal(products[0].importe, '9.00');
  for (const session of ['', noPermissionsCookie, northCookie]) {
    const response = await fetch(`${base}/api/cajas/${idCaja}/reporte/ticket`, {
      headers: { cookie: session },
    });
    assert.equal(response.status, session ? 403 : 401);
    if (session === northCookie)
      assert.match((await response.json()).message, /sucursal/);
  }
  assert.equal(
    (
      await fetch(`${base}/api/cajas/${idCaja}/reporte/csv`, {
        headers: { cookie },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(`${base}/api/cajas/2147483647/reporte/pdf`, {
        headers: { cookie },
      })
    ).status,
    404,
  );
  for (const format of ['ticket', 'pdf', 'excel']) {
    const response = await fetch(
      `${base}/api/cajas/${idCaja}/reporte/${format}`,
      { headers: { cookie } },
    );
    assert.equal(response.status, 200, format);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (format !== 'excel')
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    else {
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(bytes);
      assert.equal(book.worksheets.length, 7);
      assert.equal(book.getWorksheet('Ventas')!.rowCount, 11);
      assert.equal(
        book.getWorksheet('Medios de pago')!.getCell('H10').value,
        204.5,
      );
    }
    await writeFile(
      `tmp/pdfs/caja-${format}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      bytes,
    );
  }
  console.log(
    'Reportes: seis consultas, sumas completas, fechas Perú, stock, saldos, permisos, sucursales y reportes por caja en ticket/Excel/PDF A4 verificados.',
  );
}
