'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { Icon } from './icons';

/**
 * Native <dialog>-based confirmation for destructive operations. Replaces window.confirm
 * (the only behavioral change authorized by the redesign scope). Cancel is the safe
 * default; confirm keeps focus so Enter repeats the intent and Escape always cancels.
 */
export function DialogConfirm({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  descripcion,
  etiquetaConfirmar = 'Confirmar',
  etiquetaCancelar = 'Cancelar',
  enviando = false,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
  titulo: string;
  descripcion: string;
  etiquetaConfirmar?: string;
  etiquetaCancelar?: string;
  enviando?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;

    if (abierto && !dialogo.open) {
      dialogo.showModal();
      dialogo.querySelector<HTMLButtonElement>('[data-confirmar]')?.focus();
    }
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current && !enviando) onCerrar();
      }}
      aria-labelledby="dialog-confirm-titulo"
      className="w-[min(26rem,calc(100vw-2rem))] border border-line-strong bg-surface p-0 text-ink shadow-2xl shadow-black/50"
    >
      <div className="border-l-2 border-bloqueo px-5 py-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center border border-bloqueo/50 bg-bloqueo-dim text-bloqueo"
          >
            <Icon name="alerta" className="size-4.5" />
          </span>
          <div className="min-w-0">
            <h2 id="dialog-confirm-titulo" className="font-display text-lg font-normal tracking-tight text-ink not-italic">
              {titulo}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{descripcion}</p>
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="inline-flex min-h-10 items-center rounded-sm border border-line-strong px-4 text-[13px] font-medium text-muted transition-colors hover:border-copper hover:text-copper disabled:pointer-events-none disabled:opacity-40"
          >
            {etiquetaCancelar}
          </button>
          <button
            type="button"
            data-confirmar
            onClick={onConfirmar}
            disabled={enviando}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-bloqueo bg-bloqueo-dim px-4 text-[13px] font-semibold text-bloqueo transition-all duration-150 hover:bg-bloqueo hover:text-ink active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            {enviando && (
              <span
                aria-hidden
                className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none"
              />
            )}
            {etiquetaConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
