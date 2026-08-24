import Link from 'next/link';

import type { ReactNode } from 'react';

import type { Tono } from './format';

const SPINAS: Record<Tono, string> = {
  ok: 'border-l-ok',
  aviso: 'border-l-aviso',
  bloqueo: 'border-l-bloqueo',
  taller: 'border-l-taller',
  neutro: 'border-l-line-strong',
};

/**
 * AlertCard — alerta del Centro de Alertas: espina de severidad + Badge tipo +
 * mensaje + antigüedad mono. Las CRITICAL llevan hatch 45° (segundo canal de
 * lectura no dependiente del color).
 */
export function AlertCard({
  severidad,
  tipo,
  mensaje,
  haceCuanto,
  accionHref,
  accionLabel = 'Inspeccionar',
  critico = false,
  className = '',
}: {
  severidad: Tono;
  /** rótulo del tipo de alerta, ej. "Mantenimiento atrasado" */
  tipo: string;
  mensaje: ReactNode;
  /** antigüedad preformateada, ej. "hace 3 h" */
  haceCuanto?: string;
  accionHref?: string;
  /** texto del enlace de acción; se concatena con la flecha */
  accionLabel?: ReactNode;
  /** activa el hatch de estado crítico */
  critico?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border border-line-subtle border-l-[3px] bg-surface p-3 ${
        SPINAS[severidad]
      } ${critico ? 'hatch-bloqueo' : ''} ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-xs bg-canvas-subtle px-2 py-0.5 text-[10px] leading-4 font-bold tracking-[0.08em] whitespace-nowrap uppercase text-muted">
          {tipo}
        </span>
        {haceCuanto && (
          <span className="num ml-auto shrink-0 text-[11px] text-muted">{haceCuanto}</span>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">{mensaje}</p>
      {accionHref && (
        <Link
          href={accionHref}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-texto underline-offset-2 hover:underline"
        >
          {accionLabel}
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
