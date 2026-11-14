# 📚 Agenda Docente PRO — Frontend

**Stack:** React + Vite | **Deploy:** Vercel  
**Repositorio Backend:** [agendadocentebackPRO](https://github.com/NatyJoseDie/agendadocentebackPRO)

---

## 🗂️ Descripción General

Aplicación web para docentes que permite gestionar asistencias, alumnos, escuelas, informes y suscripciones con distintos niveles de plan (Gratuito, PRO, Premium).

---

## 🚀 Historial de Desarrollo

---

### 📅 29 de Octubre de 2026

#### 💳 Integración con Mercado Pago

- Se configuró la aplicación de Mercado Pago con el Access Token de producción.
- Se actualizó `src/services/api.js` agregando `PagosAPI` y `AdminAPI`:
  - `PagosAPI.crearPreferencia(plan, ciclo)` → crea link de pago en MP.
  - `PagosAPI.getEstado()` → consulta plan activo del docente.
  - `AdminAPI.getMetricas()` → métricas completas del negocio (solo Natalia).
  - `AdminAPI.modificarDocente(id, plan, dias)` → super poderes de admin.

#### 💰 Precios (editables desde el Panel de Dueña)

Los precios **no están hardcodeados en el frontend**: se leen de `GET /api/pagos/planes`
(`PlanesAPI.getPlanes()`) y se editan en `/admin` → sección "💰 Precios" (`PUT /api/admin/precios`).
Valores cargados al lanzar:

| Plan    | Mensual (promo → normal) | Ciclo lectivo (promo → normal) |
|---------|--------------------------|--------------------------------|
| PRO     | $3.500 → $4.500          | $15.000 → $36.000              |
| Premium | $5.000 → $5.500          | $24.000 → $44.000              |

> La promo de lanzamiento vale hasta el 29/04/2027; después rige el precio normal.

#### 📅 Ciclos de pago

- **Mensual:** 30 días desde la acreditación.
- **Ciclo lectivo (feb–dic):** vence el 31/12. Si se paga entre octubre y diciembre, cubre hasta el 31/12 del año siguiente.

#### 📦 Límites por plan

| Plan     | Escuelas | Cursos | OCR con IA            | Backups automáticos | Soporte     |
|----------|----------|--------|-----------------------|---------------------|-------------|
| Gratuito | 1        | 2      | No                    | Sí                  | Estándar    |
| PRO      | 6        | 10     | Hasta 5 cursos        | Sí                  | WhatsApp    |
| Premium  | Sin límite | Sin límite | Sin límite      | Sí                  | Prioritario |

Las VIP beta (`is_vip_beta`) cuentan como Premium.

#### 🔄 Toggle Mensual / Ciclo lectivo en Suscripción

- `src/pages/Suscripcion.jsx`: selector de ciclo (`mensual` / `ciclo_lectivo`) con precios del backend, precio tachado y "Promo hasta" cuando hay promoción.
- `src/pages/Landing.jsx`: tarjetas Gratuito / PRO / Premium con precios dinámicos y límites reales.

#### 🔒 Modo Solo Lectura (Soft-Lock)

- `src/constants/plans.js`: Se actualizó `getSubscriptionStatus()` para manejar los estados:
  - `vip_beta` → trial activo con más de 30 días restantes.
  - `read_only` → trial vencido, 30 días de gracia para ver datos pero no modificar.
  - `expired` → cuenta completamente vencida, datos archivados.

- `src/pages/Dashboard.jsx`: Se agregó banner de aviso según estado de la cuenta.

#### 👑 Panel Administrativo (Solo para Natalia)

- `src/pages/AdminDashboard.jsx` (NUEVO - 338 líneas):
  - Métricas en tiempo real: Facturación total, docentes totales, VIP activos, distribución de planes.
  - Tabla de docentes con nombre, email, fecha de registro, plan, estado y días restantes.
  - Super Poderes: Botón "Pasar a Premium 1 año" y "Regalar 30 días" por docente.
  - Historial de pagos de Mercado Pago.
  - Buscador por nombre o email.
  - Seguridad: Redirige a /dashboard si el email no es el de la administradora.

- `src/App.jsx`: Se agregó la ruta /admin montando AdminDashboard.
- Botón 👑 Panel de Control (Dueña) visible solo para nbarzotti6@gmail.com.

#### 🔁 Git Push — Deploy automático a Vercel

- commit: feat: Panel de Duena AdminDashboard, selector de ciclo, modo solo lectura y logica VIP
- 4 files changed, 429 insertions(+)
- create mode 100644 src/pages/AdminDashboard.jsx

### 📅 9 de Noviembre de 2026 — Centro de notificaciones y Web Push

- Se agregó el centro de notificaciones autenticado en la navegación inferior, con
  carga, contador de no leídas, reintento y marcado como leída.
- Desde la configuración del Dashboard se puede activar Push explícitamente. El
  permiso solo se solicita después de elegir la acción; si el navegador no lo admite
  o se deniega, la agenda sigue disponible.
- La clave pública VAPID se obtiene del backend. La suscripción se registra con la
  sesión vigente de Supabase; no se incluye una clave privada en el frontend.
- Al desactivar Push o cerrar sesión se intenta desuscribir el dispositivo y se
  notifica la baja al backend antes de cerrar la sesión. No se eliminan dispositivos
  asociados a otras cuentas.
- El service worker maneja la recepción y el clic en los avisos; los destinos se
  limitan al mismo origen y la caché queda limitada a recursos públicos estáticos.
- En iPhone/iPad puede ser necesario instalar la web en la pantalla de inicio y abrir
  la app instalada.
- **Pendiente:** probar el flujo autenticado de activación, entrega, navegación y baja
  en HTTPS con dispositivos de prueba, incluido iOS.

### 📅 Noviembre de 2026 — Precios dinámicos, ciclo lectivo, límites y notificaciones

- Precios dinámicos desde backend (`GET /api/pagos/planes`, admin `GET/PUT /api/admin/precios`) con promo/precio vigente y recordatorio de ajuste.
- Ciclo de cobro `ciclo_lectivo` (feb–dic, vence 31/12; regla especial oct–dic cubre hasta 31/12 del año siguiente) y selector Mensual / Ciclo lectivo.
- Límites por plan en front: Gratuito 1 escuela/2 cursos sin OCR; PRO 6/10 con OCR en 5 cursos; Premium sin límite. VIP beta como Premium. Modal de límite (incluye 42501) con acceso a `/suscripcion`.
- OCR envía `curso_id` y Bearer; errores del backend (incl. `OCR_PLAN_REQUIRED`, `OCR_CURSOS_LIMIT`) se muestran en el modal con acceso a planes.
- Panel de dueña: sección **💰 Precios** editable. Campanita de notificaciones en Dashboard con soporte para `ajuste_precios`.

---

## 👩‍💻 Administradora / Fundadora

- Email: nbarzotti6@gmail.com
- Plan: Founder (lifetime Premium, sin vencimiento)
- Acceso especial: Ruta /admin con métricas y gestión de usuarios.

---

## 📌 Pendientes / Próximos Pasos

- [ ] Probar pago real con Mercado Pago en producción.
- [ ] Configurar avisos automáticos por email/WhatsApp (días 120, 140, 150 del VIP).
- [ ] Invitar a los 10 docentes beta pioneros.
- [ ] Verificar webhook de MP en Render con URL pública.
