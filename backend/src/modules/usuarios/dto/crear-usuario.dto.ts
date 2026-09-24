import { z } from 'zod';

export const CrearUsuarioSchema = z.object({
    correo: z
        .email('El correo no es válido')
        .max(255, 'El correo no puede superar los 255 caracteres'),

    contrasena: z
        .string({ error: 'La contraseña es obligatoria' })
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'La contraseña debe contener una mayúscula')
        .regex(/\d/, 'La contraseña debe contener un número')
        .max(255, 'La contraseña no puede superar los 255 caracteres'),

    idRol: z
        .number({ error: 'El identificador del rol debe ser un número' })
        .int('El identificador del rol debe ser un número entero')
        .positive('El identificador del rol no es válido'),

    perfil: z.object({
        nombres: z
            .string({ error: 'Los nombres son obligatorios' })
            .trim()
            .min(2, 'Los nombres son obligatorios')
            .regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, 'Nombre inválido')
            .max(255, 'Los nombres no pueden superar los 255 caracteres'),

        apellidos: z
            .string({ error: 'Los apellidos son obligatorios' })
            .trim()
            .min(2, 'Los apellidos son obligatorios')
            .regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, 'Apellido inválido')
            .max(255, 'Los apellidos no pueden superar los 255 caracteres'),

        idTipoDocumento: z
            .number({ error: 'El tipo de documento debe ser un número' })
            .int('El tipo de documento debe ser un número entero')
            .positive('El tipo de documento no es válido')
            .optional(),

        numeroDocumento: z
            .string({ error: 'El número de documento debe ser texto' })
            .trim()
            .max(20, 'El número de documento no puede superar los 20 caracteres')
            .regex(/^[A-Za-z0-9-]+$/, 'Número de documento inválido')
            .optional(),

        telefono: z
            .string({ error: 'El teléfono debe ser texto' })
            .trim()
            .max(20, 'El teléfono no puede superar los 20 caracteres')
            .regex(/^[0-9+\-\s]+$/, 'Teléfono inválido')
            .optional(),

        direccion: z
            .string({ error: 'La dirección debe ser texto' })
            .trim()
            .max(255, 'La dirección no puede superar los 255 caracteres')
            .optional(),
    }),
});

export type CrearUsuarioDto = z.infer<typeof CrearUsuarioSchema>;
