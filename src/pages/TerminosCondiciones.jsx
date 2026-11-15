import React from 'react';

export default function TerminosCondiciones() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0d1b2a 0%, #07111d 35%, #030b14 100%)',
      color: '#e6f1ff',
      padding: '56px 24px 80px'
    }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0ea5e9, #2563eb, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            boxShadow: '0 14px 28px rgba(37, 99, 235, 0.35)'
          }}>
            ⚖️
          </div>
          <div>
            <p style={{ margin: 0, color: '#8ec5ff', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.74rem' }}>
              Legal
            </p>
            <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 800 }}>Términos y condiciones</h1>
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '22px', padding: '28px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.45)' }}>
          <p style={{ lineHeight: '1.9', color: '#dfeaff' }}>
            Al utilizar Agenda Docente, aceptás utilizar la aplicación para fines educativos y organizativos, conforme a las políticas internas del servicio y a las normativas aplicables.
          </p>

          <h2 style={{ fontSize: '1.3rem', marginTop: '30px' }}>1. Uso de la plataforma</h2>
          <p style={{ lineHeight: '1.9', color: '#dfeaff' }}>
            La plataforma está diseñada para la gestión administrativa y pedagógica de instituciones educativas. Está prohibido utilizarla para fines ilícitos, fraudulentos o que vulneren la privacidad de terceros.
          </p>

          <h2 style={{ fontSize: '1.3rem', marginTop: '24px' }}>2. Datos y privacidad</h2>
          <p style={{ lineHeight: '1.9', color: '#dfeaff' }}>
            Los datos ingresados en la plataforma se manejan con la debida confidencialidad y siguiendo las mejores prácticas de seguridad. El usuario es responsable del contenido que registra y del uso adecuado de la información.
          </p>

          <h2 style={{ fontSize: '1.3rem', marginTop: '24px' }}>3. Soporte y contacto</h2>
          <p style={{ lineHeight: '1.9', color: '#dfeaff' }}>
            Para consultas, dudas o requerimientos de soporte podés comunicarte por correo a <a href="mailto:soporteagendadocentepro@gmail.com" style={{ color: '#8ec5ff' }}>soporteagendadocentepro@gmail.com</a>.
          </p>

          <h2 style={{ fontSize: '1.3rem', marginTop: '24px' }}>4. Modificaciones</h2>
          <p style={{ lineHeight: '1.9', color: '#dfeaff' }}>
            Agenda Docente puede actualizar estos términos para reflejar cambios en el servicio, la normativa o la experiencia de uso. El uso continuo de la app implica la aceptación de dichas modificaciones.
          </p>
        </div>

        <div style={{ marginTop: '22px' }}>
          <a href="/inicio" style={{
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            padding: '12px 18px',
            fontWeight: 700
          }}>
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
