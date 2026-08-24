import Link from 'next/link';

import type { ReactNode } from 'react';

import { AlertBand } from '@/src/components/alert-band';
import { AlertCard } from '@/src/components/alert-card';
import { DisponibilidadPorDia } from '@/src/components/charts';
import { KpiCard } from '@/src/components/kpi-card';
import { StatusCard } from '@/src/components/status-card';
import { Icon, type NombreIcono } from '@/src/components/icons';
import { Badge, BarraHorometro, Encabezado, Panel, Vacio, boton, tabla } from '@/src/components/ui';
import {
  ESTADO_EQUIPO,
  ESTADO_TURNO,
  JORNADA,
  formatHoras,
} from '@/src/components/format';
import { prisma } from '@/src/infrastructure/database/prisma';
import { formatIsoDate, toIsoDate, toOperationalDate } from '@/src/use-cases/dates';
import { getProjection } from '@/src/use-cases/get-projection';

export const dynamic = 'force-dynamic';

const DIAS_PROYECCION = 7;

const ALERTA_CONFIG: Record<string, { label: string; icono: NombreIcono }> = {
  MAINTENANCE_DUE_SOON: { label: 'Mantenimiento Requerido', icono: 'taller' },
  ASSIGNMENT_AT_RISK: { label: 'Despacho en Riesgo Crítico', icono: 'alerta' },
  CERT_EXPIRING_BEFORE_SHIFT: { label: 'Certificación Vencida/Por Vencer', icono: 'operadores' },
  OVERRIDE_USED: { label: 'Excepción Operativa Autorizada', icono: 'bloqueado' },
};

/** etiqueta relativa "Hace Xm/Xh/Xd" para el Action Center */
function haceCuanto(fecha: Date): string {
  const min = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 60_000));
  if (min < 60) return `Hace ${min}m`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas}h`;
  return `Hace ${Math.floor(horas / 24)}d`;
}

/** microlabel mono de nivel operacional (decorativo; la sección lleva aria-label) */
function Nivel({ children }: { children: ReactNode }) {
  return (
    <p aria-hidden className="rotulo mb-3 flex items-center gap-2">
      <span className="h-px w-4 bg-line-strong" />
      {children}
    </p>
  );
}

export default async function TableroPage() {
  const tiempoActual = new Date();
  const fechaOperativaHoy = new Date(`${toOperationalDate(tiempoActual)}T00:00:00.000Z`);

  const [flotaEquipos, turnosOperativos, alertasActivas, proyeccionMantenimiento] = await Promise.all([
    prisma.equipment.findMany({ include: { type: true }, orderBy: { code: 'asc' } }),
    prisma.shift.findMany({
      where: { date: { gte: fechaOperativaHoy } },
      include: { _count: { select: { assignments: true } } },
      orderBy: [{ date: 'asc' }, { journey: 'asc' }],
      take: 6,
    }),
    prisma.alert.findMany({
      where: { resolvedAt: null },
      include: { equipment: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    getProjection(DIAS_PROYECCION, tiempoActual),
  ]);

  const ORDEN_SEVERIDAD = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
  const alertasOrdenadas = [...alertasActivas].sort(
    (a, b) => ORDEN_SEVERIDAD[a.severity] - ORDEN_SEVERIDAD[b.severity],
  );
  const totalCriticas = alertasOrdenadas.filter((a) => a.severity === 'CRITICAL').length;

  const desgloseEstados = flotaEquipos.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const turnosPlanificados = turnosOperativos.filter((t) => t.status === 'PLANNED').length;
  const unidadesEnRiesgoProyeccion = proyeccionMantenimiento.filter(
    (f) => f.projection.status === 'WILL_CROSS',
  ).length;
  const unidadesDetenidas = (desgloseEstados.BLOCKED ?? 0) + (desgloseEstados.IN_MAINTENANCE ?? 0);

  const ventanaTemporal = Array.from({ length: DIAS_PROYECCION }, (_, i) =>
    toOperationalDate(new Date(tiempoActual.getTime() + i * 86_400_000)),
  );

  const curvaDisponibilidad = ventanaTemporal.map((fecha) => {
    const fueraDeServicio = proyeccionMantenimiento.filter((f) => {
      if (f.status !== 'AVAILABLE') return true;
      if (f.projection.status === 'ALREADY_BLOCKED') return true;
      return f.projection.status === 'WILL_CROSS' && f.projection.crossesOn <= fecha;
    }).length;

    return {
      fecha,
      detenidos: fueraDeServicio,
      disponibles: proyeccionMantenimiento.length - fueraDeServicio,
    };
  });

  const metricasResumen: {
    titulo: string;
    subtitulo: string;
    valor: number;
    totalRef?: number;
    icono: NombreIcono;
    href: string;
    acento: string;
  }[] = [
    {
      titulo: 'Maquinaria Operativa',
      subtitulo: `${flotaEquipos.length} unidades en el parque · listas para asignación`,
      valor: desgloseEstados.AVAILABLE ?? 0,
      totalRef: flotaEquipos.length,
      icono: 'equipos',
      href: '/equipos',
      acento: 'bg-ok-dim text-ok',
    },
    {
      titulo: 'En Taller / Servicio',
      subtitulo: 'Detenidas por mantenimiento preventivo o correctivo',
      valor: unidadesDetenidas,
      icono: 'bloqueado',
      href: '/equipos',
      acento: 'bg-bloqueo-dim text-bloqueo',
    },
    {
      titulo: 'Guardias Planificadas',
      subtitulo: 'Jornadas programadas pendientes de cierre',
      valor: turnosPlanificados,
      icono: 'turnos',
      href: '/turnos',
      acento: 'bg-taller-dim text-taller',
    },
    {
      titulo: 'Umbral Crítico · 7 Días',
      subtitulo: 'Proyección de cruces de umbral inminentes',
      valor: unidadesEnRiesgoProyeccion,
      icono: 'proyeccion',
      href: '/proyeccion',
      acento: 'bg-aviso-dim text-aviso',
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
      {/* ── Columna principal: tiers CRÍTICO → OPERACIÓN → REFERENCIA ── */}
      <div className="min-w-0 space-y-10">
        <Encabezado
          titulo="Panel de Control"
          descripcion="Telemetría de horómetros, despacho validado multi-regla y predictivo de mantenimiento a 7 días."
        />

        {/* TIER 01 · CRÍTICO */}
        <section
          aria-label="Nivel crítico"
          className="motion-safe:animate-[aviso-in_180ms_var(--ease-out-quart)_both]"
        >
          <Nivel>01 · CRÍTICO</Nivel>
          <AlertBand criticos={totalCriticas} bloqueados={desgloseEstados.BLOCKED ?? 0} />
        </section>

        {/* TIER 02 · OPERACIÓN */}
        <section
          aria-label="Nivel operativo"
          className="space-y-6 motion-safe:animate-[aviso-in_180ms_var(--ease-out-quart)_80ms_both]"
        >
          <Nivel>02 · OPERACIÓN</Nivel>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricasResumen.map((kpi) => (
              <KpiCard
                key={kpi.titulo}
                href={kpi.href}
                rotulo={kpi.titulo}
                valor={
                  <>
                    {kpi.valor}
                    {kpi.totalRef !== undefined && (
                      <span className="num ml-1.5 align-baseline text-xs font-normal text-muted">
                        / {kpi.totalRef}
                      </span>
                    )}
                  </>
                }
                subtitulo={kpi.subtitulo}
                icono={kpi.icono}
                chipClase={kpi.acento}
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            {/* célula héroe: raised + ticks plenos */}
            <Panel
              icono="proyeccion"
              titulo="Curva Predictiva de Disponibilidad · 7 Días"
              descripcion="Simulación de horas acumuladas sobre guardias programadas"
              className="ticks-full border-line-strong shadow-[0_8px_24px_rgba(46,36,22,0.08)]"
              acciones={
                <Link
                  href="/proyeccion"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-texto transition-colors duration-(--dur-med) hover:text-accent-hover"
                >
                  Matriz Predictiva
                  <Icon name="flecha" className="size-3.5" />
                </Link>
              }
            >
              <div className="p-5">
                <DisponibilidadPorDia dias={curvaDisponibilidad} />
              </div>
            </Panel>

            <Panel
              icono="turnos"
              titulo="Próximas Guardias"
              descripcion="Despacho y cierre de turno"
              acciones={
                <Link
                  href="/turnos"
                  className={boton.tabla}
                >
                  Ver Todas
                  <Icon name="flecha" className="size-3.5" />
                </Link>
              }
            >
              {turnosOperativos.length === 0 ? (
                <Vacio
                  accion={
                    <Link href="/turnos" className={boton.primario}>
                      <Icon name="mas" className="size-4" />
                      Programar Guardia
                    </Link>
                  }
                >
                  No existen guardias programadas en la ventana actual.
                </Vacio>
              ) : (
                <ul className="space-y-2 p-3">
                  {turnosOperativos.map((turno) => {
                    const horasHasta = Math.round(
                      (turno.date.getTime() - tiempoActual.getTime()) / 3_600_000,
                    );
                    const relativo =
                      horasHasta <= 0 ? 'en curso' : horasHasta < 48 ? `inicia en ${horasHasta} h` : '';
                    return (
                      <li key={turno.id}>
                        <StatusCard
                          href={`/turnos/${turno.id}`}
                          codigo={formatIsoDate(toIsoDate(turno.date))}
                          badge={
                            <Badge tono={ESTADO_TURNO[turno.status].tono}>
                              {ESTADO_TURNO[turno.status].label}
                            </Badge>
                          }
                          detalle={
                            <>
                              Jornada {JORNADA[turno.journey]} ·{' '}
                              {formatHoras(turno.plannedHours)} h programadas ·{' '}
                              {turno._count.assignments} activos
                              {relativo && <> · {relativo}</>}
                            </>
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </section>

        {/* TIER 03 · REFERENCIA */}
        <section
          aria-label="Nivel de referencia"
          className="motion-safe:animate-[aviso-in_180ms_var(--ease-out-quart)_160ms_both]"
        >
          <Nivel>03 · REFERENCIA</Nivel>

          <Panel
            icono="equipos"
            titulo="Parque de Maquinaria & Telemetría"
            descripcion="Horómetro acumulado vs. umbral de mantenimiento preventivo"
            acciones={
              <Link href="/equipos" className={boton.tabla}>
                Inventario Completo
                <Icon name="flecha" className="size-3.5" />
              </Link>
            }
          >
            <div className={tabla.wrapper}>
              <table className={tabla.table}>
                <thead>
                  <tr>
                    <th scope="col" className={tabla.th}>Código Unidad</th>
                    <th scope="col" className={tabla.th}>Familia / Tipo</th>
                    <th scope="col" className={tabla.th}>Estado Operativo</th>
                    <th scope="col" className={tabla.th}>Consumo de Ciclo</th>
                    <th scope="col" className={`${tabla.th} text-right`}>Horómetro Real</th>
                    <th scope="col" className={`${tabla.th} text-right`}>Umbral Límite</th>
                  </tr>
                </thead>
                <tbody>
                  {flotaEquipos.map((equipo) => (
                    <tr key={equipo.id} className={equipo.status === 'BLOCKED' ? 'hatch-bloqueo' : ''}>
                      <td className={tabla.td}>
                        <Link
                          href={`/equipos/${equipo.id}`}
                          className="font-mono font-semibold text-ink transition-colors duration-(--dur-med) hover:text-accent-texto"
                        >
                          {equipo.code}
                        </Link>
                      </td>
                      <td className={`${tabla.td} font-medium text-muted`}>{equipo.type.name}</td>
                      <td className={tabla.td}>
                        <Badge tono={ESTADO_EQUIPO[equipo.status].tono}>
                          {ESTADO_EQUIPO[equipo.status].label}
                        </Badge>
                      </td>
                      <td className={tabla.td}>
                        <BarraHorometro
                          actual={Number(equipo.currentHours)}
                          umbral={Number(equipo.nextMaintenanceHours)}
                        />
                      </td>
                      <td className={tabla.num}>{formatHoras(equipo.currentHours)} h</td>
                      <td className={`${tabla.num} text-muted`}>
                        {formatHoras(equipo.nextMaintenanceHours)} h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>

      {/* ── Riel crítico: Action Center ── */}
      <aside className="mt-2 xl:sticky xl:top-6 xl:mt-9" aria-label="Centro de alertas críticas">
        <p aria-hidden className="rotulo mb-3 hidden items-center gap-2 xl:flex">
          <span className="h-px w-4 bg-bloqueo/50" />
          CRÍTICO · ACCIONES
        </p>
        <Panel
          icono="alerta"
          titulo="Action Center"
          descripcion="Eventos que requieren resolución antes del despacho."
          acciones={
            <Badge tono={totalCriticas > 0 ? 'bloqueo' : 'ok'}>
              {alertasOrdenadas.length} activa{alertasOrdenadas.length === 1 ? '' : 's'}
            </Badge>
          }
        >
          {alertasOrdenadas.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-md border border-line bg-ok-dim text-ok">
                <Icon name="visto" className="size-5" />
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                Sin incidentes activos. Todos los parámetros operativos están dentro de tolerancia.
              </p>
            </div>
          ) : (
            <ul className="space-y-3 p-3">
              {alertasOrdenadas.map((alerta) => {
                const cfg = ALERTA_CONFIG[alerta.type];
                return (
                  <li key={alerta.id}>
                    <AlertCard
                      severidad={alerta.severity === 'CRITICAL' ? 'bloqueo' : 'aviso'}
                      tipo={cfg?.label ?? alerta.type}
                      mensaje={alerta.message}
                      haceCuanto={haceCuanto(alerta.createdAt)}
                      accionHref={alerta.equipment ? `/equipos/${alerta.equipmentId}` : undefined}
                      accionLabel={<>Inspeccionar {alerta.equipment?.code}</>}
                      critico={alerta.severity === 'CRITICAL'}
                      className="w-full"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </aside>
    </div>
  );
}
