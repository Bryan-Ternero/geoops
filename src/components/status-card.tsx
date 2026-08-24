import Link from 'next/link';

import type { ReactNode } from 'react';

/**
 * StatusCard — fila-tarjeta de entidad para listas laterales (próximas guardias,
 * unidades standby). Código mono + badge + línea de detalle a la izquierda;
 * métrica o gauge compacto a la derecha. Con href, toda la fila es el enlace.
 */
export function StatusCard({
  codigo,
  badge,
  detalle,
  derecha,
  href,
  className = '',
}: {
  codigo: string;
  /** Badge del sistema (espina + rótulo) */
  badge?: ReactNode;
  detalle?: ReactNode;
  /** slot derecho: gauge compacto o métricas mono */
  derecha?: ReactNode;
  href?: string;
  className?: string;
}) {
  const cuerpo = (
    <div
      className={`flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 transition-colors duration-(--dur-med) ${
        href ? 'hover:border-line-strong hover:bg-canvas-subtle' : ''
      } ${className}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num text-sm font-semibold text-ink">{codigo}</span>
          {badge}
        </div>
        {detalle && <div className="mt-0.5 text-xs text-muted">{detalle}</div>}
      </div>
      {derecha && <div className="shrink-0">{derecha}</div>}
    </div>
  );

  if (!href) return cuerpo;

  return (
    <Link href={href} className="block rounded-md focus-visible:outline-offset-2">
      {cuerpo}
    </Link>
  );
}
