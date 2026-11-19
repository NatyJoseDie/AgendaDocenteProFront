import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminAPI } from '../services/api';
import PreciosAdmin from '../components/PreciosAdmin';

export default function AdminDashboard({ session }) {
  const [loading, setLoading] = useState(true);
  const isCompactMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('docentes'); // 'docentes' | 'pagos' | 'precios' | 'mensajes'
  const [busqueda, setBusqueda] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [mensajeForm, setMensajeForm] = useState({
    titulo: '',
    cuerpo: '',
    tipo: 'aviso',
    alcance: 'todos',
    plan: 'gratuito',
    docenteIds: [],
  });
  const [enviando, setEnviando] = useState(false);
  const [historialMensajes, setHistorialMensajes] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [detalleConversacion, setDetalleConversacion] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [docMensajes, setDocMensajes] = useState([]);
  const [docMensajesLoading, setDocMensajesLoading] = useState(false);
  const [docMensajesError, setDocMensajesError] = useState(null);
  const [docNoLeidos, setDocNoLeidos] = useState(0);
  const [docDetalle, setDocDetalle] = useState(null);
  const [docDetalleLoading, setDocDetalleLoading] = useState(false);
  const [docReply, setDocReply] = useState('');
  const [docSending, setDocSending] = useState(false);

  const refrescarDocNoLeidos = async () => {
    try {
      const res = await AdminAPI.getMensajesDeDocentesNoLeidos();
      setDocNoLeidos(res.noLeidos);
    } catch (err) {
      console.warn('No se pudo actualizar el contador de mensajes de docentes:', err);
    }
  };

  const cargarMensajesDocentes = async () => {
    try {
      setDocMensajesLoading(true);
      setDocMensajesError(null);
      const res = await AdminAPI.getMensajesDeDocentes();
      setDocMensajes(res.mensajes);
    } catch (err) {
      setDocMensajesError(err.message || 'No se pudieron cargar los mensajes de docentes');
    } finally {
      setDocMensajesLoading(false);
    }
    refrescarDocNoLeidos();
  };

  const abrirMensajeDocente = async (item) => {
    try {
      setDocDetalleLoading(true);
      setDocReply('');
      setDocDetalle({ mensaje: item, respuestas: [] });
      const res = await AdminAPI.getMensajeDeDocente(item.id);
      setDocDetalle({
        mensaje: { ...item, ...(res?.mensaje || {}) },
        respuestas: Array.isArray(res?.respuestas) ? res.respuestas : []
      });
      refrescarDocNoLeidos();
    } catch (err) {
      setDocDetalle(null);
      alert(err.message || 'No se pudo abrir el mensaje');
    } finally {
      setDocDetalleLoading(false);
    }
  };

  const responderMensajeDocente = async () => {
    const cuerpo = docReply.trim();
    if (!cuerpo || !docDetalle?.mensaje?.id) {
      alert('Escribí una respuesta antes de enviar.');
      return;
    }
    try {
      setDocSending(true);
      const res = await AdminAPI.responderMensajeDeDocente(docDetalle.mensaje.id, cuerpo);
      const nueva = res?.respuesta || { id: Date.now(), autor: 'admin', cuerpo, created_at: new Date().toISOString() };
      setDocDetalle((prev) => ({
        ...prev,
        mensaje: { ...prev.mensaje, estado: 'respondido' },
        respuestas: [...(prev?.respuestas || []), nueva],
      }));
      setDocMensajes((prev) => prev.map((m) => (m.id === docDetalle.mensaje.id ? { ...m, estado: 'respondido' } : m)));
      setDocReply('');
    } catch (err) {
      alert(err.message || 'No se pudo enviar la respuesta');
    } finally {
      setDocSending(false);
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await AdminAPI.getMetricas();
      setData(res);
    } catch (err) {
      setError(err.message || 'Error al cargar métricas de administración');
      return;
    } finally {
      setLoading(false);
    }

    try {
      const mensajesRes = await AdminAPI.getMensajesEnviados();
      setHistorialMensajes(mensajesRes?.mensajes || []);
      const pendientesRes = await AdminAPI.getRespuestasPendientes();
      setPendientes(pendientesRes?.conversaciones || []);
    } catch (err) {
      console.warn('No se pudo cargar el historial de mensajes del admin:', err);
    }
  };

  const cargarConversacion = async (id) => {
    if (!id) return;
    try {
      const data = await AdminAPI.getConversacion(id);
      setDetalleConversacion(data || { respuestas: [] });
    } catch (err) {
      alert(err.message || 'No se pudo cargar la conversación');
    }
  };

  const handleEnviarMensaje = async () => {
    const payload = {
      titulo: mensajeForm.titulo.trim(),
      cuerpo: mensajeForm.cuerpo.trim(),
      tipo: mensajeForm.tipo,
      alcance: mensajeForm.alcance,
      ...(mensajeForm.alcance === 'plan' ? { plan: mensajeForm.plan } : {}),
      ...(mensajeForm.alcance === 'docentes' ? { docenteIds: mensajeForm.docenteIds } : {}),
    };

    if (!payload.titulo || !payload.cuerpo) {
      alert('Completá título y cuerpo del mensaje.');
      return;
    }

    if (payload.alcance === 'todos' && !window.confirm('¿Seguro que querés enviar este mensaje a todos los docentes?')) {
      return;
    }

    try {
      setEnviando(true);
      const result = await AdminAPI.enviarMensaje(payload);
      setHistorialMensajes((prev) => [result?.mensaje || { ...payload, id: Date.now(), created_at: new Date().toISOString() }, ...prev]);
      setMensajeForm({ titulo: '', cuerpo: '', tipo: 'aviso', alcance: 'todos', plan: 'gratuito', docenteIds: [] });
      alert(`Mensaje enviado a ${result?.destinatarios ?? 0} docentes.`);
      await cargarDatos();
    } catch (err) {
      alert(err.message || 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  const handleRespondToConversation = async () => {
    if (!detalleConversacion?.id || !replyText.trim()) {
      alert('Escribí una respuesta antes de enviar.');
      return;
    }

    try {
      setSendingReply(true);
      const result = await AdminAPI.responderConversacion(detalleConversacion.id, replyText.trim());
      setDetalleConversacion((prev) => ({
        ...prev,
        respuestas: [...(prev?.respuestas || []), result?.respuesta || { id: Date.now(), autor: 'admin', cuerpo: replyText.trim(), created_at: new Date().toISOString() }],
      }));
      setReplyText('');
      await cargarDatos();
    } catch (err) {
      alert(err.message || 'No se pudo responder la conversación.');
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarMensajesDocentes();
    const interval = window.setInterval(refrescarDocNoLeidos, 45000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModificar = async (docenteId, nuevoPlan, diasExtra, nombre) => {
    const confirmMsg = nuevoPlan
      ? `¿Deseas cambiar el plan de ${nombre} a ${nuevoPlan.toUpperCase()} según la suscripción vigente?`
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
    <div className="app-container animate-fade-in" style={{ paddingBottom: '6rem', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box', paddingLeft: isCompactMobile ? '8px' : '0', paddingRight: isCompactMobile ? '8px' : '0' }}>
      
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
      <div style={{ display: 'flex', gap: isCompactMobile ? '4px' : '10px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button
          onClick={() => setTab('docentes')}
          style={{
            background: tab === 'docentes' ? 'var(--primary)' : 'transparent',
            color: tab === 'docentes' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            padding: isCompactMobile ? '6px 12px' : '8px 18px',
            borderRadius: '20px',
            fontWeight: 800,
            fontSize: isCompactMobile ? '0.75rem' : '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          👥 Docentes ({docentes?.length || 0})
        </button>

        <button
          onClick={() => setTab('pagos')}
          style={{
            background: tab === 'pagos' ? 'var(--primary)' : 'transparent',
            color: tab === 'pagos' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            padding: isCompactMobile ? '6px 12px' : '8px 18px',
            borderRadius: '20px',
            fontWeight: 800,
            fontSize: isCompactMobile ? '0.75rem' : '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          💳 Pagos ({pagos?.length || 0})
        </button>

        <button
          onClick={() => setTab('mensajes')}
          style={{
            background: tab === 'mensajes' ? 'var(--primary)' : 'transparent',
            color: tab === 'mensajes' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            padding: isCompactMobile ? '6px 12px' : '8px 18px',
            borderRadius: '20px',
            fontWeight: 800,
            fontSize: isCompactMobile ? '0.75rem' : '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📨 Mensajes ({pendientes?.length || 0})
          {docNoLeidos > 0 && (
            <span style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 900 }}>{docNoLeidos}</span>
          )}
        </button>

        <button
          onClick={() => setTab('precios')}
          style={{
            background: tab === 'precios' ? 'var(--primary)' : 'transparent',
            color: tab === 'precios' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            padding: isCompactMobile ? '6px 12px' : '8px 18px',
            borderRadius: '20px',
            fontWeight: 800,
            fontSize: isCompactMobile ? '0.75rem' : '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          💰 Precios
        </button>
      </div>

      {/* ── TAB 1: LISTA DE DOCENTES ── */}
      {tab === 'docentes' && (
        <div className="glass-card" style={{ padding: isCompactMobile ? '12px' : '1.5rem' }}>
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

          <div className="admin-table-wrapper" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
            <table style={{ minWidth: '650px', width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Docente</th>
                  <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Estado / Plan</th>
                  <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Vigencia</th>
                  <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Registro</th>
                  <th style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Acciones Especiales</th>
                </tr>
              </thead>
              <tbody>
                {docentesFiltrados.map(d => {
                  const isOwner = d.estado === 'admin';
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={d.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.nombre)}&background=8b5cf6&color=fff`} 
                            alt="" 
                            style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                              {d.nombre} {d.apellido} {isOwner && '👑 (Vos)'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{d.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
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

                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                        {isOwner ? (
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>De por vida</span>
                        ) : d.diasRestantes !== null ? (
                          <span style={{ color: d.diasRestantes <= 5 ? '#ef4444' : '#fff' }}>
                            {d.diasRestantes > 0 ? `${d.diasRestantes} días rest.` : '0 días (vencido)'}
                          </span>
                        ) : '-'}
                      </td>

                      <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('es-AR') : '-'}
                      </td>

                      <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                              onClick={() => handleModificar(d.id, 'pro', 30, d.nombre)}
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
              <p style={{ fontSize: '0.85rem' }}>Apenas un docente pague un plan mensual o de ciclo lectivo, aparecerá automáticamente aquí.</p>
            </div>
          ) : (
          <div className="admin-table-wrapper" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
            <table style={{ minWidth: '650px', width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Fecha</th>
                    <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Monto</th>
                    <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Plan</th>
                    <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Medio de Pago</th>
                    <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>ID Mercado Pago</th>
                    <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos?.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                        {p.fecha_pago ? new Date(p.fecha_pago).toLocaleString('es-AR') : '-'}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 900, color: '#22c55e', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                        ${Number(p.monto).toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                        {p.plan?.toUpperCase()}
                      </td>
                      <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                        {p.metodo_pago || 'Mercado Pago'}
                      </td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        {p.mp_payment_id || '-'}
                      </td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid #22c55e' }}>
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

      {tab === 'mensajes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>
                Mensajes de docentes
                {docNoLeidos > 0 && <span style={{ marginLeft: '10px', background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '2px 9px', fontSize: '0.75rem', fontWeight: 900 }}>{docNoLeidos} sin leer</span>}
              </h3>
              <button type="button" onClick={cargarMensajesDocentes} disabled={docMensajesLoading} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>
                {docMensajesLoading ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>

            {docMensajesLoading && !docMensajes.length ? (
              <div style={{ color: 'var(--text-secondary)' }}>Cargando mensajes…</div>
            ) : docMensajesError ? (
              <div style={{ color: '#fca5a5' }}>{docMensajesError}</div>
            ) : docMensajes.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)' }}>Todavía no recibiste mensajes de docentes.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {docMensajes.map((item) => {
                  const estado = String(item.estado || 'abierto').toLowerCase();
                  const color = estado === 'respondido' ? '#fbbf24' : estado === 'cerrado' ? '#94a3b8' : '#34d399';
                  const sinLeer = !item.leido_por_admin_at && estado === 'abierto';
                  return (
                    <button key={item.id} type="button" onClick={() => abrirMensajeDocente(item)} style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', background: docDetalle?.mensaje?.id === item.id ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <strong>{item.docente?.nombre || 'Docente'} {item.docente?.apellido || ''}</strong>
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '999px', border: `1px solid ${color}`, background: `${color}22` }}>{estado.charAt(0).toUpperCase() + estado.slice(1)}</span>
                      </div>
                      {item.docente?.email && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{item.docente.email}</div>}
                      <div style={{ marginTop: '6px', fontWeight: sinLeer ? 800 : 600, fontSize: '0.85rem' }}>{sinLeer && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginRight: 6 }} />}{item.titulo}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{item.created_at ? new Date(item.created_at).toLocaleString('es-AR') : ''}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {docDetalle?.mensaje && (
              <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 800, marginBottom: '4px' }}>{docDetalle.mensaje.titulo}</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginBottom: '12px' }}>{docDetalle.mensaje.cuerpo}</div>
                {docDetalleLoading ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Cargando conversación…</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' }}>
                    {docDetalle.respuestas.map((r) => (
                      <div key={r.id} style={{ padding: '10px 12px', borderRadius: '12px', background: r.autor === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{r.autor === 'admin' ? 'Administración' : 'Docente'}</div>
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{r.cuerpo}</div>
                        <div style={{ marginTop: '6px', fontSize: '0.64rem', color: 'rgba(255,255,255,0.45)' }}>{new Date(r.created_at).toLocaleString('es-AR')}</div>
                      </div>
                    ))}
                  </div>
                )}
                <textarea value={docReply} onChange={(e) => setDocReply(e.target.value.slice(0, 2000))} rows={3} className="input-field" style={{ width: '100%', resize: 'vertical', marginTop: '12px' }} placeholder="Responder al docente…" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{docReply.length}/2000</span>
                  <button type="button" onClick={responderMensajeDocente} disabled={docSending} style={{ background: 'linear-gradient(135deg, #22c55e, #3b82f6)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
                    {docSending ? 'Enviando…' : 'Responder'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Enviar mensaje a docentes</h3>

            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Titulo</label>
                <input value={mensajeForm.titulo} maxLength={150} onChange={(e) => setMensajeForm((prev) => ({ ...prev, titulo: e.target.value }))} className="input-field" style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Tipo</label>
                <select value={mensajeForm.tipo} onChange={(e) => setMensajeForm((prev) => ({ ...prev, tipo: e.target.value }))} className="input-field" style={{ width: '100%' }}>
                  <option value="aviso">Aviso</option>
                  <option value="oferta">Oferta</option>
                  <option value="plan">Plan</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Alcance</label>
                <select value={mensajeForm.alcance} onChange={(e) => setMensajeForm((prev) => ({ ...prev, alcance: e.target.value }))} className="input-field" style={{ width: '100%' }}>
                  <option value="todos">Todos</option>
                  <option value="plan">Por plan</option>
                  <option value="docentes">Docentes específicos</option>
                </select>
              </div>

              {mensajeForm.alcance === 'plan' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Plan</label>
                  <select value={mensajeForm.plan} onChange={(e) => setMensajeForm((prev) => ({ ...prev, plan: e.target.value }))} className="input-field" style={{ width: '100%' }}>
                    <option value="gratuito">Gratuito</option>
                    <option value="basico">Básico</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              )}

              {mensajeForm.alcance === 'docentes' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Docentes (IDs o emails)</label>
                  <input value={mensajeForm.docenteIds.join(', ')} onChange={(e) => setMensajeForm((prev) => ({ ...prev, docenteIds: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))} className="input-field" style={{ width: '100%' }} placeholder="docente@example.com, otro@..." />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Cuerpo</label>
                <textarea value={mensajeForm.cuerpo} maxLength={2000} onChange={(e) => setMensajeForm((prev) => ({ ...prev, cuerpo: e.target.value }))} rows={6} className="input-field" style={{ width: '100%', resize: 'vertical' }} />
                <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginTop: '0.25rem' }}>{mensajeForm.cuerpo.length}/2000</div>
              </div>

              <button onClick={handleEnviarMensaje} disabled={enviando} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}>
                {enviando ? 'Enviando…' : 'Enviar mensaje'}
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Respuestas pendientes</h3>
            {pendientes.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)' }}>No hay respuestas pendientes.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {pendientes.map((item) => (
                  <button key={item.id} type="button" onClick={() => cargarConversacion(item.id)} style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 800 }}>{item.docentes?.nombre || 'Docente'} {item.docentes?.apellido || ''}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{item.docentes?.email || ''}</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>{item.mensajes_admin?.titulo || 'Conversación'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{new Date(item.ultima_actividad_at).toLocaleString('es-AR')}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Historial de mensajes enviados</h3>
            {historialMensajes.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)' }}>Aún no enviaste mensajes.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {historialMensajes.map((mensaje) => (
                  <div key={mensaje.id} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <strong>{mensaje.titulo}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{mensaje.tipo?.toUpperCase()}</span>
                    </div>
                    <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{mensaje.cuerpo}</div>
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>Alcance: {mensaje.alcance} · Enviado: {new Date(mensaje.created_at).toLocaleString('es-AR')}</div>
                    <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Destinatarios: {mensaje.destinatarios ?? 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {detalleConversacion && (
            <div className="glass-card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Conversa con el docente</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
                {(detalleConversacion.respuestas || []).map((respuesta) => (
                  <div key={respuesta.id} style={{ padding: '10px 12px', borderRadius: '12px', background: respuesta.autor === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', textTransform: 'capitalize' }}>{respuesta.autor}</div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{respuesta.cuerpo}</div>
                    <div style={{ marginTop: '6px', fontSize: '0.64rem', color: 'rgba(255,255,255,0.45)' }}>{new Date(respuesta.created_at).toLocaleString('es-AR')}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value.slice(0, 2000))} rows={4} className="input-field" style={{ width: '100%', resize: 'vertical' }} placeholder="Responder al docente…" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{replyText.length}/2000</span>
                  <button onClick={handleRespondToConversation} disabled={sendingReply} style={{ background: 'linear-gradient(135deg, #22c55e, #3b82f6)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
                    {sendingReply ? 'Enviando…' : 'Responder'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB PRECIOS */}
      {tab === 'precios' && <PreciosAdmin />}

    </div>
  );
}
