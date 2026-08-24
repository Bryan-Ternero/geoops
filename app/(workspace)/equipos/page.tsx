import Link from 'next/link';

import { auth } from '@/src/auth';
import { ESTADO_EQUIPO, formatHoras } from '@/src/components/format';
import { Aviso, Badge, BarraHorometro, Encabezado, Panel, tabla } from '@/src/components/ui';
import { KpiCard } from '@/src/components/kpi-card';
import { prisma } from '@/src/infrastructure/database/prisma';
import type { EquipmentStatus } from '@/src/core/types';
import { NuevoEquipo } from './new-equipment-modal';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Maquinaria Pesada · GeoOps' };

const ESTADOS_FLOTA: EquipmentStatus[] = [
  'AVAILABLE',
  'BLOCKED',
  'IN_MAINTENANCE',
  'OUT_OF_SERVICE',
];

export default async function EquiposPage() {
  const [sesion, flotaEquipos, catalogoTipos] = await Promise.all([
    auth(),
    prisma.equipment.findMany({
      include: { type: true, _count: { select: { maintenances: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.equipmentType.findMany({ orderBy: { code: 'asc' } }),
  ]);

  const puedeModificar =
    sesion?.user.role === 'PLANNER' || sesion?.user.role === 'SUPERVISOR';

  const conteoPorEstado = flotaEquipos.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const equiposBloqueados = flotaEquipos.filter((e) => e.status === 'BLOCKED');

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Maquinaria Pesada"
        descripcion="Horómetros acumulados, umbrales de servicio e historial de mantenimiento por unidad."
        acciones={
          puedeModificar ? (
            <NuevoEquipo
              tipos={catalogoTipos.map((t) => ({
                id: t.id,
                code: t.code,
                name: t.name,
                maintenanceIntervalHours: t.maintenanceIntervalHours,
              }))}
            />
          ) : undefined
        }
      />

      {/* Fleet Status Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {ESTADOS_FLOTA.map((s) => (
          <KpiCard
            key={s}
            rotulo={ESTADO_EQUIPO[s].label}
            valor={conteoPorEstado[s] ?? 0}
            subtitulo="unidades activas"
          />
        ))}
      </div>

      {equiposBloqueados.length > 0 && (
        <Aviso
          tono="bloqueo"
          titulo={`${equiposBloqueados.length} ${equiposBloqueados.length === 1 ? 'unidad bloqueada' : 'unidades bloqueadas'} por exceso de horómetro.`}
        >
          {equiposBloqueados.map((e, i) => (
            <span key={e.id}>
              {i > 0 && ', '}
              <Link href={`/equipos/${e.id}`} className="font-mono font-bold underline hover:text-bloqueo">
                {e.code}
              </Link>
            </span>
          ))}
          . Inhabilitados para despacho hasta el registro de mantenimiento en taller.
        </Aviso>
      )}

      {/* Fleet Telemetry Table */}
      <Panel
        icono="equipos"
        titulo="Telemetría de la flota"
        descripcion="Consumo del ciclo horómetro contra el umbral de bloqueo automático"
      >
        <div className={tabla.wrapper}>
          <table className={tabla.table}>
            <thead>
              <tr>
                <th scope="col" className={tabla.th}>Unidad</th>
                <th scope="col" className={tabla.th}>Tipo</th>
                <th scope="col" className={tabla.th}>Estado</th>
                <th scope="col" className={tabla.th}>Ciclo</th>
                <th scope="col" className={`${tabla.th} text-right`}>Actual</th>
                <th scope="col" className={`${tabla.th} text-right`}>Umbral</th>
                <th scope="col" className={`${tabla.th} text-right`}>Restante</th>
                <th scope="col" className={`${tabla.th} text-right`}>Mantos.</th>
              </tr>
            </thead>
            <tbody>
              {flotaEquipos.map((e) => {
                const actual = Number(e.currentHours);
                const umbral = Number(e.nextMaintenanceHours);
                const remanente = umbral - actual;

                return (
                  <tr
                    key={e.id}
                    className={e.status === 'BLOCKED' ? 'hatch-bloqueo' : undefined}
                  >
                    <td className={tabla.td}>
                      <Link
                        href={`/equipos/${e.id}`}
                        className="font-mono font-semibold text-ink hover:text-accent-texto"
                      >
                        {e.code}
                      </Link>
                    </td>
                    <td className={`${tabla.td} font-medium text-muted`}>{e.type.name}</td>
                    <td className={tabla.td}>
                      <Badge tono={ESTADO_EQUIPO[e.status].tono}>
                        {ESTADO_EQUIPO[e.status].label}
                      </Badge>
                    </td>
                    <td className={tabla.td}>
                      <BarraHorometro actual={actual} umbral={umbral} />
                    </td>
                    <td className={tabla.num}>{formatHoras(actual)} h</td>
                    <td className={`${tabla.num} text-muted`}>{formatHoras(umbral)} h</td>
                    <td
                      className={`${tabla.num} font-bold ${
                        remanente <= 0 ? 'text-bloqueo' : remanente <= 20 ? 'text-aviso' : 'text-ink'
                      }`}
                    >
                      {remanente <= 0 ? `+${formatHoras(-remanente)} h` : `${formatHoras(remanente)} h`}
                    </td>
                    <td className={`${tabla.num} text-muted`}>{e._count.maintenances}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line-subtle bg-canvas-subtle p-4 text-xs text-muted">
          <strong>Horas Remanentes:</strong> Margen operativo disponible antes del bloqueo automático por horómetro. Valores con prefijo <span className="font-mono font-bold text-bloqueo">+</span> indican horas de sobre-operación respecto al umbral programado.
        </div>
      </Panel>
    </div>
  );
}
