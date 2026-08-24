import { redirect } from 'next/navigation';

import { auth } from '@/src/auth';
import { CredencialesDemo } from '@/src/components/credentials-panel';
import { BotonEnviar } from '@/src/components/submit-button';
import { Aviso, boton, campo } from '@/src/components/ui';
import { entrar } from './actions';

export const metadata = { title: 'Acceso · GeoOps' };

const FECHA_LIMA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  dateStyle: 'full',
  timeStyle: 'short',
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await auth()) redirect('/');

  const { error } = await searchParams;

  return (
    <main className="grid min-h-svh items-stretch lg:grid-cols-2">
      {/* Columna visual: foto duotono con ticks plenos y franja de niveles de acceso */}
      <section className="panel-ticks ticks-full relative hidden min-h-svh overflow-hidden lg:block">
        <div
          className="absolute inset-0 z-0 motion-safe:animate-[ken-burns_30s_ease-in-out_infinite_alternate] origin-[30%_70%]"
          style={{
            backgroundImage: "url('/mining-hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: '30% 70%',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#1a1815',
          }}
        />

        {/* duotono tinta cálida + lavado cobre (mezcla overlay) */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#161311]/85 via-[#1a1715]/45 to-[#1a1715]/60" />
        <div className="absolute inset-0 z-10 bg-copper/15 mix-blend-overlay" />

        <div className="relative z-20 flex flex-col justify-end px-16 pb-14">
          <p className="font-mono text-xs tracking-[0.2em] text-copper-hover uppercase">
            Sistema de control operacional
          </p>
          <h1 className="mt-2 font-display text-6xl font-bold tracking-[0.08em] text-white uppercase [font-stretch:125%] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            Geoops
          </h1>
          <div aria-hidden className="mt-4 h-px w-24 bg-copper" />
          <p className="mt-3 text-xs font-semibold tracking-[0.09em] text-white/70 uppercase">
            Collpahuasi · Perú
          </p>
          <p className="num mt-10 border-t border-white/15 pt-4 text-[11px] tracking-wider text-white/55 uppercase">
            LVL 3 Supervisor · LVL 2 Planificador · LVL 1 Consulta
          </p>
        </div>
      </section>

      {/* Banner móvil/tablet */}
      <section className="panel-ticks ticks-full relative h-64 overflow-hidden lg:hidden">
        <div
          className="absolute inset-0 z-0 motion-safe:animate-[ken-burns_30s_ease-in-out_infinite_alternate] origin-[35%_70%]"
          style={{
            backgroundImage: "url('/mining-hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: '35% 72%',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#1a1815',
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#161311]/65 via-[#1a1715]/40 to-[#1a1715]/75" />
        <div className="absolute inset-0 z-10 bg-copper/15 mix-blend-overlay" />
        <div className="relative z-20 flex h-full flex-col items-center justify-center gap-2">
          <h1 className="font-display text-4xl font-bold tracking-[0.08em] text-white uppercase [font-stretch:125%] drop-shadow-[0_4px_18px_rgba(0,0,0,0.7)]">
            Geoops
          </h1>
          <span className="text-xs font-semibold tracking-[0.09em] text-white/75 uppercase">
            Collpahuasi
          </span>
        </div>
      </section>

      {/* Columna formulario: lienzo piedra, nativa del sistema */}
      <section className="flex flex-col justify-center bg-canvas px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-sm bg-accent font-display text-lg font-bold text-copper-ink">
              G
            </div>
            <div>
              <p className="font-display text-lg leading-none font-bold tracking-[0.08em] text-ink uppercase [font-stretch:125%]">
                Geoops
              </p>
              <p className="rotulo mt-1">Control Operacional Minero</p>
            </div>
          </div>

          <h2 className="mb-1 font-display text-3xl font-semibold tracking-tight text-ink">
            Iniciar sesión
          </h2>
          <p className="mb-8 text-sm text-muted">Accede con tus credenciales operacionales.</p>

          <form action={entrar} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-muted">
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
                className={campo.input}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-muted">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={campo.input}
              />
            </div>

            {error && (
              <div role="alert">
                <Aviso tono="bloqueo">
                  No se pudo iniciar sesión. Verifica tu correo y contraseña.
                </Aviso>
              </div>
            )}

            <BotonEnviar pendiente="Iniciando sesión…" className={`${boton.primario} w-full`}>
              Iniciar sesión
            </BotonEnviar>
          </form>

          <div className="mt-8">
            <CredencialesDemo />
          </div>

          <p className="num mt-8 text-center text-[11px] text-muted">
            {FECHA_LIMA.format(new Date())} · Lima, PE
          </p>
        </div>
      </section>
    </main>
  );
}
