import React from 'react';
import { Link } from 'react-router-dom';

export default function PlanLimitModal({ message, onClose }) {
  if (!message) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(2,6,23,0.82)' }}>
      <div
        role="alertdialog"
        aria-live="polite"
        onClick={e => e.stopPropagation()}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '28px 24px 20px',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(17,24,39,0.96))',
          border: '1px solid rgba(168,85,247,0.45)',
          color: '#fff',
          boxShadow: '0 30px 80px rgba(91, 33, 182, 0.38)',
          textAlign: 'center'
        }}
      >
        <div style={{
          width: '72px',
          height: '72px',
          margin: '0 auto 18px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(59,130,246,0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.2rem',
          border: '1px solid rgba(168,85,247,0.4)'
        }}>
          🔒
        </div>

        <h3 style={{ margin: '0 0 12px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Límite del plan alcanzado
        </h3>

        <p style={{ margin: '0 0 22px', fontSize: '0.98rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
          {message}
        </p>

        <div style={{ display: 'grid', gap: '10px' }}>
          <Link to="/suscripcion" className="btn-primary" style={{ padding: '12px 16px', borderRadius: '12px', textDecoration: 'none', textAlign: 'center', fontWeight: 800 }}>
            Actualizar plan
          </Link>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '11px 16px', borderRadius: '12px' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
