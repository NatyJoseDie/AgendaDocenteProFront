import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SUBSCRIPTION_PLANS } from '../constants/plans';
import { PagosAPI } from '../services/api';

export default function Suscripcion() {
  const [ciclo, setCiclo] = useState('anual'); // 'mensual' | 'anual'
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const plan = params.get('plan');
    const cicloParam = params.get('ciclo');

    if (status === 'success') {
      setFeedback({
        tipo: 'success',
        mensaje: `🎉 ¡Felicitaciones! Tu pago fue aprobado y tu plan ${plan?.toUpperCase() || 'PRO'} (${cicloParam || 'anual'}) está activo.`,
      });
    } else if (status === 'failure') {
      setFeedback({
        tipo: 'error',
        mensaje: '❌ El pago no pudo completarse. Podés intentar nuevamente con otro medio de pago.',
      });
    } else if (status === 'pending') {
      setFeedback({
        tipo: 'warning',
        mensaje: '⏳ Tu pago está pendiente de acreditación. Apenas impacte, tu cuenta se actualizará automáticamente.',
      });
    }
  }, []);

  const handlePagar = async (planKey) => {
    try {
      setLoadingPlan(`${planKey}_${ciclo}`);
      const data = await PagosAPI.crearPreferencia(planKey, ciclo);

      if (data?.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('No se pudo generar el link de pago. Verificá las credenciales de Mercado Pago.');
      }
    } catch (err) {
      alert(err.message || 'Error al conectar con la pasarela de pagos.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '7rem', maxWidth: '960px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.8rem', textAlign: 'center', marginTop: '1rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Volver al Inicio
        </Link>

        {/* BADGE DE LANZAMIENTO */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{
            background: 'linear-gradient(90deg, #6366f1, #ec4899)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            🚀 PRECIO LANZAMIENTO — VÁLIDO POR 6 MESES
          </span>
        </div>

        <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 900 }}>Elegí tu Plan</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Llevá tu organización docente al siguiente nivel.</p>

        {/* SELECTOR MENSUAL / ANUAL */}
        <div style={{
          display: 'inline-flex',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '6px',
          borderRadius: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginTop: '1.5rem',
          gap: '8px'
        }}>
          <button
            onClick={() => setCiclo('mensual')}
            style={{
              background: ciclo === 'mensual' ? 'var(--primary)' : 'transparent',
              color: ciclo === 'mensual' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '10px 22px',
              borderRadius: '24px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Facturación Mensual
          </button>

          <button
            onClick={() => setCiclo('anual')}
            style={{
              background: ciclo === 'anual' ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'transparent',
              color: ciclo === 'anual' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '10px 22px',
              borderRadius: '24px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Facturación Anual
            <span style={{
              background: '#22c55e',
              color: '#000',
              fontSize: '0.7rem',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              AHORRÁ HASTA 64% 🎁
            </span>
          </button>
        </div>
      </header>

      {feedback && (
        <div style={{
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'center',
          fontWeight: 600,
          background: feedback.tipo === 'success' ? 'rgba(34, 197, 94, 0.15)' : feedback.tipo === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${feedback.tipo === 'success' ? '#22c55e' : feedback.tipo === 'error' ? '#ef4444' : '#f59e0b'}`,
          color: feedback.tipo === 'success' ? '#22c55e' : feedback.tipo === 'error' ? '#ef4444' : '#f59e0b',
        }}>
          {feedback.mensaje}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <style>
          {`
            @keyframes pulse-led {
              0% { box-shadow: 0 0 5px var(--primary); }
              50% { box-shadow: 0 0 20px var(--primary), 0 0 30px var(--secondary); }
              100% { box-shadow: 0 0 5px var(--primary); }
            }
            @keyframes badge-pulse {
              0% { transform: scale(1) translateX(-50%); }
              50% { transform: scale(1.08) translateX(-48%); opacity: 0.9; }
              100% { transform: scale(1) translateX(-50%); }
            }
          `}
        </style>

        {/* PLAN FREE */}
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
          <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.2rem' }}>$0 <small style={{ fontWeight: 400, fontSize: '1rem' }}>/ siempre</small></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Para probar la plataforma sin compromiso</p>
          <ul style={{ listStyle: 'none', padding: 0, flex: 1, marginBottom: '2rem' }}>
            {SUBSCRIPTION_PLANS.free.features.map(f => (
              <li key={f} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--green)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {f}
              </li>
            ))}
          </ul>
          <button className="btn-secondary" style={{ width: '100%', opacity: 0.5, cursor: 'default' }}>Tu plan actual</button>
        </div>

        {/* PLAN PRO */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', border: '2px solid var(--primary)', position: 'relative', background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(0,0,0,0))' }}>
          <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900 }}>MÁS ELEGIDO</span>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{SUBSCRIPTION_PLANS.pro.name}</h3>

          <div style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.2rem' }}>
            {ciclo === 'mensual' ? '$3.500' : '$15.000'}
            <small style={{ fontWeight: 400, fontSize: '1rem' }}>{ciclo === 'mensual' ? ' / mes' : ' / año'}</small>
          </div>

          <p style={{ color: ciclo === 'anual' ? '#22c55e' : 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem', fontWeight: ciclo === 'anual' ? 700 : 400 }}>
            {ciclo === 'anual' ? '🔥 ¡Ahorrás 64%! Equivale a $1.250 / mes' : 'Facturado mensualmente sin permanencia'}
          </p>

          <ul style={{ listStyle: 'none', padding: 0, flex: 1, marginBottom: '2rem' }}>
            {SUBSCRIPTION_PLANS.pro.features.map(f => (
              <li key={f} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {f}
              </li>
            ))}
          </ul>
          <button 
            className="btn-primary" 
            style={{ width: '100%' }} 
            disabled={loadingPlan !== null}
            onClick={() => handlePagar('pro')}
          >
            {loadingPlan === `pro_${ciclo}` ? 'Conectando con Mercado Pago...' : `Mejorar a PRO (${ciclo === 'mensual' ? '$3.500' : '$15.000'})`}
          </button>
        </div>

        {/* PLAN PREMIUM */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{SUBSCRIPTION_PLANS.premium.name}</h3>

          <div style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.2rem' }}>
            {ciclo === 'mensual' ? '$5.000' : '$24.000'}
            <small style={{ fontWeight: 400, fontSize: '1rem' }}>{ciclo === 'mensual' ? ' / mes' : ' / año'}</small>
          </div>

          <p style={{ color: ciclo === 'anual' ? '#a855f7' : 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem', fontWeight: ciclo === 'anual' ? 700 : 400 }}>
            {ciclo === 'anual' ? '💎 ¡Ahorrás 60%! Equivale a $2.000 / mes' : 'Facturado mensualmente sin permanencia'}
          </p>

          <ul style={{ listStyle: 'none', padding: 0, flex: 1, marginBottom: '2rem' }}>
            {SUBSCRIPTION_PLANS.premium.features.map(f => (
              <li key={f} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--purple)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {f}
              </li>
            ))}
          </ul>
          <button 
            className="btn-secondary" 
            style={{ width: '100%', border: '1px solid var(--purple)', color: 'var(--purple)' }} 
            disabled={loadingPlan !== null}
            onClick={() => handlePagar('premium')}
          >
            {loadingPlan === `premium_${ciclo}` ? 'Conectando con Mercado Pago...' : `Ser Premium (${ciclo === 'mensual' ? '$5.000' : '$24.000'})`}
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '3rem', padding: '1.5rem', textAlign: 'center' }}>
         <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
           ¿Necesitás un plan para toda tu escuela o institución? <a href="#" style={{ color: 'var(--primary)', fontWeight: 700 }}>Contactanos</a>
         </p>
      </div>
    </div>
  );
}
