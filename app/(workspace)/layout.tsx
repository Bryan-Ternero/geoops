import { auth, signOut } from '@/src/auth';
import { prisma } from '@/src/infrastructure/database/prisma';
import { Shell } from './shell';

const ROL: Record<string, { nombre: string; puede: string }> = {
  SUPERVISOR: {
    nombre: 'Supervisor',
    puede: 'Asigna, cierra turnos y firma excepciones.',
  },
  PLANNER: {
    nombre: 'Planificador',
    puede: 'Asigna y cierra turnos. No firma excepciones.',
  },
  VIEWER: { nombre: 'Consulta', puede: 'Solo lectura.' },
};

const FORMATO_FECHA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});
const FORMATO_HORA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** fecha/hora operativa de la faena (Lima), formateada en el servidor para evitar mismatch */
function fechaLima(): string {
  const ahora = new Date();
  return `${FORMATO_FECHA.format(ahora)} · ${FORMATO_HORA.format(ahora)} LIM`;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const rol = session ? ROL[session.user.role] : undefined;

  // medidor de capacidad en vivo del Command Bar: un solo aggregate ligero por navegación
  const flota = await prisma.equipment
    .groupBy({ by: ['status'], _count: { _all: true } })
    .catch(() => []);
  const total = flota.reduce((acc, g) => acc + g._count._all, 0);
  const disponibles = flota
    .filter((g) => g.status === 'AVAILABLE')
    .reduce((acc, g) => acc + g._count._all, 0);

  async function cerrarSesion() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <Shell
      flota={total > 0 ? { total, disponibles } : undefined}
      fechaLima={fechaLima()}
      cerrarSesion={cerrarSesion}
      usuario={
        session?.user && {
          // `name` is optional in the Auth.js session type even though the seed always sets it
          nombre: session.user.name ?? session.user.email ?? 'Sesión iniciada',
          rol: rol?.nombre ?? session.user.role,
          puede: rol?.puede ?? '',
        }
      }
    >
      {children}
    </Shell>
  );
}
