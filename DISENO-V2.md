# GEOOPS · INDUSTRIAL PRECISION V2
## Especificación exhaustiva de cambios por pantalla, componente y control

> Leyenda: ❌ elimina · 🔧 modifica · ➕ nuevo · ✅ se conserva intacto
> Nada de esto toca lógica: auth, APIs, actions, use-cases, core, Prisma, tests funcionales.

---

## 📊 CONTROL DE AVANCE
> Última actualización: Fase 5 completada  |  Fase activa: 6 · Vistas restantes

Leyenda: `[ ]` pendiente · `[~]` en progreso · `[x]` completado y validado

### Paso 0 · Preparación
- [x] Guardar este documento (DISENO-V2.md)
- [x] Instalar skills: wshobson/agents@tailwind-design-system · alirezarezvani/claude-skills@a11y-audit
- [x] Pre-vuelo: `git status` limpio en 332eeb9, dependencias instaladas

### Fase 1 · Fundaciones            ← estado: ✅ (gate verde)
- [x] Archivo variable con eje wdth (app/layout.tsx)
- [x] Tokens piedra #f5f4f2 + motion + radios + .hatch-bloqueo + .doble-filete (globals.css)
- [x] Encabezado v2 (Archivo 600-650, doble filete) (ui.tsx) + radios/duraciones en Badge, Aviso, Panel, tabla, Vacio, boton (+ variante .tabla), gauge
- [x] Gate: lint ✓ typecheck ✓ unit ✓ build ✓

### Fase 2 · Login                  ← estado: ✅ (gate verde + smoke SSR)
- [x] Columna visual duotono + ticks + LVL strip + footer Lima honesto
- [x] Formulario tokenizado (cero gray-*/ring custom/focos custom)
- [x] CredencialesDemo → InfoCard
- [x] Gate visual 360/1440 + credenciales demo funcionando (smoke: ticks-full ✓ LVL ✓ ken-burns ✓ wordmark 125% ✓ sin gray-* / SYS.ONLINE / v2.4.1 / focus-ring)

### Fase 3 · Familia de cards       ← estado: ✅ (gate verde)
- [x] KpiCard · StatusCard · AlertCard · AlertBand · NavCard (nuevos, src/components/*-card.tsx / alert-band.tsx)
- [x] Modal/DialogConfirm radios lg + header inset + sombra cálida
- [x] Gate: lint/typecheck/unit ✓

### Fase 4 · Dashboard por niveles  ← estado: ✅ (gate verde)
- [x] Alert Band + microlabels CRÍTICO/OPERACIÓN/REFERENCIA
- [x] KPIs → KpiCard · héroe ticks-full · StatusCards · tabla hatch BLOCKED · Action Center → AlertCard en riel crítico
- [x] Cascada 240ms motion-safe · loading.tsx espejado por tiers
- [x] Gate: lint ✓ typecheck ✓ unit ✓ build ✓

### Fase 5 · Sidebar                ← estado: ✅ (gate verde)
- [x] Grupos OPERACIÓN/RECURSOS/ANÁLISIS + espina activa (rail y fila)
- [x] Placa marca bg2 + wordmark expandido + vitales al pie + top-bar solo fecha (meter solo móvil)
- [x] Sheet móvil con grupos + rounded-l-lg + popover usuario lg
- [x] Gate: lint/typecheck/unit/build ✓

### Fase 6 · Vistas restantes       ← estado: ✅ (gate verde)
- [x] Turnos lista + detalle (Proceso reestilizado v2 in place, conservando estados y anclas; hatch solo en equipos BLOCKED, AT_RISK mantiene tinte ámbar)
- [x] Proyección fusión columnas → 8 cols (Cruce Proyectado: fecha mono + jornada/hora) · standby → StatusCard · hatch ALREADY_BLOCKED
- [x] Equipos lista+detalle · Operadores lista ("Resumen" + KpiCard) + ficha · Auditoría (KpiCard plano)
- [x] Contraste ink-low→muted: barrido completo; solo restan usos decorativos (placeholders, separadores, numerales)
- [x] Gate: lint/typecheck/unit/build ✓ (e2e pendiente → Fase 7)

### Fase 7 · QA integral            ← estado: ⬜
- [ ] Matriz 360/768/1024/1440 × 8 vistas
- [ ] WCAG AA contraste · targets ≥40px · reduced-motion · Ken Burns solo loop
- [ ] Suite completa verde · commit final documentado

---

## 0. FUNDACIONES GLOBALES (tokens)

| Archivo | Elemento | Acción | Detalle |
|---|---|---|---|
| `app/layout.tsx` | Import Fraunces | ❌→➕ | Eliminar fuente; añadir **Archivo** variable con ejes `wght` (500–700) y `wdth` (62–125); variable CSS `--font-archivo` |
| `app/layout.tsx` | Metadata | 🔧 | Descripción sin cambios funcionales; título igual |
| `app/globals.css` | `--color-bg0/bg-deep/canvas/canvas-subtle/bg2` | 🔧 | Familia piedra `#f5f4f2` y derivadas recalculadas |
| `app/globals.css` | `--font-display` | 🔧 | Apunta a Archivo (ya no serif) |
| `app/globals.css` | Escala radios | 🔧 | `xs 3px · sm 5px · md 7px · lg 10px · xl 14px`; comentario: `full` solo rellenos/spinners, `0` tablas-gauge-notch-shell |
| `app/globals.css` | Tokens motion | ➕ | `--dur-fast:120ms --dur-med:150ms --dur-overlay:220ms --dur-gauge:500ms --ease:cubic-bezier(0.22,1,0.36,1)` |
| `app/globals.css` | `.panel-ticks` | 🔧 | Opacidad cobre 45%→30%; clase nueva `.ticks-full` (100%) para panel héroe |
| `app/globals.css` | `.hatch-bloqueo` | ➕ | Rayas 45° al 8% opacidad (fondo bloqueo) para filas/badges |
| `app/globals.css` | `.doble-filete` | ➕ | Línea 1px + aire 3px + línea 1px bajo Encabezado |
| `app/globals.css` | `@keyframes ken-burns`, modal-in, backdrop-fade | ✅ | Intactos |
| `app/globals.css` | focus-visible, scrollbars, reduced-motion, selection, `.rotulo`, `.num` | ✅ | Intactos |

---

## 1. SISTEMA COMPARTIDO (`src/components/`)

### 1.1 `ui.tsx`
| Elemento | Acción | Detalle |
|---|---|---|
| Comentario cabecera "dark industrial skin" | 🔧 | Texto actualizado a v2 |
| **Badge** | ✅ | Estructura espina+rótulo intacta; radio pasa a `radius-xs` (3px) |
| **Encabezado** | 🔧 | H1: Archivo 600–650, `tracking-tight`; borde inferior simple → **doble filete**; títulos cortos por página (ver §4–§12); marca lateral "GeoOps \| Collpahuasi" ✅ |
| **Panel** | 🔧 | Radio exterior `lg` (10px); header opcional **inset bg2**; slot numeral sección `01…` mono opcional; ticks graduados (30% base / `.ticks-full` héroe); espina de panel opcional (tono severidad) |
| **Aviso** | 🔧 | Radio `md` (7px); animación slide-in 180ms al montar; tonos intactos |
| **boton.primario/secundario/excepcion/peligro** | 🔧 | Radio `sm` (5px); duraciones desde tokens; active scale 0.97 ✅; hover primario ✅ |
| **boton.tabla** | ➕ | Variante compacta (h-8, px-2.5, xs semibold) para acciones de fila |
| **campo.input/numero** | 🔧 | Radio `sm`; resto intacto (focus cobre, placeholder ink-low solo decorativo) |
| **BarraHorómetro** compacto/estandar/grande | ✅ | Firma intacta: recto, notch, ticks 25/50/75; transición 500ms desde token; colores umbral intactos |
| **tabla** wrapper/table/th/td/num | 🔧 | `wrapper` clip-radius `lg`; th fila header **inset bg2**; th border-b `line-strong`; td separadores `line-subtle`; celdas radio 0 |
| **Vacio** | 🔧 | Radio `md` en caja icono; texto/icono intactos |

### 1.2 Resto de componentes
| Componente | Acción | Detalle |
|---|---|---|
| `modal.tsx` | 🔧 | Radio `lg`; sombra neutra-cálida; header inset opcional; animación 220ms ✅; cierre backdrop/Escape/focus ✅ |
| `dialog-confirm.tsx` | 🔧 | Radio `lg`; espina bloqueo izquierda ✅; spinner full ✅; foco en confirmar ✅ |
| `submit-button.tsx` (BotonEnviar) | ✅ | Hereda radios nuevos vía clases; lógica useFormStatus intacta |
| `nav-link.tsx` | 🔧 | Rail activo: tinte + texto cobre + **espina izquierda 2px** + peso 600; crossfade 150ms; variantes compacto/fila intactas; `aria-current` ✅ |
| `jump-link.tsx` (IrAPanel) | ✅ | Intacto |
| `icons.tsx` (Icon, Spinner, 18 trazos) | ✅ | Set conservado; normalización óptica menor permitida sin redibujo |
| `charts.tsx` (MargenVsConsumo, DisponibilidadPorDia, HistorialHorometro, Leyenda) | ✅ | SVG, aria-labels, leyendas y gemela-tabla intactos |
| `violations-panel.tsx` | 🔧 | Radio `md`; severidades/etiquetas intactas |
| `credentials-panel.tsx` | ❌→➕ | Reescrito completo (ver §3) |
| `format.ts`, `api.ts` | ✅ | Lógica intacta |

### 1.3 Nuevos componentes
| Componente | Detalle |
|---|---|
| `kpi-card.tsx` (KpiCard) | rotulo + valor mono grande + subtítulo + chip icono tonal opcional + href opcional; radio `md`; hover lift 1px + micro-sombra + borde `line-strong` (150ms); reemplaza las 3 implementaciones actuales |
| `status-card.tsx` | entidad: código mono + Badge + métrica clave + gauge compacto + enlace; para próximas guardias y standby de proyección |
| `alert-card.tsx` | espina severidad + Badge tipo + mensaje + haceCuanto + acción; hatch si CRITICAL; para Action Center |
| `alert-band.tsx` | franja nivel crítico del dashboard (ver §4) |
| `nav-card.tsx` | formaliza `Proceso` como componente reutilizable (misma API actual) |

---

## 2. SHELL Y NAVEGACIÓN (`shell.tsx`, `layout.tsx` workspace)

| Control / zona | Acción | Tratamiento v2 |
|---|---|---|
| Skip-link accesibilidad | ✅ | Intacto |
| Marca/Monograma (desktop+compacto) | 🔧 | Placa mecanizada: franja `bg2` alto completo; "GEOOPS" Archivo caps `wdth 125`; monograma cobre ✅; sublínea Collpahuasi ✅ |
| NAV array (6 rutas/labels/iconos) | 🔧 | Agrupado: **OPERACIÓN** (/, /turnos) · **RECURSOS** (/equipos, /operadores) · **ANÁLISIS** (/proyeccion, /auditoria); microheaders mono `rotulo`; labels e iconos intactos |
| NavLink ×6 variante rail | 🔧 | Activo con espina (via nav-link v2) |
| NavLink ×6 compacto (md) | 🔧 | Grupos → separadores hairline entre bloques; tooltip/sr-only ✅ |
| Aside fijo (md+) | 🔧 | Radio 0 full-bleed ✅; ancho 16/60 ✅; bordes jerarquizados |
| Bloque usuario pie (botón abrir menú) | 🔧 | Estructura intacta; popover radio `lg`; iniciales caja afilada ✅ |
| Popover usuario (rol, puede, Cerrar sesión) | 🔧 | Radio nuevo; hover peligro ✅; form action intacta |
| MeterFlota (top-bar desktop) | 🔧 | **Se mueve al pie del sidebar** encima del usuario; pill de progreso ✅; tono ok/aviso ✅ |
| Barra superior móvil (<md): Marca + botón menú | 🔧 | Conservada; altura 56 ✅; botón radio `sm` |
| Sheet móvil: backdrop, cerrar, nav fila ×6, meter, fecha, usuario, logout | 🔧 | Radio `lg` en sheet; orden intacto; todos los handlers ✅ |
| Status bar contenido (meter, fechaLima, usuario móvil) | 🔧 | Queda **solo fechaLima** en desktop; móvil conserva todo |
| `<main id="contenido">` paddings | ✅ | Ritmo intacto |
| `layout.tsx` workspace: ROL map, fechaLima(), aggregate flota, cerrarSesion | ✅ | Lógica intacta (sin contadores nuevos según decisión) |

---

## 3. LOGIN (`app/login/page.tsx`)

| Control | Acción | Tratamiento v2 |
|---|---|---|
| Grid 2 columnas lg | ✅ | Concepto conservado |
| Hero foto izquierda + Ken Burns | ✅ | Loop 30s alternado `motion-safe` (decisión: conservar) |
| Overlay gradiente negro | 🔧 | Duotono tinta+cobre; **ticks grandes de esquina** sobre la foto |
| H1 "GeoOps" hero | 🔧 | Wordmark "GEOOPS" Archivo caps expandida + sub "Collpahuasi" |
| Franja niveles LVL | ➕ | Pie columna visual: `LVL 3 SUPERVISOR · LVL 2 PLANIFICADOR · LVL 1 CONSULTA` mono |
| Banner móvil foto h-64 | 🔧 | Mismo duotono/ticks; altura ✅ |
| Logo móvil duplicado | ❌ | Un único bloque de logo arriba del formulario |
| Logo desktop duplicado | ❌ | Ídem |
| H2 "Iniciar sesión" + subtítulo | 🔧 | Archivo display; microcopy ajustado |
| Label Email + input email | 🔧 | `campo.input` token (radio sm, fondo canvas-subtle, foco cobre global); autoComplete ✅ |
| Label Contraseña + input password | 🔧 | Ídem |
| `focus:ring-*` custom | ❌ | Fuera: outline cobre global |
| Grises `gray-*` | ❌ | Tokens ink/muted/canvas |
| Aviso error role=alert | 🔧 | Componente Aviso tono bloqueo radio md; mensaje ✅ |
| BotonEnviar "Iniciar sesión"/"Iniciando sesión…" | 🔧 | `boton.primario` full-width real; pendiente ✅ |
| Footer "SYS.ONLINE" punto verde + "v2.4.1" | ❌ | Eliminados (datos falsos) |
| Footer meta nuevo | ➕ | Fecha/hora Lima server-side (helper existente) |
| CredencialesDemo | ❌→🔧 | Reescrita como InfoCard: header rotulo, filas con Badge espina por rol, credencial mono seleccionable, acción "Usar cuenta" `boton.tabla`; acordeón grid-rows ✅; autocompletado JS ✅ |

---

## 4. PANEL DE CONTROL (`(workspace)/page.tsx`)

| Zona / control | Acción | v2 |
|---|---|---|
| Composición general | 🔧 | Tiers: CRÍTICO → OPERACIÓN → REFERENCIA con microlabels mono laterales (`CRÍTICO/OPERACIÓN/REFERENCIA`) |
| Cascada entrada | ➕ | Stagger CSS 240ms una vez, reduced-motion-safe |
| Encabezado | 🔧 | Título corto "Panel de Control"; descripción condensada |
| **Alert Band** | ➕ | Ancho completo: si críticos>0 o bloqueados>0 → spine bloqueo + conteo + enlaces; si no → franja fina ok "En tolerancia" |
| Action Center panel | 🔧 | Pasa a tier crítico (col der. xl); AlertCard por item (espina+hatch CRITICAL); badge contador ✅; "Inspeccionar CODE" links ✅; vacío con visto ✅ |
| ALERTA_CONFIG map, haceCuanto, ORDEN_SEVERIDAD | ✅ | Lógica intacta |
| KPI grid ×4 (Links) | 🔧 | → **KpiCard** unificada; hrefs intactos; acentos tonales consolidados |
| Curva predictiva panel | 🔧 | **Célula héroe**: raised + `.ticks-full` + mayor altura; link "Matriz…" `boton.tabla`; chart ✅ |
| Próximas guardias panel | 🔧 | Filas → StatusCard; tiempo relativo "en Xh"; link "Ver Todas" `boton.tabla`; Badge ✅; Vacio + "Programar Guardia" ✅ |
| Tabla flota completa | 🔧 | Header inset, jerarquía líneas, hatch en filas BLOCKED; code links/badges/gauge/num ✅; link "Inventario…" `boton.tabla` |
| Consultas Promise.all | ✅ | Intactas |

---

## 5. GUARDIAS — LISTA (`turnos/page.tsx`)

| Control | Acción | v2 |
|---|---|---|
| Encabezado | 🔧 | "Guardias & Despacho" corto |
| Form apertura guardia: date, select jornada, horas number | 🔧 | Radios sm; layout ✅; defaults ✅ |
| BotonEnviar "Aperturar Guardia"/pendiente | ✅ | Hereda tokens |
| Aviso error (searchParam) | ✅ | Estilo md |
| Panel registro histórico | 🔧 | Header inset + conteos ✅ |
| Tabla: link fecha + badge Hoy/Mañana/Ayer | 🔧 | Badge radio xs; link mono ✅ |
| Columnas Jornada/Duración/Estado | ✅ | Badges intactos |
| Celda asignaciones (conteo + riesgo + codes) | ✅ | Estructura intacta |
| Acción fila "Despachar / Cerrar" / "Ver Matriz" + flecha | 🔧 | → `boton.tabla` |
| Vacio sin guardias | ✅ | |
| procesarCreacionTurno / requireRole / redirects | ✅ | Lógica intacta |

---

## 6. GUARDIAS — DETALLE DE TURNO (`turnos/[id]/page.tsx`)

| Control | Acción | v2 |
|---|---|---|
| Encabezado + Badge estado + "Volver a turnos" | 🔧 | Título corto; volver → ghost con flecha |
| Stats dl 4 (vigentes/riesgo/horas/canceladas) | 🔧 | Coincide con skeleton loading ✅; valores num ✅ |
| Aviso "Turno creado." | ✅ | |
| **Proceso** (Asignar/Riesgos/Cerrar) | ✅ | Conservado íntegro → promovido a NavCard |
| Aviso rol consulta VIEWER | ✅ | |
| Tabla asignaciones: link equipo, operador, Badge, plan/reales, observaciones | 🔧 | Hatch en fila AT_RISK además de tinte ✅; resto intacto |
| Nota explicativa filas ámbar | ✅ | Copy intacto |
| **CancelarAsignación** por fila | ✅ | DialogConfirm hereda radios; flujo intacto |
| **AsignarForm**: selects optgroup, horas, submit | 🔧 | Radios sm; grupos ✅; debounce 300ms ✅; hint box md con gauge ✅ |
| Preview validación: comprobando / error-check / PanelViolaciones / sin problemas | 🔧 | Fade-slide 180ms al aparecer; aria-live ✅ |
| Flujo excepción: "Forzar con autorización", textarea motivo + contador 15, "Autorizar y asignar", Cancelar | ✅ | Sólo hereda radios/duraciones; gating intacto |
| Éxito Aviso + router.refresh | ✅ | |
| **CerrarTurnoForm**: inputs horas aria-label, nota condicional, preview impacto, submit cerrar | 🔧 | Hatch en fila que bloquea; aria-labels ✅; constantes desvío ✅ |
| Aviso cierre con riesgos + IrAPanel | ✅ | |
| Vacios (sin asignaciones / nada que cerrar) | ✅ | |
| Aviso turno cerrado + link bitácora | ✅ | |

---

## 7. MANTENIMIENTO PREDICTIVO (`proyeccion/page.tsx`)

| Control | Acción | v2 |
|---|---|---|
| Encabezado | 🔧 | "Mantenimiento Predictivo"; ventana fechas ✅ |
| Aviso seguro / alerta predictiva | 🔧 | Radio md; strongs/links ✅ |
| Panel Curva disponibilidad | ✅ | Chart intacto |
| Panel Margen vs Consumo (+vacío textual) | ✅ | Bullet chart intacto |
| **Matriz simulación**: 9 columnas | 🔧 | **Fusión col. Fecha Cruce + Guardia Cruce** → una celda = 8 columnas; badges diagnóstico ✅; margen rojo ≤12h ✅ |
| Unit links | ✅ | |
| Explainer simulación (footer) | ✅ | Copy intacto |
| Standby panel → lista | 🔧 | Items → StatusCard compacta; badges/métricas ✅ |
| Vacio sin carga activa | ✅ | |
| getProjection / evaluarDetenidoEnFecha | ✅ | Lógica intacta |

---

## 8. MAQUINARIA — LISTA (`equipos/page.tsx`)

| Control | Acción | v2 |
|---|---|---|
| Encabezado + NuevoEquipo (acción) | ✅/🔧 | Botón hereda tokens |
| KPI ×4 estados flota | 🔧 | → **KpiCard** (sin href, tono por estado) |
| Aviso bloqueados + links unidad | 🔧 | Spine panel + hatch sutil; links ✅ |
| Tabla telemetría: link code, tipo, Badge, gauge, horómetro, umbral, remanente, mantenimientos | 🔧 | Header inset; hatch fila BLOCKED; lógica colores ✅ |
| Explainer horas remanentes | ✅ | |

### 8b. Modal `new-equipment-modal.tsx`
| Control | v2 |
|---|---|
| Trigger "Nuevo equipo" | Hereda boton.primario |
| Modal (radio lg) campos: código mono upper, select tipo, horómetro inicial, intervalo heredado | Radios sm; placeholders/helpers ✅ |
| Preview "Al registrarlo, esto pasa:" | Aviso neutro ✅; cálculo primerUmbral ✅ |
| Error Aviso / Cancelar / "Registrar equipo" | ✅; useActionState close-on-ok ✅ |

---

## 9. MAQUINARIA — DETALLE (`equipos/[id]/page.tsx`)

| Control | Acción | v2 |
|---|---|---|
| Encabezado code + Badge + volver | 🔧 | Code en Archivo; volver ghost |
| Aviso BLOCKED + IrAPanel "Registrar mantenimiento" | 🔧 | Espina panel + hatch; salto/foco ✅ |
| Panel Estado (gauge grande + dl faltan/uso/servicios) | ✅ | Gauge firma intacto |
| Panel Horómetro en el tiempo (chart) | ✅ | Vacio <2 puntos ✅ |
| Tabla mantenimientos (atraso ámbar, nuevo umbral) + explainer anclaje | ✅ | Header inset |
| Panel RegistrarMantenimiento | ✅ | Form hereda tokens |
| Bitácora movimientos + explainer cuadre ledger | ✅ | Delta verde ✅ |

---

## 10. PERSONAL — LISTA (`operadores/page.tsx`)

| Control | Acción | v2 |
|---|---|---|
| Encabezado + NuevoOperador | ✅/🔧 | |
| **Barra filtros chips estáticos** | 🔧 | Se mantiene visualmente pero **se etiqueta "Resumen"** para dejar de parecer interactiva; cobertura por tipo ✅ |
| KPI ×4 personal | 🔧 | → **KpiCard** con tono |
| Aviso restricciones / óptimo | ✅ | |
| Matriz competencias: link code, nombre+registro, doc, condición Badge+subline, certificaciones Badge+talle fecha, botón Gestionar/Ficha | 🔧 | Badges xs; botón → `boton.tabla` |
| Vacio padrón | ✅ | |

### 10b. `new-operator-modal.tsx` / `[id]/certifications-form.tsx`
| Control | v2 |
|---|---|
| Modal nuevo operador (campos/select tipos) | Hereda tokens; estructura ✅ |
| OtorgarCertificacion (form panel) | Ídem |
| RevocarCertificacion (DialogConfirm) | Radio lg; copy ✅ |
| CambiarSituacion (activo↔inactivo) | Ídem |

---

## 11. PERSONAL — FICHA (`operadores/[id]/page.tsx`)

| Control | Acción | v2 |
|---|---|---|
| Encabezado nombre + Badge activo + volver | 🔧 | Nombre Archivo |
| Aviso sin habilitaciones (regla 3) | ✅ | |
| Stats dl ×4 | ✅ | |
| Lista "Qué puede operar" (Badge habilitado/no + vence/venció + docRef + Revocar) | 🔧 | Badges xs; filas divide ✅ |
| Explainer revocación | ✅ | Copy clave |
| Panel otorgar / situación | ✅ | |
| Tabla historial asignaciones + Vacio | 🔧 | Header inset |

---

## 12. RASTRO OPERATIVO (`auditoria/page.tsx`)

| Control | Acción | v2 |
|---|---|---|
| Encabezado | 🔧 | Título corto |
| KPI ×3 auditoría | 🔧 | → **KpiCard** plano |
| Excepciones: Badge, code, persona/guardia, link Ver Guardia, caja autorizado, reglas dispensadas | 🔧 | Caja interna radio md; citas ✅ |
| Vacio sin excepciones | ✅ | |
| Libro mayor: tabla + explainer ACID | 🔧 | Header inset; delta verde ✅ |
| Vacio libro mayor | ✅ | |

---

## 13. ESTADOS GLOBALES

| Pantalla | Acción | v2 |
|---|---|---|
| `loading.tsx` skeleton | 🔧 | Debe espejar nuevo tier dashboard; pulse ✅; aria ✅ |
| `error.tsx` 500 | 🔧 | Numeral gigante ✅; panel radio lg; botones tokens; digest ✅ |
| `not-found.tsx` 404 | 🔧 | Ídem; CTAs intactos |
| `global-error.tsx` | 🔧 | Consistencia mínima con error.tsx |

---

## 14. REGLAS TRANSVERSALES

1. **Contraste**: `ink-low` prohibido en texto informativo <18px → `muted`; revisar usos: turnos "Sin asignaciones", haceCuanto, umbrales proyección, placeholders informativos.
2. **Motion**: solo los definidos en §0–§6; nada de parallax/counters/pulses; Ken Burns única excepción ambiental.
3. **Radios**: regla de anidamiento aplicada en cada contenedor nuevo (interior = exterior − padding).
4. **Cobre ~5%**: sin nuevas superficies cobre masivas.
5. **Copy**: títulos de página cortos; descripciones condensadas sin perder precisión operacional.
6. **Responsive**: verificación 360/768/1024/1440 × todas las vistas tras cada fase.
7. **Accesibilidad**: skip-link, aria-live/current/alert, targets ≥40px, reduced-motion: regresión en cada fase.

## 15. NO-REGRESIÓN (intocable)

auth/JWT/roles/rutas · `login/actions.ts` · APIs (`assignments`, validate, cancel, close, projection, health, http) · use-cases · `core/` · Prisma · seed · tests unitarios/integración · flujos de excepción y cierre · invariantes ledger/proyección. Tests e2e: solo ajuste de selectores si el DOM cambia (ej. fusión columnas proyección).
