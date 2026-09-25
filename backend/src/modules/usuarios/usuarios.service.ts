import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto.js';
import type { UsuarioAutenticado } from '../../common/types/usuario-autenticado.js';
import { ForbiddenException } from '@nestjs/common';
import { RolSistema } from '../../common/enums/rol-sistema.enum.js';
import { PermisoSistema } from '../../common/enums/permiso-sistema.enum.js';

@Injectable()
export class UsuariosService {
    constructor(private readonly prisma: PrismaService) { }

    async crear(dto: CrearUsuarioDto) {
        const usuarioExistente = await this.prisma.usuario.findUnique({
            where: {
                correo: dto.correo,
            },
        });

        if (usuarioExistente) {
            throw new ConflictException('El correo ya está registrado');
        }

        await this.validarDocumento(
            dto.perfil.idTipoDocumento,
            dto.perfil.numeroDocumento,
        );

        const rol = await this.prisma.rol.findUnique({
            where: { idRol: dto.idRol },
        });

        if (!rol || !rol.activo) {
            throw new NotFoundException('Rol activo no encontrado');
        }

        if (rol.nombre === RolSistema.SUPERADMIN) {
            throw new ForbiddenException(
                'La creación de cuentas SUPERADMIN está reservada',
            );
        }

        const estadoActivo = await this.prisma.estado.findUnique({
            where: {
                nombre: 'ACTIVO',
            },
        });

        if (!estadoActivo) {
            throw new NotFoundException('No se encontró el estado ACTIVO');
        }

        const contrasenaHash = await bcrypt.hash(dto.contrasena, 10);

        const usuario = await this.prisma.usuario.create({
            data: {
                correo: dto.correo,
                contrasena: contrasenaHash,
                idEstado: estadoActivo.idEstado,
                idRol: rol.idRol,

                perfil: {
                    create: {
                        nombres: dto.perfil.nombres,
                        apellidos: dto.perfil.apellidos,
                        idTipoDocumento: dto.perfil.idTipoDocumento,
                        numeroDocumento: dto.perfil.numeroDocumento,
                        telefono: dto.perfil.telefono,
                        direccion: dto.perfil.direccion,
                    },
                },
            },

            select: {
                idUsuario: true,
                correo: true,
                idEstado: true,
                createdAt: true,
                updatedAt: true,

                estado: {
                    select: {
                        idEstado: true,
                        nombre: true,
                    },
                },

                rol: {
                    select: {
                        idRol: true,
                        nombre: true,
                        activo: true,
                    },
                },

                perfil: {
                    select: {
                        nombres: true,
                        apellidos: true,
                        idTipoDocumento: true,
                        numeroDocumento: true,
                        telefono: true,
                        direccion: true,

                        tipoDocumento: {
                            select: {
                                idTipoDocumento: true,
                                nombre: true,
                            },
                        },
                    },
                },
            },
        });

        return {
            message: 'Usuario creado correctamente',
            usuario,
        };
    }

    async listar() {
        return this.prisma.usuario.findMany({
            select: {
                idUsuario: true,
                correo: true,
                idEstado: true,
                createdAt: true,
                updatedAt: true,

                estado: {
                    select: {
                        idEstado: true,
                        nombre: true,
                    },
                },

                perfil: {
                    select: {
                        nombres: true,
                        apellidos: true,
                        idTipoDocumento: true,
                        numeroDocumento: true,
                        telefono: true,
                        direccion: true,

                        tipoDocumento: {
                            select: {
                                idTipoDocumento: true,
                                nombre: true,
                            },
                        },
                    },
                },

                rol: {
                    select: {
                        idRol: true,
                        nombre: true,
                        activo: true,
                    },
                },

                sucursales: {
                    select: {
                        sucursal: {
                            select: {
                                idSucursal: true,
                                nombre: true,
                                activo: true,
                            },
                        },
                    },
                },
            },

            orderBy: {
                idUsuario: 'desc',
            },
        });
    }

    async obtenerPorId(id: number) {
        const usuario = await this.prisma.usuario.findUnique({
            where: {
                idUsuario: id,
            },

            select: {
                idUsuario: true,
                correo: true,
                idEstado: true,
                createdAt: true,
                updatedAt: true,

                estado: {
                    select: {
                        idEstado: true,
                        nombre: true,
                    },
                },

                perfil: {
                    select: {
                        nombres: true,
                        apellidos: true,
                        idTipoDocumento: true,
                        numeroDocumento: true,
                        telefono: true,
                        direccion: true,

                        tipoDocumento: {
                            select: {
                                idTipoDocumento: true,
                                nombre: true,
                            },
                        },
                    },
                },

                rol: {
                    select: {
                        idRol: true,
                        nombre: true,
                        activo: true,
                    },
                },

                sucursales: {
                    select: {
                        sucursal: {
                            select: {
                                idSucursal: true,
                                nombre: true,
                                activo: true,
                            },
                        },
                    },
                },
            },
        });

        if (!usuario) {
            throw new NotFoundException('Usuario no encontrado');
        }

        return usuario;
    }

    async actualizar(id: number, dto: ActualizarUsuarioDto, actor: UsuarioAutenticado) {
        this.exigirPermisosDeActualizacion(actor, dto);
        const usuario = await this.prisma.usuario.findUnique({
            where: {
                idUsuario: id,
            },

            include: {
                perfil: true,
                estado: { select: { nombre: true } },
                rol: { select: { nombre: true } },
            },
        });

        if (!usuario) {
            throw new NotFoundException('Usuario no encontrado');
        }

        this.validarObjetivo(actor, id, usuario.rol.nombre, dto);

        const rol = dto.idRol === undefined
            ? undefined
            : await this.prisma.rol.findUnique({ where: { idRol: dto.idRol } });
        if (dto.idRol !== undefined && (!rol || !rol.activo)) {
            throw new NotFoundException('Rol activo no encontrado');
        }

        if (dto.estado !== undefined && usuario.estado.nombre === 'BLOQUEADO') {
            throw new ConflictException('Un usuario BLOQUEADO no se habilita ni deshabilita desde esta ruta');
        }
        const estado = dto.estado === undefined
            ? undefined
            : await this.prisma.estado.findUnique({ where: { nombre: dto.estado } });
        if (dto.estado !== undefined && !estado) {
            throw new NotFoundException(`No se encontró el estado ${dto.estado}`);
        }

        if (dto.correo !== undefined && dto.correo !== usuario.correo) {
            const correoExistente = await this.prisma.usuario.findUnique({
                where: {
                    correo: dto.correo,
                },
            });

            if (correoExistente) {
                throw new ConflictException('El correo ya está registrado');
            }
        }

        if (dto.perfil) {
            await this.validarDocumento(
                dto.perfil.idTipoDocumento,
                dto.perfil.numeroDocumento,
                id,
            );
        }

        await this.prisma.$transaction(async (tx) => {
            const datosUsuario: {
                correo?: string;
                idEstado?: number;
                idRol?: number;
            } = {};

            if (
                rol &&
                usuario.idRol !== rol.idRol &&
                usuario.rol.nombre === RolSistema.SUPERADMIN &&
                usuario.estado.nombre === 'ACTIVO'
            ) {
                const superadministradoresActivos = await tx.usuario.count({
                    where: {
                        idRol: usuario.idRol,
                        estado: { nombre: 'ACTIVO' },
                    },
                });

                if (superadministradoresActivos <= 1) {
                    throw new ForbiddenException(
                        'No se puede quitar el último SUPERADMIN activo',
                    );
                }
            }

            if (dto.correo !== undefined) {
                datosUsuario.correo = dto.correo;
            }

            if (estado) {
                datosUsuario.idEstado = estado.idEstado;
            }

            if (rol && rol.idRol !== usuario.idRol) {
                datosUsuario.idRol = rol.idRol;
            }

            if (Object.keys(datosUsuario).length > 0) {
                await tx.usuario.update({
                    where: {
                        idUsuario: id,
                    },
                    data: datosUsuario,
                });
            }

            if (dto.perfil) {
                if (usuario.perfil) {
                    await tx.usuarioPerfil.update({
                        where: {
                            idUsuario: id,
                        },
                        data: {
                            nombres: dto.perfil.nombres,
                            apellidos: dto.perfil.apellidos,
                            idTipoDocumento: dto.perfil.idTipoDocumento,
                            numeroDocumento: dto.perfil.numeroDocumento,
                            telefono: dto.perfil.telefono,
                            direccion: dto.perfil.direccion,
                        },
                    });
                } else {
                    if (!dto.perfil.nombres || !dto.perfil.apellidos) {
                        throw new ConflictException(
                            'Los nombres y apellidos son obligatorios para crear el perfil',
                        );
                    }

                    await tx.usuarioPerfil.create({
                        data: {
                            idUsuario: id,
                            nombres: dto.perfil.nombres,
                            apellidos: dto.perfil.apellidos,
                            idTipoDocumento: dto.perfil.idTipoDocumento,
                            numeroDocumento: dto.perfil.numeroDocumento,
                            telefono: dto.perfil.telefono,
                            direccion: dto.perfil.direccion,
                        },
                    });
                }
            }
        }, { isolationLevel: 'Serializable' });

        return {
            message: 'Usuario actualizado correctamente',
            usuario: await this.obtenerPorId(id),
        };
    }

    private exigirPermisosDeActualizacion(actor: UsuarioAutenticado, dto: ActualizarUsuarioDto) {
        const requeridos: PermisoSistema[] = [];
        if (dto.correo !== undefined || dto.perfil !== undefined) {
            requeridos.push(PermisoSistema.USUARIOS_EDITAR);
        }
        if (dto.estado === 'ACTIVO') requeridos.push(PermisoSistema.USUARIOS_ACTIVAR);
        if (dto.estado === 'INACTIVO') requeridos.push(PermisoSistema.USUARIOS_DESACTIVAR);

        if (dto.idRol !== undefined && actor.rol.nombre !== RolSistema.SUPERADMIN) {
            throw new ForbiddenException('Solo SUPERADMIN puede cambiar el rol de un usuario');
        }

        if (requeridos.some((permiso) => !actor.permisos.includes(permiso))) {
            throw new ForbiddenException('Permiso requerido para actualizar el usuario');
        }
    }

    private validarObjetivo(
        actor: UsuarioAutenticado,
        id: number,
        rolObjetivo: string,
        dto: ActualizarUsuarioDto,
    ) {
        if (actor.idUsuario === id) {
            throw new ForbiddenException('No puedes modificar tu cuenta desde esta ruta');
        }

        const modificaDatosProtegidos =
            dto.correo !== undefined ||
            dto.estado !== undefined ||
            dto.perfil !== undefined;

        if (rolObjetivo === RolSistema.SUPERADMIN && modificaDatosProtegidos) {
            throw new ForbiddenException('La cuenta SUPERADMIN está protegida');
        }
    }

    private async validarDocumento(
        idTipoDocumento?: number | null,
        numeroDocumento?: string | null,
        idUsuarioExcluir?: number,
    ) {
        if (idTipoDocumento !== undefined && idTipoDocumento !== null) {
            const tipoDocumento = await this.prisma.tipoDocumento.findUnique({
                where: {
                    idTipoDocumento,
                },
            });

            if (!tipoDocumento) {
                throw new NotFoundException('El tipo de documento no existe');
            }

            if (!tipoDocumento.activo) {
                throw new ConflictException(
                    'El tipo de documento se encuentra inactivo',
                );
            }
        }

        if (
            idTipoDocumento === undefined ||
            idTipoDocumento === null ||
            numeroDocumento === undefined ||
            numeroDocumento === null
        ) {
            return;
        }

        const documentoExistente = await this.prisma.usuarioPerfil.findFirst({
            where: {
                idTipoDocumento,
                numeroDocumento,

                ...(idUsuarioExcluir
                    ? {
                        idUsuario: {
                            not: idUsuarioExcluir,
                        },
                    }
                    : {}),
            },
        });

        if (documentoExistente) {
            throw new ConflictException(
                'El número de documento ya está registrado',
            );
        }
    }
}
