'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { Icon } from '@/src/components/icons';
import { boton } from '@/src/components/ui';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only logged in client console for telemetry without exposing internal details in UI
    console.error('GeoOps Client Error Boundary caught an exception:', error.message);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      {/* firma de identidad: código condensed gigante */}
      <span
        aria-hidden
        className="pointer-events-none -mb-10 font-condensed text-[6rem] leading-none font-bold tracking-tighter text-copper/15 select-none sm:-mb-14 sm:text-[9rem]"
      >
        500
      </span>

      <div className="panel-ticks relative mx-auto max-w-lg border border-line bg-surface p-8 sm:p-12">
        <div className="inline-flex size-14 items-center justify-center border border-bloqueo/30 bg-bloqueo-dim text-bloqueo">
          <Icon name="alerta" className="size-7" />
        </div>

        <span className="rotulo mt-6 block !text-bloqueo">Interrupción del Servicio</span>

        <h1 className="mt-2 font-display text-2xl font-normal tracking-tight text-ink not-italic sm:text-3xl">
          Error en la Operación Solicitada
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Ocurrió una contingencia inesperada al procesar la telemetría o despacho minero. El
          incidente ha sido registrado con trazabilidad de auditoría.
        </p>

        {error.digest && (
          <div className="num mt-4 border border-line bg-canvas-subtle px-3 py-1.5 text-xs text-muted">
            Referencia de incidente: <span className="text-ink">{error.digest}</span>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => reset()} className={boton.primario}>
            Reintentar Operación
          </button>

          <Link href="/" className={boton.secundario}>
            Panel de Control
          </Link>
        </div>
      </div>
    </div>
  );
}
