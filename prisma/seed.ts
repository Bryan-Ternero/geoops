/**
 * Sample data — Unidad Minera Collpahuasi.
 *
 * Covers the three edge cases the brief requires: equipment about to reach maintenance, an
 * operator with an expired certification and a shift that triggers a block when closed. All
 * dates are relative to today so the demo still holds three days from now.
 *
 * Idempotent: clears operational rows and upserts catalogues by code, so running it again
 * always leaves the same scenario.
 */
// runs outside next, and the prisma 7 cli does not load .env on its own
import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { prisma } from '../src/infrastructure/database/prisma';
import { recalculateOperatorRisk } from '../src/use-cases/recalculate-risk';

/** operational date, N days from today */
function fecha(offsetDays: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function iso(offsetDays: number): string {
  return fecha(offsetDays).toISOString().slice(0, 10);
}

/** real shift instants in Lima time: day 07:00–19:00, night 19:00–07:00 */
function horario(offsetDays: number, journey: 'DAY' | 'NIGHT') {
  return journey === 'DAY'
    ? { startsAt: new Date(`${iso(offsetDays)}T12:00:00.000Z`), endsAt: new Date(`${iso(offsetDays + 1)}T00:00:00.000Z`) }
    : { startsAt: new Date(`${iso(offsetDays + 1)}T00:00:00.000Z`), endsAt: new Date(`${iso(offsetDays + 1)}T12:00:00.000Z`) };
}

async function main() {
  // 1. clear operational rows; catalogues are upserted
  await prisma.alert.deleteMany();
  await prisma.assignmentOverride.deleteMany();
  await prisma.hourmeterEntry.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.certification.deleteMany();

  // 2. users, credentials with secure bcrypt hashing
  const usuarios = [
    { email: 'supervisor@geoops.pe', name: 'Rosario Quispe', role: 'SUPERVISOR' as const, password: 'supervisor1234' },
    { email: 'planner@geoops.pe', name: 'Alonso Rivas', role: 'PLANNER' as const, password: 'planner1234' },
    { email: 'viewer@geoops.pe', name: 'Diana Flores', role: 'VIEWER' as const, password: 'viewer1234' },
  ];

  // delete any legacy users not in the active seed list
  await prisma.user.deleteMany({
    where: { email: { notIn: usuarios.map((u) => u.email) } },
  });

  const [supervisor, planner] = await Promise.all(
    usuarios.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role, passwordHash: bcrypt.hashSync(u.password, 10) },
        create: { email: u.email, name: u.name, role: u.role, passwordHash: bcrypt.hashSync(u.password, 10) },
      }),
    ),
  );

  // 3. equipment types
  const tipos = await Promise.all(
    [
      { code: 'CAM', name: 'Camión de acarreo', maintenanceIntervalHours: 250 },
      { code: 'EXC', name: 'Excavadora', maintenanceIntervalHours: 500 },
      { code: 'PER', name: 'Perforadora', maintenanceIntervalHours: 300 },
    ].map((t) => prisma.equipmentType.upsert({ where: { code: t.code }, update: t, create: t })),
  );

  const tipo = Object.fromEntries(tipos.map((t) => [t.code, t]));

  // 4. equipment — códigos diferenciados (TAC-xxx = Transporte Acarreo, EXC-2xx, FRD-3xx = Perforación)
  const equipos = await Promise.all(
    [
      { code: 'TAC-101', typeId: tipo.CAM.id, currentHours: 180, nextMaintenanceHours: 250, status: 'AVAILABLE' as const },
      // 12 h from its threshold: closing today's shift blocks it
      { code: 'TAC-102', typeId: tipo.CAM.id, currentHours: 738, nextMaintenanceHours: 750, status: 'AVAILABLE' as const },
      { code: 'TAC-103', typeId: tipo.CAM.id, currentHours: 1253, nextMaintenanceHours: 1250, status: 'BLOCKED' as const },
      { code: 'EXC-201', typeId: tipo.EXC.id, currentHours: 1180.5, nextMaintenanceHours: 1250, status: 'AVAILABLE' as const },
      { code: 'EXC-202', typeId: tipo.EXC.id, currentHours: 420, nextMaintenanceHours: 500, status: 'IN_MAINTENANCE' as const },
      { code: 'FRD-301', typeId: tipo.PER.id, currentHours: 402, nextMaintenanceHours: 500, status: 'AVAILABLE' as const },
    ].map((e) =>
      prisma.equipment.upsert({
        where: { code: e.code },
        // update restores the scenario on every reseed
        update: { ...e, version: 0 },
        create: e,
      }),
    ),
  );

  const equipo = Object.fromEntries(equipos.map((e) => [e.code, e]));

  // 5. operators and certifications — códigos OPR-01x y nombres nuevos
  const operadores = await Promise.all(
    [
      { code: 'OPR-010', fullName: 'Carlos Medina', document: '78234156' },
      { code: 'OPR-011', fullName: 'Elena Torres', document: '79156283' },
      { code: 'OPR-012', fullName: 'Héctor Salas', document: '79824516' },
      { code: 'OPR-013', fullName: 'Beatriz Rojas', document: '71528463' },
      { code: 'OPR-014', fullName: 'Pablo Condori', document: '72684135' },
      { code: 'OPR-015', fullName: 'Graciela Mamani', document: '73845921' },
    ].map((o) => prisma.operator.upsert({ where: { code: o.code }, update: o, create: o })),
  );

  const operador = Object.fromEntries(operadores.map((o) => [o.code, o]));

  await prisma.certification.createMany({
    data: [
      { operatorId: operador['OPR-010'].id, equipmentTypeId: tipo.CAM.id, issuedAt: fecha(-500), expiresAt: fecha(180) },
      { operatorId: operador['OPR-010'].id, equipmentTypeId: tipo.EXC.id, issuedAt: fecha(-400), expiresAt: fecha(180) },
      { operatorId: operador['OPR-011'].id, equipmentTypeId: tipo.CAM.id, issuedAt: fecha(-300), expiresAt: fecha(90) },
      { operatorId: operador['OPR-011'].id, equipmentTypeId: tipo.EXC.id, issuedAt: fecha(-300), expiresAt: fecha(90) },
      { operatorId: operador['OPR-012'].id, equipmentTypeId: tipo.PER.id, issuedAt: fecha(-200), expiresAt: fecha(300) },
      // expired 10 days ago: rejected by compliance rule
      { operatorId: operador['OPR-013'].id, equipmentTypeId: tipo.EXC.id, issuedAt: fecha(-400), expiresAt: fecha(-10) },
      // expires in 3 days with future shifts: marks assignments AT_RISK
      { operatorId: operador['OPR-014'].id, equipmentTypeId: tipo.CAM.id, issuedAt: fecha(-360), expiresAt: fecha(3) },
      // OPR-015 has none: uncertified operator
    ],
  });

  // 6. yesterday's closed shift: leaves history and ledger entries
  const ayer = await prisma.shift.create({
    data: {
      date: fecha(-1),
      journey: 'DAY',
      plannedHours: 12,
      ...horario(-1, 'DAY'),
      status: 'CLOSED',
      closedAt: new Date(),
      closedById: planner.id,
      assignments: {
        create: [
          { equipmentId: equipo['TAC-101'].id, operatorId: operador['OPR-010'].id, plannedHours: 12, actualHours: 12, status: 'COMPLETED', createdById: planner.id },
          {
            equipmentId: equipo['FRD-301'].id,
            operatorId: operador['OPR-012'].id,
            plannedHours: 12,
            actualHours: 9,
            varianceNote: 'Frente detenido 3 h por voladura programada en Cut-C.',
            status: 'COMPLETED',
            createdById: planner.id,
          },
        ],
      },
    },
    include: { assignments: true },
  });

  // the ledger must match the balance: initial load plus the closed shift
  const cerradoPorEquipo = new Map(ayer.assignments.map((a) => [a.equipmentId, Number(a.actualHours)]));

  for (const e of equipos) {
    const delCierre = cerradoPorEquipo.get(e.id) ?? 0;
    const inicial = Number(e.currentHours) - delCierre;

    await prisma.hourmeterEntry.create({
      data: {
        equipmentId: e.id,
        source: 'INITIAL_LOAD',
        hoursBefore: 0,
        hoursDelta: inicial,
        hoursAfter: inicial,
        note: 'Carga inicial del horómetro al implantar el sistema en Collpahuasi',
      },
    });

    if (delCierre > 0) {
      const asignacion = ayer.assignments.find((a) => a.equipmentId === e.id);

      await prisma.hourmeterEntry.create({
        data: {
          equipmentId: e.id,
          source: 'SHIFT_CLOSE',
          referenceId: asignacion?.id,
          hoursBefore: inicial,
          hoursDelta: delCierre,
          hoursAfter: Number(e.currentHours),
          createdById: planner.id,
        },
      });
    }
  }

  // 7. past maintenance 30 h overdue: EXC-201 was due at 750 h and served at 780
  await prisma.maintenanceRecord.create({
    data: {
      equipmentId: equipo['EXC-201'].id,
      performedAt: fecha(-45),
      hoursAtService: 780,
      thresholdHours: 750,
      overdueHours: 30,
      nextThresholdHours: 1250,
      responsible: 'Taller Collpahuasi · Téc. Jaime Quinteros',
      notes: 'Servicio de 750 h ejecutado con 30 h de atraso por demora en repuesto de bomba hidráulica.',
      registeredById: planner.id,
    },
  });

  // 8. scheduled shifts; closing today's day shift takes TAC-102 from 738 to 750 h
  await prisma.shift.create({
    data: {
      date: fecha(0),
      journey: 'DAY',
      plannedHours: 12,
      ...horario(0, 'DAY'),
      assignments: {
        create: [
          { equipmentId: equipo['TAC-102'].id, operatorId: operador['OPR-010'].id, plannedHours: 12, createdById: planner.id },
        ],
      },
    },
  });

  await prisma.shift.create({
    data: {
      date: fecha(0),
      journey: 'NIGHT',
      plannedHours: 12,
      ...horario(0, 'NIGHT'),
      assignments: {
        create: [
          { equipmentId: equipo['EXC-201'].id, operatorId: operador['OPR-011'].id, plannedHours: 12, createdById: planner.id },
        ],
      },
    },
  });

  // EXC-201 adds 12 h per shift and crosses 1250 h within the week
  for (let dia = 1; dia <= 6; dia += 1) {
    await prisma.shift.create({
      data: {
        date: fecha(dia),
        journey: 'DAY',
        plannedHours: 12,
        ...horario(dia, 'DAY'),
        assignments: {
          create: [
            { equipmentId: equipo['EXC-201'].id, operatorId: operador['OPR-011'].id, plannedHours: 12, createdById: planner.id },
            // already committed: today's close must leave this AT_RISK, not cancel it
            ...(dia === 2
              ? [{ equipmentId: equipo['TAC-102'].id, operatorId: operador['OPR-010'].id, plannedHours: 12, createdById: planner.id }]
              : []),
            // by day 5 this operator's truck certification has expired
            ...(dia === 5
              ? [{ equipmentId: equipo['TAC-101'].id, operatorId: operador['OPR-014'].id, plannedHours: 12, createdById: planner.id }]
              : []),
          ],
        },
      },
    });
  }

  // 9. risk is computed by the same service the application uses, not by the seed
  const riesgo = await recalculateOperatorRisk(prisma, operador['OPR-014'].id);

  console.info(
    JSON.stringify({
      seed: 'ok',
      planta: 'Collpahuasi',
      supervisor: supervisor.email,
      equipos: equipos.length,
      operadores: operadores.length,
      asignacionesEnRiesgo: riesgo.atRisk,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
