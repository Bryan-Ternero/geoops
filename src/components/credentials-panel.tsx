'use client';

import { useState } from 'react';

import { Icon, type NombreIcono } from './icons';

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
    nombre: 'Valeria Mendoza',
    email: 'supervisor@geoops.pe',
    clave: 'supervisor1234',
    puede: 'Control total, despacho de guardias y autorización de excepciones firmadas',
  },
  {
    rol: 'Planificador',
    nivel: 'Lvl 2 Access',
    icono: 'turnos',
    nombre: 'Marco Velásquez',
    email: 'planner@geoops.pe',
    clave: 'planner1234',
    puede: 'Gestión de flota, habilitación de operadores y asignaciones estándar',
  },
  {
    rol: 'Consulta',
    nivel: 'Lvl 1 Access',
    icono: 'persona',
    nombre: 'Camila Navarro',
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-controls="credenciales"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
      >
        <span>
          <span className="block text-sm font-semibold text-gray-900">Credenciales de demostración</span>
          <span className="mt-0.5 block text-xs text-gray-600">
            Haz clic en cualquier rol para autocompletar el formulario
          </span>
        </span>
        <Icon
          name="desplegar"
          className={`size-4 shrink-0 text-gray-500 transition-transform duration-200 ease-out motion-reduce:transition-none ${
            abierto ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        id="credenciales"
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <ul className="divide-y divide-gray-200 border-t border-gray-200">
            {CUENTAS.map((c) => (
              <li key={c.email} className="px-4 py-3 transition-colors hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-accent"
                  >
                    <Icon name={c.icono} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {c.rol}{' '}
                      <span className="ml-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                        · {c.nivel}
                      </span>
                    </p>
                    <p className="truncate text-xs text-gray-600">{c.nombre}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => llenarFormulario(c.email, c.clave)}
                    className="cursor-pointer rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                  >
                    Usar cuenta
                  </button>
                </div>
                <p className="num mt-1.5 ml-11 select-all break-all rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
                  {c.email} <span className="text-gray-400">·</span> {c.clave}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
