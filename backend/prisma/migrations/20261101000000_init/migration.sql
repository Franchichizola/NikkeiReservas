-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CLIENTE', 'RECEPCIONISTA', 'ENCARGADO', 'ADMINISTRADOR');
CREATE TYPE "Deporte" AS ENUM ('FUTBOL5', 'FUTBOL7', 'PADEL');
CREATE TYPE "EstadoReserva" AS ENUM ('RETENIDA', 'RESERVADA', 'SENADA', 'EN_JUEGO', 'FINALIZADA', 'AUSENTE', 'CANCELADA', 'EXPIRADA');
CREATE TYPE "TipoPago" AS ENUM ('SENA', 'SALDO', 'REEMBOLSO');
CREATE TYPE "MedioPago" AS ENUM ('MERCADO_PAGO', 'EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA');
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL DEFAULT '',
    "email" TEXT,
    "telefono" TEXT,
    "passwordHash" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'CLIENTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "consentimientoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cancha" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "deporte" "Deporte" NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Cancha_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tarifa" (
    "id" SERIAL NOT NULL,
    "deporte" "Deporte" NOT NULL,
    "horaDesde" INTEGER NOT NULL,
    "horaHasta" INTEGER NOT NULL,
    "precio" INTEGER NOT NULL,
    CONSTRAINT "Tarifa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Politica" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "senaPorcentaje" INTEGER NOT NULL DEFAULT 30,
    "horasCancelacion" INTEGER NOT NULL DEFAULT 12,
    "retencionMinutos" INTEGER NOT NULL DEFAULT 10,
    "minutosAusencia" INTEGER NOT NULL DEFAULT 15,
    "ausenciasMax" INTEGER NOT NULL DEFAULT 3,
    "ausenciasDias" INTEGER NOT NULL DEFAULT 60,
    "horaApertura" INTEGER NOT NULL DEFAULT 9,
    "horaCierre" INTEGER NOT NULL DEFAULT 24,
    CONSTRAINT "Politica_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reserva" (
    "id" SERIAL NOT NULL,
    "canchaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoReserva" NOT NULL,
    "precio" INTEGER NOT NULL,
    "montoSena" INTEGER NOT NULL,
    "pagoTotalRequerido" BOOLEAN NOT NULL DEFAULT false,
    "reprogramada" BOOLEAN NOT NULL DEFAULT false,
    "retenidaHasta" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "tipo" "TipoPago" NOT NULL,
    "medio" "MedioPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL,
    "monto" INTEGER NOT NULL,
    "externoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bloqueo" (
    "id" SERIAL NOT NULL,
    "canchaId" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bloqueo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CierreCaja" (
    "id" SERIAL NOT NULL,
    "fecha" TEXT NOT NULL,
    "totalCobrado" INTEGER NOT NULL,
    "totalReembolsos" INTEGER NOT NULL,
    "efectivoEsperado" INTEGER NOT NULL,
    "efectivoContado" INTEGER NOT NULL,
    "diferencia" INTEGER NOT NULL,
    "observacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CierreCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Cancha_nombre_key" ON "Cancha"("nombre");
CREATE INDEX "Reserva_canchaId_inicio_idx" ON "Reserva"("canchaId", "inicio");
CREATE INDEX "Reserva_clienteId_idx" ON "Reserva"("clienteId");
CREATE UNIQUE INDEX "Pago_externoId_key" ON "Pago"("externoId");
CREATE INDEX "Pago_creadoEn_idx" ON "Pago"("creadoEn");
CREATE UNIQUE INDEX "CierreCaja_fecha_key" ON "CierreCaja"("fecha");

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bloqueo" ADD CONSTRAINT "Bloqueo_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
