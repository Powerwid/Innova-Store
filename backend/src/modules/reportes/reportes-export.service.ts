import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import pdfmake from 'pdfmake';
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces.js';
import type {
  ResultadoReporte,
  ColumnaReporte,
  FilaReporte,
} from './reportes.definition.js';

export interface SeccionReporte {
  titulo: string;
  columnas: ColumnaReporte[];
  data: FilaReporte[];
}
export type FormatoReporte = 'ticket' | 'excel' | 'pdf';

pdfmake.addFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});
const money = (value: string | number) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shown = (value: string | number | null, column: ColumnaReporte) =>
  value === null
    ? '—'
    : column.formato === 'dinero'
      ? money(value)
      : column.formato === 'cantidad'
        ? Number(value).toLocaleString('es-PE', { maximumFractionDigits: 3 })
        : String(value);
const period = (report: ResultadoReporte) =>
  report.periodo
    ? `${report.desde} al ${report.hasta} · Hora de Perú`
    : 'Estado actual';
const numeric = (column: ColumnaReporte) =>
  ['dinero', 'cantidad', 'numero'].includes(column.formato);
const excelWidth = (column: ColumnaReporte) =>
  numeric(column)
    ? 19
    : ['producto', 'cliente', 'proveedor'].includes(column.key)
      ? 38
      : 26;
const sections = (report: ResultadoReporte, extra?: SeccionReporte[]) =>
  extra ?? [
    { titulo: report.titulo, columnas: report.columnas, data: report.data },
  ];
const generated = (report: ResultadoReporte) =>
  new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(report.generadoEn));

@Injectable()
export class ReportesExportService {
  async generar(
    report: ResultadoReporte,
    formato: FormatoReporte,
    secciones?: SeccionReporte[],
  ) {
    return formato === 'excel'
      ? this.excel(report, secciones)
      : formato === 'ticket'
        ? this.ticket(report, secciones)
        : this.pdf(report, secciones);
  }

  async excel(
    report: ResultadoReporte,
    secciones?: SeccionReporte[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Innova Store';
    workbook.created = new Date(report.generadoEn);
    for (const section of sections(report, secciones)) {
      this.excelSheet(
        workbook,
        {
          ...report,
          titulo: secciones
            ? `${report.titulo} · ${section.titulo}`
            : report.titulo,
          columnas: section.columnas,
          data: section.data,
        },
        secciones ? section.titulo : 'Reporte',
      );
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private excelSheet(
    workbook: ExcelJS.Workbook,
    report: ResultadoReporte,
    name: string,
  ) {
    const sheet = workbook.addWorksheet(name.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 9 }],
    });
    const count = report.columnas.length;
    sheet.mergeCells(1, 1, 1, count);
    sheet.getCell(1, 1).value = `Innova Store · ${report.titulo}`;
    sheet.getCell(1, 1).font = {
      bold: true,
      size: 18,
      color: { argb: 'FF0F766E' },
    };
    sheet.getRow(1).height = 48;
    sheet.getCell(1, 1).alignment = { wrapText: true, vertical: 'middle' };
    for (const [index, text] of [
      report.sucursal,
      period(report) + (report.filtros ? ` · ${report.filtros}` : ''),
      report.descripcion,
      `Generado: ${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generadoEn))}`,
    ].entries()) {
      sheet.mergeCells(index + 2, 1, index + 2, count);
      sheet.getCell(index + 2, 1).value = text;
      sheet.getCell(index + 2, 1).alignment = {
        wrapText: true,
        vertical: 'middle',
      };
      sheet.getRow(index + 2).height = Math.max(
        24,
        Math.ceil(text.length / (count * 18)) * 15 + 8,
      );
    }
    sheet.mergeCells(7, 1, 7, count);
    const summaryText = report.resumen
      .map(
        (m) =>
          `${m.titulo}: ${m.formato === 'dinero' ? money(m.valor) : m.valor}`,
      )
      .join('   |   ');
    sheet.getCell(7, 1).value = summaryText;
    sheet.getCell(7, 1).font = { bold: true };
    sheet.getCell(7, 1).alignment = { wrapText: true };
    sheet.getRow(7).height = Math.max(
      32,
      Math.ceil(summaryText.length / (count * 20)) * 16,
    );
    const header = sheet.getRow(9);
    header.values = report.columnas.map((c) => c.titulo);
    header.height = 30;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' },
      };
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    report.data.forEach((data, index) => {
      const row = sheet.addRow(
        report.columnas.map((c) =>
          data[c.key] === null
            ? ''
            : numeric(c)
              ? Number(data[c.key])
              : String(data[c.key] ?? ''),
        ),
      );
      row.height = Math.max(
        32,
        ...report.columnas.map(
          (c) =>
            Math.ceil(String(data[c.key] ?? '').length / (excelWidth(c) - 3)) *
              15 +
            8,
        ),
      );
      row.eachCell((cell, i) => {
        cell.alignment = {
          vertical: 'middle',
          wrapText: true,
          horizontal: numeric(report.columnas[i - 1]!) ? 'right' : 'left',
        };
        if (index % 2 === 0)
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0FDFA' },
          };
      });
    });
    report.columnas.forEach((c, i) => {
      const column = sheet.getColumn(i + 1);
      column.width = excelWidth(c);
      if (c.formato === 'dinero')
        column.numFmt = '"S/ "#,##0.00;[Red]-"S/ "#,##0.00';
      if (c.formato === 'cantidad') column.numFmt = '#,##0.###';
    });
    sheet.autoFilter = {
      from: { row: 9, column: 1 },
      to: { row: Math.max(9, sheet.rowCount), column: count },
    };
    sheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '9:9',
    };
  }

  async pdf(
    report: ResultadoReporte,
    secciones?: SeccionReporte[],
  ): Promise<Buffer> {
    const allSections = sections(report, secciones);
    const columns = Math.max(...allSections.map((s) => s.columnas.length));
    const content: Content[] = [
      {
        text: 'INNOVA STORE',
        fontSize: 9,
        bold: true,
        color: '#0f766e',
        margin: [0, 0, 0, 5],
      },
      { text: report.titulo, fontSize: 20, bold: true, margin: [0, 0, 0, 8] },
      {
        text: `${report.sucursal} · ${period(report)}`,
        fontSize: 10,
        margin: [0, 0, 0, 8],
      },
      ...(report.filtros
        ? [
            {
              text: report.filtros,
              fontSize: 9,
              margin: [0, 0, 0, 8],
            } as Content,
          ]
        : []),
      {
        text: report.descripcion,
        fontSize: 9,
        color: '#555',
        margin: [0, 0, 0, 12],
      },
      {
        text: report.resumen
          .map(
            (m) =>
              `${m.titulo}: ${m.formato === 'dinero' ? money(m.valor) : m.valor}`,
          )
          .join('   |   '),
        bold: true,
        margin: [0, 0, 0, 16],
      },
    ];
    for (const section of allSections) {
      if (secciones)
        content.push({
          text: section.titulo,
          headlineLevel: 1,
          bold: true,
          fontSize: 12,
          color: '#0f766e',
          margin: [0, 16, 0, 8],
        });
      if (!section.data.length) {
        content.push({
          text: secciones
            ? 'Sin movimientos registrados en esta caja.'
            : 'Sin registros para los filtros seleccionados.',
          margin: [0, 3, 0, 8],
        });
        continue;
      }
      const widths = section.columnas.map((c) =>
        numeric(c)
          ? 68
          : [
                'producto',
                'cliente',
                'proveedor',
                'concepto',
                'nombre',
                'valor',
              ].includes(c.key)
            ? '*'
            : section.columnas.length >= 8
              ? 62
              : 83,
      );
      if (
        section.columnas.filter(numeric).length >= 4 &&
        section.columnas.length <= 6
      )
        widths[0] = '*';
      content.push({
        table: {
          headerRows: 1,
          widths,
          body: [
            section.columnas.map(
              (c) =>
                ({
                  text: c.titulo,
                  bold: true,
                  color: '#fff',
                  fillColor: '#0f766e',
                  alignment: numeric(c) ? 'right' : 'left',
                }) as TableCell,
            ),
            ...section.data.map((row, i): TableCell[] =>
              section.columnas.map((c) => ({
                text: shown(row[c.key] ?? null, c),
                alignment: numeric(c) ? 'right' : 'left',
                fillColor: i % 2 === 0 ? '#f0fdfa' : '#fff',
              })),
            ),
          ],
        },
        layout: {
          hLineWidth: () => 0.4,
          vLineWidth: () => 0,
          hLineColor: () => '#ddd',
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
      });
    }
    const doc: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [28, 28, 28, 36],
      defaultStyle: { font: 'Helvetica', fontSize: columns >= 8 ? 7.5 : 8.5 },
      info: {
        title: `Innova Store · ${report.titulo}`,
        author: 'Innova Store',
      },
      content,
      pageBreakBefore: (node, container) =>
        node.headlineLevel === 1 &&
        (node.startPosition.verticalRatio > 0.8 ||
          !container
            .getFollowingNodesOnPage()
            .some((following) => following.text)),
      footer: (page, pages) => ({
        columns: [
          {
            text: `Generado ${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generadoEn))}`,
            alignment: 'left',
          },
          { text: `${page} / ${pages}`, alignment: 'right' },
        ],
        fontSize: 8,
        color: '#666',
        margin: [28, 12, 28, 0],
      }),
    };
    return pdfmake.createPdf(doc).getBuffer();
  }

  // Igual que reports/generic.blade.php de Restaurant: campos por registro,
  // separados por líneas punteadas, para conservar la legibilidad en 80 mm.
  async ticket(
    report: ResultadoReporte,
    secciones?: SeccionReporte[],
  ): Promise<Buffer> {
    const width = (80 * 72) / 25.4,
      margin = (4 * 72) / 25.4;
    const divider = (): Content => ({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: width - margin * 2,
          y2: 0,
          lineWidth: 0.5,
          dash: { length: 2, space: 2 },
        },
      ],
      margin: [0, 7, 0, 7],
    });
    const content: Content[] = [
      { text: 'INNOVA STORE', bold: true, alignment: 'center', fontSize: 9 },
      {
        text: report.titulo,
        bold: true,
        alignment: 'center',
        fontSize: 12,
        margin: [0, 5, 0, 5],
      },
      { text: report.sucursal, alignment: 'center' },
      { text: period(report), alignment: 'center', margin: [0, 3, 0, 3] },
      ...(report.filtros
        ? [{ text: report.filtros, alignment: 'center' } as Content]
        : []),
      {
        text: `Generado: ${generated(report)}`,
        alignment: 'center',
        fontSize: 7,
        margin: [0, 3, 0, 3],
      },
      ...(secciones ? [] : [divider()]),
      ...(secciones ? [] : report.resumen).map((m): Content => ({
        text: [
          { text: `${m.titulo}: `, bold: true },
          m.formato === 'dinero' ? money(m.valor) : m.valor,
        ],
        margin: [0, 2, 0, 2],
      })),
    ];
    for (const section of sections(report, secciones)) {
      if (secciones)
        content.push(divider(), {
          text: section.titulo.toUpperCase(),
          headlineLevel: 1,
          bold: true,
          fontSize: 9,
        });
      if (!section.data.length)
        content.push({
          text: 'Sin registros.',
          alignment: 'center',
          margin: [0, 8, 0, 8],
        });
      if (secciones && section.titulo === 'Resumen') {
        content.push({
          table: {
            widths: ['*', 90],
            body: section.data.map((row) => [
              { text: String(row.concepto), bold: true },
              { text: String(row.valor), alignment: 'right' },
            ]),
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
          margin: [0, 6, 0, 0],
        });
        continue;
      }
      for (const row of section.data) {
        const record: Content[] = [divider()];
        for (const column of section.columnas)
          record.push({
            text: [
              { text: `${column.titulo}: `, bold: true },
              shown(row[column.key] ?? null, column),
            ],
            margin: [0, 1, 0, 1],
          });
        content.push({ stack: record, unbreakable: true });
      }
    }
    content.push(
      divider(),
      {
        text: secciones
          ? 'Fin del reporte de caja'
          : `${report.total} registro(s)`,
        alignment: 'center',
      },
      {
        text: 'Reporte interno',
        alignment: 'center',
        fontSize: 7,
        margin: [0, 5, 0, 0],
      },
    );
    const longTicket =
      sections(report, secciones).reduce(
        (count, section) => count + section.data.length,
        0,
      ) > 50;
    return pdfmake
      .createPdf({
        pageSize: { width, height: longTicket ? (297 * 72) / 25.4 : 'auto' },
        pageMargins: [margin, margin, margin, longTicket ? 25 : margin],
        defaultStyle: {
          font: 'Helvetica',
          fontSize: 8,
          lineHeight: 1.15,
          color: '#000',
        },
        info: { title: `Ticket · ${report.titulo}`, author: 'Innova Store' },
        content,
        pageBreakBefore: (node, container) =>
          node.headlineLevel === 1 &&
          (node.startPosition.verticalRatio > 0.8 ||
            !container
              .getFollowingNodesOnPage()
              .some((following) => following.text)),
        ...(longTicket
          ? {
              footer: (page: number, pages: number) => ({
                text: `${page} / ${pages}`,
                alignment: 'center' as const,
                fontSize: 7,
                margin: [0, 7, 0, 0] as [number, number, number, number],
              }),
            }
          : {}),
      })
      .getBuffer();
  }
}
