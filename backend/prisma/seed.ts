// Datos iniciales: política, 9 canchas, tarifas de ejemplo y un usuario por rol.
// Se puede ejecutar varias veces sin duplicar datos.
import bcrypt from 'bcryptjs';
import { prisma } from '../src/db';

const PASSWORD_DE_PRUEBA = 'Nikkei1234';

async function main() {
  // Política con los valores del SRS (seña 30 %, cancelación 12 h, retención 10 min, horario 9 a 24)
  await prisma.politica.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  // 4 canchas de fútbol 5 (60 min), 2 de fútbol 7 (60 min) y 3 de pádel (90 min)
  const canchas = [
    ...[1, 2, 3, 4].map((n) => ({ nombre: `Fútbol 5 - Cancha ${n}`, deporte: 'FUTBOL5' as const, duracionMin: 60 })),
    ...[1, 2].map((n) => ({ nombre: `Fútbol 7 - Cancha ${n}`, deporte: 'FUTBOL7' as const, duracionMin: 60 })),
    ...[1, 2, 3].map((n) => ({ nombre: `Pádel - Cancha ${n}`, deporte: 'PADEL' as const, duracionMin: 90 })),
  ];
  for (const c of canchas) {
    await prisma.cancha.upsert({ where: { nombre: c.nombre }, update: {}, create: c });
  }

  // Tarifas de ejemplo (en pesos por turno): de día y de noche
  if ((await prisma.tarifa.count()) === 0) {
    await prisma.tarifa.createMany({
      data: [
        { deporte: 'FUTBOL5', horaDesde: 9, horaHasta: 18, precio: 40000 },
        { deporte: 'FUTBOL5', horaDesde: 18, horaHasta: 24, precio: 50000 },
        { deporte: 'FUTBOL7', horaDesde: 9, horaHasta: 18, precio: 70000 },
        { deporte: 'FUTBOL7', horaDesde: 18, horaHasta: 24, precio: 85000 },
        { deporte: 'PADEL', horaDesde: 9, horaHasta: 18, precio: 30000 },
        { deporte: 'PADEL', horaDesde: 18, horaHasta: 24, precio: 38000 },
      ],
    });
  }

  // Un usuario por rol
  const passwordHash = await bcrypt.hash(PASSWORD_DE_PRUEBA, 10);
  const usuarios = [
    { email: 'admin@nikkei.com', nombre: 'Roberto', apellido: 'Salvatierra', rol: 'ADMINISTRADOR' as const },
    { email: 'encargada@nikkei.com', nombre: 'Marina', apellido: 'Costa', rol: 'ENCARGADO' as const },
    { email: 'recepcion@nikkei.com', nombre: 'Lucía', apellido: 'Gómez', rol: 'RECEPCIONISTA' as const },
    { email: 'cliente@nikkei.com', nombre: 'Juan', apellido: 'Pérez', rol: 'CLIENTE' as const },
  ];
  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, telefono: '1155550000', passwordHash, consentimientoEn: new Date() },
    });
  }
  console.log(`Seed listo. Usuarios de prueba (contraseña: ${PASSWORD_DE_PRUEBA}):`);
  usuarios.forEach((u) => console.log(`  ${u.rol.padEnd(14)} ${u.email}`));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
