# InspeccionAPP

Plataforma de control de inspecciones y sorteos de calidad para la cadena de suministro
automotriz (Tier 1/2/3). Varias empresas de sorteo pueden usarla a la vez, cada una aislada
de las demás (ver "Multi-empresa").

## Stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma
- NextAuth (Credentials provider, JWT, contraseñas con bcrypt)
- Tailwind CSS (paleta: navy `#142B6B` + amarillo `#F4D935`, tipografías Manrope/Inter)
- Recharts (Pareto de defectos, tendencia de % de rechazo)
- @react-pdf/renderer (reporte de cierre en PDF)
- Despliegue en Railway (Postgres + servicio web)

## Roles y permisos

Todas las reglas se validan en el servidor (API routes), no solo en la UI:

- **Admin**: acceso total, gestiona usuarios, empresas y facturación.
- **Supervisor**: crea y cierra inspecciones, asigna inspectores, ve todo.
- **Gerente**: ve todo el piso y la facturación.
- **Líder**: da seguimiento en piso (apoyo, turnos, 8D).
- **Inspector**: solo ve y captura en las inspecciones donde está asignado.
- **Residente**: personal fijo en la planta de un cliente; ve las inspecciones de su planta.
- **Cliente**: solo lectura, solo ve inspecciones donde el campo "cliente"
  coincide con su registro de usuario (`clienteNombre`).

## Módulos

- **Captura en piso**: vibración y flash al registrar, botón *Deshacer* (2 min) y
  **modo sin señal**: las capturas se guardan en el equipo (fotos incluidas) y se
  envían solas al volver la conexión, sin duplicarse.
- **Turnos** (`/turnos`): números del turno en curso y bitácora de entrega/recepción de turno.
- **Portal del cliente**: *🔗 Compartir* genera un enlace en vivo de solo lectura
  (avance, Pareto y fotos, sin precios) con vigencia y revocable.
- **Reportes 8D**: por inspección, con borrador automático de D1–D3 y PDF.
- **Facturación** (`/facturacion`, Admin y Gerente): piezas × precio por mes y
  cliente, estado de cuenta en PDF y CSV.
- **Ranking** (`/ranking`): volumen y ritmo por inspector y por turno.
- **Modo TV / Andon** (`/tv`): pantalla de piso con semáforo por sorteo, banner de
  llamados de apoyo, cinta de alertas y alarma sonora opcional. Filtra por planta con
  `/tv?planta=Querétaro`.
- **Control estadístico**: gráfica p por hora con límites de control y fecha estimada de
  término en el detalle de cada inspección.
- **Paleta de comandos** (Ctrl K o 🔍): busca piezas, clientes, páginas y acciones.
- **Recorrido de bienvenida** por rol la primera vez que alguien entra.
- **Alta de cliente** (Empresas → *Alta de cliente completa*): empresa, accesos con
  contraseña generada y primera inspección en un solo paso.
- **Página pública** en `/` para quien no tiene sesión, con botón de *Solicitar demo*.
- **Modo oscuro**: en el menú de perfil.
- **Retrabajo**: las piezas NG recuperadas se registran aparte (NG final = malas − recuperadas).
  No generan cobro extra: la facturación sigue siendo por pieza inspeccionada u hora.
- **Solicitudes de servicio** (`/solicitudes`): el cliente pide un sorteo, retrabajo o
  inspección de recibo; al aceptarla se crea la inspección.
- **Asistencia y cobro por hora** (`/asistencia`): jornadas de inspectores; una inspección
  puede facturarse por pieza o por hora con estas horas.
- **Certificación de inspectores** (`/certificaciones`): criterio con fotos OK/NG y examen
  por número de parte; solo inspectores certificados se pueden asignar a ese número de parte.
- **Auditorías y checklists** (`/auditorias`): plantillas configurables (LPA, 5S, recibo),
  captura punto por punto con foto del hallazgo, % de cumplimiento y PDF. El cliente ve las
  cerradas de su empresa.
- **Material liberado** (*✅ Liberar material* en cada inspección): etiqueta bilingüe por
  contenedor con QR; `/t/{código}` es pública y muestra qué se inspeccionó, cuándo y por quién.
  Liderazgo puede anular una etiqueta y su QR avisa en rojo que no se use.
- **Inglés / español**: selector ES | EN en el perfil, login, landing y páginas públicas. Sin
  sesión se usa el idioma del navegador; dentro de la app el default es español. Los PDF
  (cierre, 8D, auditoría) salen en el idioma elegido.
- **Multi-empresa (SaaS)**: ver la sección siguiente.

## Multi-empresa

Una sola instalación atiende a varias empresas de sorteo, cada una aislada de las demás.

- Solo `Usuario`, `Inspeccion`, `Empresa` y `CriterioParte` guardan `organizacionId`; el
  resto de tablas se aísla por su relación con ellas. `src/lib/tenant.ts` es una extensión de
  Prisma que agrega el filtro de la organización de la sesión a **toda** consulta, así una
  ruta nueva no puede olvidarlo. Sin sesión, las consultas no regresan nada.
- `prismaGlobal` (sin filtro) se usa solo en login, alta de organizaciones, el panel de
  plataforma y las páginas públicas por código/token (`/t/…`, `/compartido/…`).
- El nombre de usuario es único en toda la plataforma; los nombres de clientes y números de
  parte solo deben ser únicos dentro de cada organización.
- **Plataforma** (`/plataforma`, menú de perfil): la ven los usuarios con `superadmin`
  (los Admin que existían al migrar). Da de alta organizaciones con su primer Admin y
  contraseña temporal, las renombra o suspende (sus usuarios ya no pueden entrar).
- **Registro público** (`/registro`): cualquier empresa crea su cuenta sola si
  `REGISTRO_ABIERTO=1`; si no, la página indica que es por invitación.
- Reportes, PDF, etiquetas y la verificación pública muestran el nombre de la organización
  que emitió el documento.
- Al migrar, todo lo existente quedó en la organización principal (`org_principal`), sin cambios
  para los usuarios actuales.

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
- [ ] Dominio propio (por ejemplo `app.tudominio.com`) con CNAME a Railway
- [ ] Certificado SSL (Railway lo da automático al conectar el dominio)
- [ ] Probar con 2-3 usuarios reales (un supervisor y un inspector) antes del rollout completo
- [ ] Definir quién es el primer Admin real antes de compartir el link (así no se lo gana cualquiera)

### Variables de entorno en producción

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión de Postgres (la da Railway al conectar el plugin) |
| `NEXTAUTH_SECRET` | Valor aleatorio largo, distinto al de desarrollo (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL pública del servicio (ej. `https://app.tudominio.com`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Par de llaves para notificaciones push (Web Push). Genéralas UNA sola vez con `node -e "console.log(require('web-push').generateVAPIDKeys())"` y no las cambies después (invalidarías todas las suscripciones ya guardadas) |
| `VAPID_SUBJECT` | `mailto:` de contacto que exige el estándar Web Push, ej. `mailto:soporte@tudominio.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Mismo valor que `VAPID_PUBLIC_KEY`; debe estar disponible en **build time** (Railway la necesita antes de correr `npm run build`, no solo en runtime) |
| `NEXT_PUBLIC_ZONA_HORARIA` | Zona horaria de planta para turnos, cortes de mes y ranking (default `America/Monterrey`). Plantas fronterizas con horario de verano de EE. UU.: `America/Matamoros`. Se lee en **build time** |
| `TASA_IVA` | Opcional. Tasa de IVA del estado de cuenta (default `0.16`) |
| `NEXT_PUBLIC_CONTACTO_WHATSAPP` | Opcional. WhatsApp del botón *Solicitar demo* de la página pública, formato internacional sin signos (ej. `5218112345678`). Se lee en **build time** |
| `NEXT_PUBLIC_CONTACTO_EMAIL` | Opcional. Correo alterno para *Solicitar demo* si no hay WhatsApp. Se lee en **build time** |
| `REGISTRO_ABIERTO` | Opcional. `1` permite que cualquier empresa cree su cuenta en `/registro`; si falta, las organizaciones solo las da de alta un superadmin en `/plataforma` |

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

> Con multi-empresa, lo normal es dar de alta al nuevo cliente como organización en
> `/plataforma` de la misma instalación. Una instancia separada solo hace falta si el
> cliente exige su propio dominio, base de datos o logotipo.

El código es agnóstico a la marca. Todo texto de interfaz relacionado
con branding vive en `src/lib/branding.ts`, permitiendo deploys separados
por cliente sin tocar el código.

### 1. Personalizar branding (`src/lib/branding.ts`)

Edita las constantes exportadas:

```typescript
export const NOMBRE_CORTO = "TuApp";              // Nombre corto en browser tabs
export const NOMBRE_EMPRESA = "Tu Empresa";       // Nombre en reportes
export const NOMBRE_LEGAL = "Tu Empresa S.A.";    // Subtítulos legales
export const NOMBRE_APP = NOMBRE_CORTO;           // Título completo
export const DESCRIPCION_APP = "Tu descripción";  // Meta description y PWA
export const PIE_PDF = "Tu pie de página";        // Footer de PDFs
```

### 2. Swap logos

En la carpeta `public/`:

- Reemplaza `logo-header.png` (PNG transparente, logo claro para fondo azul oscuro; ~1200 px de ancho)
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
