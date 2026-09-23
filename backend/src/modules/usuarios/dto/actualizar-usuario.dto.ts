import { z } from 'zod';

export const ActualizarUsuarioSchema = z
    .object({
        correo: z
            .email('El correo no es válido')
            .max(255, 'El correo no puede superar los 255 caracteres')
            .optional(),


        perfil: z
            .object({
                nombres: z
                    .string()
                    .trim()
                    .min(2, 'Los nombres son obligatorios')
                    .max(255, 'Los nombres no pueden superar los 100 caracteres')
                    .regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, 'Nombre inválido')
                    .optional(),

                apellidos: z
                    .string()
                    .trim()
                    .min(2, 'Los apellidos son obligatorios')
                    .max(255, 'Los apellidos no pueden superar los 100 caracteres')
                    .regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, 'Apellido inválido')
                    .optional(),

                idTipoDocumento: z
                    .number()
                    .int()
                    .positive('El tipo de documento no es válido')
                    .nullable()
                    .optional(),

                numeroDocumento: z
                    .string()
                    .trim()
                    .max(20, 'El número de documento no puede superar los 20 caracteres')
                    .regex(/^[A-Za-z0-9-]+$/, 'Número de documento inválido')
                    .nullable()
                    .optional(),

                telefono: z
                    .string()
                    .trim()
                    .max(20, 'El teléfono no puede superar los 20 caracteres')
                    .regex(/^[0-9+\-\s]+$/, 'Teléfono inválido')
                    .nullable()
                    .optional(),

                direccion: z
                    .string()
                    .trim()
                    .max(255, 'La dirección no puede superar los 255 caracteres')
                    .nullable()
                    .optional(),
            })
            .optional(),
    })
    .refine(
        (data) =>
            data.correo !== undefined ||
            data.perfil !== undefined,
        {
            message: 'Debe enviar al menos un campo para actualizar',
        },
    );

export type ActualizarUsuarioDto = z.infer<
    typeof ActualizarUsuarioSchema
>;
