import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { EscuelasAPI, PerfilAPI, CursosAPI, BackupAPI, FeedbackAPI } from '../services/api';
import '../components/Chips.css';
import OnboardingTour from '../components/OnboardingTour';

export default function Dashboard({ session }) {
  const [escuelas, setEscuelas] = useState([]);
  const [cursosHoy, setCursosHoy] = useState([]);
  const docenteId = session?.user?.id;
  const navigate = useNavigate();

  const [docente, setDocente] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [forceStartTour, setForceStartTour] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 58, right: 12 });
  const configBtnRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => { setDeferredPrompt(e); });
    if (docenteId) {
      PerfilAPI.getProfile(docenteId).then(data => {
        setDocente(data);
        if (data?.trial_ends_at) {
          const diff = new Date(data.trial_ends_at) - new Date();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          setDaysLeft(days > 0 ? days : 0);
        }
      });
      EscuelasAPI.getByDocente(docenteId).then(data => setEscuelas(data || []));
      CursosAPI.getByDocente(docenteId).then(data => setCursosHoy(data || []));
      BackupAPI.createSnapshot(docenteId);
    }
  }, [docenteId]);

  const handleRestoreAuto = async () => {
    if (!window.confirm('¿Deseas recuperar la última copia de seguridad automática?')) return;
    try {
      setExporting(true);
      await BackupAPI.restoreLast(docenteId);
      alert('¡Agenda restaurada con éxito!');
      window.location.reload();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setExporting(false); }
  };

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      const [resEsc, resCur, resPlan, resCont] = await Promise.all([
        EscuelasAPI.getByDocente(docenteId),
        CursosAPI.getByDocente(docenteId),
        supabase.from('planificaciones').select('*').eq('docente_id', docenteId),
        supabase.from('contactos').select('*').eq('docente_id', docenteId)
      ]);
      const fullBackup = {
        metadata: { app: 'Agenda Docente', date: new Date().toISOString(), docente_id: docenteId },
        escuelas: resEsc || [], cursos: resCur || [], planificaciones: resPlan.data || [], contactos: resCont.data || []
      };
      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Respaldo_${new Date().toLocaleDateString()}.json`;
      link.click();
    } catch (e) { alert('Error exportando'); } finally { setExporting(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSendFeedback = async () => {
    try {
      setSendingFeedback(true);
      await FeedbackAPI.create({ docente_id: docenteId, estrellas: rating, comentario: comment, modulo_referencia: 'Dashboard' });
      alert('¡Gracias por tu valoración!');
      setShowFeedback(false);
      setComment('');
    } catch (e) { alert('Error al enviar: ' + e.message); }
    finally { setSendingFeedback(false); }
  };

  const userName = session?.user?.user_metadata?.full_name || 'Docente';
  const firstName = userName.split(' ')[0];
  const avatarUrl = docente?.foto_perfil || session?.user?.user_metadata?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=8b5cf6&color=fff`;

  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '90px', minHeight: '100vh', color: '#fff', boxSizing: 'border-box' }}>

      {/* ── HEADER ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>

        {/* Avatar + saludo */}
        <div id="tour-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div style={{ position: 'relative', flexShrink: 0, width: '36px', height: '36px' }}>
            <img src={avatarUrl} alt="Perfil"
              style={{ width: '36px', height: '36px', borderRadius: '9px', border: '1.5px solid rgba(255,255,255,0.15)', objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=8b5cf6&color=fff`; }}
            />
            <span style={{ position: 'absolute', bottom: '-3px', right: '-3px', background: docente?.is_premium ? '#10b981' : '#f59e0b', color: '#fff', fontSize: '0.45rem', padding: '1px 2px', borderRadius: '3px', fontWeight: 900, border: '1px solid #111', whiteSpace: 'nowrap', lineHeight: 1 }}>
              {docente?.subscription_plan?.toUpperCase() || 'FREE'}
            </span>
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontWeight: 600, lineHeight: 1.2 }}>
              {daysLeft !== null && !docente?.is_premium ? `Trial: ${daysLeft} días` : '¡Hola!'}
            </p>
            <h2 style={{ margin: 0, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Bienvenido/a, <span className="text-gradient">{firstName}</span> 🎒
            </h2>
          </div>
        </div>

        {/* Botón config */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button id="tour-config" ref={configBtnRef} onClick={() => {
            if (!showConfig && configBtnRef.current) {
              const rect = configBtnRef.current.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
            }
            setShowConfig(prev => !prev);
          }}
            style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)', background: showConfig ? '#8b5cf6' : 'rgba(255,255,255,0.05)', padding: 0, transition: 'background 0.2s' }}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={showConfig ? '#fff' : 'rgba(255,255,255,0.6)'} strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* Dropdown menú */}
          {showConfig && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowConfig(false)} />
              <div className="animate-scale-in" style={{ position: 'fixed', top: `${menuPos.top}px`, right: `${menuPos.right}px`, zIndex: 9999, width: '210px', padding: '10px', background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, padding: '2px 8px 6px', margin: 0 }}>Opciones</p>

                <Link to="/inicio" onClick={() => setShowConfig(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', textDecoration: 'none', color: '#fff', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Ir al Sitio Web</span>
                </Link>

                <button onClick={() => { handleRestoreAuto(); setShowConfig(false); }}
                  style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: '#f97316', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Restaurar Nube</span>
                </button>

                <button onClick={handleExportJSON}
                  style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: '#a3e635', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Exportar JSON</span>
                </button>

                <button onClick={() => { setShowFeedback(true); setShowConfig(false); }}
                  style={{ width: '100%', border: 'none', background: 'rgba(250,204,21,0.06)', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: '#facc15', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Dar Feedback ⭐</span>
                </button>

                <button onClick={() => { setForceStartTour(true); setShowConfig(false); }}
                  style={{ width: '100%', border: 'none', background: 'rgba(139,92,246,0.06)', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: '#c4b5fd', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Recorrido Guiado 🚀</span>
                </button>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

                <button onClick={handleLogout}
                  style={{ width: '100%', border: 'none', background: 'rgba(239,68,68,0.06)', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: '#ef4444', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Cerrar Sesión</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── TÍTULO ── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 12px 0', lineHeight: 1.4, color: '#fff' }}>Agenda Docente</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Tu espacio de trabajo inteligente.</p>
      </div>

      {/* ── ACCESOS RÁPIDOS (chips de escuelas) ── */}
      {escuelas.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
          {escuelas.map(esc => (
            <Link key={esc.id} to={`/escuelas/${esc.id}`}
              style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '20px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              🏫 {esc.nombre?.split(' ')[0]} {esc.numero ? `Nº ${esc.numero}` : ''}
            </Link>
          ))}
        </div>
      )}

      {/* ── HORARIO SEMANAL ── */}
      <Link id="tour-horarios" to="/horarios" className="glass-card"
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(79,70,229,0.12))', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '14px', textDecoration: 'none', marginBottom: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Mi Horario Semanal</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>¿Qué curso me toca hoy?</p>
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </Link>

      {/* ── BOTÓN INICIAR CLASE ── */}
      <button id="tour-iniciar-clase" className="btn-primary"
        onClick={() => escuelas.length === 1 ? navigate(`/escuelas/${escuelas[0].id}`) : navigate('/escuelas')}
        style={{ width: '100%', padding: '13px', borderRadius: '12px', marginBottom: '22px', border: 'none', cursor: 'pointer', fontFamily: "'Gloria Hallelujah', cursive", fontSize: '1.2rem' }}>
        Iniciar Clase Hoy
      </button>

      {/* ── MÓDULOS ── */}
      <p style={{ fontFamily: "'Gloria Hallelujah', cursive", fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>Módulos</p>
      <div id="tour-modulos" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <Link to="/escuelas" className="glass-card" style={{ padding: '14px', borderRadius: '16px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '3px solid #3b82f6' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.15)' }}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div><h4 style={{ margin: 0, color: '#fff' }}>Escuelas</h4><p style={{ margin: 0, color: 'rgba(255,255,255,0.5)' }}>Cursos y alumnos</p></div>
        </Link>
        <Link to="/planificaciones" className="glass-card" style={{ padding: '14px', borderRadius: '16px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '3px solid #a855f7' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,85,247,0.15)' }}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#a855f7" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div><h4 style={{ margin: 0, color: '#fff' }}>Documentos</h4><p style={{ margin: 0, color: 'rgba(255,255,255,0.5)' }}>Planificaciones PDF</p></div>
        </Link>
        <Link to="/calendario" className="glass-card" style={{ padding: '14px', borderRadius: '16px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '3px solid #10b981' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)' }}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#10b981" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div><h4 style={{ margin: 0, color: '#fff' }}>Calendario</h4><p style={{ margin: 0, color: 'rgba(255,255,255,0.5)' }}>Eventos y actos</p></div>
        </Link>
        <Link to="/contactos" className="glass-card" style={{ padding: '14px', borderRadius: '16px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.15)' }}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div><h4 style={{ margin: 0, color: '#fff' }}>Contactos</h4><p style={{ margin: 0, color: 'rgba(255,255,255,0.5)' }}>Familias</p></div>
        </Link>
      </div>

      {/* ── MODAL FEEDBACK ── */}
      {showFeedback && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.85)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '360px', padding: '24px', borderRadius: '24px', background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '6px' }}>¿Cómo venís con la App? 🌟</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '20px', fontSize: '0.85rem' }}>Tu opinión nos ayuda a mejorar.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem', color: star <= rating ? '#facc15' : 'rgba(255,255,255,0.12)', transition: 'transform 0.15s' }}
                  onMouseOver={e => e.target.style.transform = 'scale(1.2)'}
                  onMouseOut={e => e.target.style.transform = 'scale(1)'}>★</button>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Escribe una sugerencia..."
              style={{ width: '100%', height: '90px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '10px', fontSize: '0.85rem', outline: 'none', marginBottom: '16px', resize: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setShowFeedback(false)} disabled={sendingFeedback} style={{ flex: 1, padding: '11px', borderRadius: '10px' }}>Ahora no</button>
              <button className="btn-primary" onClick={handleSendFeedback} disabled={sendingFeedback} style={{ flex: 2, padding: '11px', borderRadius: '10px' }}>
                {sendingFeedback ? 'Enviando...' : 'Enviar ⭐'}
              </button>
            </div>
          </div>
        </div>
      )}
      <OnboardingTour forceStart={forceStartTour} onTourEnd={() => setForceStartTour(false)} />
    </div>
  );
}
