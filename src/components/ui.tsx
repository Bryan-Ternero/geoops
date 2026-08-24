/**
 * Design System UI Components — Industrial Precision v2
 * GeoOps layered stone canvas (#f5f4f2), machined white panels with corner ticks,
 * copper as the single brand metal, semantic tones with dimmed fills.
 * Radius carries meaning (xs badge → sm control → md card → lg panel → xl login);
 * tables, gauge and shell stay at absolute 0.
 */
import type { ReactNode } from 'react';

import type { Tono } from './format';
import { Icon, type NombreIcono } from './icons';

/**
 * StatusChip: rectangular chip with a thick left spine in the semantic color,
 * dimmed tinted background and an uppercase micro-label. No dots, no pulses.
 */
const TONOS: Record<Tono, { chip: string; spine: string; panel: string; titulo: string }> = {
  ok: {
    chip: 'bg-ok-dim text-ok',
    spine: 'border-l-ok',
    panel: 'border-ok/25 bg-ok-dim text-ink',
    titulo: 'text-ok',
  },
  aviso: {
    chip: 'bg-aviso-dim text-aviso',
    spine: 'border-l-aviso',
    panel: 'border-aviso/25 bg-aviso-dim text-ink',
    titulo: 'text-aviso',
  },
  bloqueo: {
    chip: 'bg-bloqueo-dim text-bloqueo',
    spine: 'border-l-bloqueo',
    panel: 'border-bloqueo/25 bg-bloqueo-dim text-ink',
    titulo: 'text-bloqueo',
  },
  taller: {
    chip: 'bg-taller-dim text-taller',
    spine: 'border-l-taller',
    panel: 'border-taller/25 bg-taller-dim text-ink',
    titulo: 'text-taller',
  },
  neutro: {
    chip: 'bg-bg2 text-muted',
    spine: 'border-l-line-strong',
    panel: 'border-line-strong bg-canvas-subtle text-ink',
    titulo: 'text-ink',
  },
};

export function Badge({ tono, children }: { tono: Tono; children: ReactNode }) {
  const config = TONOS[tono];
  return (
    <span
      className={`inline-flex items-center rounded-xs border-y border-r border-transparent border-l-[3px] px-2 py-0.5 text-[10px] leading-4 font-bold tracking-[0.08em] whitespace-nowrap uppercase ${config.spine} ${config.chip}`}
    >
      {children}
    </span>
  );
}

export function Encabezado({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <header className="doble-filete relative mb-8 flex flex-wrap items-end justify-between gap-4 pb-5">
      <div>
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block size-1.5 bg-accent" />
          <span className="rotulo">GeoOps | Collpahuasi</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink lg:text-[34px] lg:font-bold">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{descripcion}</p>
        )}
      </div>
      {acciones && <div className="flex items-center gap-3">{acciones}</div>}
    </header>
  );
}

export function Panel({
  id,
  icono,
  titulo,
  descripcion,
  acciones,
  children,
  className = '',
}: {
  id?: string;
  icono?: NombreIcono;
  titulo?: string;
  descripcion?: string;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`${titulo ? 'panel-ticks' : ''} rounded-lg border border-line bg-surface ${className}`}
    >
      {titulo && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {icono && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-line bg-bg2 text-muted">
                <Icon name={icono} className="size-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-medium tracking-tight text-ink">{titulo}</h2>
              {descripcion && <p className="text-xs text-muted">{descripcion}</p>}
            </div>
          </div>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

export function Aviso({
  tono,
  titulo,
  children,
  className = '',
}: {
  tono: Tono;
  titulo?: string;
  children?: ReactNode;
  className?: string;
}) {
  const config = TONOS[tono];
  return (
    <div
      role={tono === 'ok' ? 'status' : undefined}
      className={`aviso-in rounded-md border p-4 text-sm leading-relaxed ${config.panel} ${className}`}
    >
      {titulo && <p className={`font-semibold ${config.titulo}`}>{titulo}</p>}
      {children && <div className={titulo ? 'mt-1.5' : ''}>{children}</div>}
    </div>
  );
}

export const boton = {
  primario:
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold tracking-wide text-copper-ink transition-all duration-(--dur-med) hover:bg-accent-hover active:scale-[0.97] active:bg-copper-down disabled:pointer-events-none disabled:opacity-40',
  secundario:
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-line-strong px-4 py-2 text-[13px] font-medium text-ink transition-all duration-(--dur-med) hover:border-copper hover:text-copper-texto active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
  excepcion:
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-aviso/40 bg-aviso-dim px-4 py-2 text-[13px] font-semibold text-aviso transition-all duration-(--dur-med) hover:border-aviso active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
  peligro:
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-bloqueo/60 bg-bloqueo-dim px-4 py-2 text-[13px] font-semibold text-bloqueo transition-all duration-(--dur-med) hover:border-bloqueo active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
  /* acción compacta dentro de filas de tabla */
  tabla:
    'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm border border-transparent px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-accent-texto transition-all duration-(--dur-med) hover:border-line-strong hover:bg-canvas-subtle active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
};

export const campo = {
  input:
    'block w-full rounded-sm border border-line-strong bg-canvas-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-low focus:border-accent focus:outline-hidden transition-colors',
  numero:
    'block rounded-sm border border-line-strong bg-canvas-subtle px-3 py-2 text-right font-mono text-sm text-ink placeholder:text-ink-low focus:border-accent focus:outline-hidden transition-colors',
};

const FORMATO_H = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });

/**
 * Gauge Horómetro — the GeoOps signature element. A consumption gauge... with a ticked
 * scale (25/50/75 %), a limit notch at the maintenance threshold and mono readings of
 * actual / threshold / remaining. Three sizes:
 *  - compacto: table rows (default; keeps the legacy bar+percentage footprint)
 *  - estandar: KPI cards and form hints, adds the reading line
 *  - grande:   equipment detail hero, large numerals + rotulo
 */
export function BarraHorometro({
  actual,
  umbral,
  ancho = 'w-32',
  tamano = 'compacto',
}: {
  actual: number;
  umbral: number;
  /** track width for compacto/estandar; grande always spans its container */
  ancho?: string;
  tamano?: 'compacto' | 'estandar' | 'grande';
}) {
  const crudo = umbral > 0 ? (actual / umbral) * 100 : 0;
  const porcentaje = Math.min(100, crudo);
  const excedido = crudo >= 100;
  const color = excedido ? 'bg-bloqueo' : crudo >= 90 ? 'bg-aviso' : 'bg-ok';
  const restante = umbral - actual;

  const ticks = (
    <>
      {[25, 50, 75].map((marca) => (
        <span
          key={marca}
          aria-hidden
          className="absolute top-0 bottom-0 w-px bg-canvas-subtle/60"
          style={{ left: `${marca}%` }}
        />
      ))}
    </>
  );

  // notch at the right edge = the maintenance threshold itself
  const notcha = (
    <span
      aria-hidden
      className={`absolute top-[-2px] right-0 bottom-[-2px] w-[3px] ${excedido ? 'bg-bloqueo' : 'bg-line-strong'}`}
    />
  );

  if (tamano === 'compacto') {
    return (
      <span className="inline-flex items-center gap-2" title={`${Math.round(crudo)}% del umbral`}>
        <span className={`relative h-2 shrink-0 ${ancho} bg-bg2`} role="presentation">
          <span
            className={`absolute inset-y-0 left-0 ${color} transition-all duration-(--dur-gauge)`}
            style={{ width: `${porcentaje}%` }}
          />
          {ticks}
          {notcha}
        </span>
        <span className="num shrink-0 text-[11px] text-muted">
          {excedido ? (
            <span className="text-bloqueo">{Math.round(porcentaje)}% ▲</span>
          ) : (
            `${Math.round(porcentaje)}%`
          )}
        </span>
      </span>
    );
  }

  const lecturaRestante =
    restante >= 0 ? (
      <span className="num text-ok">−{FORMATO_H.format(restante)} h disp.</span>
    ) : (
      <span className="num text-bloqueo">
        +{FORMATO_H.format(Math.abs(restante))} h sobre umbral
      </span>
    );

  if (tamano === 'estandar') {
    return (
      <div className={ancho === 'w-32' ? 'w-full' : ancho}>
        <div className="relative h-2.5 bg-bg2" role="presentation" title={`${Math.round(crudo)}% del umbral`}>
          <div
            className={`absolute inset-y-0 left-0 ${color} transition-all duration-(--dur-gauge)`}
            style={{ width: `${porcentaje}%` }}
          />
          {ticks}
          {notcha}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2 text-xs whitespace-nowrap">
          <span className="num text-muted">
            {FORMATO_H.format(actual)} / {FORMATO_H.format(umbral)} h
          </span>
          {lecturaRestante}
        </div>
      </div>
    );
  }

  // grande — hero de detalle de equipo
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <span className="rotulo">Horómetro</span>
        <span className="num text-sm text-muted">
          Umbral {FORMATO_H.format(umbral)} h
        </span>
      </div>
      <p className="mt-1 font-mono text-3xl leading-none font-semibold tracking-tight text-ink">
        {FORMATO_H.format(actual)}
        <span className="ml-1 text-base font-normal text-muted">h</span>
      </p>
      <div className="relative mt-3 h-3 bg-bg2" role="presentation" title={`${Math.round(crudo)}% del umbral`}>
        <div
          className={`absolute inset-y-0 left-0 ${color} transition-all duration-(--dur-gauge)`}
          style={{ width: `${porcentaje}%` }}
        />
        {ticks}
        {notcha}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="num text-muted">{Math.round(crudo)}% del umbral</span>
        {lecturaRestante}
      </div>
    </div>
  );
}

export const tabla = {
  wrapper: 'w-full overflow-x-auto rounded-lg',
  table: 'w-full min-w-[48rem] border-collapse text-sm text-ink',
  th: 'border-b border-line-strong bg-bg2 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap',
  td: 'border-b border-line-subtle px-4 py-3 align-middle transition-colors hover:bg-canvas-subtle',
  num: 'border-b border-line-subtle px-4 py-3 text-right font-mono text-xs align-middle transition-colors hover:bg-canvas-subtle',
};

export function Vacio({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex size-11 items-center justify-center rounded-md border border-line bg-canvas-subtle text-ink-low">
        <Icon name="panel" className="size-5" />
      </div>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{children}</p>
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}
