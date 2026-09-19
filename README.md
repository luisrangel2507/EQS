# EQS · Control de Inspecciones

App de control de inspecciones de calidad para EQS (Ethical Quality Services),
empresa de sorteo/inspección para la cadena de suministro automotriz
(Tier 1/2/3) con sedes en México y EE. UU.

## Stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL (Neon) + Prisma
- NextAuth (Credentials provider, JWT, contraseñas con bcrypt)
- Tailwind CSS (paleta EQS: navy `#142B6B` + amarillo `#F4D935`, tipografías Manrope/Inter)
- Recharts (Pareto de defectos, tendencia de % de rechazo)
- @react-pdf/renderer (reporte de cierre en PDF)
- Despliegue en Railway (servicio web) + Neon (Postgres)

## Roles y permisos

Todas las reglas se validan en el servidor (API routes), no solo en la UI:

- **Admin**: acceso total, gestiona usuarios y sus roles.
- **Supervisor**: crea y cierra inspecciones, asigna inspectores, ve todo.
- **Inspector**: solo ve y captura en las inspecciones donde está asignado.
- **Cliente**: solo lectura, solo ve inspecciones donde el campo "cliente"
  coincide con su registro de usuario (`clienteNombre`).

## Desarrollo local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y ajusta `DATABASE_URL` (y `DIRECT_DATABASE_URL`)
   a tu Postgres local, o a tu proyecto de Neon si prefieres desarrollar contra
   Neon directamente.

3. Aplica las migraciones:

   ```bash
   npx prisma migrate dev
   ```

4. Levanta el servidor:

   ```bash
   npm run dev
   ```

5. Abre [http://localhost:3000](http://localhost:3000). Como no hay usuarios
   todavía, la pantalla de login te pedirá crear la cuenta del primer
   **Administrador** (bootstrap). Los demás usuarios los da de alta ese Admin
   desde la sección "Usuarios".

## Fotos de evidencia

Las capturas de piezas malas pueden incluir una foto opcional. Se sube a
`public/uploads` (servida como archivo estático en `/uploads/*`) y solo se
guarda la URL en Postgres — nunca la imagen en base64.

En Railway, monta un **Volume** exactamente en la ruta `public/uploads` del
servicio para que las fotos persistan entre deploys.

## Base de datos: Neon

Este proyecto usa [Neon](https://neon.tech) como proveedor de Postgres en vez
del plugin nativo de Railway, para tener branching de base de datos por
ambiente (útil si más adelante se agregan previews) y un free tier generoso.

1. Crea un proyecto en Neon y copia dos connection strings desde su dashboard:
   - **Pooled connection** (host con sufijo `-pooler`) → va en `DATABASE_URL`,
     es la que usa la app en cada request.
   - **Direct connection** (mismo host sin `-pooler`) → va en
     `DIRECT_DATABASE_URL`, la usa Prisma solo para `migrate deploy`
     (el pooler de Neon, PgBouncer en modo transacción, no soporta el tipo
     de sesión que necesitan las migraciones).
2. Agrega `?sslmode=require` al final de ambas si Neon no lo incluye ya.

## Checklist de salida a producción

- [ ] Repo en GitHub (privado)
- [ ] Proyecto en Neon creado, con las dos connection strings (pooled y directa) a mano
- [ ] Servicio web en Railway conectado al repo (rama `main`)
- [ ] Volume de Railway montado en `public/uploads` para las fotos de evidencia
- [ ] Variables de entorno en Railway: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- [ ] Backups automáticos de Postgres activados en Neon (point-in-time restore)
- [ ] Dominio propio tipo `inspecciones.eqservices.mx` con CNAME a Railway
- [ ] Certificado SSL (Railway lo da automático al conectar el dominio)
- [ ] Probar con 2-3 usuarios reales (un supervisor y un inspector) antes del rollout completo
- [ ] Definir quién es el primer Admin real antes de compartir el link (así no se lo gana cualquiera)

### Variables de entorno en producción

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Connection string **pooled** de Neon (host con `-pooler`) |
| `DIRECT_DATABASE_URL` | Connection string **directa** de Neon (mismo host sin `-pooler`), solo para migraciones |
| `NEXTAUTH_SECRET` | Valor aleatorio largo, distinto al de desarrollo (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL pública del servicio (ej. `https://inspecciones.eqservices.mx`) |

`npm run start` corre `prisma migrate deploy` antes de arrancar el servidor,
así que las migraciones se aplican automáticamente en cada deploy.
