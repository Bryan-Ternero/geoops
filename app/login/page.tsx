import { redirect } from 'next/navigation';

import { auth } from '@/src/auth';
import { CredencialesDemo } from '@/src/components/credentials-panel';
import { BotonEnviar } from '@/src/components/submit-button';
import { Aviso } from '@/src/components/ui';
import { entrar } from './actions';

export const metadata = { title: 'Acceso · GeoOps' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await auth()) redirect('/');

  const { error } = await searchParams;

  return (
    <main className="grid min-h-svh lg:grid-cols-2 items-stretch">
      {/* Panel izquierdo: Imagen de minería con overlay */}
      <section className="relative hidden lg:flex overflow-hidden min-h-svh">
        <div
          className="absolute inset-0 z-0 motion-safe:animate-[ken-burns_30s_ease-in-out_infinite_alternate] origin-[30%_70%]"
          style={{
            backgroundImage: "url('/mining-hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: '30% 70%',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#1a1a1a',
          }}
        />

        {/* Overlay oscuro elegante — más oscuro en la izquierda para legibilidad del branding */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/55" />

        {/* Branding GeoOps */}
        <div className="relative z-20 flex flex-col justify-end pb-20 px-16">
          <h1 className="font-display text-6xl font-normal tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] not-italic">
            GeoOps
          </h1>
        </div>
      </section>

      {/* Banner para móvil/tablet */}
      <section className="relative lg:hidden h-64 overflow-hidden">
        <div
          className="absolute inset-0 z-0 motion-safe:animate-[ken-burns_30s_ease-in-out_infinite_alternate] origin-[35%_70%]"
          style={{
            backgroundImage: "url('/mining-hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: '35% 72%',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#1a1a1a',
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />
        <div className="relative z-20 flex items-center justify-center h-full">
          <h1 className="font-display text-4xl font-normal tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.7)] not-italic">
            GeoOps
          </h1>
        </div>
      </section>

      {/* Panel derecho: Formulario de login limpio */}
      <section className="flex flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Logo móvil */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
              <span className="font-bold text-white">G</span>
            </div>
            <span className="font-display text-xl font-semibold text-gray-900 not-italic tracking-wide">GeoOps</span>
          </div>

          {/* Logo desktop */}
          <div className="mb-8 hidden lg:flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
              <span className="font-bold text-white">G</span>
            </div>
            <span className="font-display text-xl font-semibold text-gray-900 not-italic tracking-wide">GeoOps</span>
          </div>

          <h2 className="mb-2 font-display text-3xl font-normal text-gray-900 not-italic tracking-tight">
            Iniciar sesión
          </h2>
          <p className="mb-8 text-sm text-gray-600">
            Accede a tu cuenta para continuar.
          </p>

          <form action={entrar} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="username"
                spellCheck={false}
                placeholder="supervisor@geoops.pe"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {error && (
              <div role="alert">
                <Aviso tono="bloqueo" className="rounded-lg">
                  No se pudo iniciar sesión. Verifica tu correo y contraseña.
                </Aviso>
              </div>
            )}

            <BotonEnviar
              pendiente="Iniciando sesión…"
              className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Iniciar sesión
            </BotonEnviar>
          </form>

          <div className="mt-8">
            <CredencialesDemo />
          </div>

          <div className="mt-8 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500" />
              SYS.ONLINE
            </span>
            <span>v2.4.1</span>
          </div>
        </div>
      </section>
    </main>
  );
}
