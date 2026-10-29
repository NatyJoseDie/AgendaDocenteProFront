import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminAPI } from '../services/api';
import { isUserAdmin } from '../constants/plans';

export default function AdminDashboard({ session }) {
  const navigate = useNavigate();
  const userEmail = session?.user?.email;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('docentes'); // 'docentes' | 'pagos'
  const [busqueda, setBusqueda] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Protección de ruta: Solo para Natalia
  useEffect(() => {
    if (userEmail && !isUserAdmin(userEmail)) {
      navigate('/dashboard');
    }
  }, [userEmail, navigate]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await AdminAPI.getMetricas();
      setData(res);
    } catch (err) {
      setError(err.message || 'Error al cargar métricas de administración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleModificar = async (docenteId, nuevoPlan, diasExtra, nombre) => {
    const confirmMsg = nuevoPlan 
      ? `¿Deseas cambiar el plan de ${nombre} a ${nuevoPlan.toUpperCase()} por 1 año?`
      : `¿Deseas agregarle ${diasExtra} días de regalo a ${nombre}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoading(docenteId);
      await AdminAPI.modificarDocente(docenteId, nuevoPlan, diasExtra);
      await cargarDatos();
      alert('¡Docente actualizado con éxito!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ textAlign: 'center', paddingTop: '5rem', color: '#fff' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👑</div>
        <p style={{ color: 'var(--text-secondary)' }}>Cargando métricas de administración...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#fff' }}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button onClick={cargarDatos} className="btn-primary" style={{ marginTop: '1rem' }}>Reintentar</button>
      </div>
    );
  }

  const { resumen, docentes, pagos } = data || {};

  const docentesFiltrados = (docentes || []).filter(d => 
    d.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '6rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* ── HEADER ── */}
      <header style={{ marginBottom: '2rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: '0.9rem' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Volver a mi Agenda
          </Link>
          <button onClick={cargarDatos} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
            🔄 Actualizar Datos
          </button>
        </div>

        <div style={{ marginTop: '1.2rem' }}>
          <span style={{ background: 'linear-gradient(90deg, #f59e0b, #ec4899)', color: '#fff', padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.5px' }}>
            👑 EXCLUSIVO PROPIETARIA
          </span>
          <h1 className="text-gradient" style={{ fontSize: '2.4rem', fontWeight: 900, margin: '8px 0 4px' }}>
            Panel de Control del Negocio
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Monitoreo en tiempo real de ingresos por Mercado Pago, docentes activos y suscripciones.
          </p>
        </div>
      </header>

      {/* ── TARJETAS DE MÉTRICAS (KPIs) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        
        {/* Recaudación Total */}
        <div className="glass-card" style={{ padding: '1.4rem', border: '1px solid rgba(34, 197, 94, 0.4)', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(0,0,0,0))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontSize: '0.85rem', fontWeight: 800 }}>
            <span>INGRESOS MERCADO PAGO</span>
            <span>💰</span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>
            ${Number(resumen?.totalRecaudado || 0).toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            {resumen?.totalPagos || 0} cobros exitosos
          </div>
        </div>

        {/* Total Docentes */}
        <div className="glass-card" style={{ padding: '1.4rem', border: '1px solid rgba(99, 102, 241, 0.4)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(0,0,0,0))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818cf8', fontSize: '0.85rem', fontWeight: 800 }}>
            <span>DOCENTES REGISTRADOS</span>
            <span>👥</span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>
            {resumen?.totalDocentes || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            Cuentas activas en Supabase
          </div>
        </div>

        {/* Pases VIP Cuatrimestrales */}
        <div className="glass-card" style={{ padding: '1.4rem', border: '1px solid rgba(245, 158, 11, 0.4)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(0,0,0,0))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 800 }}>
            <span>PASES VIP (4 MESES)</span>
            <span>🌟</span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>
            {resumen?.countVip || 0} <small style={{ fontSize: '1rem', fontWeight: 400 }}>/ 10 cupos</small>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            Docentes pioneros activos
          </div>
        </div>

        {/* Suscripciones Pagas */}
        <div className="glass-card" style={{ padding: '1.4rem', border: '1px solid rgba(236, 72, 153, 0.4)', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(0,0,0,0))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f472b6', fontSize: '0.85rem', fontWeight: 800 }}>
            <span>SUSCRIPCIONES PRO / ELITE</span>
            <span>💎</span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>
            {(resumen?.countPro || 0) + (resumen?.countPremium || 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            {resumen?.countPro || 0} Pro | {resumen?.countPremium || 0} Premium
          </div>
        </div>

      </div>

      {/* ── SELECTOR DE PESTAÑAS ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
        <button
          onClick={() => setTab('docentes')}
          style={{
            background: tab === 'docentes' ? 'var(--primary)' : 'transparent',
            color: tab === 'docentes' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            padding: '8px 18px',
            borderRadius: '20px',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          👥 Lista de Docentes ({docentes?.length || 0})
        </button>

        <button
          onClick={() => setTab('pagos')}
          style={{
            background: tab === 'pagos' ? 'var(--primary)' : 'transparent',
            color: tab === 'pagos' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            padding: '8px 18px',
            borderRadius: '20px',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          💳 Historial de Pagos ({pagos?.length || 0})
        </button>
      </div>

      {/* ── TAB 1: LISTA DE DOCENTES ── */}
      {tab === 'docentes' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Docentes en la Plataforma</h3>
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="input-field"
              style={{ maxWidth: '300px', padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Docente</th>
                  <th style={{ padding: '10px' }}>Estado / Plan</th>
                  <th style={{ padding: '10px' }}>Vigencia</th>
                  <th style={{ padding: '10px' }}>Registro</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Acciones Especiales</th>
                </tr>
              </thead>
              <tbody>
                {docentesFiltrados.map(d => {
                  const isOwner = d.estado === 'admin';
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={d.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.nombre)}&background=8b5cf6&color=fff`} 
                          alt="" 
                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, color: '#fff' }}>
                            {d.nombre} {d.apellido} {isOwner && '👑 (Vos)'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{d.email}</div>
                        </div>
                      </td>

                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: isOwner ? 'linear-gradient(90deg, #f59e0b, #ec4899)' : d.estado === 'vip_beta' ? 'rgba(99, 102, 241, 0.2)' : d.estado === 'premium' ? 'rgba(236, 72, 153, 0.2)' : d.estado === 'pro' ? 'rgba(34, 197, 94, 0.2)' : d.estado === 'vencido' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
                          color: isOwner ? '#fff' : d.estado === 'vip_beta' ? '#818cf8' : d.estado === 'premium' ? '#f472b6' : d.estado === 'pro' ? '#22c55e' : d.estado === 'vencido' ? '#ef4444' : 'var(--text-secondary)',
                          border: `1px solid ${isOwner ? '#f59e0b' : d.estado === 'vip_beta' ? '#818cf8' : d.estado === 'premium' ? '#f472b6' : d.estado === 'pro' ? '#22c55e' : d.estado === 'vencido' ? '#ef4444' : 'transparent'}`
                        }}>
                          {isOwner ? 'FUNDADORA' : d.estado === 'vip_beta' ? 'PASE VIP (4M)' : d.estado === 'premium' ? 'PREMIUM' : d.estado === 'pro' ? 'PRO' : d.estado === 'vencido' ? 'VENCIDO' : 'FREE'}
                        </span>
                      </td>

                      <td style={{ padding: '10px' }}>
                        {isOwner ? (
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>De por vida</span>
                        ) : d.diasRestantes !== null ? (
                          <span style={{ color: d.diasRestantes <= 5 ? '#ef4444' : '#fff' }}>
                            {d.diasRestantes > 0 ? `${d.diasRestantes} días rest.` : '0 días (vencido)'}
                          </span>
                        ) : '-'}
                      </td>

                      <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('es-AR') : '-'}
                      </td>

                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        {!isOwner && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleModificar(d.id, null, 30, d.nombre)}
                              disabled={actionLoading === d.id}
                              style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366f1', color: '#c7d2fe', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                            >
                              +30 Días
                            </button>
                            <button
                              onClick={() => handleModificar(d.id, 'pro', 365, d.nombre)}
                              disabled={actionLoading === d.id}
                              style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', color: '#86efac', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                            >
                              Dar PRO
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: HISTORIAL DE PAGOS ── */}
      {tab === 'pagos' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.2rem', fontSize: '1.2rem' }}>Transacciones de Mercado Pago</h3>

          {pagos?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <p>Aún no se registraron cobros de Mercado Pago.</p>
              <p style={{ fontSize: '0.85rem' }}>Apenas un docente pague un plan mensual o anual, aparecerá automáticamente aquí.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px' }}>Fecha</th>
                    <th style={{ padding: '10px' }}>Monto</th>
                    <th style={{ padding: '10px' }}>Plan</th>
                    <th style={{ padding: '10px' }}>Medio de Pago</th>
                    <th style={{ padding: '10px' }}>ID Mercado Pago</th>
                    <th style={{ padding: '10px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos?.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)' }}>
                        {p.fecha_pago ? new Date(p.fecha_pago).toLocaleString('es-AR') : '-'}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 900, color: '#22c55e', fontSize: '1.05rem' }}>
                        ${Number(p.monto).toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#fff' }}>
                        {p.plan?.toUpperCase()}
                      </td>
                      <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)' }}>
                        {p.metodo_pago || 'Mercado Pago'}
                      </td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        {p.mp_payment_id || '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid #22c55e' }}>
                          Aprobado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
