'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Icon, type NombreIcono } from '@/src/components/icons';
import { NavLink } from '@/src/components/nav-link';

/** Order and labels fixed by the approved navigation specification; v2 agrupa por dominio. */
const NAV_GRUPOS: { titulo: string; items: { href: string; label: string; icono: NombreIcono }[] }[] =
  [
    {
      titulo: 'Operación',
      items: [
        { href: '/', label: 'Panel de Control', icono: 'tablero' },
        { href: '/turnos', label: 'Guardias', icono: 'turnos' },
      ],
    },
    {
      titulo: 'Recursos',
      items: [
        { href: '/equipos', label: 'Maquinaria Pesada', icono: 'equipos' },
        { href: '/operadores', label: 'Personal Habilitado', icono: 'operadores' },
      ],
    },
    {
      titulo: 'Análisis',
      items: [
        { href: '/proyeccion', label: 'Mantenimiento Predictivo', icono: 'proyeccion' },
        { href: '/auditoria', label: 'Rastro Operativo', icono: 'auditoria' },
      ],
    },
  ];

export interface Usuario {
  nombre: string;
  rol: string;
  puede: string;
}

export interface FlotaResumen {
  total: number;
  disponibles: number;
}

function Monograma() {
  return (
    <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center bg-accent font-condensed text-base font-bold text-white shadow-[0_2px_8px_rgba(244,140,6,0.3)]"
      >
        G
      </span>
  );
}

function Marca({ compacto = false }: { compacto?: boolean }) {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2.5"
      aria-label="GeoOps · ir al panel de control"
    >
      <Monograma />
      {!compacto && (
        <span className="min-w-0 leading-tight">
          <span className="block font-display text-[15px] font-bold tracking-[0.08em] text-ink uppercase [font-stretch:125%]">
            Geoops
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
            Collpahuasi
          </span>
        </span>
      )}
    </Link>
  );
}

function MeterFlota({ flota, className = '' }: { flota?: FlotaResumen; className?: string }) {
  if (!flota || flota.total === 0) return null;

  const pct = Math.round((flota.disponibles / flota.total) * 100);
  const tono = pct >= 70 ? 'bg-ok' : 'bg-aviso';

  return (
    <div
      className={`flex items-center gap-2.5 ${className}`}
      title={`Maquinaria disponible para despacho: ${flota.disponibles} de ${flota.total} unidades (${pct} %)`}
    >
      <span className="rotulo">Maquinaria disp.</span>
      <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-line" role="presentation">
        <span className={`block h-full rounded-full ${tono}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="num shrink-0 text-xs text-muted">
        <span className="text-ink">{flota.disponibles}</span>/{flota.total}
      </span>
    </div>
  );
}

/**
 * SideNavBar fija izquierda (Industrial Precision v2): placa de marca bg2 + riel de
 * navegación agrupado (OPERACIÓN / RECURSOS / ANÁLISIS) + vitales de flota y tarjeta
 * de usuario al pie. En lg+ riel completo (240px); en md–lg colapsa a iconos;
 * <md toda la navegación vive en un sheet y queda una barra superior mínima.
 */
export function Shell({
  usuario,
  flota,
  fechaLima,
  cerrarSesion,
  children,
}: {
  usuario?: Usuario;
  flota?: FlotaResumen;
  fechaLima?: string;
  cerrarSesion: () => Promise<void>;
  children: ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // cierra el dropdown con click externo o Escape; el sheet usa su propio backdrop
  useEffect(() => {
    if (!menuAbierto) return;

    function alClic(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuAbierto(false);
    }
    function alEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuAbierto(false);
    }

    document.addEventListener('pointerdown', alClic);
    document.addEventListener('keydown', alEscape);
    return () => {
      document.removeEventListener('pointerdown', alClic);
      document.removeEventListener('keydown', alEscape);
    };
  }, [menuAbierto]);

  const iniciales = usuario?.nombre.charAt(0).toUpperCase() ?? '?';

  const popoverUsuario =
    usuario &&
    (menuAbierto ? (
      <div
        role="menu"
        aria-label="Menú de usuario"
        className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-[0_16px_40px_-12px_rgba(35,27,18,0.3)]"
      >
        <div className="border-b border-line-subtle px-4 py-3">
          <p className="text-sm font-semibold text-ink">{usuario.nombre}</p>
          <p className="mt-0.5 text-[11px] font-semibold tracking-wider text-accent-texto uppercase">
            {usuario.rol}
          </p>
          {usuario.puede && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{usuario.puede}</p>
          )}
        </div>
        <form action={cerrarSesion} className="p-2">
          <button
            type="submit"
            role="menuitem"
            className="flex min-h-10 w-full items-center gap-2 px-2 text-[13px] font-medium text-muted transition-colors hover:bg-bloqueo-dim hover:text-bloqueo"
          >
            <Icon name="salir" className="size-4 shrink-0" />
            Cerrar sesión
          </button>
        </form>
      </div>
    ) : null);

  const bloqueUsuarioSheet = usuario && (
    <div className="border-t border-line-subtle pt-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center border border-line bg-canvas-subtle text-sm font-bold text-accent-texto"
        >
          {iniciales}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{usuario.nombre}</p>
          <p className="text-[11px] font-semibold tracking-wider text-accent-texto uppercase">
            {usuario.rol}
          </p>
        </div>
      </div>
      {usuario.puede && <p className="mt-2 text-xs leading-relaxed text-muted">{usuario.puede}</p>}
      <form action={cerrarSesion} className="mt-3">
        <button
          type="submit"
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 border border-line px-3 text-[13px] font-medium text-muted transition-colors hover:border-bloqueo hover:text-bloqueo"
        >
          <Icon name="salir" className="size-4 shrink-0" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Accessibility jump link */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Saltar al contenido principal
      </a>

      {/* ── SideNavBar (md+) ───────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface md:flex md:w-16 lg:w-60">
        {/* placa de marca (bg2 mecanizado) */}
        <div className="flex h-16 shrink-0 items-center border-b border-line-subtle bg-bg2 px-4 lg:px-5">
          <span className="hidden lg:block">
            <Marca />
          </span>
          <span className="lg:hidden">
            <Marca compacto />
          </span>
        </div>

        {/* riel de navegación agrupado */}
        <nav
          aria-label="Navegación del sistema"
          className="min-h-0 flex-1 overflow-y-auto px-2 py-4 lg:px-3"
        >
          {NAV_GRUPOS.map((grupo, idx) => (
            <ul
              key={grupo.titulo}
              className={`space-y-1 ${idx > 0 ? 'mt-4 border-t border-line-subtle pt-4' : ''}`}
            >
              {/* microheader de grupo: solo en riel completo; en md queda separador hairline */}
              <li aria-hidden className="px-3 lg:block hidden">
                <span className="rotulo text-[9px]">{grupo.titulo}</span>
              </li>
              <li aria-hidden className="mx-1 my-1 h-px bg-line-subtle lg:hidden first:mt-0" />
              {grupo.items.map((s) => (
                <li key={s.href}>
                  <NavLink
                    href={s.href}
                    icono={s.icono}
                    compacto
                    className="lg:hidden"
                  >
                    {s.label}
                  </NavLink>
                  <NavLink href={s.href} icono={s.icono} className="hidden lg:flex">
                    {s.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          ))}
        </nav>

        {/* vitales de flota al pie del riel + usuario */}
        {flota && flota.total > 0 && (
          <div className="hidden shrink-0 border-t border-line-subtle lg:block">
            <div className="px-5 py-4">
              <p className="rotulo mb-2">Flota disponible</p>
              {(() => {
                const pct = Math.round((flota.disponibles / flota.total) * 100);
                const tono = pct >= 70 ? 'bg-ok' : 'bg-aviso';
                return (
                  <div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
                      role="presentation"
                      title={`${flota.disponibles} de ${flota.total} unidades disponibles (${pct} %)`}
                    >
                      <div className={`h-full rounded-full ${tono}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="num mt-1.5 text-xs text-muted">
                      <span className="text-ink">{flota.disponibles}</span>/{flota.total} unidades ·{' '}
                      {pct}%
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        {usuario && (
          <div ref={menuRef} className="relative shrink-0 border-t border-line-subtle p-3">
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
              className="flex w-full items-center gap-2.5 rounded-sm p-1 transition-colors hover:bg-canvas-subtle"
            >
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center border border-line bg-canvas-subtle text-xs font-bold text-accent-texto"
              >
                {iniciales}
              </span>
              <span className="hidden min-w-0 flex-1 text-left leading-tight lg:block">
                <span className="block max-w-36 truncate text-[13px] font-semibold text-ink">
                  {usuario.nombre}
                </span>
                <span className="block text-[10px] font-semibold tracking-wider text-accent-texto uppercase">
                  {usuario.rol}
                </span>
              </span>
              <Icon
                name="desplegar"
                className={`hidden size-3.5 shrink-0 text-muted transition-transform lg:block ${menuAbierto ? 'rotate-180' : ''}`}
              />
            </button>
            {popoverUsuario}
          </div>
        )}
      </aside>

      {/* ── Barra superior móvil (< md) ────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface pr-3 pl-4 md:hidden">
        <Marca />
        <button
          type="button"
          onClick={() => setSheetAbierto(true)}
          aria-expanded={sheetAbierto}
          aria-controls="sheet-nav"
          aria-label="Abrir menú de navegación"
          className="inline-flex size-10 items-center justify-center rounded-sm border border-line text-ink"
        >
          <Icon name="panel" className="size-5" />
        </button>
      </header>

      {/* ── Sheet móvil (< md): nav + medidor + usuario ─────────────── */}
      {sheetAbierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setSheetAbierto(false)}
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
          />
          <div
            id="sheet-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navegación"
            className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto rounded-l-lg border-l border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="rotulo">Navegación</span>
              <button
                type="button"
                onClick={() => setSheetAbierto(false)}
                aria-label="Cerrar"
                className="inline-flex size-9 items-center justify-center rounded-sm border border-line text-muted transition-colors duration-(--dur-med) hover:border-accent hover:text-accent"
              >
                <Icon name="cerrar" className="size-4" />
              </button>
            </div>

            {NAV_GRUPOS.map((grupo, idx) => (
              <ul key={grupo.titulo} className={`mt-3 space-y-1 ${idx > 0 ? 'mt-4' : ''}`}>
                <li aria-hidden className="px-3">
                  <span className="rotulo text-[9px]">{grupo.titulo}</span>
                </li>
                {grupo.items.map((s) => (
                  <li key={s.href}>
                    <NavLink
                      href={s.href}
                      icono={s.icono}
                      variante="fila"
                      onClick={() => setSheetAbierto(false)}
                    >
                      {s.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            ))}

            <div className="mt-auto space-y-4 pt-6">
              {flota && (
                <div className="border-t border-line-subtle pt-4">
                  <MeterFlota flota={flota} />
                </div>
              )}
              {fechaLima && <p className="num border-t border-line-subtle pt-4 text-xs text-muted">{fechaLima}</p>}
              {bloqueUsuarioSheet}
            </div>
          </div>
        </div>
      )}

      {/* el wrapper compensa la barra lateral fija; la barra superior móvil, el padding */}
      <div className="min-h-svh md:pl-16 lg:pl-60">
        {/* barra de estado global: en desktop solo la fecha operativa; móvil conserva todo */}
        <div className="flex h-14 items-center justify-end gap-5 border-b border-line bg-surface/80 px-4 backdrop-blur-md sm:px-6 md:h-auto md:border-none md:bg-transparent md:px-8 md:pt-5 lg:px-10 md:backdrop-blur-none">
          <MeterFlota flota={flota} className="md:hidden" />
          {fechaLima && (
            <span
              className="num hidden text-xs whitespace-nowrap text-muted sm:block"
              title="Hora operativa de la faena (Lima)"
            >
              {fechaLima}
            </span>
          )}
          {usuario && (
            <span className="num text-xs whitespace-nowrap text-muted md:hidden">
              <span className="font-semibold text-ink">{usuario.nombre.split(' ')[0]}</span> ·{' '}
              {usuario.rol}
            </span>
          )}
        </div>

        <main id="contenido" className="px-4 pt-6 pb-12 sm:px-6 md:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </>
  );
}
