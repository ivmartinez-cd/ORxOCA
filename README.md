# OR x OCA

App para generar ordenes de retiro OCA en flujo rapido con selector de usuaria.

## Alcance actual

- App Next.js con login local por contrasena y acceso a `/rapido`.
- API `GET /api/quick-users` para listar usuarias de retiro.
- API `POST /api/pickups/create-simple` para crear OR OCA.
- Descarga automatica de etiqueta PDF luego de crear OR.
- Cliente OCA para `IngresoORMultiplesRetiros` y `GetPdfDeEtiquetasPorOrdenOrNumeroEnvio`.
- Soporte de DB dual:
  - Local: SQLite (`apps/web/orxoca.sqlite`).
  - Produccion: Postgres via `DATABASE_URL`.

## Requisitos

- Node.js 20+
- npm 10+ (o npm incluido con Node 20)

## Scripts rapidos (Windows)

- `instalar-deps.bat`: instala dependencias.
- `iniciar-app.bat`: instala deps si faltan, abre navegador e inicia la app.
- `iniciar-app-red.bat`: inicia la app para acceso por red interna (`0.0.0.0:3000`).
- `backup-db.bat`: crea backup de `apps/web/orxoca.sqlite` en `backups/`.
- `build-app.bat`: ejecuta build de produccion.

## Correr local

1. Copiar `.env.example` a `.env.local`.
2. Copiar tambien `.env.example` a `apps/web/.env.local` (este es el que usa Next en `npm run dev -w web`).
3. Instalar dependencias:

```bash
npm install
```

4. Levantar entorno:

```bash
npm run dev
```

5. Abrir `http://localhost:3000`.
6. Ingresar con la contrasena de `APP_PASSWORD`.

## Flujo simple con selector de usuaria

Ruta: `/rapido`

- Carga usuarias desde `quick_users`.
- Permite elegir una usuaria, previsualizar datos y generar OR.
- Configurado para este caso:
  - Destinatario fijo (Juan Pablo Corigliano, Laprida 3160, V.MARTELLI).
  - Paquete fijo (1 bulto, 3kg, 15x40x30).

## Variables de entorno requeridas

Copiar `.env.example` a `.env.local` y completar:

- Seguridad local: `APP_PASSWORD` (obligatoria para login).

- Credenciales y configuracion OCA: `OCA_USERNAME`, `OCA_PASSWORD`, `OCA_NRO_CUENTA`, `OCA_ID_OPERATIVA`, `OCA_CENTRO_COSTO`.
- Configuracion opcional OCA: `OCA_FRANJA_HORARIA`, `OCA_ID_CENTRO_IMPOSICION_ORIGEN`, `OCA_CONFIRMAR_RETIRO`.
- Etiquetas OCA: `OCA_LOGISTICA_INVERSA` (opcional, default `true`).
- Produccion (Vercel): `DATABASE_URL` (si esta definida, usa Postgres). En local no es necesaria.
- Destinatario fijo por default: `DEST_APELLIDO`, `DEST_NOMBRE`, `DEST_CALLE`, `DEST_NUMERO`, `DEST_CP`, `DEST_LOCALIDAD`, `DEST_PROVINCIA` (y opcionales de piso/depto/telefono/email/celular/observaciones).
- Defaults para datos de retiro (si faltan en CSV): `RETIRO_EMAIL_DEFAULT`, `RETIRO_OBSERVACIONES_DEFAULT`.
- Fallback de retiro por `.env` (si faltan columnas y no hay contacto maestro): `PICKUP_CALLE`, `PICKUP_NUMERO`, `PICKUP_CP`, `PICKUP_LOCALIDAD`, `PICKUP_PROVINCIA`.

## Uso en red interna (empresa)

1. En la PC que actuara como servidor, ejecutar `iniciar-app-red.bat`.
2. Ver la IP local de esa PC (ej: `192.168.1.25`).
3. Desde otras PCs abrir `http://IP_DEL_SERVIDOR:3000`.
4. Ingresar con la misma `APP_PASSWORD`.
5. Hacer backup periodico ejecutando `backup-db.bat`.

## Listo para GitHub

- El repo ya ignora archivos sensibles y generados via `.gitignore`:
  - `node_modules`, `.next`
  - `*.sqlite`, `backups/`
  - `.env.local` (raiz y `apps/web`)
  - CSV sensibles `quick_users_*.csv`
- Antes del primer push, validar:
  - que no haya credenciales reales en archivos versionados
  - que no se incluyan bases/exports locales

## Produccion en Vercel (opcional)

1. Crear DB Postgres (Neon/Supabase/Vercel Postgres).
2. Ejecutar `db-quick-users.sql` para crear tabla e importar usuarias.
3. En Vercel, cargar variables de entorno (`DATABASE_URL` + OCA_*).
4. Deploy del repo.

## Resultado de generacion

Despues de generar en OCA desde `/rapido`, la app permite:

- Ver `idOrdenRetiro` y `numeroEnvio`.
- Descargar etiqueta PDF automaticamente cuando OCA la devuelve.
