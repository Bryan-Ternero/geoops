import Link from 'next/link';

import type { ReactNode } from 'react';

import { Icon, type NombreIcono } from './icons';

/**
 * KpiCard — única implementación de indicador clave en v2.
 * rotulo + valor mono + subtítulo opcional + chip icono tonal opcional.
 * Con href se vuelve navegable y gana el lift de hover (1px + micro-sombra cálida).
 */
export function KpiCard({
  href,
  rotulo,
  valor,
  subtitulo,
  icono,
  chipClase = 'bg-canvas-subtle text-muted',
  className = '',
}: {
  /** si se pasa, la tarjeta entera es un enlace */
  href?: string;
  rotulo: string;
  valor: ReactNode;
  subtitulo?: ReactNode;
  icono?: NombreIcono;
  /** clases del chip tonal del icono (bg-*-dim text-*) */
  chipClase?: string;
  className?: string;
}) {
  const elevable = Boolean(href);
  const cuerpo = (
    <div
      className={`flex h-full items-start justify-between gap-3 rounded-md border border-line bg-surface p-4 transition-all duration-(--dur-med) ${
        elevable
          ? 'group-hover:-translate-y-px group-hover:border-line-strong group-hover:shadow-[0_3px_10px_rgba(46,36,22,0.09)]'
          : ''
      } ${className}`}
    >
      <div className="min-w-0">
        <p className="rotulo">{rotulo}</p>
        <p className="num mt-1.5 text-2xl leading-none font-semibold tracking-tight text-ink">
          {valor}
        </p>
        {subtitulo && <p className="mt-1.5 text-xs leading-relaxed text-muted">{subtitulo}</p>}
      </div>
      {icono && (
        <span
          aria-hidden
          className={`flex size-9 shrink-0 items-center justify-center rounded-sm ${chipClase}`}
        >
          <Icon name={icono} className="size-4.5" />
        </span>
      )}
    </div>
  );

  if (!href) return cuerpo;

  return (
    <Link href={href} className="group block rounded-md focus-visible:outline-offset-4">
      {cuerpo}
    </Link>
  );
}
