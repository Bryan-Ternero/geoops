import { Spinner } from '@/src/components/icons';

/**
 * Shown while a section's server component is still querying. It mirrors the v2 tier
 * shape of the dashboard —header con doble filete, banda crítica, KPIs, héroe +
 * guardias— so the layout does not jump when the real content arrives.
 */
export default function Cargando() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* encabezado */}
      <div className="doble-filete relative mb-8 pb-5">
        <div className="h-7 w-52 bg-line motion-safe:animate-pulse" />
        <div className="mt-2 h-4 w-full max-w-2xl bg-line/60 motion-safe:animate-pulse" />
      </div>

      {/* tier 01 · banda crítica */}
      <div className="mb-10">
        <div className="mb-3 h-2.5 w-20 bg-line/60 motion-safe:animate-pulse" />
        <div className="h-11 w-full rounded-lg border border-line bg-surface motion-safe:animate-pulse" />
      </div>

      {/* tier 02 · KPIs + héroe/guardias */}
      <div className="mb-10 space-y-6">
        <div className="mb-3 h-2.5 w-24 bg-line/60 motion-safe:animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-md border border-line bg-surface p-4 motion-safe:animate-pulse"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="h-2.5 w-28 bg-line/60" />
                <div className="size-9 rounded-sm bg-line/60" />
              </div>
              <div className="mt-3 h-7 w-14 bg-line" />
              <div className="mt-2 h-3 w-full max-w-[10rem] bg-line/60" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-lg border border-line bg-surface motion-safe:animate-pulse">
            <div className="border-b border-line-subtle px-4 py-3">
              <div className="h-3 w-56 bg-line/70" />
            </div>
            <div className="p-5">
              <div className="h-40 w-full rounded-md bg-canvas-subtle" />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface motion-safe:animate-pulse">
            <div className="border-b border-line-subtle px-4 py-3">
              <div className="h-3 w-36 bg-line/70" />
            </div>
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-md border border-line bg-canvas-subtle" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="flex items-center justify-center gap-2 text-sm text-muted">
        <Spinner />
        Consultando la base de datos…
      </p>
    </div>
  );
}
