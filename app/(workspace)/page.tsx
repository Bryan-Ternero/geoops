import Link from 'next/link';

import { DisponibilidadPorDia } from '@/src/components/charts';
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
    alerta: boolean;
    acento: string;
  }[] = [
    {
      titulo: 'Maquinaria Operativa Disponible',
      subtitulo: 'Unidades listas para ser asignadas a guardia',
      valor: desgloseEstados.AVAILABLE ?? 0,
      totalRef: flotaEquipos.length,
      icono: 'equipos',
      href: '/equipos',
      alerta: false,
      acento: 'border-ok/30 bg-ok-dim text-ok',
    },
    {
      titulo: 'Unidades en Taller / Servicio',
      subtitulo: 'Requieren mantenimiento correctivo o preventivo',
      valor: unidadesDetenidas,
      icono: 'bloqueado',
      href: '/equipos',
      alerta: unidadesDetenidas > 0,
      acento: 'border-bloqueo/30 bg-bloqueo-dim text-bloqueo',
    },
    {
      titulo: 'Guardias en Planificación',
      subtitulo: 'Jornadas programadas pendientes de cierre',
      valor: turnosPlanificados,
      icono: 'turnos',
      href: '/turnos',
      alerta: false,
      acento: 'border-taller/30 bg-taller-dim text-taller',
    },
    {
      titulo: 'Umbral Crítico en Próximos 7 Días',
      subtitulo: 'Proyección de mantenimiento inminente',
      valor: unidadesEnRiesgoProyeccion,
      icono: 'proyeccion',
      href: '/proyeccion',
      alerta: unidadesEnRiesgoProyeccion > 0,
      acento: 'border-aviso/30 bg-aviso-dim text-aviso',
    },
  ];

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-6">
      <div className="min-w-0 space-y-8">
        <Encabezado
          titulo="Panel de Control Operativo"
          descripcion="Telemetría de horómetros en tiempo real, validación multi-regla de asignaciones a guardia y motor de mantenimiento predictivo a 7 días."
        />

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricasResumen.map((kpi) => (
          <Link
            key={kpi.titulo}
            href={kpi.href}
            className="group border border-line bg-surface p-5 transition-colors duration-200 hover:border-line-strong"
          >
            <div className="flex items-center justify-between">
              <span className="rotulo">{kpi.titulo}</span>
              <div
                aria-hidden
                className={`flex size-9 items-center justify-center border ${kpi.acento}`}
              >
                <Icon name={kpi.icono} className="size-4.5" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="num text-3xl font-semibold tracking-tight text-ink">
                {kpi.valor}
              </span>
              {kpi.totalRef !== undefined && (
                <span className="num text-xs text-muted">
                  de {kpi.totalRef} unidades
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-muted">{kpi.subtitulo}</p>
          </Link>
        ))}
      </div>

      {/* Projection Chart & Upcoming Shifts */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel
          icono="proyeccion"
          titulo="Curva Predictiva de Disponibilidad de Maquinaria (7 Días)"
          descripcion="Simulación algorítmica de horas acumuladas basada en guardias programadas"
          acciones={
            <Link
              href="/proyeccion"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              Matriz de Mantenimiento Predictivo
              <Icon name="flecha" className="size-3.5" />
            </Link>
          }
        >
          <div className="p-4">
            <DisponibilidadPorDia dias={curvaDisponibilidad} />
          </div>
        </Panel>

        <Panel
          icono="turnos"
          titulo="Próximas Guardias Programadas"
          descripcion="Despacho de asignaciones y cierre de turno"
          acciones={
            <Link
              href="/turnos"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              Ver Todas
              <Icon name="flecha" className="size-3.5" />
            </Link>
          }
        >
          {turnosOperativos.length === 0 ? (
            <Vacio
              accion={
                <Link
                  href="/turnos"
                  className={boton.primario}
                >
                  <Icon name="mas" className="size-4" />
                  Programar Guardia
                </Link>
              }
            >
              No existen guardias programadas en la ventana actual.
            </Vacio>
          ) : (
            <ul className="divide-y divide-line-subtle">
              {turnosOperativos.map((turno) => (
                <li key={turno.id}>
                  <Link
                    href={`/turnos/${turno.id}`}
                    className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-canvas-subtle"
                  >
                    <div>
                      <span className="block font-mono text-sm font-semibold text-ink">
                        {formatIsoDate(toIsoDate(turno.date))}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        Jornada {JORNADA[turno.journey]} · {formatHoras(turno.plannedHours)} h programadas ·{' '}
                        {turno._count.assignments} activos asignados
                      </span>
                    </div>
                    <Badge tono={ESTADO_TURNO[turno.status].tono}>
                      {ESTADO_TURNO[turno.status].label}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Telemetry and Fleet Status Table */}
      <Panel
          icono="equipos"
          titulo="Parque de Maquinaria Pesada & Telemetría de Horómetros"
          descripcion="Horómetro acumulado actual vs. umbral de mantenimiento preventivo"
          acciones={
            <Link
              href="/equipos"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              Inventario Completo de Maquinaria
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
                <tr key={equipo.id}>
                  <td className={tabla.td}>
                    <Link
                      href={`/equipos/${equipo.id}`}
                      className="font-mono font-semibold text-ink transition-colors hover:text-accent"
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
      </div>

      {/* Action Center: riel derecho de eventos que bloquean el despacho */}
      <aside className="mt-8 xl:sticky xl:top-6 xl:mt-0">
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
              <div className="flex size-11 items-center justify-center border border-line bg-ok-dim text-ok">
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
                  <li key={alerta.id} className="border border-line bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tono={alerta.severity === 'CRITICAL' ? 'bloqueo' : 'aviso'}>
                        {cfg?.label ?? alerta.type}
                      </Badge>
                      <span className="num shrink-0 text-[11px] whitespace-nowrap text-ink-low">
                        {haceCuanto(alerta.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                      {alerta.message}
                    </p>
                    {alerta.equipment && (
                      <Link
                        href={`/equipos/${alerta.equipmentId}`}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
                      >
                        Inspeccionar {alerta.equipment.code}
                        <Icon name="flecha" className="size-3.5" />
                      </Link>
                    )}
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
