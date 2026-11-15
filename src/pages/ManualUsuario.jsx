import React from 'react';

export default function ManualUsuario() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0b1020 0%, #0c1727 20%, #050b13 100%)',
      color: '#edf6ff',
      padding: '56px 24px 80px'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(168,85,247,0.12))',
          border: '1px solid rgba(148,163,184,0.18)',
          borderRadius: '28px',
          padding: '30px 32px',
          marginBottom: '28px',
          boxShadow: '0 24px 52px rgba(15, 23, 42, 0.45)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{
              width: '62px',
              height: '62px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 16px 28px rgba(124, 58, 237, 0.35)'
            }}>
              📔
            </div>
            <div>
              <p style={{ margin: 0, color: '#93c5fd', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                Agenda Docente
              </p>
              <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(2.2rem, 4vw, 3.6rem)', fontWeight: 900, letterSpacing: '-0.05em' }}>
                Manual del Usuario
              </h1>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: '28px',
          padding: '28px 32px 20px',
          boxShadow: '0 24px 52px rgba(15, 23, 42, 0.48)'
        }}>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#dfeaff', marginTop: 0 }}>
            ¡Bienvenido a tu nueva Agenda Docente Digital! Este manual te ayudará a dar tus primeros pasos en la plataforma diseñada para simplificar tu labor educativa.
          </p>

          <section style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '1.7rem', marginBottom: '10px', color: '#f8fbff' }}>🏛️ 1. Gestión de Escuelas</h2>
            <p style={{ color: '#dfeaff', lineHeight: 1.8 }}>Tu agenda se organiza por instituciones. Lo primero que debés hacer es cargar tus escuelas:</p>
            <ul style={{ color: '#dfeaff', lineHeight: 1.95, paddingLeft: '20px' }}>
              <li><strong>Crear Escuela:</strong> En el Dashboard principal, hacé clic en el botón <strong>+</strong>. Completá el nombre, número de escuela y dirección.</li>
              <li><strong>Geolocalización:</strong> El sistema detectará automáticamente tu ubicación al cargar una escuela nueva para asistirte con el mapa.</li>
              <li><strong>Acceso Rápido:</strong> Las escuelas cargadas aparecerán como <strong>Etiquetas (Tabs)</strong> en la parte superior del Dashboard para que saltes de una a otra con un solo clic.</li>
            </ul>
          </section>

          <section style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '1.7rem', marginBottom: '10px', color: '#f8fbff' }}>🏫 2. Configuración de Cursos y Roles</h2>
            <ul style={{ color: '#dfeaff', lineHeight: 1.95, paddingLeft: '20px' }}>
              <li><strong>Agregar Curso/Rol:</strong> Entrá a una escuela y hacé clic en <strong>+ Nuevo Curso</strong>.</li>
              <li><strong>Datos del Curso:</strong> Indicá el Año/Grado, División, Turno y la Materia (ej: Construcción de la Ciudadanía).</li>
              <li><strong>Horarios:</strong> Seleccioná los días y el rango horario en que dictás clases. Se guardarán automáticamente en tu cronograma.</li>
              <li><strong>Acceso:</strong> Cada curso aparecerá como una <strong>Tarjeta (Card)</strong> con su información resumida. Tocala para entrar al panel del curso.</li>
            </ul>
          </section>

          <section style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '1.7rem', marginBottom: '10px', color: '#f8fbff' }}>👥 3. Nómina de Alumnos</h2>
            <ul style={{ color: '#dfeaff', lineHeight: 1.95, paddingLeft: '20px' }}>
              <li><strong>Pestaña Nómina:</strong> Es la lista central de tus alumnos.</li>
              <li><strong>Carga Manual:</strong> Usá el botón <strong>+ Agregar Manual</strong> para registrar datos personales (DNI, Legajo, Fecha de Nacimiento) y del tutor (Email/Teléfono).</li>
              <li><strong>📷 Escaneo OCR con IA:</strong> Tocá el botón <strong>📷 ESCANEAR PLANILLA</strong>. Sacale una foto a tu planilla de papel y el sistema extrae los nombres y apellidos para precargarlos. Disponible en PRO (hasta 5 cursos distintos) y Premium (sin límite); no está incluido en el Plan Gratuito.</li>
              <li><strong>Situación Especial (PPI/CUD):</strong> Si un alumno tiene un proyecto de inclusión, marcá el checkbox. Podrás detallar el tipo de condición y observaciones pedagógicas.</li>
            </ul>
          </section>

          <section style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '1.7rem', marginBottom: '10px', color: '#f8fbff' }}>✅ 4. Control de Asistencia</h2>
            <ul style={{ color: '#dfeaff', lineHeight: 1.95, paddingLeft: '20px' }}>
              <li><strong>Códigos Visuales:</strong> P (Presente), A (Ausente), AJ (Justificado).</li>
              <li><strong>🎙️ Modo Voz:</strong> Tocá el botón de micrófono. Decí el nombre del alumno y su estado. El sistema lo marcará automáticamente.</li>
              <li><strong>💾 Guardado Seguro:</strong> Recordá presionar el botón flotante <strong>GUARDAR ASISTENCIA</strong> al finalizar para asegurar los datos.</li>
              <li><strong>⚠️ Alertas Automáticas:</strong> El sistema te avisará si un alumno superó las 3 inasistencias en el mes.</li>
              <li><strong>📊 Resumen Mensual:</strong> Tocá el botón <strong>📊 Ver Planilla</strong> para ver una vista tipo Excel con los totales mensuales.</li>
            </ul>
          </section>

          <section style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '1.7rem', marginBottom: '10px', color: '#f8fbff' }}>📉 5. Bajas y Reactivaciones</h2>
            <ul style={{ color: '#dfeaff', lineHeight: 1.95, paddingLeft: '20px' }}>
              <li><strong>Baja Rápida (×):</strong> En la lista de asistencia, tocá la cruz gris. El alumno se tachará en rojo y se marcará como “No cursa”.</li>
              <li><strong>Reactivar:</strong> Si el alumno vuelve, simplemente presioná el botón verde <strong>Reactivar</strong>.</li>
            </ul>
          </section>

          <section style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '1.7rem', marginBottom: '10px', color: '#f8fbff' }}>💎 6. Planes y Membresías</h2>
            <ul style={{ color: '#dfeaff', lineHeight: 1.95, paddingLeft: '20px' }}>
              <li><strong>Plan Gratuito:</strong> 1 Escuela y 2 Cursos, sin escaneo OCR.</li>
              <li><strong>Plan Profesional (PRO):</strong> hasta 6 Escuelas y 10 Cursos, OCR con IA en hasta 5 cursos distintos.</li>
              <li><strong>Plan Premium:</strong> Escuelas, Cursos y OCR sin límite, backups automáticos y soporte prioritario.</li>
            </ul>
            <p style={{ color: '#dfeaff', lineHeight: 1.8, marginTop: '14px' }}>
              <strong>Formas de pago (Mercado Pago):</strong> Mensual o Ciclo lectivo (febrero a diciembre).
            </p>
            <p style={{ color: '#dfeaff', lineHeight: 1.8 }}>
              <strong>Precios:</strong> se muestran siempre actualizados en la pantalla <strong>💳 Planes / Mi suscripción</strong> (menú ⚙️).
            </p>
            <p style={{ color: '#fde68a', lineHeight: 1.8, marginTop: '10px' }}>
              <strong>Importante:</strong> La Agenda cuenta con “Cerrojos de Seguridad” en la base de datos que impiden la carga de datos por encima del límite del plan contratado.
            </p>
          </section>

          <section style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '1.45rem', marginBottom: '10px', color: '#f8fbff' }}>💡 Tips Pro</h2>
            <ul style={{ color: '#dfeaff', lineHeight: 1.95, paddingLeft: '20px' }}>
              <li>Usá el <strong>Selector de Fecha</strong> en Asistencia para cargar días pasados o corregir errores.</li>
              <li><strong>Ciclo lectivo:</strong> Pagá una sola vez y olvidate de las cuotas mensuales hasta el 31/12.</li>
              <li>Recordá que la Agenda es <strong>Mobile-First</strong>, usala desde el navegador de tu celular para mayor comodidad en el aula.</li>
            </ul>
          </section>

          <p style={{ marginTop: '30px', color: '#dfeaff', lineHeight: 1.8, fontSize: '1.04rem' }}>
            <strong>¿Necesitás ayuda extra?</strong> Contactanos a través del soporte en la app. ¡Éxitos en este ciclo lectivo!
          </p>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/inicio" style={{
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            padding: '12px 18px',
            fontWeight: 800,
            boxShadow: '0 16px 30px rgba(59, 130, 246, 0.28)'
          }}>
            Volver al inicio
          </a>
          <a href="mailto:soporteagendadocentepro@gmail.com" style={{
            background: 'transparent',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            color: '#e2e8f0',
            textDecoration: 'none',
            borderRadius: '12px',
            padding: '12px 18px',
            fontWeight: 800
          }}>
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  );
}
