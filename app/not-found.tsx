import Link from 'next/link';

import { Icon } from '@/src/components/icons';
import { boton } from '@/src/components/ui';

export const metadata = {
  title: '404 - Recurso No Encontrado · GeoOps',
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <div className="relative mx-auto max-w-lg">
        {/* firma de identidad: código condensed gigante */}
        <span
          aria-hidden
          className="pointer-events-none -mb-10 block font-condensed text-[6rem] leading-none font-bold tracking-tighter text-accent/15 select-none sm:-mb-14 sm:text-[9rem]"
        >
          404
        </span>

        <div className="panel-ticks relative border border-line bg-surface p-8 sm:p-12">
          <div className="inline-flex size-14 items-center justify-center border border-line-strong bg-bg2 text-accent">
            <Icon name="alerta" className="size-7" />
          </div>

          <span className="rotulo mt-6 block !text-accent">Código de Error 404</span>

          <h1 className="mt-2 font-display text-2xl font-normal tracking-tight text-ink not-italic sm:text-3xl">
            Recurso o Guardia No Encontrada
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            La unidad, registro de guardia o sección a la que intenta acceder no existe, ha sido
            reasignada o el identificador es incorrecto.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className={boton.primario}>
              Volver al Panel de Control
            </Link>

            <Link href="/turnos" className={boton.secundario}>
              Matriz de Guardias
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
