import { z } from 'zod';

import { errorResponse, logJson, parseBody, requireRole, traza } from '@/app/api/http';
import { registerMaintenance } from '@/src/use-cases/register-maintenance';

export const dynamic = 'force-dynamic';

const schema = z.object({
  equipmentId: z.string().min(1, 'indique el equipo').max(100),
  hoursAtService: z.number().nonnegative('el horómetro no puede ser negativo'),
  responsible: z
    .string()
    .min(1, 'indique quién ejecutó el mantenimiento')
    .max(255, 'el nombre del responsable no puede exceder 255 caracteres'),
  performedAt: z.coerce.date().optional(),
  notes: z.string().max(2000, 'las notas no pueden exceder 2000 caracteres').optional(),
});

export async function POST(request: Request) {
  const t = traza(request, 'maintenance.register');
  let userId: string | undefined;

  try {
    ({ id: userId } = await requireRole('PLANNER', 'SUPERVISOR'));
    const input = parseBody(schema, await request.json());

    const result = await registerMaintenance({ ...input, userId });

    logJson({
      ...t,
      userId,
      outcome: 'registered',
      equipmentId: input.equipmentId,
      hoursAtService: input.hoursAtService,
      nextThreshold: result.nextThreshold,
      overdue: result.overdue,
      reAnchored: result.reAnchored,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, { ...t, userId });
  }
}
