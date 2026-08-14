# CLAUDE.md — Sistema de Gestión de Proyectos Ingenium Service SAC

Este archivo es el contexto persistente del proyecto para Claude Code. Léelo antes de trabajar en cualquier tarea de este repositorio.

## Estado del proyecto

Scaffolding inicial completo: Next.js (TypeScript + Tailwind, App Router) + Prisma con el schema del modelo de datos validado, migrado contra Postgres local. Autenticación con Auth.js v5 (Credentials contra la tabla `users`, sesión JWT con id/role, login/logout, rutas protegidas vía `src/proxy.ts`) implementada y verificada. Seed (`prisma/seed.ts`, vía `npx prisma db seed`) crea las 5 líneas de negocio y el usuario OWNER real (credenciales en `.env`, no en el código — ver `SEED_OWNER_*`). Siguiente paso: primera pantalla de proyecto.

**Nota Prisma 7:** el cliente requiere un driver adapter explícito (`@prisma/adapter-pg`), ya no basta con `DATABASE_URL` en el datasource — ver `src/lib/prisma.ts`.
**Nota Next.js 16:** el archivo de middleware se llama `proxy.ts`, no `middleware.ts` (convención renombrada en esta versión).

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
