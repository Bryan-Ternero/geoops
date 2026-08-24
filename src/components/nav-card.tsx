import Link from 'next/link';

import type { ReactNode } from 'react';

import { Icon } from './icons';

/**
 * NavCard — tarjeta de navegación por pasos (proceso del turno). Numeral mono
 * + título display + descripción; lift sutil al pasar el cursor. Conserva la
 * API visual que tenía `Proceso` en el detalle de guardia.
 */
export function NavCard({
  href,
  numero,
  titulo,
  descripcion,
  className = '',
}: {
  href: string;
  /** numeral de sección, ej. "01" */
  numero: string;
  titulo: string;
  descripcion: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-md border border-line bg-surface p-4 transition-all duration-(--dur-med) hover:-translate-y-px hover:border-line-strong hover:bg-canvas-subtle hover:shadow-[0_3px_10px_rgba(46,36,22,0.09)] focus-visible:outline-offset-4 ${className}`}
    >
      <span
        aria-hidden
        className="num shrink-0 text-xs font-semibold text-ink-low transition-colors duration-(--dur-med) group-hover:text-accent"
      >
        {numero}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-medium tracking-tight text-ink">
          {titulo}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{descripcion}</span>
      </span>
      <Icon
        name="flecha"
        aria-hidden
        className="size-4 shrink-0 text-ink-low transition-all duration-(--dur-med) group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </Link>
  );
}
