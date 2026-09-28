import { prisma } from '../cliente-prisma.js';

// Catálogo inicial compartido por bodegas, ferreterías y otras tiendas.
// La presentación comercial (por ejemplo, arroz en bolsa de 1 kg) es un producto;
// la unidad indica cómo se contabilizan sus cantidades en inventario.
const unidades = [
  { nombre: 'Unidad', simbolo: 'UND' },
  { nombre: 'Kilogramo', simbolo: 'KG' },
  { nombre: 'Gramo', simbolo: 'G' },
  { nombre: 'Litro', simbolo: 'L' },
  { nombre: 'Mililitro', simbolo: 'ML' },
  { nombre: 'Metro', simbolo: 'M' },
  { nombre: 'Centímetro', simbolo: 'CM' },
  { nombre: 'Par', simbolo: 'PAR' },
  { nombre: 'Docena', simbolo: 'DOC' },
  { nombre: 'Paquete', simbolo: 'PQT' },
  { nombre: 'Caja', simbolo: 'CJA' },
  { nombre: 'Bolsa', simbolo: 'BOL' },
] as const;

export async function seedUnidadesMedida() {
  for (const unidad of unidades) {
    await prisma.unidadMedida.upsert({
      where: { simbolo: unidad.simbolo },
      create: unidad,
      update: {},
    });
  }
  console.log('Unidades de medida preparadas');
}
