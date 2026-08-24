'use client';

import { useState } from 'react';

import { Icon, type NombreIcono } from './icons';
import { boton } from './ui';

const CUENTAS: {
  rol: string;
  nivel: string;
  icono: NombreIcono;
  nombre: string;
  email: string;
  clave: string;
  puede: string;
}[] = [
  {
    rol: 'Supervisor',
    nivel: 'Lvl 3 Access',
    icono: 'visto',
    nombre: 'Rosario Quispe',
    email: 'supervisor@geoops.pe',
    clave: 'supervisor1234',
    puede: 'Control total, despacho de guardias y autorización de excepciones firmadas',
  },
  {
    rol: 'Planificador',
    nivel: 'Lvl 2 Access',
    icono: 'turnos',
    nombre: 'Alonso Rivas',
    email: 'planner@geoops.pe',
    clave: 'planner1234',
    puede: 'Gestión de flota, habilitación de operadores y asignaciones estándar',
  },
  {
    rol: 'Consulta',
    nivel: 'Lvl 1 Access',
    icono: 'persona',
    nombre: 'Diana Flores',
    email: 'viewer@geoops.pe',
    clave: 'viewer1234',
    puede: 'Monitoreo de telemetría, proyecciones y auditoría del libro mayor (modo lectura)',
  },
];

export function CredencialesDemo() {
  const [abierto, setAbierto] = useState(true);

  const llenarFormulario = (email: string, clave: string) => {
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement | null;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement | null;
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = clave;
      emailInput.focus();
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-canvas-subtle">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-controls="credenciales"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-(--dur-med) hover:bg-bg2"
      >
        <span>
          <span className="rotulo block">Acceso de demostración</span>
          <span className="mt-0.5 block text-xs text-muted">
            Haz clic en un rol para autocompletar el formulario
          </span>
        </span>
        <Icon
          name="desplegar"
          className={`size-4 shrink-0 text-muted transition-transform duration-(--dur-med) ease-out motion-reduce:transition-none ${
            abierto ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        id="credenciales"
        className={`grid transition-[grid-template-rows] duration-(--dur-overlay) ease-out motion-reduce:transition-none ${
          abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <ul className="divide-y divide-line-subtle border-t border-line-subtle">
            {CUENTAS.map((c) => (
              <li
                key={c.email}
                className="px-4 py-3 transition-colors duration-(--dur-med) hover:bg-bg2"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-xs border border-line-strong bg-surface text-accent-texto"
                  >
                    <Icon name={c.icono} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
                      {c.rol}
                      <span className="num text-[10px] font-semibold tracking-wider text-muted uppercase">
                        {c.nivel}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted">{c.nombre}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => llenarFormulario(c.email, c.clave)}
                    className={boton.tabla}
                  >
                    Usar cuenta
                  </button>
                </div>
                <p className="num mt-1.5 ml-11 select-all rounded-xs border border-line bg-surface px-2 py-1 break-all text-xs text-muted">
                  {c.email} <span className="text-ink-low">·</span> {c.clave}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
