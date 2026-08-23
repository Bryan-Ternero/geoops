import Link from 'next/link';

import { JORNADA, formatHoras } from '@/src/components/format';
import { Badge, Encabezado, Panel, Vacio, tabla } from '@/src/components/ui';
import type { Violation } from '@/src/core/rules/violation';
import { prisma } from '@/src/infrastructure/database/prisma';
import { formatIsoDate, toIsoDate, toOperationalDate } from '@/src/use-cases/dates';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rastro Operativo · GeoOps' };

const ORIGEN_EVENTO: Record<string, string> = {
  SHIFT_CLOSE: 'Cierre de Guardia',
  MAINTENANCE: 'Servicio en Taller',
  MANUAL_ADJUSTMENT: 'Ajuste Manual Calibrado',
  INITIAL_LOAD: 'Carga Inicial de Sistema',
};

export default async function AuditoriaPage() {
  const [excepcionesFirmadas, historialMovimientos] = await Promise.all([
    prisma.assignmentOverride.findMany({
      include: {
        authorizedBy: true,
        assignment: { include: { equipment: true, operator: true, shift: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.hourmeterEntry.findMany({
      include: { equipment: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const kpisAuditoria = [
    { label: 'Excepciones Autorizadas', valor: excepcionesFirmadas.length, sub: 'firmas de supervisor' },
    {
      label: 'Asientos de Horometría',
      valor: historialMovimientos.length,
      sub: 'transacciones registradas',
    },
    {
      label: 'Equipos Auditados',
      valor: new Set(historialMovimientos.map((h) => h.equipmentId)).size,
      sub: 'unidades con trazabilidad',
    },
  ];

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Rastro Operativo & Libro Mayor de Horometría"
        descripcion="Inmutabilidad contable de cada hora acumulada y trazabilidad completa de excepciones autorizadas por supervisión."
      />

      {/* Audit Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpisAuditoria.map((kpi) => (
          <div
            key={kpi.label}
            className="border border-line bg-surface p-5"
          >
            <span className="rotulo">{kpi.label}</span>
            <div className="mt-2 num text-3xl font-semibold tracking-tight text-ink">
              {kpi.valor}
            </div>
            <span className="mt-1 block text-xs text-muted">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* Authorized Overrides */}
      <Panel
        icono="bloqueado"
        titulo={`Registro de Excepciones Operativas (${excepcionesFirmadas.length})`}
        descripcion="Auditoría de despachos forzados bajo responsabilidad de supervisor"
      >
        {excepcionesFirmadas.length === 0 ? (
          <Vacio>
            No se registran excepciones autorizadas. Cuando un supervisor autorice un despacho excepcional, quedará asentada aquí la firma digital, el motivo y las reglas dispensadas.
          </Vacio>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {excepcionesFirmadas.map((o) => {
              const reglasDispensadas = (o.violatedRules as unknown as Violation[]) ?? [];

              return (
                <li key={o.id} className="p-5 transition-colors hover:bg-canvas-subtle">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Badge tono="aviso">Excepción Firmada</Badge>
                      <span className="font-mono font-bold text-ink">
                        {o.assignment.equipment.code}
                      </span>
                      <span className="text-sm font-medium text-muted">
                        · {o.assignment.operator.fullName} · Guardia del{' '}
                        {formatIsoDate(toIsoDate(o.assignment.shift.date))} ({JORNADA[o.assignment.shift.journey]})
                      </span>
                    </div>

                    <Link
                      href={`/turnos/${o.assignment.shiftId}`}
                      className="text-xs font-semibold text-accent hover:text-accent-hover underline"
                    >
                      Ver Guardia
                    </Link>
                  </div>

                  <div className="mt-3 border border-line bg-canvas-subtle p-3.5 text-xs text-ink">
                    <p className="font-medium">
                      <span className="text-muted font-normal">Autorizado por:</span>{' '}
                      <strong className="text-ink">{o.authorizedBy.name}</strong>{' '}
                      <span className="text-ink-low">
                        ({formatIsoDate(toOperationalDate(o.createdAt))})
                      </span>
                    </p>
                    <p className="mt-1 italic text-ink">&ldquo;{o.reason}&rdquo;</p>
                  </div>

                  {reglasDispensadas.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <span className="text-[11px] font-bold text-ink-low uppercase tracking-wider">
                        Reglas de negocio dispensadas:
                      </span>
                      <ul className="space-y-1 text-xs text-muted">
                        {reglasDispensadas.map((v) => (
                          <li key={v.code} className="flex items-start gap-2">
                            <span className="font-mono font-semibold text-bloqueo">{v.code}:</span>
                            <span>{v.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Hourmeter Ledger */}
      <Panel
        icono="auditoria"
        titulo="Libro Mayor de Asientos de Horómetro"
        descripcion="Auditoría cronológica inmutable de variaciones de horómetro"
      >
        {historialMovimientos.length === 0 ? (
          <Vacio>Sin movimientos registrados en el libro mayor.</Vacio>
        ) : (
          <div className={tabla.wrapper}>
            <table className={tabla.table}>
              <thead>
                <tr>
                  <th scope="col" className={tabla.th}>Fecha Asiento</th>
                  <th scope="col" className={tabla.th}>Código Unidad</th>
                  <th scope="col" className={tabla.th}>Origen del Asiento</th>
                  <th scope="col" className={`${tabla.th} text-right`}>Saldo Inicial</th>
                  <th scope="col" className={`${tabla.th} text-right`}>Delta Horas</th>
                  <th scope="col" className={`${tabla.th} text-right`}>Saldo Final</th>
                  <th scope="col" className={tabla.th}>Glosa / Justificación</th>
                </tr>
              </thead>
              <tbody>
                {historialMovimientos.map((h) => (
                  <tr key={h.id}>
                    <td className={`${tabla.td} font-mono font-medium text-muted whitespace-nowrap`}>
                      {formatIsoDate(toOperationalDate(h.createdAt))}
                    </td>
                    <td className={tabla.td}>
                      <Link
                        href={`/equipos/${h.equipmentId}`}
                        className="font-mono font-semibold text-ink hover:text-accent"
                      >
                        {h.equipment.code}
                      </Link>
                    </td>
                    <td className={`${tabla.td} font-medium text-ink`}>
                      {ORIGEN_EVENTO[h.source] ?? h.source}
                    </td>
                    <td className={`${tabla.num} text-ink-low`}>{formatHoras(h.hoursBefore)} h</td>
                    <td className={`${tabla.num} font-semibold text-ok`}>
                      +{formatHoras(h.hoursDelta)} h
                    </td>
                    <td className={`${tabla.num} font-bold text-ink`}>{formatHoras(h.hoursAfter)} h</td>
                    <td className={`${tabla.td} text-xs text-muted`}>{h.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-line-subtle bg-canvas-subtle p-4 text-xs text-muted">
          <strong>Invariante ACID:</strong> Ningún horómetro de maquinaria se incrementa sin registrar su correspondiente asiento en el libro mayor. Ambos cambios se ejecutan de manera atómica bajo transacción serializable.
        </div>
      </Panel>
    </div>
  );
}
