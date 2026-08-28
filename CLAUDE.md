# CLAUDE.md — Sistema de Gestión de Proyectos Ingenium Service SAC

Este archivo es el contexto persistente del proyecto para Claude Code. Léelo antes de trabajar en cualquier tarea de este repositorio.

## Estado del proyecto

Scaffolding inicial completo: Next.js (TypeScript + Tailwind, App Router) + Prisma con el schema del modelo de datos validado, migrado contra Postgres local. Autenticación con Auth.js v5 (Credentials contra la tabla `users`, sesión JWT con id/role, login/logout, rutas protegidas vía `src/proxy.ts`) implementada y verificada. Seed (`prisma/seed.ts`, vía `npx prisma db seed`) crea las 5 líneas de negocio y el usuario OWNER real (credenciales en `.env`, no en el código — ver `SEED_OWNER_*`). Identidad visual (logo, colores de marca, íconos Lucide) aplicada. Primera pantalla de proyecto (`/proyectos/nuevo`, `/proyectos/[id]`) funcionando, con cálculo de saldo positivo verificado contra el Excel real del cliente. Captura rápida de facturas con OCR (`/capturas/nueva`, `/capturas`) implementada y verificada. App mobile-first (sidebar en desktop, barra inferior en celular). Desplegada por el usuario en una segunda máquina vía túnel de Cloudflare para que el cliente la pruebe (base de datos independiente de la de desarrollo).

**Permisos por rol (`OWNER` vs `RESPONSABLE`):**
- **OWNER**: todo — crear/editar usuarios, crear proyectos, préstamos (de cualquiera), reembolsos, dashboard general de toda la empresa.
- **RESPONSABLE**: capturar/clasificar facturas, agregar gastos/abonos en proyectos, ver proyectos. Puede ver **sus propios préstamos** (solo lectura, no crea ni edita). No ve reembolsos, dashboard general, ni gestión de usuarios.
- Las cuentas de usuarios las crea el OWNER desde una pantalla (`/usuarios`) — no hay auto-registro.
- El guard de permisos se hace a nivel de página (chequeo de `session.user.role`, redirect si no corresponde), no a nivel de `proxy.ts`.

Usuarios, reembolsos, préstamos y panel general (con gráficos de torta/barras vía recharts) construidos y verificados. Menú móvil es un panel desplegable (hamburguesa) con la misma lista que el sidebar de escritorio, no una barra inferior limitada.

**Gastos: "quién hizo la compra" vs "quién lo registró".** `paidByUserId`/`paidByName` en `Expense` es **siempre** quién hizo la compra (seleccionable en el formulario, no solo cuando es personal) — es lo que se muestra como badge en el registro de gastos. `createdByUserId` es un dato de auditoría (quién tecleó el registro), no se muestra. El OWNER puede registrar un gasto a nombre de cualquier responsable.

**`payment_method` en `Expense`** (enum: `EFECTIVO` | `YAPE_PLIN` | `TRANSFERENCIA` | `TARJETA` | `OTRO`, nullable): el "medio pago" que imprime la factura del proveedor **no es confiable** (caso real probado: factura decía "EFECTIVO" pero el pago real fue por Yape/Plin, confirmado con el comprobante de la app). Por eso este campo es una elección manual del usuario al registrar el gasto, nunca algo que el OCR intente adivinar.

**OCR probado con una factura electrónica real** (PDF con texto seleccionable): fecha, monto y proveedor se extraen bien. El número de comprobante requirió endurecer el regex a `[A-Z]\d{3}-\d{1,8}` (serie-correlativo peruano estándar) porque el patrón laxo anterior confundía fragmentos de la dirección (ej. "TDA. B1-8") con el número real. Con capturas de pantalla de apps de pago (Yape/Plin, sin RUC ni layout de factura) el monto se sigue extrayendo razonablemente bien, pero la fecha en texto ("14 agosto 2026") no matchea el regex de fecha numérica — se espera que el usuario la complete a mano en la pantalla de clasificación, que ya es siempre editable.

**Nota S3/MinIO — bucket:** `src/lib/s3.ts` crea el bucket solo si no existe (`ensureBucket`, se corre una vez por proceso antes de la primera subida). Esto se agregó porque el despliegue en la segunda máquina del usuario falló silenciosamente ("No se pudo guardar la factura") — nunca documenté un paso para crear el bucket ahí, solo lo había creado a mano en esta máquina con un script suelto que no quedó en ningún lado. Ya no hace falta ese paso manual en ningún entorno nuevo (dev local, la otra máquina, o el futuro S3 real).

## Backlog (anotado, no construir todavía)

**Visión del producto:** el usuario piensa esta plataforma como una intranet de la empresa, no solo como gestión de proyectos/gastos — va a seguir creciendo con más módulos. Tener esto en cuenta en decisiones de arquitectura (no diseñar como si el alcance fuera fijo).

**Sistema de notificaciones — versión 1 construida** (el usuario pidió adelantarla, no hizo falta esperar): contador rojo sobre "Facturas pendientes" en el menú (por usuario, cuenta sus propias `ExpenseCapture` con `status: PENDIENTE`) y tarjeta "Facturas sin confirmar" en el Panel general con el total de **todos** los responsables. `AppShell` es ahora un server component `async` que hace esta consulta. **Pendiente todavía**: alertas fuera del sistema (correo/otro canal) cuando algo queda mucho tiempo sin confirmar — no decidido, requiere elegir proveedor de correo.

**Nota Prisma 7:** el cliente requiere un driver adapter explícito (`@prisma/adapter-pg`), ya no basta con `DATABASE_URL` en el datasource — ver `src/lib/prisma.ts`.
**Nota Next.js 16:** el archivo de middleware se llama `proxy.ts`, no `middleware.ts` (convención renombrada en esta versión). Su `matcher` debe excluir extensiones de archivos estáticos (`.png`, etc.) o rompe la optimización de imágenes de Next.
**Nota tesseract.js:** necesita estar en `serverExternalPackages` (`next.config.ts`) para no romperse con el bundling de Turbopack — intenta hacer un `require` dinámico de su worker que el bundler no resuelve bien.
**Nota pdf-parse (mismo problema que tesseract.js):** también necesita estar en `serverExternalPackages` (`next.config.ts`) por el mismo motivo — intenta levantar su propio worker (`pdf.worker.mjs`) con una ruta relativa a su módulo, y Turbopack la rompe al empaquetarlo. Síntoma real visto en la demo de la segunda máquina: al clasificar una factura en PDF, el OCR fallaba silenciosamente con `captureReceiptAction: OCR failed Error: Setting up fake worker failed: "Cannot find module '...pdf.worker.mjs'..."` — la captura se guardaba igual, pero sin ningún dato extraído. Corregido agregando `"pdf-parse"` junto a `"tesseract.js"` en `serverExternalPackages`.
**Nota Prisma + dev server:** cuando se agrega un modelo nuevo al schema, además de migrar y regenerar el cliente, hay que **reiniciar el proceso de `npm run dev`** — el singleton de `PrismaClient` en `src/lib/prisma.ts` sobrevive el Fast Refresh y se queda con la versión vieja del cliente en memoria (síntoma: `Cannot read properties of undefined (reading 'findMany')` en un modelo que sí existe en el schema).

### Entorno local

- **Postgres:** `docker compose up -d` (puerto host `5433`, ver `docker-compose.yml`). `DATABASE_URL` en `.env` ya apunta ahí.
- **MinIO** (equivalente local de S3): mismo `docker compose up -d`, consola en `http://localhost:9001`, API en `http://localhost:9000`. Credenciales dev en `.env`.
- **Next.js dev server:** el puerto 3000 puede estar ocupado por otros proyectos del usuario en Docker (`lms-core-frontend-manicura`); usar `npm run dev -- -p 3001` si hay conflicto. `.claude/launch.json` está configurado con `autoPort: true` para la vista previa.
- **Prisma:** schema en `prisma/schema.prisma`, cliente generado en `src/generated/prisma` (gitignored). `npx prisma migrate dev` para nuevas migraciones.
- `.env` tiene valores de desarrollo local (no reales); `.env.example` documenta las variables sin secretos.

## Reglas de trabajo

- Trabajar paso a paso. NO avanzar al siguiente paso sin confirmación explícita del usuario.
- No asumir ningún requerimiento que no esté confirmado en este documento; preguntar antes de asumir.
- No escribir código de la aplicación hasta validar el modelo de datos con el usuario.
- País: Perú. Normativa/terminología local: RUC, IGV (18%), SCTR, moneda Soles (S/.).

## La empresa

- **Nombre:** INGENIUM SERVICE S.A.C.
- **Slogan:** "Transformamos tus ideas en soluciones reales"
- **Rubro:** Ingeniería multidisciplinaria, obras y mantenimiento industrial. Proveedor homologado (certificación "MEGA").
- **Contacto:** +51 974 823 889 / +51 999 997 757 · proyectos@ingeniumservicesac.com · [www.ingeniumservicesac.com](https://www.ingeniumservicesac.com)

## Líneas de negocio

Cada proyecto pertenece a una de estas 5 líneas de negocio:

1. **Ingeniería de Proyectos** — consultoría, ingeniería conceptual/básica/de detalle, topografía, geotecnia, expedientes técnicos.
2. **Obras Civiles** — cimentaciones, estructuras, acabados, saneamiento.
3. **Obras de Metalmecánica** — fabricación de estructuras metálicas, montaje electromecánico, soldadura.
4. **Mantenimiento Industrial** — mantenimiento mecánico en planta, outsourcing técnico.
5. **Servicios Generales**

## Objetivo del sistema (prioridad actual)

Sistema de gestión de pendientes y proyectos. Vista principal: **una pestaña por proyecto**. Debe darle al dueño de la empresa control total y centralizado de:

1. **Datos generales del proyecto**: nombre, ubicación, cliente, usuario/contacto del cliente, empresa cliente, RUC, fecha inicio/fin, responsable por Ingenium, orden de compra, línea de negocio.
2. **Control financiero por proyecto**:
   - Monto de la orden sin IGV, monto de IGV, monto total.
   - Otros gastos: impuesto mensual (1%), renta anual (10%).
   - Saldo positivo del proyecto (calculado).
   - Registro de gastos: fecha, descripción, monto.
   - Registro de abonos/ingresos: fecha, descripción, monto.
   - Totales automáticos: total gastos, total ingresos, ganancia, saldo pendiente.
3. **Problema clave a resolver — control de compras/facturas**: el dueño de la empresa compra insumos y servicios a veces con su cuenta personal y a veces con la cuenta de la empresa. Hoy eso no se registra de forma ordenada. Por cada gasto el sistema debe permitir:
   - Indicar la fuente de pago (cuenta personal del dueño / cuenta de la empresa).
   - Indicar quién realizó la compra.
   - Adjuntar el comprobante/factura (foto o PDF).
   - Esto debe permitir luego hacer reembolsos y conciliación clara entre gastos personales adelantados y gastos de la empresa.
4. **Multiusuario**: distintos responsables de proyecto pueden registrar gastos e ingresos (ej. columna "Responsable por Ingenium" en los proyectos actuales).

## Ejemplo real de estructura de datos

Excel actual del cliente, proyecto "CIMENTACION". Este archivo real está disponible como caso de prueba de importación/migración de datos.

Encabezado del proyecto:

```
Proyecto: CIMENTACION
Ubicación: PAMOLSA
Usuario (cliente): MARCO
Empresa (cliente): QROMA
RUC:
Fecha de Inicio / Fecha Final:
Responsable por Ingenium: RAUL QUINTERO
Orden de Compra:
Monto de la orden sin IGV: 33,827.88
Monto del IGV: 6,089.02
Monto Total: 39,916.90
Impuesto Mensual (1%): 399.169
Renta Anual (10%): 3,991.69
Saldo Positivo del Proyecto: 29,437.02
```

Luego dos tablas en paralelo:

- **REGISTRO DE GASTOS**: Fecha | Descripción | Monto (ej. "21/07/2026, PLASTICO PARA FORRADO DE PANELES, 400"; "08/08/2026, ADELANTO MAXIMO, 2500"; incluye pagos de SCTR, EPP, movilidad, materiales, adelantos a personal, etc.)
- **REGISTRO DE ABONO**: Fecha | Descripción | Monto (ej. "03/08/2026, ABONO PROYECTO CIMENTACION, 4000")

Al final: total gastos, total abonos, saldo positivo, gastos, ganancia, pendiente por cobrar.

## Modelo de datos (validado)

**Catálogos**
- `business_lines` — id, name *(seed: las 5 líneas de negocio)*
- `clients` (empresa cliente) — id, business_name, ruc, created_at
- `client_contacts` (usuario del cliente, reutilizable entre proyectos) — id, client_id → clients, name, phone, email, created_at
- `users` — id, name, email, password_hash, role (`owner` | `responsable`), created_at

**Proyectos**
- `projects` — id, name, location, client_id → clients, client_contact_id → client_contacts, business_line_id → business_lines, responsible_user_id → users (nullable), responsible_name (texto libre si no tiene cuenta), purchase_order_number, start_date, end_date, order_amount_no_igv, igv_amount, monthly_tax_percent (default 1%), annual_rent_percent (default 10%), status, created_at, updated_at.
  `order_amount_no_igv` / `igv_amount` son el valor **actual** del proyecto — pueden editarse (adicionales/ampliaciones).
- `project_order_revisions` (historial de cambios de monto) — id, project_id → projects, date, order_amount_no_igv, igv_amount, reason, created_by_user_id, created_at
- `project_members` — project_id, user_id, role *(varios responsables pueden registrar movimientos en un mismo proyecto)*

**Movimientos financieros**
- `expenses` (gastos — siempre se registran, sin importar la fuente de pago) — id, project_id → projects (**nullable**: sin proyecto = gasto general/administrativo de la empresa), date, description, operation_code (nº de comprobante/factura, texto libre), amount, payment_source (`personal` | `empresa`), paid_by_user_id → users (nullable), paid_by_name (texto libre), billable_to_client_contact_id → client_contacts (nullable, a quién se le debe cobrar/descontar este gasto), billable_amount (nullable, puede ser parcial respecto a `amount`), notes (texto libre), created_by_user_id, created_at
- `expense_attachments` — id, expense_id → expenses, file_key (S3), file_type, uploaded_by_user_id, uploaded_at
- `incomes` (abonos) — id, project_id → projects (nullable, mismo criterio que expenses), date, description, amount, created_by_user_id, created_at
- `reimbursements` (pago del reembolso, como movimiento propio; no atado a un solo proyecto porque puede cubrir gastos de varios) — id, date, amount, description, paid_to_user_id → users, created_by_user_id, created_at
- `reimbursement_items` — reimbursement_id → reimbursements, expense_id → expenses, amount_applied *(une un reembolso con uno o varios gastos personales; soporta reembolsos parciales o agrupados)*

**Captura rápida de facturas (bandeja de fotos pendientes)**
- `expense_captures` — id, captured_by_user_id → users, file_key (S3, foto/PDF original), file_type, captured_at, ocr_raw_text (texto crudo extraído), ocr_extracted_date / ocr_extracted_amount / ocr_extracted_vendor / ocr_extracted_document_number (nullable, lo que el OCR pudo adivinar), status (`pendiente` | `clasificado`), expense_id → expenses (nullable, se llena al clasificar), classified_at.
  Flujo: cualquier responsable le toma foto a una factura desde el celular (captura instantánea, sin llenar nada). El sistema sube la foto a S3 y corre OCR en el momento. Después, esa misma persona entra a "Mis facturas pendientes" (filtrado por `captured_by_user_id` = usuario actual) y clasifica cada una: confirma/edita los datos del OCR, elige el proyecto, y marca si fue con dinero personal o de la empresa. Ahí recién se crea el `Expense` real + su `ExpenseAttachment`, y la captura pasa a `clasificado`.
  **OCR:** `pdf-parse` (Node) para facturas PDF con texto seleccionable; `tesseract.js` (Node, mismo motor Tesseract, sin binario externo) para fotos/escaneos sin texto extraíble. Tesseract solo da texto plano — los campos (RUC, fecha, monto, N° de comprobante) se extraen con reglas/regex sobre ese texto, por lo que el paso de clasificación con datos editables es obligatorio, no opcional.

**Préstamos**
- `loans` (dinero prestado por terceros para financiar la operación) — id, lender_name (prestamista), borrower_user_id → users (nullable, quién recibe el préstamo — puede ser la empresa en general), amount, currency (`PEN` | `USD`, solo en este módulo), interest_amount, interest_currency (`PEN` | `USD`), loan_date, due_date, status (`pendiente` | `pagado`), notes, created_by_user_id, created_at
  *(cubre tanto préstamos de terceros externos como deudas de tarjeta de crédito atribuidas a una persona — ej. "PRESTAMO MERVIS TDC")*

**Calculados (query/vista, no almacenados)**
- Total gastos, total abonos, ganancia, saldo pendiente por proyecto (y también a nivel empresa, agregando gastos/abonos sin proyecto).
- Gastos personales aún no cubiertos por reembolso = `expenses` con `payment_source='personal'` cuya suma de `reimbursement_items.amount_applied` < `expenses.amount`.
- Total a cobrar/descontar por cliente = suma de `billable_amount` agrupado por `billable_to_client_contact_id`.
- Préstamos pendientes de pago = `loans` con `status='pendiente'`.

**Patrón "persona" (usuario del sistema u opcional texto libre)** aplicado en `projects.responsible_*` y `expenses.paid_by_*`.

**Preparado para RRHH futuro:** `users` es genérico (solo auth); un futuro módulo de planillas/asistencia se conectaría vía `user_id` sin modificar este core.

## Escalabilidad (no construir todavía)

Diseñar el modelo de datos y la arquitectura pensando en que más adelante se agregará un módulo de gestión de personal (RRHH, planillas, asistencia). Dejar la arquitectura preparada para eso, pero el alcance actual NO incluye ese módulo.

## Identidad visual (brochure oficial 2026)

- Azul marino oscuro: `#070759`
- Azul medio: `#093e8c`
- Dorado / ámbar (acento): `#e2ab23`
- Fondos: blancos y grises claros
- Usar esta paleta en la UI del sistema.

## Entorno de desarrollo

- Windows nativo + Git Bash (mismo flujo que ya usan en VS Code). NO usar WSL.
- Repositorio en GitHub como parte del setup inicial.

## Stack tecnológico

- **Frontend:** Next.js + TypeScript + Tailwind CSS, con la paleta de marca de arriba.
- **Base de datos:** PostgreSQL en Amazon RDS (no Supabase) — administrado, con backups automáticos, fácil de exportar/migrar entre cuentas AWS.
- **Archivos** (fotos/PDF de facturas): Amazon S3.
- **Autenticación:** NextAuth.js contra la base Postgres (multiusuario, sin depender de Cognito).
- **Hosting:** AWS App Runner (despliega el contenedor de la app sin administrar servidores).
- **Infraestructura como código:** Terraform. Toda la infraestructura (RDS, S3, App Runner, IAM, etc.) debe quedar definida en Terraform para poder redesplegar el sistema completo en otra cuenta AWS ejecutando el mismo código.

## Plan de despliegue en fases

1. Desarrollo y pruebas en local (Docker Compose replicando Postgres/S3 localmente si es posible).
2. Despliegue de una instancia de prueba en la cuenta AWS propia, para que la empresa evalúe el sistema y pida ajustes iniciales.
3. Una vez aprobado, se crea una cuenta AWS para la empresa y se redespliega el sistema ahí, usando el mismo Terraform, con IAM de administrador entregado al cliente.

## Flujo de trabajo acordado

1. Crear el repositorio en GitHub.
2. Generar este CLAUDE.md con el contexto completo.
3. Proponer y validar con el usuario el modelo de datos (tablas y relaciones) antes de escribir cualquier código.
4. A partir de ahí, avanzar paso a paso, esperando confirmación del usuario después de cada paso antes de continuar con el siguiente.

## Sesión de despliegue local + hallazgos pendientes (2026-08-14)

### Flujo de trabajo acordado entre las dos computadoras

- **Desarrollo de código** (nuevas funciones, cambios que pida el cliente): se hace en la computadora de la oficina, con Claude Code, como hasta ahora. Se sube con `git push`.
- **Esta segunda computadora (Windows, Git Bash)**: se usa para alojar una demo accesible por internet para que el cliente pruebe. Stack: `docker compose up -d` (Postgres local puerto 5433 + MinIO puerto 9000/9001), `npm run build && npm run start` (puerto 3000), y `cloudflared tunnel --url http://localhost:3000` (Quick Tunnel, sin cuenta de Cloudflare, URL tipo `*.trycloudflare.com`, cambia cada vez que se reinicia cloudflared).
- Antes de trabajar en cualquiera de las dos computadoras: `git pull`. Después de terminar un cambio: `git push`. Nunca editar código en las dos a la vez sin sincronizar entre medio.
- Al llegar un cambio nuevo desde GitHub a esta computadora de demo: parar `npm run start` (Ctrl+C, sin tocar la terminal de cloudflared), `git pull`, `npm install`, si tocó `schema.prisma` correr `npx prisma generate && npx prisma migrate deploy` (no borra datos existentes), `npm run build`, `npm run start` de nuevo. El túnel de cloudflared no necesita reiniciarse — sigue apuntando al mismo puerto, así que la URL que ya tiene el cliente no cambia.

### Las dos bases de datos son independientes

Cada computadora tiene su propio Postgres local (Docker), sin sincronización automática. Si hay que mover datos de una a la otra, usar `pg_dump`/`psql` contra los contenedores de Docker de cada lado (pedirle a Claude el comando exacto cuando haga falta — depende del nombre del contenedor en cada máquina). La solución de fondo, ya prevista en la sección "Plan de despliegue en fases" de este mismo documento, es pasar a una única base de datos compartida (AWS RDS) en cuanto se avance a la fase 2.

### Proyecto real de referencia cargado en la demo local

Se cargó como demo el proyecto real **CIMENTACION / PAMOLSA** (cliente QROMA, contacto MARCO, responsable RAUL QUINTERO, línea de negocio Obras Civiles, orden S/ 33,827.88 + IGV S/ 6,089.02) usando un script puntual (`prisma/seed-pamolsa.ts`, no forma parte del seed principal). Los gastos y abonos de este proyecto se cargan a mano desde la interfaz, no por script.

### Hallazgos de funcionalidad al revisar los Excel reales de la empresa (GASTOS_E_INGRESOS_2026*.xlsx)

Se revisaron a fondo, además de la hoja "CIMENTACION PAMOLSA" (ya usada de ejemplo en el modelo de datos), las hojas: "Compras y gastos [MES]" (Febrero–Agosto), "Relación de gastos Mervis/Raul/Grelimar/Anggie", "Relación de préstamos", y varias hojas de proyectos reales adicionales ("OC 8070011577" / Monorriel y Pivot para QROMA, "MTTO PETAR en la Fábrica de Mondelez" para VIKINGO, dos hojas de "Suministro e instalación de polipasto" para QROMA). Pendiente evaluar y construir:

1. ~~**Módulo de préstamos (UI)**~~ — **RESUELTO.** `/prestamos-terceros` (préstamos de terceros, con ficha de prestamista — ver sección de 2026-08-20/22) y `/prestamos` (préstamos de personal) ya están construidos y probados.
2. ~~**Reporte / vista de "cuenta corriente" por persona**~~ — **RESUELTO** (2026-08-22): `/prestamos` ahora muestra, por persona, sus gastos pendientes, el saldo pendiente total y sus abonos recibidos — ver sección "Préstamos de personal: saldo pendiente y abonos por persona".
3. ~~**Gastos generales de la empresa sin proyecto asociado — falta pantalla de detalle**~~ — **RESUELTO**: `/gastos` (Gastos por mes) lista todos los gastos, con o sin proyecto, agrupados por mes.
4. **Multiproyecto**: confirmado con datos reales que la empresa maneja varios proyectos activos en paralelo para el mismo cliente (ej. dos suministros de polipasto distintos para QROMA) y para clientes distintos (QROMA, VIKINGO). El modelo de datos ya lo soporta sin cambios — no es una tarea pendiente, solo una confirmación.

Los hallazgos 1-3 fueron resueltos en sesiones posteriores (ambas computadoras). Ver "## Pendientes reales (actualizado 2026-08-22)" más abajo para la lista vigente de lo que falta.

## Pendientes reales (actualizado 2026-08-22)

- **Alertas por correo — pedido ampliado (2026-08-22): no es solo facturas, es notificaciones diarias/semanales de los `PendingTask` (Pendientes) por persona responsable.** Analizado con el usuario antes de tocar código, quedaron **dos decisiones en pausa** (el usuario las va a resolver y volvemos):
  - **Proveedor de correo**: todavía no elegido — el usuario va a estudiarlo (mencionó que probablemente arme su propio servidor de correo). No asumir Gmail/SES/otro hasta que confirme.
  - **Cómo vincular "Responsable" a un correo real**: hoy `PendingTask.responsibleName` es texto libre (`responsibleUserId` existe en el schema pero nunca se usa en ningún formulario ni en el importador de Excel — habría que revisar eso). El usuario "lo dejó anotado" sin decidir todavía si usar las mismas cuentas de Usuario reales que se van a crear para Raúl/Mervis/Anggie/Grelimar/Máximo (ver sección de préstamos de personal más arriba), o una lista aparte más liviana. **No arrancar la implementación de envío de correos hasta que esto se resuelva.**
  - **Sí construido ya** (no depende de ninguna de las dos decisiones de arriba, usa el dato que ya existe): filtro por responsable en `/pendientes` — `src/app/pendientes/ResponsableFilter.tsx` (client component, un `<select>` que arma la URL con `?responsable=Nombre`) + `src/app/pendientes/page.tsx` ahora lee `searchParams.responsable`, arma la lista de responsables distintos (`distinct: ["responsibleName"]`) y filtra ambas secciones (Proyectos / Gestión interna) por ese nombre.
- **`npm audit`**: 2 vulnerabilidades moderadas, 3 altas (paquetes de desarrollo) — pendiente de revisar, mejor hacerlo desde la otra computadora.
- ~~**Resiliencia del proceso en la demo** (PM2 o similar)~~ — **ya no hace falta**: el usuario va a migrar pronto a un despliegue real en AWS (ver "Plan de despliegue en fases"), donde este problema no aplica (no depende de que una terminal se quede abierta en una compu personal).
- **Despliegue a un servidor real** (AWS RDS + S3 + App Runner + Terraform) — el usuario mencionó que lo van a montar pronto. Todavía no arrancado.
- **App móvil / PWA**: el usuario preguntó si es posible, quedó pendiente sin fecha ("lo dejamos pendiente").
- ~~**Capturas de pantalla para la página web profesional**~~ — **resuelto**, el usuario ya las tiene.
- ~~**BUG: en "Mis facturas pendientes" (`/capturas`) se podía confirmar una factura sin elegir proyecto y quedaba "perdida" como gasto general.**~~ — **resuelto 2026-08-27**, ver sección más abajo.

## Comprobantes al registrar/editar un gasto a mano + descarga mensual para contadores (2026-08-20)

Hasta ahora `ExpenseAttachment` solo se creaba desde la captura por OCR (`/capturas`, `classifyCaptureAction`). El usuario pidió poder adjuntar el comprobante (foto/PDF) también al registrar un gasto **manualmente** en un proyecto o al editarlo, y una forma de bajar todos los comprobantes de un mes para mandárselos a los contadores. Implementado en esta sesión (computadora de demo, sin acceso a la computadora de la oficina en ese momento — cambios hechos directamente ahí y sincronizados por git, no fue necesaria ninguna migración de schema porque `ExpenseAttachment`/`attachments` ya existían):

- **`src/lib/s3.ts`**: se agregaron dos funciones reutilizables — `extensionForContentType(contentType)` (ya existía duplicada como función local en `capturas/actions.ts`, ahora también exportada desde acá para los nuevos casos de uso; `capturas/actions.ts` no se tocó, sigue con su propia copia) y `downloadFileBuffer(fileKey)` (baja el archivo completo desde S3/MinIO como `Buffer`, para armar el .zip mensual — distinto de `getFileSignedUrl`, que solo da una URL temporal para mostrar/enlazar).
- **Adjuntar al crear un gasto**: `src/app/proyectos/[id]/actions.ts` (`addExpenseAction`) ahora lee un campo `file` opcional del formulario, lo sube con `uploadReceiptFile` y crea el `Expense` con un `ExpenseAttachment` anidado (mismo patrón que `classifyCaptureAction`). El formulario inline "Agregar gasto" en `src/app/proyectos/[id]/page.tsx` tiene un `<input type="file" name="file">` nuevo.
- **Adjuntar al editar un gasto**: `src/app/gastos/actions.ts` (`updateExpenseAction`) igual, pero **agrega** el adjunto nuevo sin borrar los que ya tenía (un gasto puede terminar con más de un comprobante). `src/app/gastos/[id]/editar/page.tsx` muestra los comprobantes ya adjuntos (links "Ver comprobante") y tiene el mismo input de archivo para sumar uno más.
- **"Ver comprobante" en las tablas de gastos**: se agregó a `src/app/proyectos/[id]/page.tsx` (registro de gastos del proyecto) y `src/app/gastos/page.tsx` (listado general por mes) — ambos ahora incluyen `attachments` en la consulta Prisma y generan un link firmado (`getFileSignedUrl`) del primer adjunto de cada gasto.
- **Descarga mensual para contadores**: botón nuevo en `/panel` (sección "Comprobantes para contabilidad", solo visible para OWNER porque toda la página lo es), con un `<input type="month">` y un submit `GET` directo a la nueva ruta `src/app/api/comprobantes/route.ts`. Esa ruta arma un `.zip` (librería `archiver`, agregada a `package.json` — **hace falta `npm install`** después de este pull) con todos los comprobantes de `Expense` cuya `date` cae en el mes elegido, de **todos** los proyectos + gastos generales, organizados en carpetas por nombre de proyecto dentro del zip (carpeta "Generales" para los que no tienen proyecto). Devuelve 403 si no es OWNER, 400 si el periodo es inválido, 404 si no hay comprobantes ese mes.
- Alcance decidido explícitamente por el usuario entre 3 opciones (general desde Panel / por proyecto / ambas): **general desde Panel**, no se construyó una versión por proyecto.

## Prestamistas: relación consolidada de préstamos (2026-08-20)

El usuario pidió que en "Préstamos de terceros" se pueda crear un prestamista una sola vez y agregarle varios préstamos a lo largo del tiempo, viendo en un solo lugar todos sus préstamos, sus abonos y su saldo total pendiente. **Aclaración importante**: el usuario mencionó "2 modalidades de préstamos" — la segunda modalidad (préstamos de personal / adelantos, hoy en `/prestamos`, separado de terceros) **ya estaba construida** en la otra computadora (commits `976faa0` y `75995d7`), no hizo falta tocarla. Esta sesión solo trabajó sobre "Préstamos de terceros".

**Modelo de datos — nuevo `Lender` (prestamista):**
- `lenders` — id, name, phone (opcional), notes (opcional), created_at.
- `loans.lender_id` (nuevo, FK a `lenders`, **nullable**) — la relación real. `loans.lender_name` (el campo de texto libre que ya existía) se mantiene sin cambios de tipo, y ahora se llena automáticamente con `lender.name` al crear un préstamo desde la ficha de un prestamista — queda como copia de respaldo/legado, ya no se edita a mano desde el formulario.
- **Migración pensada para no arriesgar datos existentes**: `lender_id` se agregó nullable (aditivo, sin riesgo) y hay un script puntual `prisma/backfill-lenders.ts` (mismo patrón que `seed-pamolsa.ts`) que crea un `Lender` por cada `lenderName` distinto que ya existiera en préstamos viejos y les asigna el `lenderId` correspondiente — se corre una sola vez después de la migración (`npx tsx prisma/backfill-lenders.ts`), no borra nada. La pantalla de lista (`/prestamos-terceros`) avisa si queda algún préstamo sin prestamista asignado (no debería pasar si se corrió el backfill).

**Rutas reorganizadas** (antes `/prestamos-terceros/[id]` era el detalle de UN préstamo; ahora `[id]` es el `lenderId`):
- `/prestamos-terceros` — lista de prestamistas (antes era lista de préstamos individuales), con saldo total pendiente por moneda y cantidad de préstamos.
- `/prestamos-terceros/nuevo` — crear un prestamista (antes era "crear préstamo"; ese formulario se movió).
- `/prestamos-terceros/[id]` — ficha del prestamista: totales por moneda (prestado/abonado/saldo) y tabla de todos sus préstamos, cada uno con su saldo y link a su propia ficha. **Los abonos de cada préstamo NO se muestran mezclados acá** — cada préstamo mantiene su propio "Registro de abonos" en su ficha individual, tal como está documentado en la guía de usuario del sistema (`Guia_Sistema_Gestion_Ingenium.pdf`, sección 5). Una primera versión de esta pantalla juntaba los abonos de todos los préstamos en una sola tabla acá; se sacó porque no era lo que el usuario pedía.
- `/prestamos-terceros/[id]/prestamos/nuevo` — crear un préstamo nuevo para ese prestamista (`LoanForm.tsx` ya no tiene el campo "Prestamista" de texto libre, se quitó porque ahora el prestamista viene fijo de la URL).
- `/prestamos-terceros/[id]/prestamos/[loanId]` y `.../editar` — detalle/edición de un préstamo puntual (contenido igual al que había antes en `/prestamos-terceros/[id]` y `/prestamos-terceros/[id]/editar`, solo movido de lugar).
- El archivo viejo `src/app/prestamos-terceros/[id]/editar/page.tsx` se eliminó (`git rm`) porque quedó en conflicto de rutas con el nuevo esquema.

No se tocó `/prestamos` (préstamos de personal/adelantos) ni ningún otro módulo en esa sesión — sí se tocó después, ver siguiente sección.

## Préstamos de personal: saldo pendiente y abonos por persona (2026-08-22)

El usuario pidió que, al registrar un gasto, se pueda elegir entre "todas las personas que hacen compras o gastos" (Raúl, Mervis, Anggie, Grelimar, Máximo) con opción de agregar más, que cada gasto personal se sume automático a esa persona en `/prestamos`, y que ahí mismo se vea la relación de abonos hechos a su favor y el saldo pendiente final.

**Revisado antes de tocar código — ya funcionaba solo:** en cuanto un gasto se registra con `payment_source = PERSONAL` y un `paidByUserId`/`paidByName`, ya aparece agrupado automáticamente en `/prestamos` (no hizo falta ningún cambio para esto).

**Decisión del usuario sobre cómo agregar personas:** se le preguntó si Raúl/Mervis/Anggie/Grelimar/Máximo debían ser usuarios reales del sistema (con correo/contraseña, vía la pantalla "Usuarios" que ya existe) o una ficha liviana sin acceso (como se hizo con `Lender`/prestamista). **Eligió usuarios reales** — no hizo falta ningún cambio de código para esto, el usuario los crea él mismo desde `/usuarios/nuevo`. Ventaja adicional (no pedida explícitamente pero relevante): al ser usuarios reales con rol `RESPONSABLE`, después pueden entrar ellos mismos desde su celular a capturar facturas y registrar sus propios gastos, en vez de que el OWNER les cargue todo a mano.

**Lo que sí se construyó:**
- `src/app/prestamos/page.tsx`: ahora calcula `pendingTotal` (saldo pendiente) por persona, y trae TODOS los `Reimbursement` (antes solo traía los últimos 10, globales) y los reparte dentro de cada grupo por `paidToUserId`/`paidToName` — ya no hay una lista global mezclada de "Pagos recientes".
- `src/app/prestamos/PendingExpensesGroup.tsx`: ahora muestra un badge "Saldo pendiente: S/. X" en el encabezado de la tarjeta de cada persona, y una sección "Abonos realizados" con los pagos hechos a esa persona específica (fecha, nota, monto) — antes no existía esta lista por persona.
- No se tocó el modelo de datos ni las acciones (`createReimbursementAction`) — el cálculo de saldo pendiente ya existía por gasto, solo faltaba sumarlo y mostrarlo, y filtrar los abonos por persona en vez de mostrar los últimos 10 de todos.

## Revisión cruzada (otra computadora → esta) + dos arreglos (2026-08-27)

Se revisaron los 5 commits hechos en la otra computadora (comprobantes+zip para contadores, ficha de prestamista/`Lender`, saldo por persona en préstamos de personal, filtro por responsable en Pendientes). Se aplicó la migración pendiente (`add_lender_model`) + `prisma generate` + `prisma/backfill-lenders.ts` en esta máquina, se corrió `next build` completo (compila y tipa limpio) y se probaron a mano los flujos nuevos (crear prestamista → préstamo → abono, filtro de Pendientes, subir comprobante + descarga del zip mensual con validación de `periodo`). Todo funcionaba. Se encontraron y corrigieron dos cosas:

- **Regresión real en `/prestamos` (Préstamos de personal): a alguien ya reembolsado por completo se le desaparecía el historial de abonos de la pantalla.** El commit del 2026-08-22 (ver sección de arriba) armaba la tarjeta de cada persona solo si tenía algún gasto con `pending > 0.01`; los `Reimbursement` de gente ya sin saldo pendiente no encontraban tarjeta donde mostrarse (`if (!group) continue`) y quedaban invisibles en la UI (aunque seguían en la base de datos). **Arreglado**: `src/app/prestamos/page.tsx` ahora crea la tarjeta también al recorrer los reembolsos si todavía no existía, con `pendingTotal: 0` y sin gastos. `PendingExpensesGroup.tsx` ya no muestra el formulario de "seleccionar gastos y registrar pago" cuando no hay gastos pendientes — en su lugar un texto simple ("No tiene gastos pendientes de devolver ahora mismo") seguido igual de "Abonos realizados". Probado creando un gasto personal, reembolsándolo por completo, y confirmando que la persona sigue apareciendo con su historial. Dato de prueba limpiado.
- **BUG de `/capturas` (anotado el 2026-08-27, corregido el mismo día a pedido del usuario):** se agregó `<option value="" disabled>Elegí un proyecto...</option>` como placeholder + `required` en el `<select name="projectId">` (`src/app/capturas/page.tsx`), y "Sin proyecto (general)" pasó a un valor explícito `"GENERAL"` en vez de `""`. `classifyCaptureAction` (`src/app/capturas/actions.ts`) ahora rechaza con error si `projectId` llega vacío (defensa por si algún cliente sin JS evade la validación del navegador) y trata `"GENERAL"` como `null` (gasto general) solo cuando se elige a propósito. Probado en el navegador: confirmar sin tocar el selector queda bloqueado por el navegador (no crea nada); eligiendo "Sin proyecto (general)" explícitamente sí crea el gasto general como antes. Captura y gasto de prueba limpiados.

## Préstamos de terceros: tasa de interés → "Total a pagar" (2026-08-28)

El usuario pidió (y corrigió explícitamente que era en **Préstamos de terceros**, no en "Préstamos" de personal): poder colocar el porcentaje al que le están prestando el dinero, y que el sistema refleje el monto prestado más ese porcentaje para saber cuánto tiene que pagar en total.

**Modelo de datos** — se agregó a `Loan` (migración `20260828141715_loan_interest_rate`): `interestRate` (`Decimal(6,3)`, opcional, el porcentaje ej. `15` = 15%). El campo `interestAmount` que ya existía **se mantiene** y sigue siendo la fuente de verdad para todo el resto del sistema (saldo pendiente, totales por moneda, etc.) — cuando se da una tasa, `interestAmount` se recalcula a partir de ella (`amount * tasa/100`) y se guarda igual que antes, así no hizo falta tocar ningún cálculo existente que ya sumaba `interestAmount`, solo agregar el campo de tasa como otra forma de cargarlo.

**Cálculo en dos capas** (mismo patrón que `OrderAmountFields.tsx` con el IGV): `src/app/prestamos-terceros/LoanAmountFields.tsx` (nuevo, `"use client"`) muestra en vivo "Interés calculado" y "Total a pagar" mientras se escribe, pero **el servidor nunca confía en ese cálculo** — `parseLoanFields()` en `src/app/prestamos-terceros/actions.ts` recalcula `interestAmount` desde `interestRate` y `amount` de forma independiente antes de guardar. Como parte de este cambio se simplificó el formulario: antes había selectores de moneda separados para el interés y la comisión del banco; ahora ambos quedan forzados (`<input type="hidden">`) a la misma moneda que el préstamo, porque "Total a pagar" solo tiene sentido como una sola cifra cuando todo está en la misma moneda.

**"Total a pagar" y saldo pendiente recalculados en los 3 lugares donde se mostraba el monto/saldo del préstamo** (`/prestamos-terceros/[id]/prestamos/[loanId]`, la ficha del prestamista `/prestamos-terceros/[id]`, y la lista `/prestamos-terceros`): `total a pagar = monto prestado + interés + comisión del banco`, sumando interés/comisión solo cuando están en la misma moneda que el préstamo (si alguna vez quedan en otra moneda — préstamos viejos — se ignoran en la suma y se avisa con una nota, mismo patrón que ya existía para abonos en otra moneda). `saldo pendiente = total a pagar - abonado`, antes era `monto prestado - abonado`.

**Compatibilidad con préstamos viejos** (que tienen `interestAmount` fijo pero nunca tuvieron una tasa guardada): la página de editar (`.../[loanId]/editar/page.tsx`) calcula una "tasa implícita" (`interestAmount / amount * 100`) para precargar el campo la primera vez que se edita un préstamo viejo; de ahí en adelante la tasa queda guardada y es la fuente de verdad.

Probado en el navegador con un préstamo de prueba (S/. 2,000 al 15% + S/. 4.80 de comisión = S/. 2,304.80 de total a pagar; tras un abono de S/. 1,000, saldo pendiente S/. 1,304.80 consistente en las 3 pantallas) y verificando que la página de editar precarga la tasa (`15`) correctamente. Prestamista, préstamo y abono de prueba limpiados.

## Módulo nuevo: Cotizaciones (2026-08-28)

El usuario compartió `COTIZACIONES QROMA.xlsx`, la hoja donde llevaban el control de cotizaciones enviadas a QROMA (columnas: N° correlativo, Usuario/contacto del cliente, N° de cotización tipo "ISS-021-2026", Proyecto, Monto sin IGV, Monto total, Estatus en texto libre) y pidió agregar ese control al sistema. Se analizó el archivo real con `exceljs` antes de diseñar nada (9 filas de datos, montos en formato peruano "S/ 46,373.25" como texto, no como celda numérica).

**Decisiones acordadas con el usuario antes de construir** (`AskUserQuestion`):
- **Genérico para varios clientes**, no solo QROMA — el usuario ya tiene hojas de otras empresas.
- **Etapa fija + notas**, no texto libre: el "Estatus" de la hoja mezclaba una etapa (enviado/en evaluación/OC recibida) con detalles puntuales (N° de OC, si falta un HES) — se separó en un campo de etapa fijo (`QuoteStage`: `ENVIADA`, `EN_EVALUACION`, `OC_RECIBIDA`, `PAGADA`, `RECHAZADA`) más un campo de notas libre para el detalle.
- **Tabla vacía para empezar**, pero con función de importar: el usuario va a cargar esta tabla y las de otras empresas él mismo desde el sistema cuando esté en producción — no se pre-cargaron los 9 registros de QROMA.

**Modelo de datos — `Quote`** (`prisma/schema.prisma`, migración `20260828152309_add_quote_model`): `clientName` es texto libre (mismo criterio que `Lender.name`) para no obligar a tener un `Client` formal antes de poder registrar una cotización. `code` es el N° de cotización de la empresa (ej. "ISS-021-2026"); el N° correlativo de la hoja (con huecos, claramente solo un contador manual) **no se guarda** — no aportaba información real. `amountNoIgv` + `igvAmount` se guardan por separado (mismo patrón que `Project.orderAmountNoIgv`/`igvAmount`), el total se calcula sumando en cada pantalla.

**Rutas**: `/cotizaciones` (lista con filtro por cliente, tarjetas de totales — cotizado, sin IGV, total, "ganadas" = OC recibida + pagada), `/cotizaciones/nueva`, `/cotizaciones/[id]/editar` (con botón Eliminar), `/cotizaciones/importar` (sube un `.xlsx`, previsualiza, confirma — mismo patrón de dos pasos que `/pendientes/importar` y `/proyectos/importar`, nada se guarda hasta confirmar). Todo OWNER-only, como Pendientes y Préstamos de terceros. Cálculo de IGV en vivo (`QuoteAmountFields.tsx`) igual que `OrderAmountFields.tsx`/`LoanAmountFields.tsx` — cliente muestra el cálculo, servidor lo recalcula siempre antes de guardar.

**Importador** (`/cotizaciones/importar/actions.ts`): busca hojas cuyo nombre incluya "COTIZA" (para soportar un archivo por cliente, ej. "COTIZACIONES PAMOLSA"); el nombre del cliente se saca del nombre de la hoja quitando la palabra "COTIZACIONES". Los montos vienen como texto con formato peruano ("S/ 46,373.25"), así que se limpia el texto (quita símbolos, quita comas de miles) en vez de usar `Number()` directo. La etapa se **adivina** a partir del texto del Estatus (ej. contiene "OC " → OC recibida, contiene "EVALUA" → en evaluación) solo como punto de partida — el texto completo del Estatus siempre queda guardado en Notas sin perder nada, y la UI avisa que hay que revisar la etapa después de importar porque el texto real varía mucho de fila a fila.

**Verificado**: creación/edición/eliminación manual probada en el navegador end-to-end. El parseo se verificó corriendo la misma lógica contra el archivo real `COTIZACIONES QROMA.xlsx` (fuera del navegador, porque este entorno no tiene forma de manejar el selector nativo de archivos): las 9 filas parsearon con los montos exactos del Excel (ej. S/ 46,373.25 → 54,720.44 total), cliente "QROMA" bien extraído del nombre de la hoja, y códigos/contactos/etapas correctos. El guardado en base de datos (`importQuotesAction`) se probó por separado insertando esas mismas filas parseadas y confirmando que se ven bien en `/cotizaciones` (montos, notas, filtro por cliente). Subir el archivo real y confirmar la importación desde la pantalla queda pendiente para cuando el usuario lo haga él mismo, tal como pidió. Datos de prueba limpiados.

## Módulo nuevo: Facturación, ligada a cada proyecto (2026-08-28)

El usuario compartió `Relacion de Ordenes.xlsx` — la hoja donde llevan, a fin de mes, el estatus de facturación de cada orden de compra (colores: verde = ya pagado, amarillo = pendiente de pago, azul = todavía sin factura ingresada) y pidió pensar cómo incorporarlo a la ficha de cada proyecto. **Se analizó el archivo (incluyendo el color real de las celdas) antes de tocar código, y se presentó el análisis al usuario sin construir nada todavía**, tal como pidió explícitamente ("antes de ejecutar nada").

**Hallazgo clave del análisis**: el color de cada fila no es un dato aparte — es 100% deducible de 3 columnas que ya existían en la hoja (`SOLICITUD DE PARTE HES`, `HES`, `PAGARON`). También se confirmó por qué cuadraban los montos: "MONTO NETO"/"MONTO IGV" siguen el 18% de siempre, y la columna "DETRACCIÓN BN 12%" es exactamente 12% del total (neto+IGV) — el sistema peruano de detracciones. Había una tercera columna sin encabezado claro ("0.06") que resultó ser matemáticamente IGV − detracción, un residual sin significado propio — **no se modeló**, se lo mostró como hallazgo al usuario.

**Decisiones acordadas con el usuario antes de construir** (`AskUserQuestion`, las 4 recomendadas):
- **Ficha del proyecto + lista global** `/facturacion` (no solo la ficha) — porque el uso real es "a fin de mes ver el estatus general", igual que se hizo con Cotizaciones.
- **Proyecto opcional con aviso** (mismo patrón que `Expense`/`Income`/el huérfano de `Lender`) — para poder importar filas sin identificar a qué proyecto pertenecen todavía, y que el sistema avise cuántas quedan sin asignar.
- **Detracción editable por fila** (default 12%, mismo patrón que `Loan.interestRate`) — no todos los servicios tienen la misma tasa.
- **3 estados alcanzan**, calculados siempre a partir de `hesRequested`/`hesReceived`/`paid` (nunca guardados como campo aparte, para que no se puedan desincronizar) — ver `src/app/facturacion/status.ts`.

**Modelo de datos — `Invoice`** (`prisma/schema.prisma`, migración `20260828155011_add_invoice_model`): `projectId` opcional; `purchaseOrderNumber`, `quoteCode`, `solicitantName`, `description` como texto libre; `hesRequested`/`hesRequestedDate`, `hesReceived`, `paid`/`paidDate` (booleans + fecha, la fuente de verdad del estado); `amountNet` + `igvAmount` (mismo patrón de siempre) + `detractionPercent` (`Decimal(5,4)`, default `0.12`).

**Rutas**: `/facturacion` (lista global, filtro por proyecto y por estado, tarjetas de totales por estado, avisa cuántas facturas quedan sin proyecto), `/facturacion/nueva`, `/facturacion/[id]/editar` (con Eliminar, redirige a la ficha del proyecto si tiene uno asignado), `/facturacion/importar` (mismo patrón de dos pasos que Cotizaciones/Pendientes). Todo OWNER-only. Dentro de `/proyectos/[id]`, se agregó una sección "Facturación (órdenes/valorizaciones)" con tabla + un formulario inline corto para agregar rápido (descripción, OC, N° cotización, monto neto) — mismo patrón que las secciones de Gastos/Abonos que ya existían ahí; el detalle completo (HES, detracción, fechas) se completa después desde "Editar".

**Bug encontrado y corregido durante la verificación del importador**: la detección de columnas confundía "SOLICITUD DE PARTE HES" (booleano SI/NO) con "FECHA DE SOLICITUD DE HES" (fecha), porque ambos encabezados contienen las palabras "SOLICITUD" y "HES" — la columna de fecha pisaba a la de texto. Se corrigió excluyendo explícitamente los encabezados que contienen "FECHA" al detectar la columna booleana.

**Verificado**: alta/edición end-to-end en el navegador (agregado inline desde la ficha del proyecto, marcado como HES recibido + pagado desde "Editar", el estado pasó de "Sin factura" a "Pagado" correctamente en la ficha y en `/facturacion`). El parseo del importador se corrió contra el archivo real `Relacion de Ordenes.xlsx` (7 filas de datos): tras corregir el bug de arriba, las 7 filas parsearon con montos, fechas y booleanos exactos, y la tasa de detracción retro-calculada dio 12% en las 7 (coincide con el hallazgo del análisis). El guardado en base de datos se probó insertando esas filas parseadas sin proyecto asignado y confirmando que aparece el aviso de "facturas sin proyecto" y el filtro correspondiente en `/facturacion`. Subir el archivo real desde la pantalla queda para cuando el usuario lo haga. Datos de prueba limpiados.
