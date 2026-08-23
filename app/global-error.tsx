'use client';

import { useEffect } from 'react';

import { Icon } from '@/src/components/icons';

/**
 * Self-contained fallback: it renders when the root layout itself fails, so no global
 * stylesheet is guaranteed. The palette below mirrors the GeoOps tokens as literals.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('GeoOps Global Root Error caught:', error.message);
  }, [error]);

  return (
    <html lang="es" className="h-full">
      <body
        className="flex min-h-full flex-col items-center justify-center px-4 text-center"
        style={{ background: '#101215', color: '#f3f2ee', fontFamily: 'system-ui, sans-serif' }}
      >
        <div
          className="relative mx-auto max-w-md p-8"
          style={{ border: '1px solid #272a2f', background: '#1b1e22' }}
        >
          <span
            aria-hidden
            style={{
              display: 'block',
              fontFamily: '"Arial Narrow", "Segoe UI", system-ui, sans-serif',
              fontStretch: 'condensed',
              fontWeight: 700,
              fontSize: '6rem',
              lineHeight: 1,
              letterSpacing: '-0.05em',
              color: 'rgba(217, 142, 85, 0.15)',
              userSelect: 'none',
              marginBottom: '-2.25rem',
              pointerEvents: 'none',
            }}
          >
            500
          </span>

          <div
            className="inline-flex size-14 items-center justify-center text-[#ea6666]"
            style={{ border: '1px solid rgba(234,102,102,0.3)', background: 'rgba(234,102,102,0.09)' }}
          >
            <Icon name="alerta" className="size-7" />
          </div>

          <h1 className="mt-4 text-xl font-bold">Contingencia Crítica del Sistema</h1>
          <p className="mt-2 text-sm" style={{ color: '#b4b7af' }}>
            Se produjo un error no controlado en el núcleo de la interfaz. Los servicios de base de
            datos permanecen íntegros y protegidos.
          </p>

          {error.digest && (
            <div
              className="mt-4 px-3 py-1.5 font-mono text-xs"
              style={{ border: '1px solid #272a2f', background: '#141619', color: '#b4b7af' }}
            >
              Digest ID: <span style={{ color: '#f3f2ee' }}>{error.digest}</span>
            </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: '#d98e55', color: '#211507' }}
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
