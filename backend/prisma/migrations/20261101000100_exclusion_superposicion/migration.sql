-- RF004: impedir que dos reservas activas se solapen en la misma cancha.
-- Es la "red de seguridad" definitiva: aunque dos personas reserven a la vez,
-- PostgreSQL rechaza la segunda con el error 23P01.

-- Permite usar "=" sobre enteros dentro de un índice GiST
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Solo cuentan las reservas que ocupan la cancha (las canceladas, expiradas
-- y ausentes la liberan)
ALTER TABLE "Reserva"
  ADD CONSTRAINT "Reserva_sin_superposicion"
  EXCLUDE USING gist (
    "canchaId" WITH =,
    tsrange("inicio", "fin") WITH &&
  )
  WHERE ("estado" IN ('RETENIDA', 'RESERVADA', 'SENADA', 'EN_JUEGO', 'FINALIZADA'));
