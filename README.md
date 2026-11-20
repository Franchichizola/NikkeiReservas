# Nikkei Reservas

Sistema de reservas de canchas de fútbol 5, fútbol 7 y pádel.

- **Backend:** Node.js + Express + TypeScript, con PostgreSQL y Prisma (carpeta `backend/`, puerto 3000).
- **Frontend:** React + Vite + Tailwind (carpeta `frontend/`, puerto 5173).
- **Base de datos:** PostgreSQL 16, que se levanta con Docker (`docker-compose.yml`).

Para ejecutar el proyecto se necesitan **tres cosas corriendo a la vez**: la base de datos, el backend y el frontend (cada uno en su propia terminal).

---

## 1. Requisitos (todos los sistemas operativos)

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 22 o superior (incluye `npm`) | Backend y frontend |
| Docker | Docker Desktop (Windows/Mac) o Docker Engine + Compose (Linux) | PostgreSQL |
| Git | Cualquiera (opcional) | Clonar el repositorio |

Verificá las versiones en una terminal:

```bash
node -v      # debe mostrar v22.x o superior
npm -v
docker --version
docker compose version
```

> Si no querés usar Docker, mirá la sección [PostgreSQL sin Docker](#postgresql-sin-docker).

---

## 2. Windows

Usá **PowerShell** (no hace falta ser administrador).

### 2.1 Instalar lo necesario

1. **Node.js 22+**: descargalo de <https://nodejs.org> (versión LTS o superior) o instalalo con:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
2. **Docker Desktop**: <https://www.docker.com/products/docker-desktop/> (o `winget install Docker.DockerDesktop`).
   Después de instalarlo, **abrí Docker Desktop y esperá a que diga "Engine running"** antes de seguir. Puede pedir reiniciar la PC y activar WSL 2.
3. Cerrá y volvé a abrir PowerShell para que reconozca los comandos nuevos.

### 2.2 Ejecutar el proyecto

**Terminal 1: base de datos y backend**

```powershell
# Ubicate en la carpeta raíz del proyecto (donde está docker-compose.yml)
cd C:\ruta\a\Nikkei

# 1) Levantar PostgreSQL
docker compose up -d

# 2) Instalar dependencias del backend
cd backend
npm install

# 3) Crear el archivo de variables de entorno
copy .env.example .env

# 4) Crear las tablas (migraciones)
npx prisma migrate deploy

# 5) Cargar datos iniciales (canchas, tarifas, usuarios de prueba)
npm run db:seed

# 6) Arrancar el backend
npm run dev
```

**Terminal 2: frontend** (abrí otra ventana de PowerShell)

```powershell
cd C:\ruta\a\Nikkei\frontend
npm install
copy .env.example .env
npm run dev
```

### 2.3 Problemas frecuentes en Windows

- **`Cannot find module '.prisma/client/default'`**: no se generó el cliente de Prisma. Dentro de `backend` ejecutá `npx prisma generate` y volvé a correr `npm run dev`. Si sigue fallando, borrá `node_modules` (`Remove-Item -Recurse -Force node_modules`), corré `npm install` y `npx prisma generate`.
- **OneDrive**: si el proyecto está dentro de una carpeta sincronizada con OneDrive (por ejemplo `Documents`), puede bloquear archivos durante `npm install`. Pausá la sincronización o mové el proyecto a una ruta como `C:\Nikkei`.
- **`docker : The term 'docker' is not recognized`**: Docker Desktop no está instalado o no está abierto. Abrilo y reiniciá PowerShell.
- **`npm : ... running scripts is disabled on this system`**: ejecutá una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y reabrí PowerShell.
- **El puerto 5432 ya está en uso**: tenés otro PostgreSQL instalado en Windows. Detené ese servicio (`services.msc` → *postgresql*) o cambiá el puerto en `docker-compose.yml` y en `DATABASE_URL`.

---

## 3. macOS

Usá la app **Terminal**.

### 3.1 Instalar lo necesario

Con [Homebrew](https://brew.sh) (si no lo tenés, instalalo desde su página):

```bash
brew install node@22
brew install --cask docker
```

> Si `node -v` no muestra la versión 22, ejecutá `brew link --overwrite node@22` o usá el instalador de <https://nodejs.org>.

Abrí **Docker Desktop** una vez (desde Aplicaciones) y esperá a que termine de iniciar.

### 3.2 Ejecutar el proyecto

**Terminal 1: base de datos y backend**

```bash
# Ubicate en la carpeta raíz del proyecto (donde está docker-compose.yml)
cd ~/ruta/a/Nikkei

# 1) Levantar PostgreSQL
docker compose up -d

# 2) Instalar dependencias del backend
cd backend
npm install

# 3) Crear el archivo de variables de entorno
cp .env.example .env

# 4) Crear las tablas (migraciones)
npx prisma migrate deploy

# 5) Cargar datos iniciales
npm run db:seed

# 6) Arrancar el backend
npm run dev
```

**Terminal 2: frontend** (nueva pestaña con `Cmd + T`)

```bash
cd ~/ruta/a/Nikkei/frontend
npm install
cp .env.example .env
npm run dev
```

### 3.3 Problemas frecuentes en macOS

- **`Cannot find module '.prisma/client/default'`**: dentro de `backend` ejecutá `npx prisma generate` y volvé a correr `npm run dev`.
- **`Cannot connect to the Docker daemon`**: Docker Desktop no está abierto. Abrilo y esperá a que inicie.
- **Puerto 5432 ocupado**: tenés otro PostgreSQL corriendo (por ejemplo, de Homebrew). Detenelo con `brew services stop postgresql` o cambiá el puerto en `docker-compose.yml` y en `DATABASE_URL`.
- **Puerto 5000/3000 ocupado**: el backend usa el 3000. Si está en uso, cambiá `PORT` en `backend/.env` y `VITE_API_URL` en `frontend/.env`.

---

## 4. Linux (Ubuntu / Debian)

Usá una terminal. Los comandos de instalación son para Ubuntu/Debian; en otras distribuciones usá el gestor de paquetes equivalente.

### 4.1 Instalar lo necesario

**Node.js 22** (con NodeSource):

```bash
sudo apt update
sudo apt install -y curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

**Docker Engine y Compose** (script oficial):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Después de `usermod`, **cerrá sesión y volvé a entrar** (o ejecutá `newgrp docker`) para usar Docker sin `sudo`.

### 4.2 Ejecutar el proyecto

**Terminal 1: base de datos y backend**

```bash
# Ubicate en la carpeta raíz del proyecto (donde está docker-compose.yml)
cd ~/ruta/a/Nikkei

# 1) Levantar PostgreSQL
docker compose up -d

# 2) Instalar dependencias del backend
cd backend
npm install

# 3) Crear el archivo de variables de entorno
cp .env.example .env

# 4) Crear las tablas (migraciones)
npx prisma migrate deploy

# 5) Cargar datos iniciales
npm run db:seed

# 6) Arrancar el backend
npm run dev
```

**Terminal 2: frontend**

```bash
cd ~/ruta/a/Nikkei/frontend
npm install
cp .env.example .env
npm run dev
```

### 4.3 Problemas frecuentes en Linux

- **`permission denied while trying to connect to the Docker daemon socket`**: tu usuario no está en el grupo `docker`. Ejecutá `sudo usermod -aG docker $USER` y volvé a iniciar sesión.
- **`Cannot find module '.prisma/client/default'`**: dentro de `backend` ejecutá `npx prisma generate` y volvé a correr `npm run dev`.
- **Puerto 5432 ocupado**: hay un PostgreSQL instalado en el sistema. Detenelo con `sudo systemctl stop postgresql` o cambiá el puerto en `docker-compose.yml` y en `DATABASE_URL`.
- **Node con una versión vieja** (`apt` instala una anterior a la 22): usá NodeSource como se muestra arriba o [nvm](https://github.com/nvm-sh/nvm): `nvm install 22`.

---

## 5. Abrir la aplicación

Con la base de datos, el backend y el frontend corriendo:

| Qué | Dirección |
|---|---|
| Aplicación (frontend) | <http://localhost:5173> |
| API (backend) | <http://localhost:3000> |
| Chequeo del backend | <http://localhost:3000/api/health> (debe responder `{"ok":true}`) |

Sin iniciar sesión se pueden **ver los turnos disponibles**, pero para **reservar** hay que ingresar con una cuenta de cliente.

### Usuarios de prueba

Contraseña de todos: `Nikkei1234`

| Rol | Email |
|---|---|
| Administrador | admin@nikkei.com |
| Encargado | encargada@nikkei.com |
| Recepcionista | recepcion@nikkei.com |
| Cliente | cliente@nikkei.com |
| Password | Nikkei1234 |

Los roles se heredan: el encargado puede hacer lo del recepcionista y el administrador lo del encargado.

---

## 6. Variables de entorno

**`backend/.env`**

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://nikkei:nikkei@localhost:5432/nikkei` | Conexión a PostgreSQL |
| `JWT_SECRET` | `secret123` | Secreto para firmar las sesiones (hay que cambiarlo en un proyecto real) |
| `JWT_EXPIRA` | `8h` | Duración de la sesión |
| `PORT` | `3000` | Puerto del backend |
| `WEBHOOK_SECRET` | `webhook_prueba` | Secreto del webhook simulado de Mercado Pago |

**`frontend/.env`**

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | URL del backend (sin `/api` al final) |
| `VITE_WEBHOOK_SECRET` | `webhook_prueba` | Debe ser igual a `WEBHOOK_SECRET` del backend (solo para el pago simulado) |

Si cambiás un `.env`, reiniciá el servidor correspondiente.

---

## 7. Comandos útiles

```bash
# Detener la base de datos (conserva los datos)
docker compose stop

# Volver a levantarla
docker compose up -d

# Borrar la base de datos por completo (se pierden todos los datos)
docker compose down -v

# Backend (dentro de backend/)
npm run dev          # desarrollo, se reinicia al guardar
npm run build        # compila a dist/
npm start            # ejecuta lo compilado (producción)
npm run db:seed      # carga datos iniciales (se puede repetir sin problema)
npx prisma generate  # regenera el cliente de Prisma

# Frontend (dentro de frontend/)
npm run dev          # desarrollo
npm run build        # compila para producción
npm run preview      # sirve la versión compilada
```

> Las migraciones se aplican con `npx prisma migrate deploy`. No uses `migrate dev` sin leer antes: Prisma no conoce la restricción anti-superposición de turnos que está escrita a mano en SQL.

---

## PostgreSQL sin Docker

Si preferís instalar PostgreSQL directamente (versión 14 o superior, con el paquete de extensiones `contrib` porque las migraciones usan `btree_gist`):

1. Instalá PostgreSQL: [Windows y macOS](https://www.postgresql.org/download/) o, en Ubuntu/Debian, `sudo apt install postgresql postgresql-contrib`.
2. Creá el usuario y la base:
   ```bash
   # Linux
   sudo -u postgres psql -c "CREATE USER nikkei WITH PASSWORD 'nikkei' SUPERUSER;"
   sudo -u postgres psql -c "CREATE DATABASE nikkei OWNER nikkei;"
   # macOS / Windows: abrí `psql` con tu usuario administrador y ejecutá las mismas dos sentencias SQL
   ```
3. Dejá `DATABASE_URL` en `backend/.env` apuntando a esa base y seguí desde el paso de `npx prisma migrate deploy`.

---

## Resumen rápido

```bash
docker compose up -d                                   # raíz del proyecto
cd backend && npm install && cp .env.example .env      # en Windows: copy
npx prisma migrate deploy && npm run db:seed
npm run dev                                            # terminal 1

cd frontend && npm install && cp .env.example .env    # en Windows: copy
npm run dev                                            # terminal 2
```

Luego abrí <http://localhost:5173>.
