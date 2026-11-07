import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ImageStorage } from '../../common/storage/image-storage.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';

export const PRODUCTO_IMAGEN_DIRECTORY = Symbol('PRODUCTO_IMAGEN_DIRECTORY');

@Injectable()
export class ProductoImagenService {
  private readonly storage: ImageStorage;
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(PRODUCTO_IMAGEN_DIRECTORY)
    directory = 'storage/productos',
  ) {
    this.storage = new ImageStorage(directory);
  }

  private url(id: number, archivo: string) {
    return `/api/logistica/productos/${id}/imagen/${archivo}`;
  }
  async subir(id: number, file: Express.Multer.File | undefined) {
    const product = await this.prisma.producto.findUnique({
      where: { idProducto: id },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    // La validación se realiza antes de escribir; la foto comercial usa almacenamiento independiente.
    const saved = await this.storage.save(file as Express.Multer.File);
    try {
      return await this.prisma.producto.update({
        where: { idProducto: id, createdAt: product.createdAt },
        data: { imagen: this.url(id, saved.archivo) },
        include: { tipoProducto: true, categoria: true, unidadMedida: true },
      });
    } catch (error) {
      await this.storage.remove(saved.archivo);
      throw error;
    }
  }
  async obtener(id: number, archivo: string) {
    const product = await this.prisma.producto.findUnique({
      where: { idProducto: id },
      select: { imagen: true },
    });
    if (!product || product.imagen !== this.url(id, archivo))
      throw new NotFoundException('Imagen de producto no encontrada');
    try {
      const buffer = await this.storage.read(archivo);
      const mimeType = archivo.endsWith('.png')
        ? 'image/png'
        : archivo.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';
      return { buffer, mimeType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new NotFoundException('Imagen de producto no encontrada');
      throw error;
    }
  }
}
