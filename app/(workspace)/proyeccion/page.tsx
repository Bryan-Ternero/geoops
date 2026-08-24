import Link from 'next/link';

import { DisponibilidadPorDia, MargenVsConsumo } from '@/src/components/charts';
import { ESTADO_EQUIPO, JORNADA, formatHoras } from '@/src/components/format';
import { Aviso, Badge, Encabezado, Panel, Vacio, tabla } from '@/src/components/ui';
import { StatusCard } from '@/src/components/status-card';
import type { EquipmentStatus } from '@/src/core/types';
import { formatIsoDate, toOperationalDate } from '@/src/use-cases/dates';
import { getProjection, type ProjectionRow } from '@/src/use-cases/get-projection';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mantenimiento Predictivo · GeoOps' };

const DIAS_HORIZONTE = 7;

function evaluarDetenidoEnFecha(fila: ProjectionRow, dia: string): boolean {
  if (fila.status !== 'AVAILABLE') return true;
  if (fila.projection.status === 'ALREADY_BLOCKED') return true;
  return fila.projection.status === 'WILL_CROSS' && fila.projection.crossesOn <= dia;
}

export default async function ProyeccionPage() {
  const tiempoActual = new Date();
  const matrizProyeccion = await getProjection(DIAS_HORIZONTE, tiempoActual);

  const fechaInicio = toOperationalDate(tiempoActual);
  const fechaFin = toOperationalDate(new Date(tiempoActual.getTime() + DIAS_HORIZONTE * 86_400_000));

  const equiposConCargaActiva = matrizProyeccion.filter((f) => f.plannedShifts > 0);
  const equiposSinAsignacion = matrizProyeccion.filter((f) => f.plannedShifts === 0);

  const cruzanUmbral = equiposConCargaActiva.filter((f) => f.projection.status === 'WILL_CROSS');
  const yaBloqueados = equiposConCargaActiva.filter((f) => f.projection.status === 'ALREADY_BLOCKED');

  const ventanaTemporal = Array.from({ length: DIAS_HORIZONTE }, (_, i) =>
    toOperationalDate(new Date(tiempoActual.getTime() + i * 86_400_000)),
  );

  const curvaDisponibilidad = ventanaTemporal.map((fecha) => {
    const detenidos = matrizProyeccion.filter((f) => evaluarDetenidoEnFecha(f, fecha)).length;
    return { fecha, detenidos, disponibles: matrizProyeccion.length - detenidos };
  });

  const comparativaConsumo = equiposConCargaActiva.map((f) => ({
    code: f.code,
    margen: Math.max(0, f.projection.hoursRemaining),
    consumo: f.plannedHours,
    cruza: f.projection.status !== 'SAFE',
  }));

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Mantenimiento Predictivo"
        descripcion={`Simulación de consumo de horómetro entre el ${formatIsoDate(fechaInicio)} y el ${formatIsoDate(fechaFin)}: predice qué equipos cruzarán su umbral antes de iniciar la guardia.`}
      />

      {cruzanUmbral.length + yaBloqueados.length === 0 ? (
        <Aviso tono="ok" titulo="Flota completamente segura durante la ventana proyectada.">
          Con la programación actual, los {equiposConCargaActiva.length} equipos asignados operarán hasta el{' '}
          {formatIsoDate(fechaFin)} sin superar sus umbrales de mantenimiento.
        </Aviso>
      ) : (
        <Aviso
          tono="aviso"
          titulo={`Alerta Predictiva: ${cruzanUmbral.length + yaBloqueados.length} de ${equiposConCargaActiva.length} equipos requieren intervención de taller.`}
        >
          {yaBloqueados.length > 0 && (
            <p className="font-medium text-bloqueo">
              Unidades bloqueadas actualmente:{' '}
              <strong>{yaBloqueados.map((f) => f.code).join(', ')}</strong> (requieren orden de trabajo para habilitar asignación).
            </p>
          )}
          {cruzanUmbral.length > 0 && (
            <p className="mt-1 text-ink">
              Cruce de umbral inminente:{' '}
              <strong className="text-ink">{cruzanUmbral.map((f) => f.code).join(', ')}</strong>. Se recomienda coordinar mantenimiento preventivo para evitar detenciones imprevistas.
            </p>
          )}
        </Aviso>
      )}

      {/* Visual Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          icono="proyeccion"
          titulo="Curva de Disponibilidad Diaria de Maquinaria"
          descripcion="Capacidad proyectada asumiendo la ejecución de guardias planificadas"
        >
          <div className="p-4">
            <DisponibilidadPorDia dias={curvaDisponibilidad} />
          </div>
        </Panel>

        <Panel
          icono="equipos"
          titulo="Margen de Horas vs. Consumo Programado"
          descripcion="Horómetro remanente antes del bloqueo comparado con las horas ya comprometidas"
        >
          {comparativaConsumo.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">
              No hay turnos planificados en la ventana para generar consumo proyectado.
            </div>
          ) : (
            <div className="p-4">
              <MargenVsConsumo filas={comparativaConsumo} />
            </div>
          )}
        </Panel>
      </div>

      {/* Detailed Projection Matrix */}
      <Panel
        icono="proyeccion"
        titulo={`Matriz de Simulación por Equipo (${equiposConCargaActiva.length} activos)`}
        descripcion="Desglose detallado de unidades con guardias asignadas en el horizonte de 7 días"
      >
        {equiposConCargaActiva.length === 0 ? (
          <Vacio>
            Ningún equipo registra turnos programados entre el {formatIsoDate(fechaInicio)} y el{' '}
            {formatIsoDate(fechaFin)}.
          </Vacio>
        ) : (
          <div className={tabla.wrapper}>
            <table className={tabla.table}>
              <thead>
                <tr>
                  <th scope="col" className={tabla.th}>Unidad</th>
                  <th scope="col" className={tabla.th}>Tipo Maquinaria</th>
                  <th scope="col" className={`${tabla.th} text-right`}>Horómetro Actual</th>
                  <th scope="col" className={`${tabla.th} text-right`}>Umbral Máx</th>
                  <th scope="col" className={`${tabla.th} text-right`}>Margen Remanente</th>
                  <th scope="col" className={tabla.th}>Cruce Proyectado</th>
                  <th scope="col" className={`${tabla.th} text-right`}>Turnos Prog.</th>
                  <th scope="col" className={tabla.th}>Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {equiposConCargaActiva.map((f) => {
                  const p = f.projection;
                  const diasFaltantes =
                    p.status === 'WILL_CROSS'
                      ? Math.round(
                          (Date.parse(`${p.crossesOn}T00:00:00Z`) -
                            Date.parse(`${fechaInicio}T00:00:00Z`)) /
                            86_400_000,
                        )
                      : null;

                  return (
                    <tr
                      key={f.equipmentId}
                      className={p.status === 'ALREADY_BLOCKED' ? 'hatch-bloqueo' : undefined}
                    >
                      <td className={tabla.td}>
                        <Link
                          href={`/equipos/${f.equipmentId}`}
                          className="font-mono font-semibold text-ink hover:text-accent-texto"
                        >
                          {f.code}
                        </Link>
                      </td>
                      <td className={`${tabla.td} font-medium text-muted`}>{f.typeName}</td>
                      <td className={tabla.num}>{formatHoras(f.currentHours)} h</td>
                      <td className={`${tabla.num} text-muted`}>
                        {formatHoras(f.nextMaintenanceHours)} h
                      </td>
                      <td className={`${tabla.num} font-bold ${p.hoursRemaining <= 12 ? 'text-bloqueo' : 'text-ink'}`}>
                        {formatHoras(p.hoursRemaining)} h
                      </td>
                      <td className={tabla.td}>
                        {p.status === 'WILL_CROSS' ? (
                          <>
                            <span className="font-mono text-sm font-medium text-ink">
                              {formatIsoDate(p.crossesOn)}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              Jornada {JORNADA[p.crossesInShift]} · a las{' '}
                              {formatHoras(p.hoursIntoShift)} h
                            </span>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className={`${tabla.num} text-muted`}>{f.plannedShifts}</td>
                      <td className={tabla.td}>
                        {p.status === 'ALREADY_BLOCKED' && (
                          <Badge tono="bloqueo">Bloqueo Operativo</Badge>
                        )}
                        {p.status === 'WILL_CROSS' && (
                          <Badge tono={diasFaltantes !== null && diasFaltantes <= 2 ? 'bloqueo' : 'aviso'}>
                            {diasFaltantes === 0
                              ? 'Cruce Hoy'
                              : diasFaltantes === 1
                                ? 'Cruce Mañana'
                                : `Cruce en ${diasFaltantes} días`}
                          </Badge>
                        )}
                        {p.status === 'SAFE' && <Badge tono="ok">Operación Confiable</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-1.5 border-t border-line-subtle bg-canvas-subtle p-4 text-xs text-muted">
          <p>
            <strong>Simulación Cronológica:</strong> Se proyecta secuencialmente turno día y turno noche, consumiendo las horas planificadas sobre el saldo de horómetro de cada equipo.
          </p>
          <p>
            <strong>Momento de Cruce:</strong> Señala la hora exacta de la guardia en que se alcanzará el umbral de bloqueo para optimizar la planificación de relevos y mantenimiento en taller.
          </p>
        </div>
      </Panel>

      {/* Inactive fleet without work planned */}
      {equiposSinAsignacion.length > 0 && (
        <Panel
          icono="equipos"
          titulo={`Flota en Standby / Sin Turnos Asignados (${equiposSinAsignacion.length})`}
          descripcion="Equipos sin horas programadas en la ventana de simulación actual"
        >
          <ul className="space-y-2 p-3">
            {equiposSinAsignacion.map((f) => (
              <li key={f.equipmentId}>
                <StatusCard
                  href={`/equipos/${f.equipmentId}`}
                  codigo={f.code}
                  detalle={`${formatHoras(f.currentHours)} h / ${formatHoras(f.nextMaintenanceHours)} h umbral`}
                  badge={
                    <Badge tono={ESTADO_EQUIPO[f.status as EquipmentStatus].tono}>
                      {ESTADO_EQUIPO[f.status as EquipmentStatus].label}
                    </Badge>
                  }
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
