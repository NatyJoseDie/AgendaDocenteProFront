import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { EscuelasAPI, PerfilAPI, CursosAPI, BackupAPI, FeedbackAPI, PushNotificationsAPI } from '../services/api';
import { getSubscriptionStatus, formatPrecio, getPlanPrecio } from '../constants/plans';
import usePlanes from '../hooks/usePlanes';
import '../components/Chips.css';
import OnboardingTour from '../components/OnboardingTour';
import PushNotificationsSettings from '../components/PushNotificationsSettings';
import NotificationBell from '../components/NotificationBell';
import { MensajesBell } from '../components/MensajesPanel';

export default function Dashboard({ session }) {
  const [escuelas, setEscuelas] = useState([]);
  const [cursosHoy, setCursosHoy] = useState([]);
  const docenteId = session?.user?.id;
  const navigate = useNavigate();

  const [docente, setDocente] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [forceStartTour, setForceStartTour] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 96, left: 0 });
  const configBtnRef = useRef(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showTrialNotice, setShowTrialNotice] = useState(false);
  const subStatus = getSubscriptionStatus(docente);
  const isAdmin = docente?.is_admin === true;
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const { planes } = usePlanes();
  const proMensual = getPlanPrecio(planes, 'pro', 'mensual')?.precio_vigente ?? 4500;

  useEffect(() => {
    let cancelled = false;
    window.addEventListener('beforeinstallprompt', (e) => { setDeferredPrompt(e); });
    if (docenteId) {
      setDocente(null);
      setProfileError(null);
      PerfilAPI.getProfile().then(data => {
        if (cancelled) return;
        setDocente(data);
        if (data?.trial_ends_at) {
          const diff = new Date(data.trial_ends_at) - new Date();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          setDaysLeft(days > 0 ? days : 0);

          const hasSeenTrialNotice = localStorage.getItem('agenda_trial_notice_seen') === 'true';
          const isVipBeta = Boolean(data?.is_vip_beta);
          const isPremiumAccess = Boolean(
            data?.is_premium ||
            isVipBeta ||
            ['premium', 'pro', 'basico', 'basic'].includes(String(data?.plan || data?.subscription_plan || '').toLowerCase())
          );
          if (!hasSeenTrialNotice && days > 0 && (isVipBeta || isPremiumAccess || days <= 14)) {
            setShowTrialNotice(true);
          }
        }
      }).catch(error => {
        if (!cancelled) {
          console.error('Error al cargar el perfil:', error);
          setProfileError(error.message);
        }
      });
      EscuelasAPI.getByDocente(docenteId).then(data => setEscuelas(data || []));
      CursosAPI.getByDocente(docenteId).then(data => setCursosHoy(data || []));
      BackupAPI.createSnapshot(docenteId);
    }
    return () => { cancelled = true; };
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
    setLoggingOut(true);
    try {
      try {
        await PushNotificationsAPI.unsubscribeCurrentDevice(docenteId);
      } catch (pushError) {
        const shouldContinue = window.confirm(
          `No se pudo completar la baja de notificaciones Push: ${pushError.message}\n\n¿Querés cerrar sesión igualmente?`
        );
        if (!shouldContinue) return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      window.alert(`No se pudo cerrar sesión: ${error.message}`);
    } finally {
      setLoggingOut(false);
    }
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
  const isCompactMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const avatarUrl = docente?.foto_perfil || session?.user?.user_metadata?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=8b5cf6&color=fff`;

  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '90px', minHeight: '100vh', color: '#fff', boxSizing: 'border-box' }}>

      {profileError && <p role="alert" style={{ color: '#fca5a5' }}>No se pudo cargar tu perfil: {profileError}</p>}

      {/* ── HEADER ── */}
      <header className="dashboard-main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px', flexWrap: 'nowrap' }}>

        {/* Avatar + saludo */}
        <div id="tour-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            <img src={avatarUrl} alt="Perfil"
              style={{ width: '36px', height: '36px', borderRadius: '9px', border: '1.5px solid rgba(255,255,255,0.15)', objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=8b5cf6&color=fff`; }}
            />
            <span style={{ background: isAdmin ? 'linear-gradient(90deg, #ec4899, #8b5cf6)' : subStatus.isReadOnly ? '#ef4444' : subStatus.isVipBeta ? '#6366f1' : docente?.is_premium ? '#10b981' : '#f59e0b', color: '#fff', fontSize: '0.55rem', padding: '3px 6px', borderRadius: '6px', fontWeight: 900, whiteSpace: 'nowrap', lineHeight: 1 }}>
              {isAdmin ? 'FUNDADORA 👑' : subStatus.label}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="dashboard-welcome-sub" style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
              {daysLeft !== null && !docente?.is_premium ? `Trial: ${daysLeft} días` : '¡Hola!'}
            </p>
            <h2 className="dashboard-welcome-title" style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>
              Bienvenido/a, <span className="text-gradient">{firstName}</span> 🎒
            </h2>
          </div>
        </div>

        {/* Acciones header */}
        <div className="dashboard-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <MensajesBell />
          <NotificationBell />
          <div style={{ position: 'relative', flexShrink: 0 }}>
          <button id="tour-config" className="btn-header-trigger" ref={configBtnRef} onClick={() => {
            if (!showConfig && configBtnRef.current) {
              const rect = configBtnRef.current.getBoundingClientRect();
              const menuWidth = Math.min(340, window.innerWidth - 24);
              const top = Math.min(rect.bottom + 8, Math.max(10, window.innerHeight - 80));
              let left = rect.right - menuWidth;

              if (left < 10) left = 10;
              if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;

              setMenuPos({ top, left });
            }
            setShowConfig(prev => !prev);
          }}
            style={{ width: isCompactMobile ? '34px' : '40px', height: isCompactMobile ? '34px' : '40px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)', background: showConfig ? '#8b5cf6' : 'rgba(255,255,255,0.05)', padding: 0, transition: 'background 0.2s' }}>
            <svg viewBox="0 0 24 24" width={isCompactMobile ? '16' : '19'} height={isCompactMobile ? '16' : '19'} fill="none" stroke={showConfig ? '#fff' : 'rgba(255,255,255,0.6)'} strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* Dropdown menú */}
          {showConfig && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowConfig(false)} />
              <div className="config-menu-container" style={{ position: 'fixed', top: isCompactMobile ? 10 : `${menuPos.top}px`, left: isCompactMobile ? 8 : `${menuPos.left}px`, zIndex: 9999, width: isCompactMobile ? 'calc(100vw - 16px)' : 'min(340px, calc(100vw - 24px))', maxHeight: isCompactMobile ? 'calc(100dvh - 20px)' : `max(0px, calc(100dvh - ${menuPos.top}px - 10px))`, overflowY: 'auto', boxSizing: 'border-box', padding: isCompactMobile ? '8px' : '10px', background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: isCompactMobile ? '2px' : '3px' }}>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, padding: isCompactMobile ? '1px 6px 4px' : '2px 8px 6px', margin: 0 }}>Opciones</p>

                {isAdmin && (
                  <Link to="/admin" className="config-menu-item" onClick={() => setShowConfig(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', textDecoration: 'none', color: '#f59e0b', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', marginBottom: isCompactMobile ? '3px' : '4px' }}>
                    <span style={{ fontSize: '1rem' }}>👑</span>
                    <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 900 }}>Panel de Dueña</span>
                  </Link>
                )}
                <Link to="/suscripcion" className="config-menu-item" onClick={() => setShowConfig(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', textDecoration: 'none', color: '#fff', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', marginBottom: isCompactMobile ? '3px' : '4px' }}>
                  <svg viewBox="0 0 24 24" width={isCompactMobile ? '14' : '16'} height={isCompactMobile ? '14' : '16'} fill="none" stroke="#818cf8" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 700, color: '#c7d2fe' }}>Mi suscripción / Planes</span>
                </Link>

                <a href="mailto:soporteagendadocentepro@gmail.com" className="config-menu-item" onClick={() => setShowConfig(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', textDecoration: 'none', color: '#fff', borderRadius: '10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', marginBottom: isCompactMobile ? '3px' : '4px' }}>
                  <svg viewBox="0 0 24 24" width={isCompactMobile ? '14' : '16'} height={isCompactMobile ? '14' : '16'} fill="none" stroke="#4ade80" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 7l-10 7L2 7" /></svg>
                  <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 700, color: '#bbf7d0' }}>soporteagendadocentepro@gmail.com</span>
                </a>

                <PushNotificationsSettings userId={docenteId} />

                <Link to="/inicio" className="config-menu-item" onClick={() => setShowConfig(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', textDecoration: 'none', color: '#fff', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                  <svg viewBox="0 0 24 24" width={isCompactMobile ? '14' : '16'} height={isCompactMobile ? '14' : '16'} fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 600 }}>Ir al Sitio Web</span>
                </Link>

                <button className="config-menu-item" onClick={() => { handleRestoreAuto(); setShowConfig(false); }}
                  style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', color: '#f97316', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width={isCompactMobile ? '14' : '16'} height={isCompactMobile ? '14' : '16'} fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 600 }}>Restaurar Nube</span>
                </button>

                <button className="config-menu-item" onClick={handleExportJSON}
                  style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', color: '#a3e635', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width={isCompactMobile ? '14' : '16'} height={isCompactMobile ? '14' : '16'} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 600 }}>Exportar JSON</span>
                </button>

                <button className="config-menu-item" onClick={() => { setShowFeedback(true); setShowConfig(false); }}
                  style={{ width: '100%', border: 'none', background: 'rgba(250,204,21,0.06)', display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', color: '#facc15', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width={isCompactMobile ? '14' : '16'} height={isCompactMobile ? '14' : '16'} fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 700 }}>Dar Feedback ⭐</span>
                </button>

                <button className="config-menu-item" onClick={() => { setForceStartTour(true); setShowConfig(false); }}
                  style={{ width: '100%', border: 'none', background: 'rgba(139,92,246,0.06)', display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', color: '#c4b5fd', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}>
                  <svg viewBox="0 0 24 24" width={isCompactMobile ? '14' : '16'} height={isCompactMobile ? '14' : '16'} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 700 }}>Recorrido Guiado 🚀</span>
                </button>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: isCompactMobile ? '3px 0' : '4px 0' }} />

                <button className="config-menu-item" onClick={handleLogout} disabled={loggingOut}
                  style={{ width: '100%', border: 'none', background: 'rgba(239,68,68,0.06)', display: 'flex', alignItems: 'center', gap: '8px', padding: isCompactMobile ? '8px 10px' : '10px 12px', color: '#ef4444', cursor: loggingOut ? 'wait' : 'pointer', borderRadius: '10px', textAlign: 'left', opacity: loggingOut ? 0.65 : 1 }}>
                  <svg viewBox="0 0 24 24" width={isCompactMobile ? '14' : '16'} height={isCompactMobile ? '14' : '16'} fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  <span style={{ fontSize: isCompactMobile ? '0.78rem' : '0.88rem', fontWeight: 700 }}>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </header>

      {showTrialNotice && !subStatus.isReadOnly && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(79,70,229,0.12), rgba(59,130,246,0.12))',
          border: '1px solid rgba(168,85,247,0.45)',
          borderRadius: '18px',
          padding: '18px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 16px 36px rgba(88, 28, 135, 0.18)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px', minWidth: 0 }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0
            }}>
              {(docente?.is_vip_beta || docente?.is_premium || ['premium', 'pro', 'basico', 'basic'].includes(String(docente?.plan || docente?.subscription_plan || '').toLowerCase())) ? '✨' : '⏳'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#e9d5ff', fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {(docente?.is_vip_beta || docente?.is_premium || ['premium', 'pro', 'basico', 'basic'].includes(String(docente?.plan || docente?.subscription_plan || '').toLowerCase())) ? 'Tu acceso premium está activo' : 'Tu prueba gratuita está activa'}
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                {(docente?.is_vip_beta || docente?.is_premium || ['premium', 'pro', 'basico', 'basic'].includes(String(docente?.plan || docente?.subscription_plan || '').toLowerCase())) ? (
                  <>Te quedan <strong>{daysLeft ?? 120} días</strong> de acceso especial. Si no elegís un plan al finalizarlo, tus datos quedarán en <strong>solo lectura</strong>.</>
                ) : (
                  <>Te quedan <strong>{daysLeft ?? 14} días</strong> para probar la app. Si no elegís un plan, luego tus datos quedarán en <strong>solo lectura</strong> y no podrás seguir editando.</>
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('agenda_trial_notice_seen', 'true');
                setShowTrialNotice(false);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Entendido
            </button>
            <Link to="/suscripcion" style={{
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}>
              Ver planes
            </Link>
          </div>
        </div>
      )}

      {/* ── BANNER MODO SOLO LECTURA (Prueba vencida) ── */}
      {subStatus.isReadOnly && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(245, 158, 11, 0.18))',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 800, fontSize: '0.95rem', marginBottom: '4px' }}>
              <span>🔒 Período de prueba finalizado</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.4 }}>
              Tus cursos, alumnos y notas están <strong>resguardados por 30 días</strong> en modo solo lectura. Para continuar tomando asistencia y generar planillas oficiales:
            </p>
          </div>
          <Link to="/suscripcion" style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.88rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}>
            Renovar ahora
          </Link>
        </div>
      )}

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

