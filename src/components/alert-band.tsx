import Link from 'next/link';

import { Icon } from './icons';

/**
 * AlertBand — franja de nivel crítico que abre el dashboard (tier CRÍTICO).
 * Con incidencias: espina bloqueo + hatch + conteos y enlaces de salto.
 * Sin incidencias: franja fina de tolerancia en tono ok.
 */
export function AlertBand({
  criticos,
  bloqueados,
  hrefEquipos = '/equipos',
  hrefProyeccion = '/proyeccion',
}: {
  criticos: number;
  bloqueados: number;
  hrefEquipos?: string;
  hrefProyeccion?: string;
}) {
  const total = criticos + bloqueados;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-ok/25 bg-ok-dim px-4 py-2.5 text-sm text-ink">
        <Icon name="visto" className="size-4 shrink-0 text-ok" />
        <span>
          Flota en <strong className="font-semibold">tolerancia operacional</strong> — sin unidades
          bloqueadas ni mantenimientos en riesgo.
        </span>
      </div>
    );
  }

  return (
    <div className="hatch-bloqueo flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-bloqueo/25 border-l-[3px] border-l-bloqueo bg-bloqueo-dim px-4 py-3">
      <span className="inline-flex items-center gap-2">
        <Icon name="alerta" className="size-4 shrink-0 text-bloqueo" />
        <strong className="text-sm font-bold tracking-[0.08em] text-bloqueo uppercase">
          Nivel crítico
        </strong>
      </span>

      {bloqueados > 0 && (
        <>
          <span className="num text-sm text-ink">
            <strong className="font-semibold">{bloqueados}</strong> bloqueada
            {bloqueados !== 1 ? 's' : ''}
          </span>
          <Link
            href={hrefEquipos}
            className="text-xs font-semibold text-bloqueo underline-offset-2 hover:underline"
          >
            Ver maquinaria →
          </Link>
        </>
      )}

      {criticos > 0 && (
        <>
          <span className="num text-sm text-ink">
            <strong className="font-semibold">{criticos}</strong> con mantenimiento en riesgo
          </span>
          <Link
            href={hrefProyeccion}
            className="text-xs font-semibold text-bloqueo underline-offset-2 hover:underline"
          >
            Ver predictivo →
          </Link>
        </>
      )}
    </div>
  );
}
