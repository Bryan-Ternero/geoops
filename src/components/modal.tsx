'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { Icon } from './icons';

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;

    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
      aria-labelledby="modal-titulo"
      className="w-[min(38rem,calc(100vw-2rem))] border border-line-strong bg-surface p-0 text-ink shadow-2xl shadow-black/50 overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 py-4">
        <div>
          <h2 id="modal-titulo" className="font-display text-lg font-normal tracking-tight text-ink not-italic">
            {titulo}
          </h2>
          {descripcion && <p className="mt-1 text-sm text-muted">{descripcion}</p>}
        </div>

        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex size-8 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-copper hover:text-copper"
        >
          <Icon name="cerrar" className="size-4" />
        </button>
      </div>

      <div className="max-h-[75svh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
