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

#### 💰 Precios de Lanzamiento (vigentes 6 meses desde hoy)

| Plan    | Mensual   | Anual      |
|---------|-----------|------------|
| PRO     | .500    | .000    |
| Premium | .000    | .000    |

> Pasados 6 meses, los precios pasan a: PRO .000/mes – .000/año | Premium .500/mes – .000/año.

#### 🔄 Toggle Mensual / Anual en Suscripción

- `src/pages/Suscripcion.jsx`: Se agregó selector de ciclo de facturación (mensual/anual) con el ahorro calculado automáticamente.
- `src/pages/Landing.jsx`: Cards de precios actualizadas con precios de lanzamiento reales y badge "Precio de Lanzamiento".

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

- commit: feat: Panel de Duena AdminDashboard, selector mensual/anual, modo solo lectura y logica VIP
- 4 files changed, 429 insertions(+)
- create mode 100644 src/pages/AdminDashboard.jsx

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
