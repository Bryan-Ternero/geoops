# Decisiones de diseño — GeoOps

## 1. Contexto y problema

Una operación minera coordina camiones de acarreo, excavadoras y perforadoras a través de
turnos día/noche, con operadores certificados por tipo de equipo y mantenimiento disparado por
horómetro. Ese proceso se lleva hoy en hojas de cálculo, y el problema no es la falta de datos:
es que las reglas se cruzan entre sí y una hoja de cálculo no las hace cumplir. Un equipo que ya
debía estar en mantenimiento sigue asignándose, un operador entra a operar con una certificación
vencida, y el mismo equipo termina comprometido en dos turnos a la vez porque nada impide que
dos personas lo asignen en paralelo.

Ninguno de esos fallos es un error de captura: son invariantes de negocio sin un sistema que las
haga cumplir. GeoOps existe para cerrar esa brecha — no como un CRUD de equipos, operadores y
turnos, sino como un sistema que **preserva reglas operativas, bloquea asignaciones inválidas,
gobierna el ciclo de mantenimiento por horómetro y mantiene trazabilidad incluso cuando dos
usuarios actúan sobre el mismo recurso al mismo tiempo.**

El criterio de éxito, en consecuencia, no es la cantidad de pantallas: es que las doce reglas de
negocio del problema se cumplan de forma consistente, que las decisiones abiertas (qué pasa con
un equipo bloqueado a mitad de semana, si una regla es forzable o no, cómo se resuelve la
concurrencia) tengan una respuesta explícita y verificable, y que el sistema esté desplegado y
operable, no solo demostrado en local.

Tres principios técnicos guiaron la implementación, desarrollados en la siguiente sección:
integridad garantizada en la capa que corresponde, dominio de negocio aislado del framework, y
cada decisión respaldada por una prueba automatizada.

---

## 2. Principios de diseño

Antes de entrar en el detalle de cada decisión, estos son los criterios que se repiten a lo
largo del sistema y que explican por qué está construido como está:

- **Integridad antes que conveniencia.** Cuando una regla es un invariante real (un equipo no
  puede tener dos asignaciones activas en el mismo turno), la garantiza el motor de base de
  datos, no una validación que se puede saltar por una condición de carrera. Ver §5.
- **El dominio no conoce el framework.** Las reglas de negocio en `src/core/` reciben datos
  planos y devuelven violaciones tipadas; no importan Prisma ni Next. Eso las hace verificables
  en milisegundos y legibles sin conocer el resto del stack.
- **Prevenir antes que corregir.** Cuando un equipo se bloquea con turnos futuros ya asignados,
  el sistema no cancela silenciosamente ni espera a que el problema aparezca en el cambio de
  guardia: lo marca visible (`AT_RISK`) y bloquea el cierre del turno hasta que se resuelva.
- **Comportamiento determinista sobre el tiempo.** El siguiente umbral de mantenimiento se ancla
  al umbral anterior, no al horómetro real en el momento del servicio, para que el ciclo no
  acumule desfase turno tras turno.
- **Cada decisión de negocio se traduce en una prueba, no en un comentario.** Las doce reglas y
  las seis decisiones abiertas del enunciado tienen su contraparte en `tests/unit` o
  `tests/integration`; una decisión sin prueba automatizada no se considera cerrada.
- **Trazabilidad por diseño.** El horómetro es un libro mayor y no un contador, las alertas
  operativas se persisten y la proyección se calcula bajo demanda, y cada respuesta de error
  lleva un `requestId` que permite ubicar el log correspondiente. El sistema no solo debe
  comportarse bien: debe poder explicar por qué se comportó así.
- **Alcance como decisión de ingeniería, no como recorte.** Lo que queda fuera (§9) se decide
  explícitamente, con la dependencia y el valor futuro de cada elemento identificados, no
  simplemente por falta de tiempo.

Estos principios no son una declaración de intenciones: se ven reflejados, con su evidencia
concreta, en cada sección siguiente.

---

## 3. Arquitectura y modelo de datos

El esquema completo, con índices y restricciones, vive en `prisma/schema.prisma`. Las entidades
son `EquipmentType`, `Equipment`, `Operator`, `Certification`, `Shift`, `Assignment`,
`AssignmentOverride`, `MaintenanceRecord`, `HourmeterEntry`, `Alert` y `User`. Las decisiones de
modelado relacionadas con integridad transaccional y concurrencia (el horómetro como ledger, las
restricciones de unicidad de las reglas 6 y 7) se documentan por separado en §5, donde se
concentran junto al resto de garantías de consistencia del sistema.

### 3.1 Intervalo de mantenimiento por familia, con excepción por unidad

**Problema:** el intervalo de mantenimiento nominal es por tipo de equipo, pero en operación
real una unidad reparada o antigua puede necesitar un régimen distinto al del resto de su
familia.

**Decisión:** `EquipmentType.maintenanceIntervalHours` guarda el intervalo base; cada unidad
puede además tener `Equipment.maintenanceIntervalOverride` (nulo por defecto).

**Motivo:** representa la excepción real sin duplicar la configuración de toda la familia ni
crear un tipo nuevo para una sola unidad.

**Evidencia:** `tests/integration/registry.spec.ts` prueba explícitamente que el override manda
sobre el intervalo del tipo al calcular el primer umbral.

**Trade-off:** el override vive fuera del tipo, así que cualquier consulta que necesite el
intervalo efectivo de una unidad debe resolver la precedencia; se centraliza en el momento de
crear el equipo o registrar mantenimiento (ver §3.2), no en cada lectura.

### 3.2 El umbral se almacena, no se calcula en cada lectura

**Problema:** el valor de horómetro que dispara el bloqueo (`Equipment.nextMaintenanceHours`)
podría derivarse en cada consulta como `horas del último servicio + intervalo`.

**Decisión:** se almacena como columna y se recalcula únicamente en los eventos que lo afectan
(alta de equipo, registro de mantenimiento).

**Motivo:** tres ventajas concretas. La proyección de 7 días (§4.7) queda como una consulta
simple, sin recalcular intervalos en cada lectura. Permite fijar umbrales excepcionales cuando
hace falta. Y deja explícita la política de desfase de §4.3 en un evento auditable, en lugar de
esconderla dentro de una fórmula que se evalúa en cada request.

**Trade-off:** el valor almacenado puede quedar desincronizado si algo escribe en
`currentHours` sin pasar por el flujo de cierre de turno o mantenimiento; por eso ambos flujos
son transaccionales (§5).

### 3.3 Horas planificadas acotadas por la duración del turno

`Shift.plannedHours` es la duración del turno. `Assignment.plannedHours` es editable por
asignación, pero no puede superar la duración del turno al que pertenece:

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

Por defecto la asignación toma la duración completa del turno, pero admite jornadas parciales
(un relevo a media jornada, por ejemplo) siempre que no la excedan. Cubierto por
`close-shift.spec.ts:188` (rechaza más horas que el turno) y `:197` (menos horas sí se
permiten). Al cerrar el turno, el horómetro suma las horas reales trabajadas
(`Assignment.actualHours`), nunca las planificadas — la relación entre planificado y real se
desarrolla en §4.4.

### 3.4 Entidades que encapsulan una regla, no solo un dato

- **`MaintenanceRecord` cubre los cuatro campos que exige la regla 3** (fecha, horómetro al
  momento, responsable, observaciones), más el rastro completo de la política de umbral anclado
  (§4.3):

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

  `responsible` es texto libre y no una relación a `User`: representa a quien físicamente hizo
  el mantenimiento en el taller, que puede no tener cuenta en el sistema. Es distinto de
  `registeredBy`, relación obligatoria a `User` que representa quién *registró* el mantenimiento
  en la aplicación. La distinción entre "quién lo hizo" y "quién lo cargó" es intencional y
  queda trazada por separado. Cubierto por `tests/integration/maintenance.spec.ts:124`.

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

  `startsAt`/`endsAt` (los instantes reales) se usan aparte, para evaluar si una certificación
  vence durante el turno (§4.5). `@@unique([date, journey])` impone, a nivel de base de datos,
  que solo pueda existir un turno día y un turno noche por fecha operativa.

- **`Alert` es una tabla para avisos operativos.** Queda registro de que el sistema avisó y de
  cuándo lo hizo. La proyección de mantenimiento, en cambio, se calcula bajo demanda a partir
  del estado actual y las asignaciones planificadas.

- **Certificaciones múltiples por operador y tipo.** Se guarda el historial de renovaciones y se
  aplica la de mayor fecha de vencimiento a la fecha del turno
  (`tests/unit/rules.spec.ts:173`, "acepta si existe una certificación renovada aunque haya otra
  vencida").

---

## 4. Decisiones críticas de negocio

Esta sección concentra las seis decisiones abiertas del enunciado más la regla de proyección
(regla 12), que por su complejidad se trata como una séptima decisión. En cada una: qué problema
había, qué se decidió, qué alternativa se descartó, cómo se implementó, cómo se verificó y cuál
es el límite conocido de la decisión.

### 4.1 Un equipo se bloquea a mitad de semana y ya tenía turnos programados

**Problema:** un equipo cruza su umbral de mantenimiento al cerrar un turno y ya tiene
asignaciones futuras planificadas. Cancelarlas automáticamente deja al planificador enterándose
del hueco recién en el cambio de guardia — el peor momento posible para descubrirlo.

**Decisión:** las asignaciones no se cancelan. Pasan a `AT_RISK`, con alerta, y el turno
correspondiente no se puede cerrar sin resolverlas.

**Implementación**, probada en `tests/integration/close-shift.spec.ts:93` ("marca EN_RIESGO las
asignaciones futuras del equipo bloqueado"):

1. Al bloquearse el equipo (regla 10 → regla 2), sus asignaciones futuras `ACTIVE` de turnos
  `PLANNED` pasan a `AT_RISK` dentro de la misma transacción.
2. `get-projection.ts` incluye explícitamente las asignaciones `AT_RISK` en la ventana de 7
   días: un equipo con asignaciones en riesgo no desaparece de la vista de proyección mientras
   el problema no se resuelva.
3. Registrar el mantenimiento devuelve automáticamente a `ACTIVE` las asignaciones afectadas
  exclusivamente por el bloqueo y sin un override
  (`tests/integration/maintenance.spec.ts`, "devuelve AT_RISK→ACTIVE").

**Alternativa descartada:** cancelación automática. Traslada el problema a la operación en el
peor momento posible, sin ganar nada a cambio.

**Límite conocido:** el sistema marca el riesgo y bloquea el cierre; no reprograma por sí mismo
un equipo o turno alternativo (ver §10, reprogramación asistida).

### 4.2 ¿Se puede forzar una asignación con autorización de un supervisor?

**Problema:** algunas violaciones son políticas de la empresa, no imposibilidades físicas, y una
regla completamente rígida puede empujar al supervisor a resolver el problema fuera del sistema,
donde no queda ninguna traza.

**Decisión:** sí, pero solo para violaciones de política, nunca para imposibilidades físicas; y
con advertencias separadas que no bloquean nada. La clasificación real,
en `src/core/rules/violation.ts:33-47`, tiene tres niveles:

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

- **`HARD`, no forzable:** imposibilidades físicas o inconsistencias de datos (operador o equipo
  ya asignados, turno cerrado, equipo dado de baja, operador inactivo).
- **`OVERRIDABLE`, forzable con firma de supervisor:** políticas de la empresa (equipo
  bloqueado, equipo en mantenimiento, certificación vencida o inexistente).
- **`WARNING`, no bloquea, solo informa:** certificación que vence a mitad de turno (§4.5).
  El catálogo también reserva `PROJECTED_BLOCK_BEFORE_SHIFT` para una futura advertencia
  preventiva al crear asignaciones, pero esa validación todavía no está implementada.

El código documenta el criterio detrás de la separación HARD/OVERRIDABLE (`violation.ts:28-31`):
la severidad pertenece al código de violación y no a la regla que la levanta, para que dos
reglas nunca puedan discrepar sobre si algo es forzable. `HARD` es una imposibilidad física o
corrupción de datos; `OVERRIDABLE` es una política de negocio que alguien puede firmar.

**Cómo queda registrada la excepción:** solo el rol `SUPERVISOR` puede autorizarla, el motivo es
obligatorio, se detalla qué reglas se saltaron, y la asignación queda visiblemente en `AT_RISK`
en vez de `ACTIVE`.

**Límite conocido:** el sistema usa un único código `CERTIFICATION_EXPIRED` con severidad fija,
sin distinguir si venció hace 1 día o hace 6 meses, aunque la fecha exacta ya viaja en el
`context` de la violación (`violation.ts:25`, `context?: Record<string, unknown>`). Es la
decisión más discutible del catálogo: se sostiene porque una certificación vencida no siempre
refleja pérdida real de competencia, y porque prohibir toda excepción empuja al supervisor a
resolver el problema fuera del sistema. La mejora pendiente (§10) es usar ese mismo dato del
`context` para degradar automáticamente a `HARD` cuando el atraso supera un umbral de días.

### 4.3 Mantenimiento hecho 30 horas después del umbral: ¿desde dónde cuenta el siguiente ciclo?

**Problema:** si el siguiente ciclo se cuenta desde el horómetro real en el momento del
servicio, cada atraso se traslada al ciclo siguiente y el desfase se acumula turno tras turno —
que es, según el enunciado, la causa del problema que ya sufre la hoja de cálculo actual.

**Decisión:** el siguiente ciclo se ancla al umbral anterior, no al horómetro real, con una
salvaguarda si el atraso superó un ciclo completo. Con umbral en 250 h, servicio a las 280 h e
intervalo de 250 h, el siguiente umbral es 500, no 530.

**Implementación:** `MaintenanceRecord` guarda `thresholdHours` (el umbral que estaba
pendiente), `overdueHours` (el atraso, como indicador y no como crédito —
`hoursAtService - thresholdHours`) y `nextThresholdHours` (el siguiente umbral).

**Evidencia**, en `tests/unit/maintenance-policy.spec.ts`, cuatro casos:

- ancla al umbral anterior (caso simple, sin atraso extremo);
- no acumula desfase a lo largo de tres ciclos consecutivos;
- re-ancla al primer múltiplo por encima del horómetro real si el atraso superó un ciclo
  completo;
- el equipo nunca sale del taller ya bloqueado.

**Alternativa descartada:** contar desde el horómetro real. Es el comportamiento actual de la
hoja de cálculo y la causa directa del desfase que señala el enunciado.

### 4.4 El turno se cerró con más o menos horas de las planificadas

**Problema:** lo planificado y lo efectivamente trabajado casi nunca coinciden exactamente, y el
horómetro debe reflejar la realidad operativa, no el plan.

**Decisión:** mandan las horas reales; el desvío se registra y, si es grande, se justifica.

**Evidencia**, en `tests/integration/close-shift.spec.ts`:

- `it('suma las horas reales al horómetro y deja asiento en el ledger')` — el horómetro siempre
  se mueve con `actualHours`, nunca con lo planificado.
- `it('bloquea el equipo cuando el cierre cruza el umbral (regla 10 → regla 2)')` — el cierre
  puede disparar el bloqueo en la misma operación.
- `it('exige nota cuando el desvío supera 2 horas')` — umbral de justificación obligatoria: 2
  horas de desvío.
- `it('es idempotente: cerrar dos veces el mismo turno falla con SHIFT_NOT_PLANNED')` — un turno
  cerrado no se puede volver a cerrar; el error producido es uno de los códigos `HARD` de §4.2,
  no forzable. Detalle ampliado en §5.
- `it('no se planifica una asignación más larga que el turno')` — las horas quedan acotadas por
  la duración del turno también en el momento de planificar (§3.3).

### 4.5 Una certificación vence a mitad de un turno ya programado a futuro

**Decisión:** dos niveles de tratamiento según el momento del vencimiento respecto al turno.

- **Vence antes de que empiece el turno →** violación `CERTIFICATION_EXPIRED`, `OVERRIDABLE`
  (§4.2), evaluada explícitamente contra la fecha del turno y no contra "hoy" —
  `tests/unit/rules.spec.ts:135`, "rechaza certificación vencida evaluada contra la FECHA DEL
  TURNO, no contra hoy".
- **Vence a mitad del turno** (vigente al iniciar, vencida al terminar) → violación
  `CERTIFICATION_EXPIRES_DURING_SHIFT`, severidad `WARNING`: no bloquea, informa. Usa
  `startsAt`/`endsAt` del turno, no solo la fecha operativa, para distinguir este caso del
  anterior.

### 4.6 Dos supervisores asignan el mismo equipo al mismo turno a la vez

**Problema:** dos usuarios actuando en paralelo sobre el mismo equipo y turno no deben poder
crear dos asignaciones activas simultáneas.

**Decisión:** la garantía de unicidad no depende únicamente de una validación previa en el
código de aplicación: está protegida mediante restricciones de base de datos y verificada bajo
concurrencia real. El detalle de implementación y las tres pruebas de concurrencia se desarrollan
en §5, junto con el resto de garantías de consistencia del sistema, porque este caso es el
ejemplo más directo de la filosofía descrita ahí.

**Límite conocido:** el mecanismo depende de que las restricciones únicas sobre
`(shiftId, equipmentId, activeSlot)` y `(shiftId, operatorId, activeSlot)` existan en el motor de
base de datos; cualquier ruta de escritura que las evite (una migración manual o un `INSERT`
directo) queda fuera de la garantía.

### 4.7 Proyección de mantenimiento a 7 días (regla 12)

**Problema:** saber qué equipos están bloqueados *hoy* no es suficiente; el enunciado exige
anticipar qué equipos llegarán a su umbral de mantenimiento según los turnos ya programados, no
según el estado actual del horómetro.

**Decisión:** se simula turno por turno, en orden cronológico, usando las horas planificadas de
las asignaciones ya creadas — no un promedio ni una extrapolación del horómetro actual.

**Implementación**, en tres capas:

**Endpoint** (`app/api/projection/route.ts:6-18`) — ventana configurable por query string, 7
días por defecto, con techo de 30:

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

**Puntos que dejo explícitos**, porque son donde más se presta a confusión esta regla:

- Suma horas planificadas al horómetro actual, pero se trata de `Assignment.plannedHours` (que
  por defecto copia la duración del turno, pero es editable y está topada por ella — §3.3), no
  de `Shift.plannedHours` directamente.
- Un turno futuro sin asignación de equipo queda excluido de forma natural: la consulta solo
  trae filas desde `assignments`, así que no aporta consumo simulado a ningún equipo. No hace
  falta un filtro explícito para lograrlo.
- No vuelve a consultar `maintenanceIntervalOverride`. Usa directamente
  `Equipment.nextMaintenanceHours`, que ya incorporó el override en el momento en que se creó el
  equipo o se registró el último mantenimiento (`registry.spec.ts:71-82`) — coherente con la
  decisión de §3.2 de no derivar el umbral en cada lectura.
- `hoursIntoShift` no es una hora de reloj: es cuántas horas dentro de ese turno se alcanza el
  umbral (`threshold - before`). Útil para operaciones ("se bloquea a las 3 horas de iniciado el
  turno noche"), pero no debe leerse como una hora del día.
- El orden final de la vista es por urgencia, no alfabético (`get-projection.ts:78-93`): primero
  los equipos ya bloqueados, luego los que van a cruzar el umbral (por fecha de cruce), y por
  último los que están seguros, ordenados por margen restante.

**Evidencia:** `tests/unit/projection.spec.ts` cubre el cruce en el n-ésimo turno, la hora
exacta del cruce dentro del turno, el orden noche-después-de-día, `ALREADY_BLOCKED`, `SAFE`, la
exclusión de turnos cerrados o cancelados, y el conteo de asignaciones `AT_RISK` —no solo
`ACTIVE`— dentro de la simulación, coherente con la decisión de §4.1 de no ocultar el riesgo ya
detectado.

---

## 5. Integridad, concurrencia y consistencia

La idea central de esta sección es una sola: **las validaciones de aplicación mejoran la
experiencia y los mensajes de error, pero las invariantes críticas no dependen únicamente del
código de aplicación.** Donde el negocio exige una garantía absoluta, la garantía la da el motor
de base de datos.

### 5.1 El horómetro es un libro mayor, no un contador

`HourmeterEntry` registra cada movimiento del horómetro, y el saldo (`Equipment.currentHours`)
solo se actualiza dentro de la misma transacción que escribe el asiento correspondiente. El
invariante —que la suma de los asientos reconstruye el saldo actual— está probado en dos
lugares:

```text
tests/integration/close-shift.spec.ts:169
  it('la suma de los asientos del ledger es igual al horómetro actual', async () => {

tests/integration/registry.spec.ts:100-101
  "el saldo del equipo tiene que poder reconstruirse sumando el libro mayor"
```

Esto convierte el horómetro en algo auditable: cualquier discrepancia se puede rastrear
sumando el historial de asientos, no confiando en un contador que nadie puede reconstruir si
falla.

### 5.2 Unicidad garantizada por índices, no por `if`

Las reglas 6 y 7 del enunciado (un operador o un equipo no pueden tener dos asignaciones activas
en el mismo turno) son restricciones de base de datos, no validaciones de aplicación. Las
restricciones únicas sobre `(shiftId, equipmentId, activeSlot)` y `(shiftId, operatorId,
activeSlot)` garantizan que ningún equipo ni operador conserve dos asignaciones con cupo activo
en el mismo turno, incluso con varias instancias de la aplicación corriendo en paralelo. Una
asignación cancelada libera su cupo estableciendo `activeSlot` en `NULL`; la comprobación en el
código de negocio existe para devolver buenos mensajes de error, pero la garantía real la da el
motor de base de datos.

### 5.3 Caso de prueba: asignaciones concurrentes sobre el mismo cupo

Esta es la decisión que mejor demuestra la filosofía de esta sección. Verificado en
`tests/integration/concurrency.spec.ts`, con tres pruebas:

1. **2 invocaciones simultáneas sobre el mismo equipo y turno** — exactamente 1 `fulfilled` y 1
  `rejected`, con `Promise.allSettled`.
2. **20 invocaciones simultáneas** (timeout extendido a 30 s) — exactamente 1 operación exitosa.
3. **2 invocaciones simultáneas sobre el mismo operador** — mismo resultado, para la regla 6.

El rechazo puede venir por dos caminos distintos, y el test acepta ambos explícitamente
(`concurrency.spec.ts:44-51`, función `rechazaPorCupoTomado`): o la validación de negocio lo
detecta primero, o el índice único de la base de datos lo detecta cuando dos transacciones
legaron a validar en paralelo antes de insertar. La aserción final no se queda en el resultado de
las promesas: consulta la base directamente
(`assignment.count({ status: { not: 'CANCELLED' } }) === 1`) para confirmar que solo quedó una
fila vigente, más allá del resultado de cada invocación individual.

### 5.4 Idempotencia en operaciones que mutan estado

El cierre de turno es idempotente por diseño: `tests/integration/close-shift.spec.ts` prueba que
cerrar dos veces el mismo turno falla con el código `SHIFT_NOT_PLANNED`, uno de los códigos
`HARD` de §4.2 y por lo tanto no forzable. Esto evita que un reintento de red o un doble clic
duplique horas en el horómetro o dispare dos veces la lógica de bloqueo.

### 5.5 Separación entre validación de aplicación y garantía de persistencia

El patrón se repite en todo el sistema: la capa de aplicación valida temprano para dar mensajes
de error claros y específicos, pero la garantía final —la que sobrevive a condiciones de
carrera, reintentos y múltiples instancias del servidor— vive en la base de datos, a través de
transacciones e índices únicos. Ninguna invariante crítica del sistema depende exclusivamente de
que el código de aplicación se ejecute sin interrupciones.

---

## 6. Arquitectura técnica y decisiones de stack

- **Next.js 16 (Turbopack) + React 19, Auth.js v5 con `Credentials` y `bcrypt`, Prisma 7 con
  adapter-pg sobre PostgreSQL en Neon, Tailwind 4, Vitest para unitarias e integración,
  Playwright para end-to-end.**
- **PostgreSQL en Neon en vez de una alternativa MySQL.** El requisito era una base relacional;
  Neon se eligió porque su plan gratuito reactiva la base sola tras un período de inactividad,
  lo cual importa porque la evaluación ocurre días después de la entrega y no conviene depender
  de encender manualmente un servicio dormido.
- **Monolito, un repositorio, un despliegue en Vercel.** Lo que se evalúa es el modelo, las
  reglas de negocio y que la aplicación esté en línea; separar backend y frontend habría
  duplicado infraestructura sin aportar a ninguno de esos criterios.
- **Reglas de negocio en `src/core/`, sin dependencias de Prisma ni Next.** Reciben datos planos
  y devuelven `Violation[]`; se testean en milisegundos con Vitest, sin necesidad de una base de
  datos real, y se leen sin conocer el resto del stack — es la base técnica del principio de
  dominio independiente descrito en §2.
- **Auth.js con roles, sesión JWT de 12 h.** La autorización de un supervisor (§4.2) no existe
  sin identidad, así que el login con tres roles (`SUPERVISOR`, `PLANNER`, `VIEWER`) es la base
  mínima que ese requisito exige. Recuperación de contraseña y gestión de usuarios desde la
  interfaz quedan fuera de alcance (§9) porque no son parte de las reglas de negocio evaluadas.
- **Docker Compose con tres servicios:** `db` (PostgreSQL 17 alpine con healthcheck), `migrate`
  (job de un solo uso: `npx prisma migrate deploy && npx prisma db seed`, `restart: "no"`) y
  `app` (imagen multi-stage con `output: standalone`, que espera a que `migrate` termine):

  ```
  docker compose up --build        # http://localhost:3000
  ```

  El `Dockerfile` es multi-stage (`deps` → `builder` con `BUILD_STANDALONE=1` → `runner`); la
  imagen final solo copia `.next/standalone`, `.next/static` y `public`, sin el código fuente
  completo ni el CLI de Prisma, para mantenerla liviana.
- **Zona horaria `America/Lima`**, tanto en el contenedor (`TZ: America/Lima`) como en la lógica
  de fecha operativa del turno — necesaria porque las reglas 2.5 y 4.5 dependen de comparar
  fechas de vencimiento contra la fecha del turno, no contra un reloj en UTC arbitrario.
- **Logging estructurado con `requestId`.** Cada respuesta de error sale de un único punto
  (`toErrorResponse` / `errorResponse`, en `app/api/http.ts`), con un `requestId`
  por request que permite ubicar la línea de log correspondiente a partir del identificador que
  ve el usuario — soporte directo del principio de trazabilidad de §2.

---

## 7. Validación y estrategia de pruebas

Las pruebas no se agregaron al final: fueron el mecanismo para cerrar cada decisión de las
secciones 3, 4 y 5. La estrategia tiene cuatro capas, cada una con un propósito distinto:

- **Unitarias, sin base de datos:** el motor de reglas y la lógica de proyección son funciones
  puras (`src/core/`), así que se prueban en milisegundos, incluyendo la política de umbral
  anclado y sus casos límite (§4.3).
- **Integración, contra PostgreSQL real:** todo lo que depende de una transacción o de una
  restricción del motor de base de datos —cierre de turno, registro de mantenimiento, altas de
  equipo— se prueba contra Postgres real, no contra un mock, precisamente porque la garantía que
  se está verificando vive en la base (§5).
- **Concurrencia, con invocaciones paralelas reales:** las tres pruebas de §5.3 no simulan
  concurrencia con mocks; ejecutan el caso de uso simultáneamente y verifican el estado final
  directamente en la base de datos.
- **End-to-end, con Playwright:** valida que los flujos completos —login por rol, navegación
  entre las vistas principales, creación y cierre de turnos— funcionan de punta a punta sobre la
  aplicación desplegada, no solo sobre unidades aisladas.

**Unitarias (Vitest):**

| Archivo | Qué cubre |
|---|---|
| `tests/unit/rules.spec.ts` | Motor de reglas completo: cada código de violación con su severidad, evaluación contra la fecha del turno (no contra "hoy"), certificaciones renovadas, `WARNING` por vencimiento intra-turno, regla 11 (todas las violaciones, no solo la primera) |
| `tests/unit/projection.spec.ts` | Regla 12: cruce en el n-ésimo turno, horas dentro del turno donde ocurre el cruce, orden noche-después-de-día, `ALREADY_BLOCKED`, `SAFE`, ignora turnos cerrados/cancelados, incluye asignaciones `AT_RISK` |
| `tests/unit/maintenance-policy.spec.ts` | Política de umbral anclado (§4.3): ancla al umbral anterior, no acumula desfase en varios ciclos, re-ancla si el atraso superó un ciclo, nunca sale del taller ya bloqueado |
| `tests/unit/smoke.spec.ts` | Sanidad del entorno de pruebas |

**Integración (contra PostgreSQL real):**

| Archivo | Qué cubre |
|---|---|
| `tests/integration/close-shift.spec.ts` | Cierre de turno: suma de horas reales + asiento en el ledger, bloqueo al cruzar umbral, `AT_RISK` en asignaciones futuras, nota obligatoria por desvío mayor a 2 h, idempotencia, límites de horas planificadas frente a la duración del turno |
| `tests/integration/maintenance.spec.ts` | Registro de mantenimiento: libera el equipo, ancla el próximo umbral, deja asiento por la diferencia, `AT_RISK → ACTIVE`, guarda responsable/notas/horómetro, el horómetro nunca retrocede |
| `tests/integration/concurrency.spec.ts` | Las tres pruebas de §5.3 (2, 20 y 2 sobre el mismo operador, con invocaciones simultáneas) |
| `tests/integration/registry.spec.ts` | Altas: primer umbral anclado por delante del horómetro, override manda sobre el tipo, asiento `INITIAL_LOAD`, unicidades, revocación de certificaciones |

**End-to-end (Playwright):** valida sobre la aplicación levantada localmente por defecto, o sobre
la URL indicada mediante `PLAYWRIGHT_TEST_BASE_URL`: `auth.spec.ts` (redirección al login, login
por rol, credenciales inválidas), `navigation.spec.ts` (las 6 vistas principales, incluida
Auditoría/Libro Mayor), `shifts-and-rules.spec.ts`, `comprehensive-verification.spec.ts`.

---

## 8. Escenarios de demostración

El seed (`npm run db:seed`, `package.json`: `"db:seed": "tsx prisma/seed.ts"`) no es solo un
conjunto de datos ficticios: son escenarios diseñados específicamente para poner en evidencia el
comportamiento del sistema frente a los casos que el enunciado exige como mínimo. Se carga de
forma idempotente dentro de Docker vía el servicio `migrate`, y borra las filas operacionales
haciendo upsert de los catálogos, así que se puede correr varias veces sin duplicar datos.

**Los tres casos obligatorios del enunciado, confirmados en el seed:**

1. **Equipo a punto de mantenimiento:** TAC-102, 738 h contra un umbral de 750 h — faltan 12
   horas, comentario explícito en el código: `// 12 h from its threshold: closing today's shift
   blocks it`.
2. **Operador con certificación vencida:** Beatriz Rojas, certificación de excavadora vencida
   hace 10 días.
3. **Turno que al cerrarse dispara el bloqueo:** el turno diurno de hoy, con TAC-102 asignado y 12
   horas planificadas. `738 + 12 = 750 ≥ 750` → el equipo queda bloqueado al cerrar el turno.
   Comentario del propio seed: `// closing today's shift takes TAC-102 from 738 to 750 h`.

**Equipos (6):**

| Código | Tipo | Horas actuales | Umbral | Estado |
|---|---|---|---|---|
| TAC-101 | Camión de acarreo | 180 | 250 | Disponible |
| TAC-102 | Camión de acarreo | 738 | 750 | Disponible — a 12 h del bloqueo |
| TAC-103 | Camión de acarreo | 1253 | 1250 | Bloqueado |
| EXC-201 | Excavadora | 1180,5 | 1250 | Disponible |
| EXC-202 | Excavadora | 420 | 500 | En mantenimiento |
| FRD-301 | Perforadora | 402 | 500 | Disponible |

**Operadores (6)** con sus certificaciones: Carlos Medina (CAM y EXC vigentes, +180 días), Elena
Torres (CAM y EXC vigentes, +90 días), Héctor Salas (PER, +300 días), Beatriz Rojas (EXC,
vencida hace 10 días), Pablo Condori (CAM, vence en 3 días), Graciela Mamani (sin ninguna
certificación).

**Turnos:** uno cerrado ayer (con 2 asignaciones ya `COMPLETED`, que alimentan el saldo inicial
del ledger); hoy día y noche; y turnos programados de mañana hasta 6 días adelante, incluyendo
EXC-201 en varios de ellos y TAC-101 con Pablo Condori el día +5 (que es también el caso donde la
certificación vence a mitad de la ventana de turnos programados, §4.5).

**Credenciales de demostración** (no representan usuarios ni datos de producción):

| Rol | Email | Contraseña |
|---|---|---|
| Supervisor | `supervisor@geoops.pe` | `supervisor1234` |
| Planner | `planner@geoops.pe` | `planner1234` |
| Viewer | `viewer@geoops.pe` | `viewer1234` |

Estas credenciales están disponibles para la demostración. Las pruebas automatizadas del
repositorio se ejecutan localmente; no hay una suite que verifique estas credenciales contra
producción.

---

## 9. Decisiones de alcance

Un modelo de dominio bien diseñado también se define por lo que deliberadamente no resuelve. Cada
elemento de esta lista quedó fuera del alcance actual por una razón específica, no por falta de
tiempo:

| Fuera del alcance actual | Por qué no está en el MVP | Qué aportaría después |
|---|---|---|
| Umbral de días de gracia para que una certificación vencida deje de ser forzable | El dato que lo habilitaría (fecha exacta de vencimiento) ya viaja en el `context` de la violación (§4.2), pero cambiar la severidad dinámicamente introduce una regla nueva que el enunciado no exige y que merece su propio criterio de negocio (¿cuántos días?, ¿por tipo de certificación?) | Reduciría la dependencia del criterio manual del supervisor para certificaciones muy vencidas |
| Notificaciones por correo o WhatsApp de las alertas | Las alertas ya existen como entidad (§3.4) y se ven en el tablero; el canal de salida es infraestructura de notificación, no una regla de negocio | Reduciría el tiempo entre que una alerta se genera y que alguien la atiende |
| Calendario con arrastrar y soltar para reprogramar turnos | Costo de interfaz alto frente al peso de evaluación declarado (el enunciado no evalúa diseño gráfico); depende de que exista primero la reprogramación asistida de §10 | Reduciría la fricción operativa de reasignar equipos en riesgo |
| Gestión de usuarios desde la interfaz | Los tres roles sembrados alcanzan para demostrar el modelo de autorización de §4.2; agregar CRUD de usuarios no prueba una regla de negocio adicional | Necesaria para operación real más allá de un ambiente de demostración |
| Reportes exportables (Excel/PDF) y KPIs históricos | El ledger, `overdueHours` y los desvíos de horas ya están modelados para soportarlos (§5.1, §4.4); falta exclusivamente la capa de presentación | Aprovecharía datos que el sistema ya captura, sin cambios al modelo |
| Órdenes de trabajo, repuestos y costos de mantenimiento | Es otro dominio (un CMMS completo) con su propio modelo de datos, fuera del alcance de las doce reglas del enunciado | Extendería el sistema hacia gestión de mantenimiento, no solo control de bloqueo |
| Multi-tenant o varias operaciones mineras | No lo exige el enunciado, y agregaría una dimensión de particionamiento a todas las tablas sin necesidad actual | Sería requisito si GeoOps pasara a operar sobre más de una faena |

---

## 10. Evolución propuesta

Ordenado por el impacto que tendría sobre la confiabilidad operativa y la eficiencia del
planificador, no por facilidad de implementación.

### Alta prioridad — seguridad operacional y confiabilidad

1. **Umbral de días de gracia para certificaciones vencidas**, usando el dato de fecha de
   vencimiento que ya viaja en el `context` de la violación (§4.2), para que el sistema degrade
   automáticamente a `HARD` cuando el atraso es demasiado grande, en lugar de depender
   enteramente del criterio del supervisor.
2. **Observabilidad:** enviar los logs estructurados (que ya llevan `requestId`, §6) a un
   servicio externo, con trazas y alertas de error, para reducir el tiempo de diagnóstico ante
   una falla en producción.

### Media prioridad — eficiencia del planificador

3. **Reprogramación asistida** cuando un equipo se bloquea: sugerir equipos equivalentes
   disponibles con operador certificado para ese turno, en lugar de solo marcar `AT_RISK` y
   avisar (§4.1).
4. **Proyección con horas reales promedio** (por equipo o por frente) en lugar de solo las horas
   planificadas de las asignaciones ya creadas (§4.7), para estimar mejor el margen cuando
   todavía no hay asignación para un turno futuro.

### Evolución futura — ampliación del dominio

5. **Mantenimiento preventivo por calendario**, además de por horómetro, para componentes que se
   sirven por tiempo aunque el equipo esté detenido.
6. **Métricas de operación:** disponibilidad mecánica, utilización, cumplimiento del plan de
   mantenimiento y horas por operador — los datos ya están en el ledger (§5.1), falta la capa de
   agregación.
7. **Captura offline en campo**, con sincronización posterior — el punto donde este tipo de
   sistema suele fallar en la práctica minera, y que requeriría revisar la estrategia de
   concurrencia de §5 para un contexto de sincronización diferida.

---

## 11. Uso de IA y responsabilidad técnica

Usé asistentes de IA (Claude y opencode sobre el repositorio) como apoyo durante el
desarrollo y en la redacción de este documento: para explorar alternativas de modelado, ampliar
casos borde de tests, acelerar código repetitivo de interfaz y, de forma explícita en esta
versión, verificar contra el código real cada afirmación técnica antes de dejarla por escrito —
incluida la revisión del despliegue en producción (Vercel). `opencode` se usó puntualmente como
apoyo para la construcción del código, no para decidir el diseño.

Las decisiones de fondo —el modelo de datos, la política de umbral anclado, cómo se resuelve la
concurrencia, la clasificación de violaciones en tres niveles de severidad y qué queda fuera del
alcance— las tomé yo, apoyándome en cómo resuelven estos mismos problemas sistemas más
profesionales del dominio (control de flotas, mantenimiento por horómetro, ledgers
transaccionales), y quedan argumentadas en este documento con sus alternativas descartadas y sus
límites reconocidos. Ninguna línea de código se aprobó sin revisión: cada una fue evaluada con
criterio propio antes de integrarse al repositorio, y es sustentable línea por línea contra el
código y las pruebas. La IA fue una herramienta de exploración y aceleración; la responsabilidad
técnica sobre cada decisión y cada línea entregada permanece en el desarrollo.

---

## Conclusión

GeoOps resuelve un problema de coordinación operativa —equipos, operadores, turnos y
mantenimiento— donde el riesgo no está en la falta de datos sino en reglas que se cruzan entre sí
sin nada que las haga cumplir. El sistema traduce esas reglas en invariantes de dominio,
distingue con criterio qué se garantiza en la base de datos y qué se valida en la capa de
aplicación, resuelve concurrencia real con evidencia de tres pruebas independientes, y deja
trazabilidad completa de cada asignación, excepción y movimiento de horómetro. Cada decisión
abierta del enunciado tiene una respuesta explícita, una alternativa descartada por escrito y una
prueba automatizada que la sostiene; y lo que quedó fuera del alcance se decidió, no se recortó
por tiempo. Ese es el criterio de ingeniería que este documento busca dejar visible.
