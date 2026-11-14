import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SUBSCRIPTION_PLANS, CICLOS, PAID_PLAN_KEYS, PLAN_CICLOS, getPlanPrecio, formatPrecio, formatFecha } from '../constants/plans';
import { PagosAPI, PerfilAPI } from '../services/api';
import usePlanes from '../hooks/usePlanes';
import './Suscripcion.css';

const PLANES_PAGOS = [
  { key: 'basico', color: '#22c55e', destacado: false, cta: 'Elegir BÁSICO' },
  { key: 'pro', color: 'var(--primary)', destacado: true, cta: 'Mejorar a PRO' },
  { key: 'premium', color: 'var(--purple)', destacado: false, cta: 'Ser Premium' },
];

function PrecioPlan({ precio, ciclo }) {
  if (!precio) {
    return <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: '0.6rem 0 1.5rem' }}>Precio no disponible</div>;
  }
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {precio.en_promocion && (
        <div style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', fontSize: '1rem' }}>
          {formatPrecio(precio.precio)}
        </div>
      )}
      <div style={{ fontSize: 'clamp(1.7rem, 2.5vw, 2.2rem)', fontWeight: 900, lineHeight: 1.2 }}>
        {formatPrecio(precio.precio_vigente)}
        <small style={{ display: 'block', fontWeight: 400, fontSize: '0.9rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>{CICLOS[ciclo].sufijo}</small>
      </div>
      {precio.en_promocion && precio.promo_hasta && (
        <p style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: 700, margin: '4px 0 0' }}>
          🔥 Promo hasta {formatFecha(precio.promo_hasta)}
        </p>
      )}
    </div>
  );
}

export default function Suscripcion({ session }) {
  const [ciclo, setCiclo] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const cicloParam = params.get('ciclo');
    return PLAN_CICLOS.includes(cicloParam) ? cicloParam : 'mensual';
  });
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const { planes, loading: loadingPrecios, error: errorPrecios, recargar } = usePlanes();
  const docenteId = session?.user?.id;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const plan = params.get('plan');
    const cicloParam = params.get('ciclo');

    if (status === 'success') {
      if (PAID_PLAN_KEYS.includes(plan) && PLAN_CICLOS.includes(cicloParam)) {
        setCiclo(cicloParam);
        Promise.all([
          PagosAPI.getEstado(),
          docenteId ? PerfilAPI.getProfile() : Promise.reject(new Error('No se pudo identificar la sesión.'))
        ]).then(([estado, perfil]) => {
          if (cancelled) return;
          const pago = estado?.ultimoPago;
          const trialEndsAt = new Date(perfil?.trial_ends_at).getTime();
          const paymentExpiresAt = new Date(pago?.expira_at).getTime();
          const approved = pago?.estado === 'approved'
            && pago?.plan === `${plan}_${cicloParam}`
            && estado?.plan === plan
            && perfil?.plan === plan
            && Number.isFinite(trialEndsAt)
            && trialEndsAt > Date.now()
            && Number.isFinite(paymentExpiresAt)
            && paymentExpiresAt > Date.now();

          setFeedback(approved
            ? {
                tipo: 'success',
                mensaje: `🎉 El backend confirmó tu plan ${plan.toUpperCase()} (${CICLOS[cicloParam].label}) activo hasta el ${formatFecha(cicloParam === 'ciclo_lectivo' ? pago.expira_at : perfil.trial_ends_at)}.`,
              }
            : {
                tipo: 'warning',
                mensaje: '⏳ Mercado Pago regresó a la app, pero todavía no se confirmó la activación del plan. La cuenta se actualizará cuando el backend procese el pago.',
              });
        }).catch((error) => {
          if (!cancelled) {
            setFeedback({
              tipo: 'error',
              mensaje: `No se pudo verificar la activación real del pago: ${error.message}`,
            });
          }
        });
      } else {
        setFeedback({
          tipo: 'warning',
          mensaje: 'No se pudo verificar el plan y el ciclo de esta operación. Revisá el estado de tu suscripción antes de volver a pagar.',
        });
      }
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

    return () => { cancelled = true; };
  }, [docenteId]);

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

  const hayPromo = planes.some(p => p.en_promocion);
  const cicloBtn = (value) => ({
    background: ciclo === value ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'transparent',
    color: ciclo === value ? '#fff' : 'var(--text-secondary)',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '24px',
    fontWeight: 800,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '7rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.8rem', textAlign: 'center', marginTop: '1rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Volver al Inicio
        </Link>

        {hayPromo && (
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ background: 'linear-gradient(90deg, #6366f1, #ec4899)', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)' }}>
              🚀 PRECIO PROMOCIONAL DE LANZAMIENTO
            </span>
          </div>
        )}

        <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 900 }}>Elegí tu Plan</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Llevá tu organización docente al siguiente nivel.</p>

        <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '6px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '1.5rem', gap: '8px' }}>
          <button onClick={() => setCiclo('mensual')} style={cicloBtn('mensual')}>Mensual</button>
          <button onClick={() => setCiclo('ciclo_lectivo')} style={cicloBtn('ciclo_lectivo')}>Ciclo lectivo</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '10px auto 0', maxWidth: '520px', lineHeight: 1.5 }}>
          {ciclo === 'mensual'
            ? 'El plan mensual cubre 30 días desde la acreditación del pago.'
            : 'El ciclo lectivo vence el 31/12. Si pagás entre octubre y diciembre, cubre hasta el 31/12 del mismo año.'}
        </p>
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

      {errorPrecios && (
        <div style={{ padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#fca5a5' }}>
          {errorPrecios}{' '}
          <button onClick={recargar} className="btn-secondary" style={{ marginLeft: '8px', padding: '4px 12px' }}>Reintentar</button>
        </div>
      )}

      <div className="subscription-grid">
        <div className="glass-card subscription-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Gratuito</h3>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '1.5rem' }}>
            $0 <small style={{ display: 'block', fontWeight: 400, fontSize: '0.9rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>/ siempre</small>
          </div>
          <ul className="subscription-features">
            {SUBSCRIPTION_PLANS.free.features.map(f => (
              <li key={f}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--green)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {PLANES_PAGOS.map(({ key, color, destacado, cta }) => {
          const precio = getPlanPrecio(planes, key, ciclo);
          const disponible = precio && precio.activo !== false;
          return (
            <div key={key} className="glass-card subscription-card" style={{ position: 'relative', border: destacado ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)', background: destacado ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(0,0,0,0))' : undefined }}>
              {destacado && (
                <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900, whiteSpace: 'nowrap' }}>MÁS ELEGIDO</span>
              )}
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{SUBSCRIPTION_PLANS[key].name}</h3>
              {loadingPrecios ? (
                <div style={{ color: 'var(--text-secondary)', margin: '0.6rem 0 1.5rem' }}>Cargando precio...</div>
              ) : (
                <PrecioPlan precio={disponible ? precio : null} ciclo={ciclo} />
              )}
              <ul className="subscription-features">
                {SUBSCRIPTION_PLANS[key].features.map(f => (
                  <li key={f}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`subscription-button ${destacado ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', ...(destacado ? {} : { border: `1px solid ${color}`, color }) }}
                disabled={loadingPlan !== null || loadingPrecios || !disponible}
                onClick={() => handlePagar(key)}
              >
                {loadingPlan === `${key}_${ciclo}`
                  ? 'Conectando con Mercado Pago...'
                  : disponible ? `${cta} (${formatPrecio(precio.precio_vigente)})` : cta}
              </button>
            </div>
          );
        })}
      </div>

      <div className="glass-card" style={{ marginTop: '3rem', padding: '1.5rem', textAlign: 'center' }}>
         <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
           ¿Necesitás un plan para toda tu escuela o institución? <a href="#" style={{ color: 'var(--primary)', fontWeight: 700 }}>Contactanos</a>
         </p>
      </div>
    </div>
  );
}
