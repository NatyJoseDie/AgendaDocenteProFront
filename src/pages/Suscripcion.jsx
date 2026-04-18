import React from 'react';
import { Link } from 'react-router-dom';
import { SUBSCRIPTION_PLANS } from '../constants/plans';

export default function Suscripcion() {
  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '7rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem', textAlign: 'center', marginTop: '1rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Volver al Inicio
        </Link>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 900 }}>Elegí tu Plan</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Llevá tu organización docente al siguiente nivel.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* CSS PARA ANIMACIÓN DE LUZ LED */}
        <style>
          {`
            @keyframes pulse-led {
              0% { box-shadow: 0 0 5px var(--primary); }
              50% { box-shadow: 0 0 20px var(--primary), 0 0 30px var(--secondary); }
              100% { box-shadow: 0 0 5px var(--primary); }
            }
            @keyframes badge-pulse {
              0% { transform: scale(1) translateX(-50%); }
              50% { transform: scale(1.1) translateX(-45%); opacity: 0.8; }
              100% { transform: scale(1) translateX(-50%); }
            }
          `}
        </style>

        {/* Plan FREE */}
        <div className="glass-card" style={{ 
          padding: '2rem', display: 'flex', flexDirection: 'column', 
          border: '1px solid var(--primary)', position: 'relative',
          animation: 'pulse-led 3s infinite ease-in-out' 
        }}>
          <span style={{ 
            position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', 
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)', color: '#fff', 
            padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900,
            animation: 'badge-pulse 2s infinite ease-in-out', boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)',
            whiteSpace: 'nowrap'
          }}>
            🎁 REGALO: 30 DÍAS FULL
          </span>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{SUBSCRIPTION_PLANS.free.name}</h3>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1.5rem' }}>$0 <small style={{ fontWeight: 400, fontSize: '1rem' }}>/ siempre</small></div>
          <ul style={{ listStyle: 'none', padding: 0, flex: 1, marginBottom: '2rem' }}>
            {SUBSCRIPTION_PLANS.free.features.map(f => (
              <li key={f} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--green)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {f}
              </li>
            ))}
          </ul>
          <button className="btn-secondary" style={{ width: '100%', opacity: 0.5, cursor: 'default' }}>Tu plan actual</button>
        </div>

        {/* Plan PRO */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', border: '2px solid var(--primary)', position: 'relative', background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(0,0,0,0))' }}>
          <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900 }}>MÁS ELEGIDO</span>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{SUBSCRIPTION_PLANS.pro.name}</h3>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1.5rem' }}>$10.000 <small style={{ fontWeight: 400, fontSize: '1rem' }}>/ año</small></div>
          <ul style={{ listStyle: 'none', padding: 0, flex: 1, marginBottom: '2rem' }}>
            {SUBSCRIPTION_PLANS.pro.features.map(f => (
              <li key={f} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {f}
              </li>
            ))}
          </ul>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => alert('Próximamente: Integración con Mercado Pago')}>Mejorar a PRO</button>
        </div>

        {/* Plan PREMIUM */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{SUBSCRIPTION_PLANS.premium.name}</h3>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1.5rem' }}>$15.000 <small style={{ fontWeight: 400, fontSize: '1rem' }}>/ año</small></div>
          <ul style={{ listStyle: 'none', padding: 0, flex: 1, marginBottom: '2rem' }}>
            {SUBSCRIPTION_PLANS.premium.features.map(f => (
              <li key={f} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--purple)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {f}
              </li>
            ))}
          </ul>
          <button className="btn-secondary" style={{ width: '100%', border: '1px solid var(--purple)', color: 'var(--purple)' }} onClick={() => alert('Próximamente: Integración con Mercado Pago')}>Ser Premium</button>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '3rem', padding: '1.5rem', textAlign: 'center' }}>
         <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
           ¿Necesitás un plan para toda tu escuela? <a href="#" style={{ color: 'var(--primary)', fontWeight: 700 }}>Contactanos</a>
         </p>
      </div>
    </div>
  );
}
