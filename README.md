# GeoOps

> Sistema de asignación y mantenimiento de equipos mineros por horómetro.

**Demo en producción:** https://geoops-system.vercel.app
**Criterio y decisiones de diseño:** [`DECISIONES.md`](./DECISIONES.md)

---

## El problema que resuelve

En una operación minera, camiones de acarreo, excavadoras y perforadoras se reparten entre
turnos día/noche, cada uno con requisitos de certificación por operador y un umbral de
mantenimiento por horómetro. Cuando ese proceso se lleva en una hoja de cálculo, nada impide
que:

- se asigne un equipo que ya debería estar en mantenimiento,
- un operador entre a operar con una certificación vencida,
- dos personas asignen el mismo equipo al mismo turno al mismo tiempo.

GeoOps convierte esas reglas en restricciones que el sistema hace cumplir — a nivel de
aplicación y, donde el negocio lo exige, a nivel de base de datos — en vez de dejarlas
libradas a que alguien se acuerde de revisarlas.

---

## Ingresar a la demo

| Rol | Correo | Contraseña | Alcance |
|---|---|---|---|
| Supervisor | `supervisor@geoops.pe` | `supervisor1234` | Acceso completo, incluida la autorización de excepciones |
| Planificador | `planner@geoops.pe` | `planner1234` | Turnos, asignaciones, cierres y mantenimientos |
| Consulta | `viewer@geoops.pe` | `viewer1234` | Solo lectura |

Los datos de ejemplo ya vienen cargados con los casos límite armados (ver más abajo).

---

## Qué hay dentro

**Equipos** — código, tipo, horómetro y estado (`DISPONIBLE`, `BLOQUEADO`, `EN
MANTENIMIENTO`, `FUERA DE SERVICIO`), con el umbral del próximo servicio calculado.

**Operadores y certificaciones** — una certificación por tipo de equipo, con vencimiento
evaluado contra la fecha del turno, no contra la fecha de hoy.

**Turnos y asignaciones** — cada intento de asignación pasa por las 12 reglas del enunciado
antes de crearse.

**Motor de reglas** — un rechazo no dice solo "no se puede": devuelve todas las violaciones
encontradas, cada una con su severidad y qué haría falta para resolverla.

**Excepciones autorizadas** — un supervisor puede forzar una regla de política (no una
imposibilidad física) dejando motivo y traza; la asignación queda visible como excepción,
nunca como si nada hubiera pasado.

**Cierre de turno** — las horas reales se suman al horómetro y, si cruzan el umbral, el
equipo se bloquea — todo en una sola transacción.

**Mantenimiento** — libera el equipo, ancla el próximo umbral y guarda historial completo:
responsable, horómetro, atraso.

**Proyección a 7 días** — no mira el estado actual, simula los turnos ya programados para
anticipar qué equipo va a cruzar su umbral, cuándo y en qué jornada.

**Auditoría** — libro mayor del horómetro y registro de cada excepción firmada.

---

## Un recorrido rápido

1. Intenta asignar `TAC-103` (bloqueado) a Graciela Mamani (sin certificación) en *Turnos*.
   Vas a ver las dos violaciones a la vez, y ninguna es forzable por ser imposibilidad física.
2. Ahora intenta asignar un equipo bloqueado a un operador sí habilitado, y usa *Forzar con
   autorización*. Pide motivo, queda en auditoría, y la asignación se crea como **EN RIESGO**.
3. Cierra el turno de hoy. `TAC-102` sube de 738 a 750 h, toca su umbral y queda
   **BLOQUEADO**; cualquier asignación futura suya pasa a **EN RIESGO** en la misma
   transacción.
4. Entra a */proyeccion*: ese bloqueo ya aparecía anticipado ahí, junto con `EXC-201`, antes
   de que ocurriera.
5. Registra el mantenimiento de `TAC-102`. El equipo se libera, el siguiente umbral se calcula
   desde el anterior (no desde el horómetro real) y las asignaciones en riesgo vuelven a
   activarse solas.
6. Revisa */auditoria* para ver el movimiento completo del horómetro y las excepciones
   firmadas.

---

## Stack técnico

- **Next.js 16** (App Router) + TypeScript, interfaz y API en el mismo despliegue
- **PostgreSQL** sobre **Neon**, con **Prisma 7** (`@prisma/adapter-pg`)
- **Auth.js** (Credentials) + bcrypt — roles `SUPERVISOR`, `PLANNER`, `VIEWER`
- **Zod** en el borde HTTP; las reglas de negocio viven en TypeScript puro, sin depender de Zod ni de Prisma
- **Tailwind CSS 4** para la interfaz
- **Vitest** (unitarios + integración contra Postgres real) y **Playwright** (E2E)
- **GitHub Actions** — lint, typecheck y tests en cada push
- **Vercel + Neon** en producción; `docker compose` para levantar todo en local

El razonamiento detrás de cada elección está documentado en [`DECISIONES.md`](./DECISIONES.md).

---

## Levantarlo en tu máquina

### Opción rápida, con Docker

Aplica migraciones y carga los datos de ejemplo automáticamente:

```bash
docker compose up --build
# http://localhost:3000
```

### Opción manual, con Node

```bash
cp .env.example .env         # completar AUTH_SECRET y las cadenas de conexión
docker compose up -d db      # solo levanta PostgreSQL 17 en localhost:5432
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión de la aplicación (en Neon, la del pooler) |
| `MIGRATE_DATABASE_URL` | Conexión directa para migraciones (la usa `prisma.config.ts`) |
| `AUTH_SECRET` | Firma de sesión — generar con `openssl rand -base64 32` |
| `AUTH_URL` | URL pública de la app, con esquema incluido |

### Scripts disponibles

```bash
npm run dev          # servidor de desarrollo
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm run test           # unitarios: reglas, umbrales, proyección
npm run test:int      # integración: cierre, mantenimiento, concurrencia (requiere base)
npm run test:e2e      # flujos end-to-end
npm run db:seed       # carga los datos de ejemplo
```

---

## Cómo está desplegado

La aplicación corre en **Vercel** y la base en **Neon** (Postgres serverless). Cada push a
`main` dispara un despliegue nuevo; el build ejecuta `prisma migrate deploy` antes de
compilar, y las migraciones directas usan `MIGRATE_DATABASE_URL`. Un workflow programado
llama a `/api/health` cada 6 horas para que la base no quede suspendida justo cuando alguien
abre la demo.

Cada error del API se registra como una línea JSON con un `requestId`, que también viaja en
la cabecera `x-request-id` de la respuesta — así el identificador que ve el usuario permite
ubicar el log exacto.

---

## Organización del código

```
src/core/        reglas de negocio en TypeScript puro — sin ORM, sin framework
src/use-cases/   casos de uso y transacciones que orquestan esas reglas
app/api/         endpoints REST
app/(workspace)/ interfaz
prisma/          esquema, migraciones y datos de ejemplo
tests/           unitarios, integración contra Postgres real y E2E
```

`src/core/` y `src/use-cases/` se mantienen separados a propósito: uno son reglas puras y
testeables en milisegundos, el otro las orquesta dentro de transacciones reales. Por qué, en
[`DECISIONES.md`](./DECISIONES.md).

---

## Licencia

Sin licencia declarada por el momento.
