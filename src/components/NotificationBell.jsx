import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotificacionesAPI } from '../services/api';

const TIPOS = {
  ajuste_precios: { icon: '💲', color: '#f59e0b', link: '/suscripcion', linkLabel: 'Ver planes y precios' },
  evento_calendario: { icon: '📅', color: '#38bdf8', link: '/calendario', linkLabel: 'Ver calendario' },
};
const TIPO_DEFAULT = { icon: '🔔', color: '#a78bfa' };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isCompactMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await NotificacionesAPI.getAll(20);
      setItems(data.notificaciones);
      setNoLeidas(data.noLeidas);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const marcarLeida = async (n) => {
    if (n.leida_at) return;
    try {
      const actualizada = await NotificacionesAPI.marcarLeida(n.id);
      setItems(prev => prev.map(i => i.id === n.id ? { ...i, leida_at: actualizada?.leida_at || new Date().toISOString() } : i));
      setNoLeidas(prev => Math.max(prev - 1, 0));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <button aria-label="Notificaciones" className="btn-header-trigger" onClick={() => { setOpen(o => !o); if (!open) cargar(); }}
        style={{ position: 'relative', width: isCompactMobile ? '34px' : '40px', height: isCompactMobile ? '34px' : '40px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)', background: open ? '#8b5cf6' : 'rgba(255,255,255,0.05)', padding: 0, flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" width={isCompactMobile ? '16' : '19'} height={isCompactMobile ? '16' : '19'} fill="none" stroke={open ? '#fff' : 'rgba(255,255,255,0.6)'} strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {noLeidas > 0 && (
          <span style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: isCompactMobile ? '15px' : '18px', height: isCompactMobile ? '15px' : '18px', padding: '0 4px', borderRadius: '9px', background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Centro de notificaciones" style={{ position: 'fixed', top: isCompactMobile ? 10 : '64px', right: isCompactMobile ? '8px' : '12px', left: isCompactMobile ? '8px' : 'auto', zIndex: 9999, width: isCompactMobile ? 'calc(100vw - 16px)' : 'min(340px, calc(100vw - 16px))', maxHeight: isCompactMobile ? 'calc(100dvh - 20px)' : 'calc(100vh - 80px)', overflowY: 'auto', boxSizing: 'border-box', padding: isCompactMobile ? '8px' : '10px', background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', color: '#fff' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, padding: isCompactMobile ? '1px 6px 4px' : '2px 8px 6px', margin: 0 }}>Notificaciones</p>
            {loading && !items.length && <p style={{ padding: '8px', margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Cargando...</p>}
            {error && <p style={{ padding: '8px', margin: 0, color: '#fca5a5', fontSize: '0.85rem' }}>{error}</p>}
            {!loading && !error && !items.length && <p style={{ padding: '8px', margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>No tenés notificaciones.</p>}
            {items.map(n => {
              const tipo = TIPOS[n.tipo] || TIPO_DEFAULT;
              return (
                <div key={n.id} onClick={() => marcarLeida(n)}
                  style={{ padding: isCompactMobile ? '8px' : '10px', borderRadius: '10px', marginBottom: isCompactMobile ? '3px' : '4px', cursor: n.leida_at ? 'default' : 'pointer', background: n.leida_at ? 'rgba(255,255,255,0.02)' : 'rgba(139,92,246,0.1)', borderLeft: `3px solid ${n.leida_at ? 'transparent' : tipo.color}` }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span>{tipo.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: n.leida_at ? 600 : 800, fontSize: isCompactMobile ? '0.8rem' : '0.85rem' }}>{n.titulo}</div>
                      {n.mensaje && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginTop: '2px' }}>{n.mensaje}</div>}
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        {new Date(n.programada_para || n.created_at).toLocaleDateString('es-AR')}
                      </div>
                      {tipo.link && (
                        <Link to={tipo.link} onClick={() => setOpen(false)} style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.78rem', fontWeight: 700, color: tipo.color }}>
                          {tipo.linkLabel} →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
