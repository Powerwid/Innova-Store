# Innova Store

El frontend es React con Vite y el backend es NestJS. La API vive bajo `/api`.

## Desarrollo

1. Instale las dependencias en `frontend` y `backend` con `npm install`.
2. Configure `backend/.env` a partir de `backend/.env.example`.
3. Ejecute `npm run dev` desde la raíz.

Vite abre `http://localhost:5173` y reenvía las solicitudes `/api` a Nest en `http://localhost:3000`. Use siempre rutas relativas `/api/...` desde React; así el navegador maneja las cookies bajo el mismo origen visible.

## Producción

Ejecute `npm run build` desde la raíz y luego `npm start`. El build de Vite coloca los archivos en `backend/public`; Nest sirve esos archivos y la API desde la misma URL. El comando de arranque usa `NODE_ENV=production`, por lo que las cookies `Secure` requieren HTTPS. `backend/public` es un artefacto de compilación y no se guarda en Git.

La configuración de autenticación y las rutas disponibles están en [backend/ACCESO.md](backend/ACCESO.md).
