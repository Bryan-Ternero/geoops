import type { Violation } from '../core/rules/violation';
import { Badge } from './ui';

const SEVERIDAD = {
  HARD: { etiqueta: 'Infracción Bloqueante (No Autorizable)', tono: 'bloqueo' as const },
  OVERRIDABLE: { etiqueta: 'Políticas de Empresa (Autorizable por Supervisor)', tono: 'aviso' as const },
  WARNING: { etiqueta: 'Alerta Operativa (No Bloqueante)', tono: 'taller' as const },
};

export function PanelViolaciones({
  mensaje,
  violations,
}: {
  mensaje: string;
  violations: Violation[];
}) {
  if (violations.length === 0) {
    return (
      <div className="rounded-sm border border-bloqueo/30 bg-bloqueo-dim p-4 text-sm font-medium text-ink">
        {mensaje}
      </div>
    );
  }

  return (
    <div className="border border-bloqueo/30 bg-bloqueo-dim">
      <div className="border-b border-bloqueo/20 px-4 py-3 text-sm font-semibold text-bloqueo">
        {mensaje}
      </div>

      <ul className="divide-y divide-bloqueo/15">
        {violations.map((v) => (
          <li key={v.code} className="p-4 transition-colors hover:bg-bloqueo/5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tono={SEVERIDAD[v.severity].tono}>{v.code}</Badge>
              <span className="text-xs font-medium text-muted">{SEVERIDAD[v.severity].etiqueta}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink">{v.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
