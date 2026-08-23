'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon, type NombreIcono } from './icons';

/**
 * Enlace de navegación del riel lateral (Industrial Precision Light).
 * - `rail`: fila vertical de la barra lateral; el estado activo usa tinte naranja
 *   suave + texto cobre, el único acento interactivo permitido en el sistema.
 * - `rail` + `compacto`: modo solo-iconos para viewports medios; la etiqueta
 *   sobrevive como tooltip y sr-only.
 * - `fila`: fila de ancho completo para el sheet móvil, marcada con espina izquierda.
 */
export function NavLink({
  href,
  icono,
  compacto = false,
  variante = 'rail',
  className = '',
  onClick,
  children,
}: {
  href: string;
  icono: NombreIcono;
  /** icons-only mode for mid viewports; the label survives as tooltip + sr-only */
  compacto?: boolean;
  variante?: 'rail' | 'fila';
  /** extra classes for responsive visibility switching between rail and sheet */
  className?: string;
  onClick?: () => void;
  children: string;
}) {
  const pathname = usePathname();
  const activo = href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (variante === 'fila') {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={activo ? 'page' : undefined}
        className={`flex min-h-11 items-center gap-3 px-3 text-sm font-medium transition-colors ${
          activo
            ? 'border-l-2 border-accent bg-accent/10 pl-2.5 text-accent'
            : 'border-l-2 border-transparent pl-2.5 text-muted hover:bg-canvas-subtle hover:text-ink'
        } ${className}`}
      >
        <Icon name={icono} className="size-4 shrink-0" />
        {children}
      </Link>
    );
  }

  if (compacto) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={activo ? 'page' : undefined}
        title={children}
        className={`flex size-10 items-center justify-center rounded-sm transition-colors ${
          activo
            ? 'bg-accent/10 text-accent'
            : 'text-muted hover:bg-canvas-subtle hover:text-ink'
        } ${className}`}
      >
        <Icon name={icono} className="size-[18px] shrink-0" />
        <span className="sr-only">{children}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={activo ? 'page' : undefined}
      className={`flex min-h-10 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors ${
        activo ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-canvas-subtle hover:text-ink'
      } ${className}`}
    >
      <Icon name={icono} className="size-[18px] shrink-0" />
      {children}
    </Link>
  );
}
