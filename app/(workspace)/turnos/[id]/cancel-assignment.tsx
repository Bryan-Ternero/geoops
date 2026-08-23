'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { postJson } from '@/src/components/api';
import { DialogConfirm } from '@/src/components/dialog-confirm';
import { Icon, Spinner } from '@/src/components/icons';

/** Cancelling frees the slot without erasing history; reassigning is cancel plus create. */
export function CancelarAsignacion({ assignmentId, etiqueta }: { assignmentId: string; etiqueta: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);

  async function cancelar() {
    setEnviando(true);
    setError(null);
    const res = await postJson(`/api/assignments/${assignmentId}/cancel`);
    setEnviando(false);

    if (res.ok) {
      setConfirmarAbierto(false);
      router.refresh();
    } else {
      // el diálogo permanece abierto para mostrar el fallo en contexto
      setError(res.error.message);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={enviando}
        onClick={() => setConfirmarAbierto(true)}
        className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs whitespace-nowrap transition-colors hover:border-bloqueo hover:text-bloqueo disabled:opacity-40"
      >
        {enviando ? <Spinner className="size-3.5" /> : <Icon name="cerrar" className="size-3.5" />}
        {enviando ? 'Cancelando…' : 'Cancelar'}
      </button>

      <DialogConfirm
        abierto={confirmarAbierto}
        onCerrar={() => {
          if (!enviando) {
            setError(null);
            setConfirmarAbierto(false);
          }
        }}
        onConfirmar={() => void cancelar()}
        titulo="Cancelar asignación"
        descripcion={`¿Cancelar la asignación de ${etiqueta}? El cupo queda libre y la asignación se conserva como cancelada.`}
        etiquetaConfirmar="Sí, cancelar asignación"
        enviando={enviando}
      >
        {error && (
          <p role="alert" className="border border-bloqueo/40 bg-bloqueo-dim px-3 py-2 text-xs leading-relaxed text-bloqueo">
            {error}
          </p>
        )}
      </DialogConfirm>
    </>
  );
}
