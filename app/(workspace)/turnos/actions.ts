'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireRole } from '@/src/auth';
import type { Journey } from '@/src/core/types';
import { createShift } from '@/src/use-cases/create-shift';
import { ServiceError } from '@/src/use-cases/errors';

export type EstadoAccion = { ok?: string; error?: string };

/** Apertura de guardia invocada desde el modal; en éxito redirige al detalle del turno. */
export async function crearTurno(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  let turnoCreadoId: string | null = null;

  try {
    await requireRole('PLANNER', 'SUPERVISOR');

    const nuevoTurno = await createShift({
      date: String(formData.get('date') ?? ''),
      journey: String(formData.get('journey') ?? 'DAY') as Journey,
      plannedHours: Number(formData.get('plannedHours') ?? 12),
    });

    turnoCreadoId = nuevoTurno.id;
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }

  revalidatePath('/turnos');
  redirect(`/turnos/${turnoCreadoId ?? ''}?nuevo=1`);
}
