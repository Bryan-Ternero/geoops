# GeoOps — Control de equipos mineros y mantenimiento por horómetro

[![CI](https://github.com/GutoPin/miners-fullstack-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/GutoPin/miners-fullstack-challenge/actions/workflows/ci.yml)

Aplicación web para asignar equipos (camiones de acarreo, excavadoras, perforadoras) a los
turnos de una operación minera y controlar cuándo entran a mantenimiento, en reemplazo de las
hojas de cálculo con las que hoy se lleva ese control.

El sistema impide asignar un equipo bloqueado por horómetro, un operador sin certificación
vigente o el mismo equipo dos veces en el mismo turno, y cuando rechaza una asignación
muestra todas las reglas incumplidas, no solo la primera. Además proyecta qué equipos van a
alcanzar su mantenimiento en los próximos 7 días según los turnos ya programados, para
anticipar el bloqueo en lugar de descubrirlo al inicio de la guardia.

| | |
|---|---|
| **Aplicación** | https://miners-fullstack-challenge.vercel.app |
| **Decisiones de diseño** | [`DECISIONES.md`](./DECISIONES.md) |

---

## Acceso

| Rol | Usuario | Contraseña | Permisos |
|---|---|---|---|
| Supervisor | `supervisor@geoops.pe` | `supervisor1234` | Todo, incluido autorizar excepciones |
| Planificador | `planner@geoops.pe` | `planner1234` | Crear turnos y asignaciones, cerrar turnos, registrar mantenimientos |
| Consulta | `viewer@geoops.pe` | `viewer1234` | Solo lectura |

---

## Funcionalidad

| Módulo | Qué resuelve |
|---|---|
| **Equipos** | Horómetro, estado (`DISPONIBLE / BLOQUEADO / EN MANTENIMIENTO / FUERA DE SERVICIO`) y umbral del próximo servicio. |
| **Operadores y certificaciones** | Certificación por tipo de equipo con fecha de vencimiento. La vigencia se evalúa contra la fecha del turno, no contra la fecha actual. |
| **Turnos y asignaciones** | Turno = fecha + jornada (día o noche) + duración. Cada asignación se valida contra las 12 reglas del enunciado. |
| **Motor de reglas** | Un rechazo devuelve la lista completa de violaciones, cada una con su severidad y qué hacer para resolverla. |
| **Excepciones con autorización** | Un supervisor puede forzar las reglas que son política de la empresa (equipo bloqueado, certificación vencida) dejando motivo y traza. Las que son imposibilidad física no se pueden forzar. |
| **Cierre de turno** | Registra las horas reales, las suma al horómetro y bloquea el equipo si cruzó el umbral, todo en una transacción. |
| **Mantenimiento** | Libera el equipo, calcula el próximo umbral y deja historial con responsable, horómetro y atraso. |
| **Proyección a 7 días** | Simula el consumo de horas de los turnos programados: qué equipo cruza su umbral, en qué fecha y en qué jornada. |
| **Auditoría** | Libro mayor del horómetro y registro de excepciones autorizadas. |

---

## Recorrido de la demo

Los datos de ejemplo ya están cargados, con los casos borde armados.

1. **Un rechazo con sus razones.** En *Turnos*, intentar asignar `TAC-103` a Graciela Mamani
   (`OPR-015`). El sistema identifica el equipo bloqueado y la falta de certificación vigente;
   la imposibilidad física no puede forzarse.
2. **Excepción autorizada.** Intentar asignar un equipo bloqueado a un operador habilitado.
   Un supervisor puede usar *Forzar con autorización*: pide motivo, deja traza en auditoría y
   crea la asignación en estado **EN RIESGO**. El turno no se puede cerrar mientras existan
   asignaciones en riesgo sin resolver.
3. **Bloqueo por horómetro.** Cerrar el turno de hoy. `TAC-102` pasa de 738 a 750 h, alcanza
   su umbral y queda **BLOQUEADO**; las asignaciones futuras afectadas pasan a **EN RIESGO**
   con alerta crítica, en la misma transacción.
4. **Proyección.** En */proyeccion* aparece lo anterior antes de que ocurra: `TAC-102` y
   `EXC-201` cruzan su umbral dentro de la semana, con la fecha y la jornada exactas.
5. **Mantenimiento.** Registrar el servicio del equipo bloqueado lo libera, fija el siguiente
   umbral a partir del anterior (no del horómetro real) y devuelve a activas las asignaciones
   que estaban en riesgo por ese bloqueo.
6. **Auditoría.** En */auditoria* está el libro mayor del horómetro, con las horas antes y
   después de cada movimiento, y las excepciones firmadas.

---

## Stack

| Capa | Elección |
|---|---|
| Framework (interfaz y API en un despliegue) | Next.js 16 (App Router) + TypeScript |
| Base de datos | PostgreSQL (Neon) |
| ORM y migraciones | Prisma 7 con driver adapter `@prisma/adapter-pg` |
| Autenticación | Auth.js (Credentials) + bcrypt, roles `SUPERVISOR / PLANNER / VIEWER` |
| Validación | Zod en el borde HTTP; las reglas de negocio, en TypeScript puro |
| Interfaz | Tailwind CSS 4 |
| Tests | Vitest: unitarios del motor de reglas e integración contra PostgreSQL real |
| CI | GitHub Actions: lint, typecheck y ambas suites en cada push |
| Infraestructura | Vercel + Neon, y `docker compose` para levantar todo en local |

El porqué de cada elección está en [`DECISIONES.md`](./DECISIONES.md).

---

## Ejecución local

Con Docker, que además aplica las migraciones y carga los datos de ejemplo:

```bash
docker compose up --build        # http://localhost:3000
```

Con Node, contra una base propia:

```bash
cp .env.example .env             # completar AUTH_SECRET y las cadenas de conexión
docker compose up -d db          # PostgreSQL 17 en localhost:5432
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión que usa la aplicación. En Neon, la del pooler. |
| `MIGRATE_DATABASE_URL` | Conexión directa que usan las migraciones. La lee `prisma.config.ts`. |
| `AUTH_SECRET` | Firma de la sesión (`openssl rand -base64 32`). |
| `AUTH_URL` | URL pública de la aplicación, incluyendo el esquema. |

### Comandos

```bash
npm run dev            # desarrollo
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run test           # unitarios: reglas, política de umbrales y proyección
npm run test:int       # integración: cierre, mantenimiento y concurrencia (requiere base)
npm run db:seed        # datos de ejemplo
```

---

## Despliegue

La aplicación corre en Vercel y la base de datos en Neon (PostgreSQL serverless). Cada push a
`main` despliega y aplica las migraciones pendientes. Un workflow programado consulta
`/api/health` cada 6 horas para que la base no esté suspendida cuando alguien abra la demo.

Los rechazos y errores del API se registran como una línea JSON con `requestId`, y ese mismo
identificador se devuelve en la cabecera `x-request-id` de la respuesta, así que con el
número que ve el usuario se puede ubicar la línea exacta en los logs.

---

## Estructura

```
src/domain/      Reglas de negocio en TypeScript puro: sin ORM, sin framework
src/services/    Casos de uso y transacciones
app/api/         Endpoints REST
app/(dashboard)/ Interfaz
prisma/          Esquema, migraciones versionadas y datos de ejemplo
tests/           Unitarios del dominio e integración contra PostgreSQL
```
