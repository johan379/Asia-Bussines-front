# Despliegue y operación

## Qué es un backup

Un **backup** es una copia independiente de la base de datos. Sirve para recuperar productos, movimientos y usuarios si ocurre un borrado accidental, un error de migración o un fallo del proveedor. No reemplaza las pruebas ni evita errores: permite volver a un estado anterior.

Supabase ofrece respaldos administrados; comprueba su disponibilidad y retención en el plan elegido. Además, conserva una copia externa periódica: así no dependes de un solo proveedor.

## Base de datos en Supabase

1. Crea el proyecto y en **Connect** copia la cadena adecuada para tu hosting.
2. Configura en el backend desplegado, nunca en React:

   ```env
   DATABASE_URL=postgresql+psycopg2://USUARIO:CONTRASENA@HOST:PUERTO/postgres?sslmode=require
   ```

3. Ejecuta una vez por despliegue de esquema:

   ```text
   alembic upgrade head
   ```

Para un backend persistente usa la conexión directa si el hosting tiene IPv6; para plataformas IPv4 o serverless usa el pooler indicado por Supabase. Consulta su [guía de conexiones](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Backup externo

Instala las herramientas de PostgreSQL para disponer de `pg_dump`. No guardes la contraseña en el script ni la confirmes en Git.

Ejecuta manualmente un backup:

```powershell
cd C:\Users\USUARIO\Inventario\backend
.\scripts\backup_supabase.ps1 -DatabaseUrl 'postgresql://USUARIO:CONTRASENA@HOST:PUERTO/postgres?sslmode=require' -OutputDirectory 'D:\Backups\Inventario'
```

El script crea un `.dump`, un hash SHA-256 y conserva 30 días. Programa esa orden diariamente con el **Programador de tareas de Windows** y sincroniza `D:\Backups\Inventario` a un almacenamiento externo cifrado. Prueba una restauración antes de depender de los backups:

```powershell
pg_restore --list D:\Backups\Inventario\inventario-AAAAmmdd-HHMMSS.dump
```

## Backend reproducible

El archivo `backend/Dockerfile` construye el backend igual en tu equipo y en el hosting:

```powershell
docker build -t inventario-api .\backend
docker run --rm -p 8000:8000 --env-file .\backend\.env inventario-api
```

El hosting debe definir estas variables: `ENTORNO=produccion`, `DATABASE_URL`, `SECRET_KEY`, `ORIGENES_PERMITIDOS`, `MAX_ARCHIVO_RECEPCION_BYTES` y, opcionalmente, `SENTRY_DSN` y `REDIS_URL`.

El `Dockerfile` del directorio raíz construye el frontend. La URL de API se fija durante el build:

```powershell
docker build --build-arg VITE_API_URL=https://api.tu-dominio.com -t inventario-web .
```

## HTTPS

HTTPS cifra la comunicación entre las bodegas y la aplicación. En Render, Railway, Vercel u otro hosting administrado, conecta tu dominio y activa el certificado TLS desde su panel; normalmente se renueva automáticamente. Publica solo URLs `https://` y luego configura:

```env
ORIGENES_PERMITIDOS=https://app.tu-dominio.com
```

No expongas el puerto de PostgreSQL ni `DATABASE_URL` al navegador.

## Monitoreo

La API registra cada solicitud, su estado y duración. Para alertas de errores, crea un proyecto en Sentry y configura en el backend:

```env
SENTRY_DSN=https://clave@o0.ingest.sentry.io/proyecto
```

Revisa también `GET /health`; devuelve 503 cuando la base de datos no responde. Configura el health check del hosting contra `https://api.tu-dominio.com/health`.

## Límite de archivos

Las recepciones aceptan únicamente `.xlsx` y `.xls`, hasta 15 MB por defecto. Cambia `MAX_ARCHIVO_RECEPCION_BYTES` si el negocio requiere más, solo después de medir el uso de memoria.
