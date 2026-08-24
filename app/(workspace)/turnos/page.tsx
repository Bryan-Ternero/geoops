import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ESTADO_TURNO, JORNADA, diasHasta, formatHoras } from '@/src/components/format';
import { Icon } from '@/src/components/icons';
import { BotonEnviar } from '@/src/components/submit-button';
import { Aviso, Badge, Encabezado, Panel, Vacio, boton, campo, tabla } from '@/src/components/ui';
import { auth, requireRole } from '@/src/auth';
import { prisma } from '@/src/infrastructure/database/prisma';
import type { Journey } from '@/src/core/types';
import { createShift } from '@/src/use-cases/create-shift';
import { formatIsoDate, toIsoDate, toOperationalDate } from '@/src/use-cases/dates';
import { ServiceError } from '@/src/use-cases/errors';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Guardias & Despacho · GeoOps' };

async function procesarCreacionTurno(formData: FormData) {
  'use server';

  let mensajeError: string | null = null;
  let turnoCreadoId: string | null = null;

  try {
    await requireRole('PLANNER', 'SUPERVISOR');

    const nuevoTurno = await createShift({
      date: String(formData.get('date') ?? ''),
      journey: String(formData.get('journey') ?? 'DAY') as Journey,
      plannedHours: Number(formData.get('plannedHours') ?? 12),
    });

    turnoCreadoId = nuevoTurno.id;
  } catch (e) {
    if (!(e instanceof ServiceError)) throw e;
    mensajeError = e.message;
  }

  if (mensajeError) redirect(`/turnos?error=${encodeURIComponent(mensajeError)}`);

  revalidatePath('/turnos');
  redirect(`/turnos/${turnoCreadoId}?nuevo=1`);
}

function obtenerEtiquetaRelativa(dias: number): string | null {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === -1) return 'Ayer';
  return null;
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const sesionUsuario = await auth();
  const tienePermisoCrear =
    sesionUsuario?.user.role === 'PLANNER' || sesionUsuario?.user.role === 'SUPERVISOR';

  const listadoTurnos = await prisma.shift.findMany({
    include: {
      assignments: {
        include: { equipment: true, operator: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ date: 'desc' }, { journey: 'asc' }],
    take: 30,
  });

  const guardiasAbiertas = listadoTurnos.filter((t) => t.status === 'PLANNED').length;

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Guardias & Despacho"
        descripcion="Programación por fecha y jornada operativa; la duración planificada fija el techo de horómetro y el control de horas reales al cierre."
      />

      {tienePermisoCrear && (
        <Panel
          icono="turnos"
          titulo="Apertura de Guardia"
          descripcion="Parámetros del turno que habilita la asignación de operadores y maquinaria"
        >
          <form action={procesarCreacionTurno} className="flex flex-wrap items-end gap-4 p-5">
            <label className="block min-w-[10rem]">
              <span className="rotulo">Fecha Operativa</span>
              <input
                type="date"
                name="date"
                required
                defaultValue={toOperationalDate(new Date())}
                className={`mt-1.5 ${campo.numero}`}
              />
            </label>

            <label className="block min-w-[12rem]">
              <span className="rotulo">Jornada Operativa</span>
              <select name="journey" className={`mt-1.5 ${campo.input}`}>
                <option value="DAY">Día (07:00 a 19:00)</option>
                <option value="NIGHT">Noche (19:00 a 07:00)</option>
              </select>
            </label>

            <label className="block w-36">
              <span className="rotulo">Duración Prevista (h)</span>
              <input
                type="number"
                name="plannedHours"
                min={1}
                max={24}
                step={0.5}
                defaultValue={12}
                className={`mt-1.5 ${campo.numero}`}
              />
            </label>

            <BotonEnviar pendiente="Generando guardia…" icono="mas">
              Aperturar Guardia
            </BotonEnviar>
          </form>

          {error && (
            <div role="alert" className="border-t border-line-subtle p-4">
              <Aviso tono="bloqueo">{error}</Aviso>
            </div>
          )}
        </Panel>
      )}

      <Panel
        icono="turnos"
        titulo="Registro de Guardias"
        descripcion={`${listadoTurnos.length} guardias registradas · ${guardiasAbiertas} en planificación`}
      >
        {listadoTurnos.length === 0 ? (
          <Vacio>
            No hay guardias registradas. Genere una nueva guardia desde el formulario superior.
          </Vacio>
        ) : (
          <div className={tabla.wrapper}>
            <table className={tabla.table}>
              <thead>
                <tr>
                  <th scope="col" className={tabla.th}>Fecha Guardia</th>
                  <th scope="col" className={tabla.th}>Jornada</th>
                  <th scope="col" className={`${tabla.th} text-right`}>Duración</th>
                  <th scope="col" className={tabla.th}>Estado</th>
                  <th scope="col" className={tabla.th}>Asignaciones & Flota</th>
                  <th scope="col" className={tabla.th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {listadoTurnos.map((t) => {
                  const etiquetaRel = obtenerEtiquetaRelativa(diasHasta(t.date));
                  const asignacionesValidas = t.assignments.filter((a) => a.status !== 'CANCELLED');
                  const asignacionesEnRiesgo = asignacionesValidas.filter((a) => a.status === 'AT_RISK');

                  return (
                    <tr key={t.id}>
                      <td className={`${tabla.td} whitespace-nowrap`}>
                        <Link
                          href={`/turnos/${t.id}`}
                          className="font-mono font-semibold text-ink hover:text-accent-texto"
                        >
                          {formatIsoDate(toIsoDate(t.date))}
                        </Link>
                        {etiquetaRel && (
                          <span className="ml-2 rounded-sm border border-ok/30 bg-ok-dim px-2 py-0.5 text-[11px] font-semibold text-ok">
                            {etiquetaRel}
                          </span>
                        )}
                      </td>
                      <td className={`${tabla.td} font-medium text-ink`}>{JORNADA[t.journey]}</td>
                      <td className={tabla.num}>{formatHoras(t.plannedHours)} h</td>
                      <td className={tabla.td}>
                        <Badge tono={ESTADO_TURNO[t.status].tono}>
                          {ESTADO_TURNO[t.status].label}
                        </Badge>
                      </td>
                      <td className={`${tabla.td} max-w-md`}>
                        {asignacionesValidas.length === 0 ? (
                          <span className="text-xs text-muted">Sin asignaciones</span>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-ink">
                                {asignacionesValidas.length} unidad(es)
                              </span>
                              {asignacionesEnRiesgo.length > 0 && (
                                <Badge tono="aviso">
                                  {asignacionesEnRiesgo.length} en riesgo
                                </Badge>
                              )}
                            </div>
                            <span className="mt-1 block truncate text-xs font-mono text-muted">
                              {asignacionesValidas.map((a) => a.equipment.code).join(' · ')}
                            </span>
                          </>
                        )}
                      </td>
                      <td className={tabla.td}>
                        <Link href={`/turnos/${t.id}`} className={boton.tabla}>
                          {t.status === 'PLANNED' ? 'Despachar / Cerrar' : 'Ver Matriz'}
                          <Icon name="flecha" className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
