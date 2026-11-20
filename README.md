# Nikkei Reservas – Backend (MVP)

API REST en Node.js + Express + TypeScript, con PostgreSQL y Prisma.
Cubre los requerimientos funcionales de prioridad Alta del SRS (RF001 a RF005, RF007, RF008, RF011 a RF017, RF019).

## Requisitos

- Node.js 22 o superior
- Docker con Docker Compose (solo para PostgreSQL)

## Puesta en marcha (paso a paso)

```bash
# 1) Base de datos (desde la carpeta raíz, donde está docker-compose.yml)
docker compose up -d

# 2) Entrar al backend e instalar dependencias
cd backend
npm install

# 3) Variables de entorno
cp .env.example .env          # en Windows: copy .env.example .env

# 4) Crear las tablas y la restricción anti-superposición (migraciones SQL)
npx prisma migrate deploy

# 5) Cargar datos iniciales (9 canchas, tarifas, usuarios de prueba)
npm run db:seed

# 6) Arrancar en modo desarrollo (se reinicia solo al guardar)
npm run dev
```

La API queda en `http://localhost:3000`. Probá: `curl http://localhost:3000/api/health`.
Para producción: `npm run build` y luego `npm start`.

## Usuarios de prueba

Contraseña de todos: `Nikkei1234`

| Rol | Email |
|---|---|
| Administrador | admin@nikkei.com |
| Encargado | encargada@nikkei.com |
| Recepcionista | recepcion@nikkei.com |
| Cliente | cliente@nikkei.com |
|password | Nikkei1234 |
Los roles se heredan: el encargado puede hacer lo del recepcionista, y el administrador lo del encargado.

## Probar el flujo completo en 4 comandos

```bash
# 1. Iniciar sesión como cliente y guardar el token
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"cliente@nikkei.com","password":"Nikkei1234"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

# 2. Reservar (queda RETENIDA 10 minutos). Usá una fecha entre hoy y los próximos 30 días.
curl -s -X POST localhost:3000/api/reservas -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"canchaId":1,"fecha":"2026-11-25","hora":"20:00"}'

# 3. Pedir el pago de la seña (devuelve "externoId")
curl -s -X POST localhost:3000/api/reservas/1/pagar-sena -H "Authorization: Bearer $TOKEN"

# 4. Simular el aviso de Mercado Pago (la reserva pasa a SENADA)
curl -s -X POST localhost:3000/api/pagos/webhook/mercadopago -H "x-webhook-secret: secreto-webhook-prueba" \
  -H "Content-Type: application/json" -d '{"externoId":"SIM-1-...","status":"approved"}'
```

## Endpoints

Todos devuelven JSON. Los errores tienen la forma `{ "error": "mensaje" }` (los de validación agregan `detalles`).
Salvo los marcados como públicos, hay que mandar `Authorization: Bearer <token>`.
En los ejemplos, `$TOKEN` es el token del rol indicado. Fechas: `AAAA-MM-DD`; horas: `HH:MM` (hora de Buenos Aires).

### Autenticación (públicos salvo `/me`)

```bash
# POST /api/auth/registro – crea un cliente (devuelve token)
curl -X POST localhost:3000/api/auth/registro -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","apellido":"Lopez","email":"ana@mail.com","telefono":"1155551111","password":"clave1234","aceptaTerminos":true}'

# POST /api/auth/login
curl -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"cliente@nikkei.com","password":"Nikkei1234"}'

# GET /api/auth/me – datos del usuario logueado
curl localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

### Disponibilidad (público)

```bash
# GET /api/disponibilidad?fecha=&deporte=&canchaId=   (deporte: FUTBOL5 | FUTBOL7 | PADEL; los dos filtros son opcionales)
curl "localhost:3000/api/disponibilidad?fecha=2026-11-25&deporte=PADEL"
```
Cada turno trae `hora`, `precio` y `estado`: `LIBRE`, `OCUPADO` o `NO_DISPONIBLE` (pasado o bloqueado).

### Reservas del cliente (rol CLIENTE)

```bash
# POST /api/reservas – retiene el turno 10 minutos
curl -X POST localhost:3000/api/reservas -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"canchaId":1,"fecha":"2026-11-25","hora":"20:00"}'

# GET /api/reservas/mias – historial con estado y pagos
curl localhost:3000/api/reservas/mias -H "Authorization: Bearer $TOKEN"

# POST /api/reservas/:id/pagar-sena – crea el pago pendiente (simulado) y devuelve "externoId"
curl -X POST localhost:3000/api/reservas/1/pagar-sena -H "Authorization: Bearer $TOKEN"

# POST /api/reservas/:id/cancelar – con 12 h o más reembolsa la seña; con menos, no
curl -X POST localhost:3000/api/reservas/1/cancelar -H "Authorization: Bearer $TOKEN"

# POST /api/reservas/:id/reprogramar – una sola vez, 12 h antes, mismo deporte (canchaId opcional)
curl -X POST localhost:3000/api/reservas/1/reprogramar -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fecha":"2026-11-26","hora":"21:00"}'
```

### Webhook simulado de Mercado Pago (sin token; usa el encabezado `x-webhook-secret` del `.env`)

```bash
# POST /api/pagos/webhook/mercadopago – status: approved | rejected | pending
curl -X POST localhost:3000/api/pagos/webhook/mercadopago -H "x-webhook-secret: secreto-webhook-prueba" \
  -H "Content-Type: application/json" -d '{"externoId":"SIM-1-1700000000000","status":"approved"}'
```
Es seguro mandarlo más de una vez. Si el pago llega después de que venció la retención y el turno ya lo tomó otro, se reembolsa solo.

### Recepción (desde RECEPCIONISTA)

```bash
# GET /api/recepcion/grilla?fecha=&dias=&deporte=   (dias=1 diaria, hasta 7 semanal)
curl "localhost:3000/api/recepcion/grilla?fecha=2026-11-25&dias=1" -H "Authorization: Bearer $TOKEN"

# GET /api/recepcion/clientes?q=   – busca por nombre, apellido o teléfono
curl "localhost:3000/api/recepcion/clientes?q=juan" -H "Authorization: Bearer $TOKEN"

# POST /api/recepcion/reservas – carga manual. Usá "clienteId" o "cliente" (alta rápida). "sena" es opcional.
# medios: EFECTIVO | TRANSFERENCIA | QR | TARJETA. Con 3 ausencias en 60 días hay que pagar el total.
curl -X POST localhost:3000/api/recepcion/reservas -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"canchaId":3,"fecha":"2026-11-25","hora":"19:00","cliente":{"nombre":"Pedro","telefono":"1144445555"},"sena":{"medio":"EFECTIVO","monto":15000}}'

# GET /api/recepcion/reservas/:id – detalle con pagos
curl localhost:3000/api/recepcion/reservas/1 -H "Authorization: Bearer $TOKEN"

# PATCH /api/recepcion/reservas/:id – cambia horario o cancha (mismo deporte)
curl -X PATCH localhost:3000/api/recepcion/reservas/1 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fecha":"2026-11-25","hora":"21:00"}'

# POST /api/recepcion/reservas/:id/cancelar – aplica la política; el ENCARGADO puede exceptuarla
curl -X POST localhost:3000/api/recepcion/reservas/1/cancelar -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"exceptuar":true,"motivo":"Lluvia"}'

# POST /api/recepcion/reservas/:id/checkin – el turno pasa a EN_JUEGO
curl -X POST localhost:3000/api/recepcion/reservas/1/checkin -H "Authorization: Bearer $TOKEN"

# POST /api/recepcion/reservas/:id/cobrar-saldo – cobra lo que falta, finaliza y devuelve el comprobante
curl -X POST localhost:3000/api/recepcion/reservas/1/cobrar-saldo -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"medio":"QR"}'

# POST /api/recepcion/reservas/:id/ausente – solo pasados 15 min del inicio; retiene la seña
curl -X POST localhost:3000/api/recepcion/reservas/1/ausente -H "Authorization: Bearer $TOKEN"
```

### Bloqueos de canchas (desde ENCARGADO)

```bash
# GET /api/bloqueos – vigentes y futuros
curl localhost:3000/api/bloqueos -H "Authorization: Bearer $TOKEN"

# GET /api/bloqueos/afectadas – vista previa de las reservas que quedarían afectadas
curl -G localhost:3000/api/bloqueos/afectadas -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "canchaIds=1,2" --data-urlencode "desde=2026-11-25T15:00:00-03:00" --data-urlencode "hasta=2026-11-25T18:00:00-03:00"

# POST /api/bloqueos – hay que decidir cada reserva afectada (CANCELAR = reembolso total, o REPROGRAMAR).
# Si falta alguna decisión responde 409 con la lista. Todo se aplica en una transacción.
curl -X POST localhost:3000/api/bloqueos -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"canchaIds":[1],"desde":"2026-11-25T15:00:00-03:00","hasta":"2026-11-25T18:00:00-03:00","motivo":"Mantenimiento",
       "acciones":[{"reservaId":4,"accion":"REPROGRAMAR","fecha":"2026-11-25","hora":"19:00"},{"reservaId":5,"accion":"CANCELAR"}]}'

# DELETE /api/bloqueos/:id – levanta el bloqueo
curl -X DELETE localhost:3000/api/bloqueos/1 -H "Authorization: Bearer $TOKEN"
```

### Caja (desde ENCARGADO)

```bash
# GET /api/caja/resumen?fecha= – cobros por medio, reembolsos, efectivo esperado y turnos sin resolver
curl "localhost:3000/api/caja/resumen?fecha=2026-11-19" -H "Authorization: Bearer $TOKEN"

# POST /api/caja/cierre – si hay diferencia de efectivo, "observacion" es obligatoria
curl -X POST localhost:3000/api/caja/cierre -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fecha":"2026-11-19","efectivoContado":12000}'

# POST /api/caja/reabrir – solo ADMINISTRADOR
curl -X POST localhost:3000/api/caja/reabrir -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fecha":"2026-11-19","motivo":"Faltó cargar un cobro"}'
```

### Administración (solo ADMINISTRADOR)

```bash
# Canchas (no se borran: se desactivan; con reservas futuras hay que usar un bloqueo)
curl localhost:3000/api/admin/canchas -H "Authorization: Bearer $TOKEN"                                   # GET
curl -X POST localhost:3000/api/admin/canchas -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nombre":"Pádel - Cancha 4","deporte":"PADEL"}'                                                     # POST
curl -X PATCH localhost:3000/api/admin/canchas/1 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"activa":false}'                                                                                    # PATCH

# Tarifas por deporte y franja (las franjas de un deporte no pueden superponerse)
curl localhost:3000/api/admin/tarifas -H "Authorization: Bearer $TOKEN"                                   # GET
curl -X POST localhost:3000/api/admin/tarifas -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"deporte":"PADEL","horaDesde":9,"horaHasta":12,"precio":28000}'                                    # POST
curl -X PATCH localhost:3000/api/admin/tarifas/1 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"precio":42000}'                                                                                    # PATCH

# Política: senaPorcentaje, horasCancelacion, retencionMinutos, minutosAusencia, ausenciasMax, ausenciasDias, horaApertura, horaCierre
curl localhost:3000/api/admin/politica -H "Authorization: Bearer $TOKEN"                                  # GET
curl -X PATCH localhost:3000/api/admin/politica -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"senaPorcentaje":40}'                                                                               # PATCH

# Usuarios y roles
curl "localhost:3000/api/admin/usuarios?rol=RECEPCIONISTA" -H "Authorization: Bearer $TOKEN"              # GET
curl -X POST localhost:3000/api/admin/usuarios -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nombre":"Sofia","apellido":"Ruiz","email":"sofia@nikkei.com","password":"clave12345","rol":"RECEPCIONISTA"}'  # POST
curl -X PATCH localhost:3000/api/admin/usuarios/5 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"rol":"ENCARGADO","activo":true}'                                                                   # PATCH
```

## Cómo está organizado el código

1. `src/index.ts` arma la app de Express, monta las rutas y arranca el servidor.
2. `src/routes/` tiene un archivo por funcionalidad: validan lo que llega con Zod y llaman a un servicio.
3. `src/services/` tiene la lógica de negocio (reservas, pagos, recepción, bloqueos, caja) y habla con la base.
4. `src/middleware/` tiene el login por JWT, el control de roles y el manejo de errores.
5. `src/services/mercadoPago.ts` es el **único** archivo que simula Mercado Pago: para usar el real, solo se reemplaza ese archivo.
6. `prisma/schema.prisma` define las tablas; `prisma/migrations/` tiene las migraciones SQL.
7. La segunda migración crea la restricción de exclusión de PostgreSQL: la base rechaza dos reservas activas solapadas en la misma cancha, aunque lleguen a la vez.
8. Las reservas retenidas vencidas pasan a `EXPIRADA` cada 30 segundos y también antes de consultar o reservar.
9. Las fechas se guardan en UTC y se interpretan en hora de Buenos Aires (UTC-3); ver `services/fechas.ts`.
10. `prisma/seed.ts` carga canchas, tarifas, política y usuarios de prueba; se puede correr más de una vez.

## Notas

- Los cambios de base de datos se aplican con `npx prisma migrate deploy` (no uses `migrate dev` sin leer antes: Prisma no conoce la restricción de exclusión que está escrita a mano en SQL).
- Cambiá `JWT_SECRET` y `WEBHOOK_SECRET` en `.env` antes de publicar el sistema en algún lado.
- Los estados de una reserva son: `RETENIDA`, `RESERVADA` (cargada en recepción sin seña), `SENADA`, `EN_JUEGO`, `FINALIZADA`, `AUSENTE`, `CANCELADA` y `EXPIRADA`.

## Pendiente (fuera del MVP, marcado como TODO en el código)

WhatsApp y correo reales (hoy se muestran con `console.log`), verificación de email y recuperar contraseña, bloqueo de login tras 5 intentos, turnos fijos semanales, reportes CSV/PDF, auditoría, bloqueos recurrentes, tarifas con vigencia futura, descuentos autorizados por el encargado, pruebas automáticas y Mercado Pago real.
