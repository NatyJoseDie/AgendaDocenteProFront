import React from 'react';
import { Link } from 'react-router-dom';

export default function PlanLimitModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.8)' }}>
      <div role="alertdialog" onClick={e => e.stopPropagation()} className="glass-card" style={{ width: '100%', maxWidth: '380px', padding: '24px', borderRadius: '20px', background: '#1a1f2e', border: '1px solid rgba(245,158,11,0.4)', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔒</div>
        <p style={{ margin: '0 0 20px', fontSize: '0.95rem', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px' }}>Cerrar</button>
          <Link to="/suscripcion" className="btn-primary" style={{ flex: 2, padding: '11px', borderRadius: '10px', textDecoration: 'none', textAlign: 'center' }}>
            💳 Ver planes
          </Link>
        </div>
      </div>
    </div>
  );
}
