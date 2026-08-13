# Arquitejas — Backend

API en **FastAPI** para el sistema de inventario multi-bodega. Desarrollo
local con **MySQL**; el mismo código apunta a **Supabase (Postgres)** en
producción solo cambiando `DATABASE_URL` (SQLAlchemy abstrae el motor).

## Estructura

```
app/
  core/       configuración (.env) y seguridad (JWT, hashing)
  db/         engine, sesión y Base declarativa
  models/     tablas SQLAlchemy (una por dominio)
  schemas/    contratos Pydantic de entrada/salida
  api/
    deps.py       dependencias (sesión de BD, usuario autenticado, roles)
    routes/       un router por módulo del frontend
  services/   lógica de negocio pesada (clasificación de rollos, etc.)
alembic/      migraciones de base de datos
scripts/      utilidades de línea de comandos (seed de datos demo)
```

Cada router de `app/api/routes/` corresponde 1 a 1 con un módulo del
frontend: `inventario`, `bodegas`, `rollos`, `produccion`, `recepcion`.

## Puesta en marcha (desarrollo local, MySQL)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env      # y ajustar DATABASE_URL, SECRET_KEY

# Crear la base de datos vacía en MySQL, ej.:
#   mysql -u root -p -e "CREATE DATABASE arquitejas CHARACTER SET utf8mb4;"

alembic upgrade head

python -m scripts.seed    # bodegas, usuarios demo y tablas de equivalencias

uvicorn app.main:app --reload
```

En Windows PowerShell, si el entorno `.venv` anterior está roto, ejecuta:

```powershell
.\scripts\recrear_entorno.ps1
```

El script conserva el entorno anterior con un nombre de respaldo, instala las
dependencias y aplica las migraciones.

Documentación interactiva: `http://localhost:8000/docs`.

Cuentas demo (contraseña `123456789`): `ricaurte@gmail.com` (Bodega Ricaurte, Admin), `ricaurteplanta@gmail.com` (Bodega Ricaurte, Planta), `santander@gmail.com` (Bodega Santander, Admin), `santanderplanta@gmail.com` (Bodega Santander, Planta).

## Migrar a Supabase (producción)

1. Crear el proyecto en Supabase y copiar su cadena de conexión Postgres.
2. En el entorno de producción, definir:
   `DATABASE_URL=postgresql+psycopg2://usuario:password@db.xxxx.supabase.co:5432/postgres`
3. Correr `alembic upgrade head` apuntando a esa URL — no se toca ni una
   línea de `app/`, solo la variable de entorno.

## Migraciones y bases existentes

La revisión inicial crea el esquema de forma explícita: tablas, claves
foráneas e índices. Para una base vacía usa siempre:

```powershell
alembic upgrade head
```

Si ya tienes tablas creadas por una versión anterior, no ejecutes la revisión
inicial sobre ellas. Tras comprobar que el esquema coincide, marca ese punto
de partida una única vez:

```powershell
alembic stamp 20260812_01
alembic upgrade head
```

Antes de aplicar o revertir migraciones en producción, realiza una copia de
seguridad. En adelante, cada cambio de modelo debe crear una nueva revisión;
no se modifica una revisión ya aplicada en otro entorno.

## Convenciones

- Todo el dominio (Bodega, Usuario, Producto, Rollo, Movimiento, Solicitud,
  Producción, Recepción, tablas de equivalencia) vive en `app/models`,
  reflejando exactamente las entidades ya validadas en el prototipo React
  (`AlmacenGlobal.jsx` y los hooks de cada módulo).
- Autenticación por JWT (`Authorization: Bearer <token>`), emitido en
  `POST /auth/login`.
- El rol (`jefe_planta` / `administrativo`) restringe endpoints igual que
  hoy restringe rutas en `App.jsx` (ver `requiere_rol` en `app/api/deps.py`).

## Al añadir una función

1. Crea primero el modelo y su esquema Pydantic; después añade un router y,
   si contiene reglas de negocio reutilizables, un servicio en `app/services/`.
2. Genera una revisión nueva con `alembic revision --autogenerate -m "..."`.
   No edites una migración que ya se haya ejecutado en otro entorno y procura
   que cada revisión tenga un `downgrade` verificable.
3. Las operaciones que descuenten o transfieran existencias deben consultar
   la fila con `with_for_update()` dentro de la misma transacción antes de
   validar el saldo. Así dos usuarios no pueden consumir la misma existencia.
4. Añade una prueba de integración para cada regla y un caso E2E cuando el
   usuario interactúe con una pantalla nueva.
