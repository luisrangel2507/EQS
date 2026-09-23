# EQS · Control de Inspecciones

App de control de inspecciones de calidad para EQS (Ethical Quality Services),
empresa de sorteo/inspección para la cadena de suministro automotriz
(Tier 1/2/3) con sedes en México y EE. UU.

## Stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma
- NextAuth (Credentials provider, JWT, contraseñas con bcrypt)
- Tailwind CSS (paleta EQS: navy `#142B6B` + amarillo `#F4D935`, tipografías Manrope/Inter)
- Recharts (Pareto de defectos, tendencia de % de rechazo)
- @react-pdf/renderer (reporte de cierre en PDF)
- Despliegue en Railway (Postgres + servicio web)

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

2. Copia `.env.example` a `.env` y ajusta `DATABASE_URL` a tu Postgres local.

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

## Fotos de evidencia y PDFs de instrucción de trabajo

Las capturas de piezas malas pueden incluir una foto opcional, y cada
inspección puede tener un PDF de instrucción de trabajo. Se guardan en
`storage/uploads` y se sirven mediante `/api/archivos/[archivo]` (requiere
sesión iniciada) en vez del directorio `public/`, porque Next.js cachea la
lista de archivos de `public/` al arrancar el servidor y no detecta los que
se escriben después en producción. Solo la URL se guarda en Postgres —
nunca el archivo en base64.

En Railway, monta un **Volume** exactamente en la ruta `storage/uploads` del
servicio para que las fotos y PDFs persistan entre deploys.

## Checklist de salida a producción

- [ ] Repo en GitHub (privado)
- [ ] Proyecto en Railway con servicio de Postgres + servicio web conectados
- [ ] Volume de Railway montado en `storage/uploads` para fotos de evidencia y PDFs de instrucción
- [ ] Variables de entorno en Railway: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- [ ] Backups automáticos de Postgres activados en Railway (retención 7-30 días)
- [ ] Dominio propio tipo `inspecciones.eqservices.mx` con CNAME a Railway
- [ ] Certificado SSL (Railway lo da automático al conectar el dominio)
- [ ] Probar con 2-3 usuarios reales (un supervisor y un inspector) antes del rollout completo
- [ ] Definir quién es el primer Admin real antes de compartir el link (así no se lo gana cualquiera)

### Variables de entorno en producción

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión de Postgres (la da Railway al conectar el plugin) |
| `NEXTAUTH_SECRET` | Valor aleatorio largo, distinto al de desarrollo (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL pública del servicio (ej. `https://inspecciones.eqservices.mx`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Par de llaves para notificaciones push (Web Push). Genéralas UNA sola vez con `node -e "console.log(require('web-push').generateVAPIDKeys())"` y no las cambies después (invalidarías todas las suscripciones ya guardadas) |
| `VAPID_SUBJECT` | `mailto:` de contacto que exige el estándar Web Push, ej. `mailto:soporte@eqservices.mx` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Mismo valor que `VAPID_PUBLIC_KEY`; debe estar disponible en **build time** (Railway la necesita antes de correr `npm run build`, no solo en runtime) |

`npm run start` corre `prisma migrate deploy` antes de arrancar el servidor,
así que las migraciones se aplican automáticamente en cada deploy.

### Notificaciones push

El botón "Activar notificaciones push" vive en el menú de perfil (esquina
superior derecha). Hoy se dispara cuando un inspector reporta una pieza NG,
avisando a los usuarios Cliente de esa empresa y a los usuarios Líder.

En iPhone, Safari solo permite notificaciones push si la app está agregada
a la pantalla de inicio (Compartir → Agregar a pantalla de inicio) y se abre
desde ahí, no desde una pestaña normal — es una limitación de iOS, no de la
app. En Android/desktop funciona directo desde el navegador.

## Despliegue para nuevos clientes (white-label)

El código es agnóstico a la marca (EQS). Todo texto de interfaz relacionado
con branding vive en `src/lib/branding.ts`, permitiendo deploys separados
por cliente sin tocar el código.

### 1. Personalizar branding (`src/lib/branding.ts`)

Edita las constantes exportadas:

```typescript
export const NOMBRE_CORTO = "TuApp";              // Nombre corto en browser tabs
export const NOMBRE_EMPRESA = "Tu Empresa";       // Logo y headers
export const NOMBRE_LEGAL = "Tu Empresa S.A.";    // Subtítulos legales
export const NOMBRE_APP = `Tu Empresa TuApp`;     // Título completo
export const DESCRIPCION_APP = "Tu descripción";  // Meta description y PWA
export const PIE_PDF = "Tu pie de página";        // Footer de PDFs
```

### 2. Swap logos

En la carpeta `public/`:

- Reemplaza `logo-header.png` (usado en AppShell, recomendado 200×60px)
- Reemplaza `icon.png` (512×512px, PWA icon)
- Reemplaza `apple-icon.png` (180×180px, acceso directo en iOS)

### 3. Ajustar colores Tailwind

En `tailwind.config.ts`, busca la sección de colores y cambia `navy` y `yellow`
a tus colores corporativos:

```typescript
colors: {
  navy: {
    50: "#F8F9FC",
    900: "#TuColorOscuro", // en lugar de "#142B6B"
    // ... resto de tonalidades
  },
  yellow: "#TuColorAmarillo", // en lugar de "#F4D935"
}
```

También actualiza `theme_color` en `app/manifest.ts` a tu color principal.

### 4. Crear una instancia en Railway

Sigue el checklist de salida a producción (arriba), pero:

1. Crea un **nuevo repositorio privado en GitHub** (o rama nueva en `claude/new-session-*`)
   para este cliente.

2. En Railway, crea un nuevo **Proyecto** (no servicio dentro del existente).
   Cada cliente tendrá su propia Postgres + servicio web aislados.

3. Configura las variables de entorno idénticas al checklist:
   `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, VAPID keys, etc.
   (El `NEXTAUTH_URL` debe apuntar al dominio del cliente, ej.
   `https://inspecciones.sucliente.com`).

4. Despliega desde la rama personalizada. Railway detectará `Dockerfile` y
   `package.json` automáticamente.

### Verificación rápida post-despliegue

Tras hacer deploy:

- [ ] Logo y textos en header coinciden con branding.ts
- [ ] Favicon en browser tabs muestra tu logo (ej. "TuApp")
- [ ] PDF de cierre lleva tu pie de página correcto
- [ ] Colores Tailwind (botones, cards, borders) son tus colores corporativos
- [ ] Dominio es de cliente (no *.railway.app)
- [ ] Primer usuario bootstrap se crea sin errores
