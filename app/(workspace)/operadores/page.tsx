import Link from 'next/link';

import { auth } from '@/src/auth';
import { diasHasta } from '@/src/components/format';
import { Icon } from '@/src/components/icons';
import { Aviso, Badge, Encabezado, Panel, Vacio, boton, tabla } from '@/src/components/ui';
import { KpiCard } from '@/src/components/kpi-card';
import { prisma } from '@/src/infrastructure/database/prisma';
import { formatIsoDate, toIsoDate } from '@/src/use-cases/dates';
import { NuevoOperador } from './new-operator-modal';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Personal Habilitado · GeoOps' };

const VENTANA_ALERTA_DIAS = 30;

export default async function OperadoresPage() {
  const [sesion, operadoresNomina, catalogoTipos] = await Promise.all([
    auth(),
    prisma.operator.findMany({
      include: {
        certifications: { include: { equipmentType: true }, orderBy: { expiresAt: 'desc' } },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.equipmentType.findMany({ orderBy: { code: 'asc' } }),
  ]);

  const puedeGestionar =
    sesion?.user.role === 'PLANNER' || sesion?.user.role === 'SUPERVISOR';

  const todasLasCertificaciones = operadoresNomina.flatMap((o) =>
    o.certifications.map((c) => ({ operador: o.fullName, dias: diasHasta(c.expiresAt), tipoId: c.equipmentTypeId })),
  );
  const certsVencidas = todasLasCertificaciones.filter((c) => c.dias < 0);
  const certsPorVencer = todasLasCertificaciones.filter((c) => c.dias >= 0 && c.dias <= VENTANA_ALERTA_DIAS);
  const personalSinHabilitar = operadoresNomina.filter((o) => o.certifications.length === 0);

  const operadoresActivos = operadoresNomina.filter((o) => o.active);
  const operadoresInactivos = operadoresNomina.filter((o) => !o.active);

  const distribucionHabilitaciones = catalogoTipos.map((t) => {
    const tiene = operadoresNomina.filter((o) =>
      o.certifications.some((c) => c.equipmentTypeId === t.id && diasHasta(c.expiresAt) >= 0),
    ).length;
    return { codigo: t.code, nombre: t.name, total: tiene };
  });

  const kpisPersonal = [
    { label: 'Nómina Activa', valor: operadoresActivos.length, sub: 'operadores habilitados', tono: 'ok' },
    {
      label: 'Competencias Vigentes',
      valor: todasLasCertificaciones.length - certsVencidas.length,
      sub: 'certificaciones auditadas',
      tono: 'ok',
    },
    {
      label: `Vencimientos (${VENTANA_ALERTA_DIAS} días)`,
      valor: certsPorVencer.length,
      sub: 'a punto de expirar',
      tono: 'aviso',
    },
    { label: 'Competencias Vencidas', valor: certsVencidas.length, sub: 'bloquean asignación', tono: 'bloqueo' },
  ];

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Personal Habilitado"
        descripcion="Habilitaciones por familia de maquinaria. La vigencia se valida contra la fecha de cada guardia."
        acciones={
          puedeGestionar ? (
            <NuevoOperador
              tipos={catalogoTipos.map((t) => ({ id: t.id, code: t.code, name: t.name }))}
            />
          ) : undefined
        }
      />

      {/* Resumen estático de nómina (sin filtros client-side) */}
      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rotulo mr-1">Resumen</span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1 text-xs font-semibold text-ink">
              <Icon name="persona" className="size-3 text-muted" />
              Todos ({operadoresNomina.length})
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-ok/30 bg-ok-dim px-2.5 py-1 text-xs font-semibold text-ok">
              <Icon name="visto" className="size-3" />
              Habilitados ({operadoresActivos.length})
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong px-2.5 py-1 text-xs font-semibold text-muted">
              <Icon name="bloqueado" className="size-3" />
              Inactivos ({operadoresInactivos.length})
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-aviso/30 bg-aviso-dim px-2.5 py-1 text-xs font-semibold text-aviso">
              <Icon name="alerta" className="size-3" />
              Alerta ({certsPorVencer.length + certsVencidas.length})
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1 text-xs font-semibold text-muted">
              <Icon name="bloqueado" className="size-3" />
              Sin habilitar ({personalSinHabilitar.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rotulo mr-1">Cobertura por tipo:</span>
            {distribucionHabilitaciones.map((tipo) => (
              <span
                key={tipo.codigo}
                title={`${tipo.total} operador(es) con ${tipo.nombre} vigente`}
                className="inline-flex items-center gap-1 rounded-sm border border-line bg-canvas px-2 py-1 text-[11px] font-semibold text-ink"
              >
                <span className="font-mono text-muted">{tipo.codigo}</span>
                <span className="num text-xs">{tipo.total}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row + Alerts: Grid de 2 columnas (KPIs 2/3 + Alertas 1/3) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {kpisPersonal.map((kpi) => {
            const chip =
              kpi.tono === 'ok'
                ? 'bg-ok-dim text-ok'
                : kpi.tono === 'aviso'
                ? 'bg-aviso-dim text-aviso'
                : kpi.tono === 'bloqueo'
                ? 'bg-bloqueo-dim text-bloqueo'
                : 'bg-canvas-subtle text-muted';
            const icono =
              kpi.tono === 'ok'
                ? ('visto' as const)
                : kpi.tono === 'aviso'
                ? ('alerta' as const)
                : kpi.tono === 'bloqueo'
                ? ('bloqueado' as const)
                : ('persona' as const);
            const tonoValor =
              kpi.tono === 'aviso'
                ? 'text-aviso'
                : kpi.tono === 'bloqueo'
                ? 'text-bloqueo'
                : undefined;

            return (
              <KpiCard
                key={kpi.label}
                rotulo={kpi.label}
                valor={tonoValor ? <span className={tonoValor}>{kpi.valor}</span> : kpi.valor}
                subtitulo={kpi.sub}
                icono={icono}
                chipClase={chip}
              />
            );
          })}
        </div>

        {(certsVencidas.length > 0 || personalSinHabilitar.length > 0) ? (
          <Aviso
            tono="aviso"
            titulo="Restricciones activas"
          >
            {certsVencidas.length > 0 && (
              <p>
                Existen <strong>{certsVencidas.length}</strong> competencia(s) vencida(s). El motor
                de reglas impide la asignación a menos que un supervisor firme una excepción.
              </p>
            )}
            {personalSinHabilitar.length > 0 && (
              <p className="mt-1 text-muted">
                Personal sin certificaciones:{' '}
                <strong>{personalSinHabilitar.map((o) => o.fullName).join(', ')}</strong>.
              </p>
            )}
            {certsPorVencer.length > 0 && (
              <p className="mt-1 text-aviso">
                {certsPorVencer.length} certificación(es) expiran en los próximos{' '}
                {VENTANA_ALERTA_DIAS} días — priorice renovaciones.
              </p>
            )}
          </Aviso>
        ) : (
          <Aviso tono="ok" titulo="Estado de habilitaciones: Óptimo">
            Todo el personal activo cuenta con certificaciones vigentes y sin
            vencimientos inmediatos.
          </Aviso>
        )}
      </div>

      {/* Tabla de Operadores — Matriz de Competencias */}
      <Panel
        icono="operadores"
        titulo={`Matriz de competencias · ${operadoresNomina.length} registros`}
        descripcion="Condición operativa y habilitaciones vigentes o vencidas por tipo de maquinaria."
      >
        <div className={tabla.wrapper}>
          <table className={tabla.table}>
            <thead>
              <tr>
                <th scope="col" className={`${tabla.th} w-24`}>Código</th>
                <th scope="col" className={tabla.th}>Operador</th>
                <th scope="col" className={tabla.th}>Documento</th>
                <th scope="col" className={tabla.th}>Condición</th>
                <th scope="col" className={tabla.th}>Habilitaciones</th>
                <th scope="col" className={`${tabla.th} w-36`}>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {operadoresNomina.map((o) => {
                const tieneVencida = o.certifications.some((c) => diasHasta(c.expiresAt) < 0);
                const tieneAlerta =
                  !tieneVencida &&
                  o.certifications.some(
                    (c) => diasHasta(c.expiresAt) >= 0 && diasHasta(c.expiresAt) <= VENTANA_ALERTA_DIAS,
                  );
                const condicionExtra = !o.active
                  ? 'neutro'
                  : tieneVencida
                  ? 'bloqueo'
                  : tieneAlerta
                  ? 'aviso'
                  : 'ok';

                return (
                  <tr key={o.id}>
                    <td className={tabla.td}>
                      <Link
                        href={`/operadores/${o.id}`}
                        className="font-mono font-semibold text-ink hover:text-accent-texto"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td className={`${tabla.td} font-semibold text-ink`}>
                      {o.fullName}
                    </td>
                    <td className={`${tabla.td} font-mono text-muted`}>{o.document}</td>
                    <td className={tabla.td}>
                      <div className="flex flex-col gap-1">
                        <Badge tono={condicionExtra}>
                          {condicionExtra === 'ok'
                            ? 'Apto'
                            : condicionExtra === 'aviso'
                            ? 'Vigencia próxima'
                            : condicionExtra === 'bloqueo'
                            ? 'Restringido'
                            : 'Inactivo'}
                        </Badge>
                        <span className="text-[11px] text-muted">
                          {o.certifications.length > 0
                            ? `${o.certifications.length} competencia(s) registrada(s)`
                            : 'Sin competencias cargadas'}
                        </span>
                      </div>
                    </td>
                    <td className={tabla.td}>
                      {o.certifications.length === 0 ? (
                        <span className="text-xs text-muted">
                          Sin certificaciones — requiere proceso de habilitación.
                        </span>
                      ) : (
                        <ul className="space-y-1.5">
                          {o.certifications.map((c) => {
                            const dias = diasHasta(c.expiresAt);
                            const tono =
                              dias < 0
                                ? 'bloqueo'
                                : dias <= VENTANA_ALERTA_DIAS
                                ? 'aviso'
                                : 'ok';
                            const detalle =
                              dias < 0
                                ? `vencida el ${formatIsoDate(toIsoDate(c.expiresAt))}`
                                : `vence el ${formatIsoDate(toIsoDate(c.expiresAt))} · ${dias}d restantes`;

                            return (
                              <li key={c.id} className="flex flex-wrap items-center gap-2">
                                <Badge tono={tono}>
                                  <span className="font-mono text-[10px] opacity-70 mr-1">
                                    {c.equipmentType.code}
                                  </span>
                                  {c.equipmentType.name}
                                </Badge>
                                <span className="text-[11px] text-muted">{detalle}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </td>
                    <td className={tabla.td}>
                      <Link
                        href={`/operadores/${o.id}`}
                        className={boton.tabla}
                      >
                        {puedeGestionar ? 'Gestionar' : 'Ficha'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {operadoresNomina.length === 0 && (
          <Vacio>No hay personal cargado en el padrón de operadores.</Vacio>
        )}
      </Panel>
    </div>
  );
}
