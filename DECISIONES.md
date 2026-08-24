# Decisiones de diseño — GeoOps

Cómo modelé los datos y por qué, cómo resolví cada decisión abierta del enunciado, qué dejé
fuera y qué haría con más tiempo. Todas las citas de código corresponden al commit `87218ca`
de `main`; si el repo avanzó, los números de línea pueden haberse desplazado.

---

## 1. Modelo de datos

### 1.1 Decisiones estructurales

**a) El intervalo de mantenimiento vive en el tipo de equipo, con excepción por unidad.**
`EquipmentType.maintenanceIntervalHours` guarda el intervalo por familia. Cada unidad puede
tener además `Equipment.maintenanceIntervalOverride` (nulo por defecto), porque en operación
real una unidad reparada o antigua puede quedar con un régimen distinto al de su familia.
`tests/integration/registry.spec.ts` prueba explícitamente que el override manda sobre el
intervalo del tipo al calcular el primer umbral.

**b) El umbral se almacena, no se calcula.** `Equipment.nextMaintenanceHours` guarda el valor
de horómetro que dispara el bloqueo. Se podría derivar (`horas del último servicio +
intervalo`), pero almacenarlo tiene tres ventajas: la proyección de 7 días queda como una
consulta simple sin tener que recalcular intervalos en cada lectura (ver §2.7), permite
umbrales excepcionales, y deja explícita la política de desfase de §2.3 en lugar de
esconderla en una fórmula que se evalúa en cada request.

**c) El horómetro es un libro mayor, no un contador.** `HourmeterEntry` registra cada
movimiento y el saldo (`Equipment.currentHours`) solo se actualiza dentro de la misma
transacción que escribe el asiento. El invariante — que la suma de los asientos reconstruye
el saldo actual — está probado en dos lugares:

```
tests/integration/close-shift.spec.ts:169
  it('la suma de los asientos del ledger es igual al horómetro actual', async () => {

tests/integration/registry.spec.ts:100-101
  "el saldo del equipo tiene que poder reconstruirse sumando el libro mayor"
```

**d) Las reglas 6 y 7 son restricciones de base de datos, no `if` de aplicación.** Un índice
único por `(shift, equipment)` y otro por `(shift, operator)` sobre las asignaciones activas
garantizan que ningún equipo ni operador quede duplicado en el mismo turno, incluso con
varias instancias de la aplicación corriendo en paralelo. La comprobación en el código de
negocio existe para dar buenos mensajes de error; la garantía real la da el motor de base de
datos (detalle completo en §2.6).

**e) Planificado y real son columnas distintas, y la planificada está acotada por el turno.**
`Shift.plannedHours` es la duración del turno. `Assignment.plannedHours` es editable por
asignación pero no puede superar la duración del turno — está validado explícitamente en
`src/use-cases/create-assignment.ts:47-55`:

```ts
// an assignment cannot plan more operation than the shift itself lasts: the equipment is
// only in the operator's hands during the journey, so anything beyond it is not schedulable
const horas = input.plannedHours ?? shiftPlannedHours;

if (!Number.isFinite(horas) || horas <= 0 || horas > shiftPlannedHours) {
  throw new ServiceError({
    code: 'HOURS_EXCEED_SHIFT',
    message: `El turno dura ${shiftPlannedHours} h, así que la asignación no puede planificar ${horas} h...`,
    status: 400,
  });
}
```

Es decir: por defecto la asignación toma la duración completa del turno, pero admite
jornadas parciales (por ejemplo, un relevo a media jornada) siempre que no la excedan. Cubierto
por `close-shift.spec.ts:188` (rechaza más horas que el turno) y `:197` (menos horas sí se
permite). El horómetro, al cerrar el turno, suma las horas reales trabajadas
(`Assignment.actualHours`), no las planificadas.

### 1.2 Entidades

`EquipmentType`, `Equipment`, `Operator`, `Certification`, `Shift`, `Assignment`,
`AssignmentOverride`, `MaintenanceRecord`, `HourmeterEntry`, `Alert`, `User`. El esquema
completo, con índices y restricciones, vive en `prisma/schema.prisma`.

Cuatro decisiones de modelo, ya verificadas contra el schema real:

- **`MaintenanceRecord` cubre los cuatro campos que exige la regla 3** (fecha, horómetro al
  momento, responsable, observaciones), más el rastro completo de la política de umbral
  anclado (§2.3):

  ```prisma
  model MaintenanceRecord {
    id                 String   @id @default(cuid())
    equipmentId        String
    performedAt        DateTime                       // service date
    hoursAtService     Decimal  @db.Decimal(10, 2)     // real hourmeter at that moment
    thresholdHours     Decimal  @db.Decimal(10, 2)     // threshold that was due
    overdueHours       Decimal  @db.Decimal(10, 2)     // overdue = real - threshold
    nextThresholdHours Decimal  @db.Decimal(10, 2)     // next computed threshold
    responsible        String                          // rule 3
    notes              String?
    registeredById     String
    createdAt          DateTime @default(now())

    equipment    Equipment @relation(fields: [equipmentId], references: [id])
    registeredBy User      @relation(fields: [registeredById], references: [id])

    @@index([equipmentId, performedAt])
    @@map("maintenance_records")
  }
  ```

  `responsible` es texto libre y no una relación a `User`: representa a quien físicamente
  hizo el mantenimiento en el taller, que puede no tener cuenta en el sistema. Es distinto de
  `registeredBy`, que sí es una relación obligatoria a `User` y representa quién *registró*
  el mantenimiento en la aplicación — la distinción entre "quién lo hizo" y "quién lo cargó"
  es intencional y queda trazada por separado. Cubierto por
  `tests/integration/maintenance.spec.ts:124`.

- **`Shift` tiene un campo enum explícito para la jornada**, no derivado de la hora:

  ```prisma
  enum ShiftJourney {
    DAY
    NIGHT
  }

  model Shift {
    id           String       @id @default(cuid())
    date         DateTime     @db.Date
    journey      ShiftJourney
    plannedHours Decimal      @db.Decimal(5, 2)
    startsAt     DateTime
    endsAt       DateTime
    status       ShiftStatus  @default(PLANNED)
    ...
    @@unique([date, journey])
    @@index([status, date])
  }
  ```

  `startsAt`/`endsAt` (los instantes reales) se usan aparte, específicamente para evaluar si
  una certificación vence durante el turno (§2.5). La restricción `@@unique([date, journey])`
  además impone, a nivel de base de datos, que solo pueda existir un turno día y un turno
  noche por fecha operativa.

- **`Alert` es una tabla y no un cálculo al vuelo.** Así queda registro de que el sistema
  avisó y de cuándo lo hizo.

- **Certificaciones múltiples por operador y tipo.** Se guarda el historial de renovaciones
  y se aplica la de mayor fecha de vencimiento a la fecha del turno
  (`tests/unit/rules.spec.ts:173`, "acepta si existe una certificación renovada aunque haya
  otra vencida").

---

## 2. Decisiones abiertas del enunciado

### 2.1 Un equipo se bloquea a mitad de semana y ya tenía turnos programados

**Decisión: las asignaciones no se cancelan. Pasan a `AT_RISK`, con alerta, y el turno no se
puede cerrar sin resolverlas.**

No cancelo automáticamente porque el planificador se enteraría del hueco recién en el cambio
de guardia, que es el peor momento. El mecanismo, probado en
`tests/integration/close-shift.spec.ts:93` ("marca EN_RIESGO las asignaciones futuras del
equipo bloqueado"):

1. Al bloquearse el equipo (por cruzar el umbral al cerrar un turno, regla 10 → regla 2),
   sus asignaciones futuras en estado `PLANNED`/`ACTIVE` pasan a `AT_RISK`, dentro de la
   misma transacción.
2. `get-projection.ts` incluye explícitamente las asignaciones `AT_RISK` en la ventana de 7
   días, así que un equipo con asignaciones en riesgo no desaparece de la vista de
   proyección — sigue siendo visible mientras el problema no se resuelva.
3. Registrar el mantenimiento las devuelve a `ACTIVE` de forma automática
   (`tests/integration/maintenance.spec.ts`, "devuelve AT_RISK→ACTIVE").

*Alternativa descartada:* cancelación automática. Traslada el problema a la operación en el
peor momento posible.

### 2.2 ¿Se puede forzar una asignación con autorización de un supervisor?

**Decisión: sí, pero solo para violaciones de política, nunca para imposibilidades físicas,
y con severidad intermedia para las advertencias que no bloquean nada.**

La clasificación real, tal como está en `src/core/rules/violation.ts:33-47`, tiene tres
niveles y no dos como yo mismo había asumido antes de esta revisión:

```ts
export const SEVERITY_BY_CODE: Record<ViolationCode, Severity> = {
  EQUIPMENT_ALREADY_ASSIGNED: 'HARD',
  OPERATOR_ALREADY_ASSIGNED: 'HARD',
  SHIFT_NOT_PLANNED: 'HARD',
  EQUIPMENT_OUT_OF_SERVICE: 'HARD',
  OPERATOR_INACTIVE: 'HARD',

  EQUIPMENT_BLOCKED: 'OVERRIDABLE',
  EQUIPMENT_IN_MAINTENANCE: 'OVERRIDABLE',
  OPERATOR_NOT_CERTIFIED: 'OVERRIDABLE',
  CERTIFICATION_EXPIRED: 'OVERRIDABLE',

  CERTIFICATION_EXPIRES_DURING_SHIFT: 'WARNING',
  PROJECTED_BLOCK_BEFORE_SHIFT: 'WARNING',
};
```

- **`HARD`, no se puede forzar:** imposibilidades físicas o inconsistencias de datos (operador
  o equipo ya asignados, turno cerrado, equipo dado de baja, operador inactivo).
- **`OVERRIDABLE`, se puede forzar con firma de un supervisor:** políticas de la empresa
  (equipo bloqueado, equipo en mantenimiento, certificación vencida o inexistente).
- **`WARNING`, no bloquea nada, solo informa:** certificación que vence a mitad de turno
  (§2.5) y una regla que no había documentado antes — `PROJECTED_BLOCK_BEFORE_SHIFT`, que
  avisa al crear una asignación si la *proyección* indica que el equipo llegará bloqueado
  antes de la fecha de ese turno. Es la regla 12 (proyección) actuando también como
  advertencia preventiva en el momento de asignar, no solo como una vista aparte.

El propio código documenta el criterio de la separación HARD/OVERRIDABLE con casi las mismas
palabras que yo había usado para justificarlo (`violation.ts:28-31`):

```
Severity belongs to the code, not to the rule that raises it, so two rules can never
disagree on whether something is forceable. HARD is a physical impossibility or data
corruption; OVERRIDABLE is a business policy someone can sign for.
```

**Sobre por qué certificación vencida es forzable y no HARD, con su límite real.**
Confirmado: el sistema usa un único código `CERTIFICATION_EXPIRED` con severidad fija, sin
distinguir si venció hace 1 día o hace 6 meses — no es una suposición mía, es el
comportamiento verificado. La fecha de vencimiento sí viaja como dato adicional en el
`context` de la violación (`violation.ts:25`, `context?: Record<string, unknown>`), pero hoy
no se usa para cambiar la clasificación. Esta sigue siendo, para mí, la decisión más
discutible del catálogo: la sustento porque una certificación vencida no siempre refleja
pérdida real de competencia, y porque prohibir toda excepción empuja al supervisor a resolver
el problema por fuera del sistema, donde no queda ninguna traza. La mejora pendiente (§6) es
usar ese mismo dato de `context` para degradar automáticamente a `HARD` cuando el atraso
supera un umbral de días.

Cómo queda registrada la excepción: rol `SUPERVISOR` únicamente, motivo obligatorio, detalle
de qué reglas se saltaron, y la asignación queda visiblemente en `AT_RISK` en vez de
`ACTIVE`.

### 2.3 Mantenimiento hecho 30 horas después del umbral: ¿desde dónde cuenta el siguiente ciclo?

**Decisión: desde el umbral, no desde el horómetro real — con salvaguarda si el atraso
superó un ciclo completo.**

Con umbral 250 h, servicio a las 280 h e intervalo de 250 h, el siguiente umbral es 500, no
530. Esto queda modelado explícitamente en `MaintenanceRecord` con dos campos separados:
`thresholdHours` (el umbral que estaba pendiente) y `overdueHours` (el atraso, guardado como
indicador, no como crédito) — `hoursAtService - thresholdHours`. El siguiente umbral se
guarda en `nextThresholdHours`.

Toda la política — anclaje al umbral anterior, que el desfase no se acumula en varios ciclos,
y el re-anclaje si el atraso superó un ciclo completo para que el equipo no salga del taller
ya bloqueado — está cubierta por `tests/unit/maintenance-policy.spec.ts`, con estos cuatro
casos:

- ancla al umbral anterior (caso simple, sin atraso extremo),
- no acumula desfase a lo largo de tres ciclos consecutivos,
- re-ancla al primer múltiplo por encima del horómetro real si el atraso superó un ciclo,
- el equipo nunca sale del taller ya bloqueado.

*Alternativa descartada:* contar desde el horómetro real. Es lo que hace la hoja de cálculo
actual y es la causa del desfase que señala el enunciado.

### 2.4 El turno se cerró con más o menos horas de las planificadas

**Decisión: mandan las horas reales; el desvío se registra y, si es grande, se justifica.**

Confirmado por `tests/integration/close-shift.spec.ts`:

- `it('suma las horas reales al horómetro y deja asiento en el ledger')` — el horómetro
  siempre se mueve con `actualHours`, nunca con lo planificado.
- `it('bloquea el equipo cuando el cierre cruza el umbral (regla 10 → regla 2)')` — el cierre
  puede disparar el bloqueo en la misma operación.
- `it('exige nota cuando el desvío supera 2 horas')` — el umbral de justificación obligatoria
  es de 2 horas de desvío.
- `it('es idempotente: cerrar dos veces el mismo turno falla con SHIFT_NOT_PLANNED')` — el
  cierre es idempotente: un turno ya cerrado no se puede volver a cerrar, y el error que
  produce es justamente uno de los códigos `HARD` de §2.2 (no es forzable).
- `it('no se planifica una asignación más larga que el turno')` — las horas quedan acotadas
  por la duración del turno también en el momento de planificar (§1.1.e).

### 2.5 Una certificación vence a mitad de un turno ya programado a futuro

Confirmado el mismo tratamiento en dos niveles que había planteado:

- **Vence antes de que empiece el turno →** violación `CERTIFICATION_EXPIRED`, `OVERRIDABLE`
  (§2.2), evaluada explícitamente contra la fecha del turno y no contra "hoy" —
  `tests/unit/rules.spec.ts:135`, "rechaza certificación vencida evaluada contra la FECHA DEL
  TURNO, no contra hoy".
- **Vence a mitad del turno** (vigente al iniciar, vencida al terminar) → violación
  `CERTIFICATION_EXPIRES_DURING_SHIFT`, severidad `WARNING`: no bloquea, informa. Usa
  `startsAt`/`endsAt` del turno, no solo la fecha operativa, para poder distinguir este caso
  del anterior.

### 2.6 Dos supervisores asignan el mismo equipo al mismo turno a la vez

**Decisión: la garantía la da la base de datos; la aplicación solo mejora el mensaje.**

Verificado en `tests/integration/concurrency.spec.ts`, con tres pruebas, no dos como había
resumido antes:

1. **2 peticiones simultáneas sobre el mismo equipo y turno** — exactamente 1 `fulfilled` y 1
   `rejected` con `Promise.allSettled`.
2. **20 peticiones simultáneas** (timeout extendido a 30 s) — exactamente 1 sobreviviente.
3. **2 peticiones simultáneas sobre el mismo operador** — mismo resultado, para la regla 6.

El rechazo puede venir por dos caminos distintos y el test acepta ambos explícitamente
(`concurrency.spec.ts:44-51`, función `rechazaPorCupoTomado`): o la validación de negocio lo
detecta primero, o el índice único de la base de datos lo detecta si dos transacciones
llegaron a validar en paralelo antes de insertar. La aserción final no se queda en el conteo
de respuestas HTTP: consulta la base directamente
(`assignment.count({ status: { not: 'CANCELLED' } }) === 1`) para confirmar que solo quedó
una fila vigente, más allá de qué haya respondido cada petición.

### 2.7 Proyección de mantenimiento a 7 días (regla 12)

**Decisión: se simula turno por turno, en orden cronológico, usando las horas planificadas de
las asignaciones ya creadas — no un promedio ni el horómetro actual.**

Tres capas, ya verificadas:

**Endpoint** (`app/api/projection/route.ts:6-18`) — ventana configurable por query string,
7 días por defecto, con techo de 30:

```ts
export async function GET(request: Request) {
  const t = traza(request, 'projection.read');
  try {
    await requireSession();
    const days = Number(new URL(request.url).searchParams.get('days') ?? 7);
    const ventana = Number.isFinite(days) && days > 0 && days <= 30 ? days : 7;
    return Response.json({ days: ventana, equipment: await getProjection(ventana) });
  } catch (error) {
    return errorResponse(error, t);
  }
}
```

**Caso de uso** (`src/use-cases/get-projection.ts:26-43`) — trae, para cada equipo, solo las
asignaciones `ACTIVE` o `AT_RISK` de turnos `PLANNED` dentro de la ventana:

```ts
export async function getProjection(days = 7, today = new Date()): Promise<ProjectionRow[]> {
  const desde = new Date(`${toOperationalDate(today)}T00:00:00.000Z`);
  const hasta = new Date(desde);
  hasta.setUTCDate(hasta.getUTCDate() + days);

  const equipos = await prisma.equipment.findMany({
    include: {
      type: true,
      assignments: {
        where: {
          status: { in: ['ACTIVE', 'AT_RISK'] },
          shift: { status: 'PLANNED', date: { gte: desde, lte: hasta } },
        },
        include: { shift: true },
      },
    },
    orderBy: { code: 'asc' },
  });
```

**Dominio puro** (`src/core/projection.ts:30-71`) — simula el consumo de horómetro turno por
turno, en orden cronológico (noche después del día del mismo día), y reporta en qué turno se
cruza el umbral:

```ts
export function projectMaintenance(
  equipment: EquipmentSnapshot,
  upcoming: PlannedUsage[],
): ProjectionResult {
  let hours = equipment.currentHours;
  const threshold = equipment.nextMaintenanceHours;

  if (hours >= threshold) return { status: 'ALREADY_BLOCKED', hoursRemaining: 0 };

  for (const shift of enOrden(upcoming)) {
    const before = hours;
    hours += shift.plannedHours;

    if (hours >= threshold) {
      return {
        status: 'WILL_CROSS',
        crossesOn: shift.date,
        crossesInShift: shift.journey,
        hoursIntoShift: threshold - before,
        projectedHours: hours,
        hoursRemaining: threshold - equipment.currentHours,
      };
    }
  }

  return { status: 'SAFE', projectedHours: hours, hoursRemaining: threshold - equipment.currentHours };
}
```

Puntos que quiero dejar explícitos porque suelen ser donde más se presta a confusión esta
regla:

- **Sí suma horas planificadas al horómetro actual**, pero es `Assignment.plannedHours` (que
  por defecto copia la duración del turno, pero es editable y está topada por ella — §1.1.e),
  no `Shift.plannedHours` directamente.
- **Un turno futuro sin asignación de equipo queda excluido de forma natural**: la consulta
  solo trae filas desde `assignments`, así que un turno sin asignaciones no aporta ningún
  consumo simulado a ningún equipo. No hace falta un filtro explícito para eso.
- **No vuelve a consultar el `maintenanceIntervalOverride`.** Usa directamente
  `Equipment.nextMaintenanceHours`, que ya incorporó el override en el momento en que se creó
  el equipo o se registró el último mantenimiento (`registry.spec.ts:71-82`). La proyección
  nunca recalcula intervalos; confía en que el umbral almacenado ya es correcto — coherente
  con la decisión de §1.1.b de no derivar el umbral en cada lectura.
- **`hoursIntoShift` no es una hora de reloj**, es cuántas horas dentro de ese turno se
  alcanza el umbral (`threshold - before`). Es un detalle útil para el equipo de operaciones
  ("se bloquea a las 3 horas de iniciado el turno noche"), pero no debe leerse como una hora
  del día.
- **El orden final de la vista es por urgencia**, no alfabético (`get-projection.ts:78-93`):
  primero los ya bloqueados, luego los que van a cruzar el umbral (por fecha de cruce), y por
  último los que están seguros, ordenados por margen restante.

Cubierto extensamente por `tests/unit/projection.spec.ts`: cruce en el n-ésimo turno, hora
exacta del cruce dentro del turno, orden noche-después-de-día, `ALREADY_BLOCKED`, `SAFE`,
ignora turnos cerrados o cancelados, y cuenta las asignaciones `AT_RISK` (no solo `ACTIVE`)
dentro de la simulación — coherente con la decisión de §2.1 de no ocultar el riesgo ya
detectado.

---

## 3. Otras decisiones de criterio

- **Stack:** Next.js 16 (Turbopack) + React 19, Auth.js v5 con `Credentials` y `bcrypt`,
  Prisma 7 con adapter-pg sobre PostgreSQL en Neon, Tailwind 4, Vitest para unitarias e
  integración, Playwright para end-to-end.
- **Neon (PostgreSQL) en vez de una alternativa MySQL.** El plan gratuito reactiva la base
  sola tras inactividad, lo cual importa porque la prueba se evalúa días después de la
  entrega y no quería depender de encender manualmente un servicio dormido.
- **Monolito, un repositorio, un despliegue** en Vercel. Lo que se evalúa es el modelo, las
  reglas y que la aplicación esté en línea; separar backend y frontend habría duplicado
  infraestructura sin aportar a eso.
- **Reglas de negocio en `src/core/`, sin importar Prisma ni Next.** Reciben datos planos y
  devuelven `Violation[]`; se testean en milisegundos con Vitest, sin necesidad de una base de
  datos real, y se leen sin conocer el framework.
- **Sin salida temprana en el motor de reglas.** La regla 11 exige mostrar todas las razones
  del rechazo, no solo la primera. `assignment-rules.ts` acumula con `violations.push(...)` y
  devuelve todo el arreglo al final (`assignment-rules.ts:121`), nunca corta apenas encuentra
  la primera violación. Cubierto por `tests/unit/rules.spec.ts:228`, "DEVUELVE TODAS LAS
  VIOLACIONES, no solo la primera".
- **Autenticación mínima con roles.** Sin identidad no puede existir la autorización de un
  supervisor (§2.2), así que hay login con tres roles (`SUPERVISOR`, `PLANNER`, `VIEWER`,
  sesión JWT de 12 h). No hay recuperación de contraseña ni gestión de usuarios desde la
  interfaz porque no aportan al problema del enunciado.
- **Zona horaria `America/Lima`**, tanto en el contenedor Docker (`TZ: America/Lima`) como en
  la lógica de fecha operativa del turno.
- **Logging estructurado con `requestId`.** Cada respuesta de error sale de un único punto
  (`toErrorResponse` / `errorResponse`, visto en `app/api/projection/route.ts`), con un
  `requestId` por request que permite ubicar la línea de log correspondiente a partir del
  identificador que ve el usuario.
- **Contenerización completa con Docker Compose**, tres servicios: `db` (PostgreSQL 17
  alpine con healthcheck), `migrate` (job de un solo uso: `npx prisma migrate deploy && npx
  prisma db seed`, `restart: "no"`) y `app` (imagen multi-stage con `output: standalone`, que
  espera a que `migrate` termine). Se levanta todo con:

  ```
  docker compose up --build        # http://localhost:3000
  ```

  El `Dockerfile` es multi-stage (`deps` → `builder` con `BUILD_STANDALONE=1` → `runner`) y
  la imagen final solo copia `.next/standalone`, `.next/static` y `public` — no lleva el
  código fuente completo ni el CLI de Prisma, para mantenerla liviana.

---

## 4. Datos de prueba

Se cargan con `npm run db:seed` (`package.json`: `"db:seed": "tsx prisma/seed.ts"`), y de
forma idempotente dentro de Docker vía el servicio `migrate`. El seed borra las filas
operacionales y hace upsert de catálogos, así que se puede correr varias veces sin duplicar
datos.

**Equipos (6):**

| Código | Tipo | Horas actuales | Umbral | Estado |
|---|---|---|---|---|
| TAC-101 | Camión de acarreo | 180 | 250 | Disponible |
| TAC-102 | Camión de acarreo | 738 | 750 | Disponible — a 12 h del bloqueo |
| TAC-103 | Camión de acarreo | 1253 | 1250 | Bloqueado |
| EXC-201 | Excavadora | 1180,5 | 1250 | Disponible |
| EXC-202 | Excavadora | 420 | 500 | En mantenimiento |
| FRD-301 | Perforadora | 402 | 500 | Disponible |

**Operadores (6)** con sus certificaciones: Carlos Medina (CAM y EXC vigentes, +180 días),
Elena Torres (CAM y EXC vigentes, +90 días), Héctor Salas (PER, +300 días), Beatriz Rojas
(EXC, **vencida hace 10 días**), Pablo Condori (CAM, vence en 3 días), Graciela Mamani (sin
ninguna certificación).

**Turnos:** uno cerrado ayer (con 2 asignaciones ya `COMPLETED`, que alimentan el saldo
inicial del ledger); hoy día y noche; y turnos programados de mañana hasta 6 días adelante,
incluyendo EXC-201 en varios de ellos y TAC-101 con Pablo Condori el día +5 (que es también
el caso donde la certificación vence a mitad de la ventana de turnos programados, §2.5).

**Los tres casos obligatorios del enunciado, confirmados en el seed:**

1. **Equipo a punto de mantenimiento:** TAC-102, 738 h contra un umbral de 750 h — faltan 12
   horas, comentario explícito en el código: `// 12 h from its threshold: closing today's
   shift blocks it`.
2. **Operador con certificación vencida:** Beatriz Rojas, certificación de excavadora
   vencida hace 10 días.
3. **Turno que al cerrarse dispara el bloqueo:** el turno día de hoy, con TAC-102 asignado y
   12 horas planificadas. `738 + 12 = 750 ≥ 750` → el equipo queda bloqueado al cerrar el
   turno. Comentario del propio seed: `// closing today's shift takes TAC-102 from 738 to
   750 h`.

**Credenciales de prueba:**

| Rol | Email | Contraseña |
|---|---|---|
| Supervisor | `supervisor@geoops.pe` | `supervisor1234` |
| Planner | `planner@geoops.pe` | `planner1234` |
| Viewer | `viewer@geoops.pe` | `viewer1234` |

Verificadas funcionando en producción, no solo en local.

---

## 5. Pruebas automatizadas

**Unitarias (Vitest, sin base de datos):**

| Archivo | Qué cubre |
|---|---|
| `tests/unit/rules.spec.ts` | Motor de reglas completo: cada código de violación con su severidad, evaluación contra la fecha del turno (no contra "hoy"), certificaciones renovadas, `WARNING` por vencimiento intra-turno, regla 11 (todas las violaciones, no solo la primera) |
| `tests/unit/projection.spec.ts` | Regla 12: cruce en el n-ésimo turno, horas dentro del turno donde ocurre el cruce, orden noche-después-de-día, `ALREADY_BLOCKED`, `SAFE`, ignora turnos cerrados/cancelados, incluye asignaciones `AT_RISK` |
| `tests/unit/maintenance-policy.spec.ts` | Política de umbral anclado (§2.3): ancla al umbral anterior, no acumula desfase en varios ciclos, re-ancla si el atraso superó un ciclo, nunca sale del taller ya bloqueado |
| `tests/unit/smoke.spec.ts` | Sanidad del entorno de pruebas |

**Integración (contra PostgreSQL real):**

| Archivo | Qué cubre |
|---|---|
| `tests/integration/close-shift.spec.ts` | Cierre de turno: suma de horas reales + asiento en el ledger, bloqueo al cruzar umbral, `AT_RISK` en asignaciones futuras, nota obligatoria por desvío mayor a 2 h, idempotencia, límites de horas planificadas frente a la duración del turno |
| `tests/integration/maintenance.spec.ts` | Registro de mantenimiento: libera el equipo, ancla el próximo umbral, deja asiento por la diferencia, `AT_RISK → ACTIVE`, guarda responsable/notas/horómetro, el horómetro nunca retrocede |
| `tests/integration/concurrency.spec.ts` | Las tres pruebas de §2.6 (2, 20 y 2-sobre-mismo-operador peticiones simultáneas) |
| `tests/integration/registry.spec.ts` | Altas: primer umbral anclado por delante del horómetro, override manda sobre el tipo, asiento `INITIAL_LOAD`, unicidades, revocación de certificaciones |

**End-to-end (Playwright):** `auth.spec.ts` (redirección al login, login por rol,
credenciales inválidas), `navigation.spec.ts` (las 6 vistas principales, incluida
Auditoría/Libro Mayor), `shifts-and-rules.spec.ts`, `comprehensive-verification.spec.ts`.

---

## 6. Qué dejé fuera

| Fuera | Por qué |
|---|---|
| Umbral de días de gracia para que una certificación vencida deje de ser forzable | Ver §2.2. Hoy toda certificación vencida usa la misma severidad `OVERRIDABLE` sin importar cuánto tiempo pasó desde el vencimiento, aunque la fecha exacta ya viaja en el `context` de la violación. |
| Notificaciones por correo o WhatsApp de las alertas | Las alertas existen y se ven en el tablero; el canal de salida es infraestructura y no cambia las reglas. |
| Calendario con arrastrar y soltar para reprogramar turnos | Costo alto en interfaz; el enunciado no evalúa diseño gráfico. |
| Gestión de usuarios desde la interfaz | Con los tres roles sembrados alcanza para demostrarlos. |
| Reportes exportables (Excel/PDF) y KPIs históricos | El ledger, `overdueHours` y los desvíos de horas ya están modelados para soportarlos; falta la capa de reportes. |
| Órdenes de trabajo, repuestos y costos de mantenimiento | Es otro dominio (un CMMS completo), fuera del alcance del enunciado. |
| Multi-tenant o varias operaciones mineras | No se pide, y agregaría una dimensión a todas las tablas sin necesidad. |

---

## 7. Qué haría con más tiempo

1. **Umbral de días de gracia para certificaciones vencidas**, usando el dato de fecha de
   vencimiento que ya viaja en el `context` de la violación, para que el propio sistema
   degrade automáticamente a `HARD` cuando el atraso es demasiado grande, en vez de depender
   enteramente del criterio del supervisor.
2. **Reprogramación asistida** cuando un equipo se bloquea: sugerir equipos equivalentes
   disponibles con operador certificado para ese turno, en lugar de solo marcar `AT_RISK` y
   avisar.
3. **Proyección con horas reales promedio** (por equipo o por frente) en lugar de solo las
   horas planificadas de las asignaciones ya creadas, para estimar mejor el margen cuando
   todavía no hay asignación para un turno futuro.
4. **Mantenimiento preventivo por calendario**, además de por horómetro, para componentes que
   se sirven por tiempo aunque el equipo esté detenido.
5. **Métricas de operación:** disponibilidad mecánica, utilización, cumplimiento del plan de
   mantenimiento y horas por operador — los datos ya están en el ledger.
6. **Observabilidad:** enviar los logs estructurados (que ya llevan `requestId`) a un servicio
   externo, con trazas y alertas de error.
7. **Captura offline en campo**, con sincronización posterior, que suele ser el punto donde
   estos sistemas fallan en la práctica minera.

---

## 8. Uso de inteligencia artificial

Usé asistentes de IA (Claude, y Claude Code sobre el repositorio) como apoyo durante el
desarrollo y para la redacción de este documento: ampliar casos borde de tests, acelerar
código repetitivo de interfaz, discutir alternativas de modelado, y —de forma explícita en
esta versión— verificar contra el código real cada afirmación técnica antes de dejarla por
escrito, incluyendo la revisión de un despliegue en producción (Vercel) que quedó fuera del
alcance de este documento pero forma parte del mismo trabajo.

Las decisiones de fondo —el modelo de datos, la política de umbral anclado, cómo se resuelve
la concurrencia, la clasificación de violaciones en tres niveles de severidad y qué queda
fuera del alcance— son las que están argumentadas aquí, con sus alternativas descartadas y,
donde corresponde, sus límites reconocidos.
