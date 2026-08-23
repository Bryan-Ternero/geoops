# GeoOps — Control de equipos mineros y mantenimiento por horómetro

[![CI](https://github.com/Bryan-Ternero/geoops/actions/workflows/ci.yml/badge.svg)](https://github.com/Bryan-Ternero/geoops/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![License](https://img.shields.io/badge/license-no%20license-lightgrey)

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

## Contenido

- [Qué demuestra este proyecto](#qué-demuestra-este-proyecto)
- [Acceso](#acceso)
- [Funcionalidad](#funcionalidad)
- [Recorrido de la demo](#recorrido-de-la-demo)
- [Stack](#stack)
- [Ejecución local](#ejecución-local)
- [Despliegue](#despliegue)
- [Estructura](#estructura)
- [Licencia](#licencia)

---

## Qué demuestra este proyecto

Este proyecto pone énfasis en tres aspectos:

- **Reglas de negocio testeables de forma aislada.** `src/core/` no depende de ORM ni de
   framework: las reglas de asignación, la política de umbrales y la proyección a 7 días se
   pueden probar como funciones puras.
- **Transacciones consistentes en operaciones críticas.** El cierre de turno y el registro de
   mantenimiento ocurren en una sola transacción para evitar estados intermedios inconsistentes.
- **Trazabilidad operativa.** El sistema conserva el historial del horómetro, las excepciones
   autorizadas y un `requestId` para rastrear los errores del API.

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
| Tests | Vitest: unitarios e integración contra PostgreSQL real; Playwright: flujos E2E |
| CI | GitHub Actions: lint, typecheck y pruebas unitarias e integración en cada push |
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
npm run test:e2e       # flujos end to end contra la aplicación local
npm run db:seed        # datos de ejemplo
```

---

## Despliegue

La aplicación está preparada para correr en Vercel y la base de datos en Neon (PostgreSQL
serverless). Una vez conectado el repositorio a Vercel, cada push a `main` podrá desplegar la
aplicación. Las migraciones pendientes deben ejecutarse con `MIGRATE_DATABASE_URL`; el build
actual también ejecuta `prisma migrate deploy` antes de compilar. Un workflow programado
consulta `/api/health` cada 6 horas para que la base no esté suspendida cuando alguien abra la
demo.

Los rechazos y errores del API se registran como una línea JSON con `requestId`, y ese mismo
identificador se devuelve en la cabecera `x-request-id` de la respuesta, así que con el
número que ve el usuario se puede ubicar la línea exacta en los logs.

---

## Estructura

```
src/core/        Reglas de negocio en TypeScript puro: sin ORM, sin framework
src/use-cases/   Casos de uso y transacciones
app/api/         Endpoints REST
app/(workspace)/ Interfaz
prisma/          Esquema, migraciones versionadas y datos de ejemplo
tests/           Unitarios, integración contra PostgreSQL y flujos E2E
```

`src/core/` y `src/use-cases/` están separados a propósito: el primero contiene las reglas de
negocio como funciones puras y el segundo las orquesta dentro de transacciones y casos de uso
concretos. El detalle de esta decisión está en [`DECISIONES.md`](./DECISIONES.md).

---

## Licencia

Este repositorio no declara actualmente una licencia de uso o distribución. El código se
mantiene como proyecto de evaluación técnica.
