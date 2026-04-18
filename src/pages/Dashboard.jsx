import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { EscuelasAPI, PerfilAPI, CursosAPI, BackupAPI, FeedbackAPI } from '../services/api';
import '../components/Chips.css';

export default function Dashboard({ session }) {
  const [escuelas, setEscuelas] = useState([]);
  const [cursosHoy, setCursosHoy] = useState([]);
  const docenteId = session?.user?.id;
  const navigate = useNavigate();

  const [docente, setDocente] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  // Feedback states
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    // Detectar si la app es instalable
    window.addEventListener('beforeinstallprompt', (e) => {
      // Dejamos que el navegador muestre su cartel si quiere (No hacemos e.preventDefault())
      setDeferredPrompt(e);
    });

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

      // Backup automático silencioso
      BackupAPI.createSnapshot(docenteId);
    }
  }, [docenteId]);

  const handleRestoreAuto = async () => {
    if (!window.confirm('¿Deseas recuperar la última copia de seguridad automática? Los cambios de hoy se sobreescribirán.')) return;
    try {
      setExporting(true);
      await BackupAPI.restoreLast(docenteId);
      alert('¡Agenda restaurada con éxito!');
      window.location.reload();
    } catch (e) { alert('Error: ' + e.message); } 
    finally { setExporting(false); }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
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
      link.download = `Respaldo_Seguridad_${new Date().toLocaleDateString()}.json`;
      link.click();
    } catch (e) { alert('Error exportando'); } finally { setExporting(false); }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const resCur = await CursosAPI.getByDocente(docenteId);
      let csv = "Escuela,Numero,Año,Division,Materia\n";
      resCur.forEach(c => { csv += `"${c.escuelas?.nombre}","${c.escuelas?.numero || ''}","${c.anio_o_grado}","${c.division || ''}","${c.materia || ''}"\n`; });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mis_Cursos_${new Date().toLocaleDateString()}.csv`;
      link.click();
    } catch (e) { alert('Error CSV'); } finally { setExporting(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const handleSendFeedback = async () => {
    try {
      setSendingFeedback(true);
      await FeedbackAPI.create({
        docente_id: docenteId,
        estrellas: rating,
        comentario: comment,
        modulo_referencia: 'Dashboard'
      });
      alert('¡Gracias por tu valoración! Nos ayuda mucho a mejorar.');
      setShowFeedback(false);
      setComment('');
    } catch (e) {
      alert('Error al enviar feedback: ' + e.message);
    } finally {
      setSendingFeedback(false);
    }
  };

  const userName = session?.user?.user_metadata?.full_name || 'Docente';
  const firstName = userName.split(' ')[0];

  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '7rem' }}>
      
      {/* HEADER PREMIUM RECONSTRUIDO */}
      <header className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div className="user-info" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={docente?.foto_perfil || session?.user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userName) + '&background=8b5cf6&color=fff'} 
              alt="Profile" 
              className="avatar" 
              style={{ width: '50px', height: '50px', border: '2px solid rgba(255,255,255,0.1)', objectFit: 'cover' }}
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userName) + '&background=8b5cf6&color=fff';
              }}
            />
            <span style={{ 
              position: 'absolute', bottom: '-2px', right: '-2px', 
              background: docente?.is_premium ? 'var(--green)' : 'var(--orange)', 
              color: '#fff', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '6px', fontWeight: 900, border: '2px solid #111'
            }}>
              {docente?.subscription_plan?.toUpperCase() || 'FREE'}
            </span>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '-2px' }}>
              {daysLeft !== null && !docente?.is_premium ? (
                <span style={{ color: 'var(--orange-light)', fontWeight: 600 }}>Trial: {daysLeft} días restantes</span>
              ) : '¡Hola!'}
            </p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              Bienvenido/a, <span className="text-gradient">{firstName}</span> 🎒
            </h2>
          </div>
        </div>

        {/* BOTÓN DE CONFIGURACIÓN (Rueda) */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="glass-card" 
            style={{ 
              width: '45px', height: '45px', borderRadius: '14px', 
              display: 'flex', justifyContent: 'center', alignItems: 'center', 
              cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
              background: showConfig ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              transition: '0.3s'
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={showConfig ? '#fff' : 'var(--text-secondary)'} strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          {/* MENÚ DESPLEGABLE */}
          {showConfig && (
            <>
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setShowConfig(false)} />
              <div className="glass-card animate-scale-in" style={{ 
                position: 'absolute', top: '120%', right: 0, zIndex: 100,
                width: '260px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)',
                background: '#141824', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}>
                {!docente?.is_premium && (
                  <Link to="/suscripcion" onClick={() => setShowConfig(false)} style={{ 
                    textDecoration: 'none', background: 'var(--primary)', color: '#fff', 
                    padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.8rem', marginBottom: '12px'
                  }}>
                    PASAR A PREMIUM ✨
                  </Link>
                )}

                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', padding: '5px 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Suscripción</p>
                <Link to="/suscripcion" onClick={() => setShowConfig(false)} className="menu-item" style={{ display: 'flex', gap: '10px', padding: '10px', textDecoration: 'none', color: '#fff' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  <span>Planes y Beneficios</span>
                </Link>

                {deferredPrompt && (
                  <button onClick={handleInstallApp} className="menu-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', gap: '10px', padding: '10px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 800 }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    <span>INSTALAR APLICACIÓN</span>
                  </button>
                )}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', padding: '5px 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Datos y Backup</p>
                <button onClick={handleExportCSV} className="menu-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', gap: '10px', padding: '10px', color: '#fff', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span>Exportar a Excel</span>
                </button>
                <button onClick={handleExportJSON} className="menu-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', gap: '10px', padding: '10px', color: '#fff', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>Resguardo Técnico</span>
                </button>
                <button onClick={handleRestoreAuto} className="menu-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', gap: '10px', padding: '10px', color: '#fff', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--orange)" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  <span>Restaurar de la Nube</span>
                </button>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                
                <button onClick={handleLogout} className="menu-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', gap: '10px', padding: '10px', color: '#ff4d4d', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  <span>Cerrar Sesión</span>
                </button>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                
                <button onClick={() => { setShowFeedback(true); setShowConfig(false); }} className="menu-item" style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,0.03)', textAlign: 'left', display: 'flex', gap: '10px', padding: '12px', color: '#facc15', cursor: 'pointer', borderRadius: '8px' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ fontWeight: 800 }}>Darnos Feedback ⭐</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1px' }}>Agenda Docente</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Tu espacio de trabajo inteligente.</p>
      </div>

      <Link to="/horarios" className="glass-card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.2rem', textDecoration: 'none', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(79, 70, 229, 0.15))', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <div style={{ background: 'var(--purple-bg)', color: 'var(--purple)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '2px' }}>Mi Horario Semanal</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>¿Qué curso me toca hoy?</p>
        </div>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </Link>

      <button className="btn-primary" onClick={() => escuelas.length === 1 ? navigate(`/escuelas/${escuelas[0].id}`) : navigate('/escuelas')} style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem', marginBottom: '2.5rem', fontWeight: 800 }}>
        INICIAR CLASE HOY
      </button>

      <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>Accesos Rápidos</h3>
      <div className="chips-slider" style={{ marginBottom: '2.5rem' }}>
        {escuelas.length > 0 ? escuelas.map((esc) => (
          <Link key={esc.id} to={`/escuelas/${esc.id}`} className="school-chip">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {esc.nombre.split(' ')[0]} {esc.numero ? `Nº ${esc.numero}` : ''}
          </Link>
        )) : <Link to="/escuelas" className="school-chip chip-empty">+ Agregar Escuela</Link>}
      </div>

      <h3 style={{ marginBottom: '1.2rem', fontSize: '1.2rem', fontWeight: 700 }}>Explorar Módulos</h3>
      <section className="modules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <Link to="/escuelas" className="module-card glass-card color-blue" style={{ padding: '1.2rem' }}>
          <div className="module-icon" style={{ marginBottom: '12px' }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Escuelas</h4><p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Gestión de cursos</p>
        </Link>
        <Link to="/planificaciones" className="module-card glass-card color-purple" style={{ padding: '1.2rem' }}>
          <div className="module-icon" style={{ marginBottom: '12px' }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Documentos</h4><p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Planificaciones PDF</p>
        </Link>
        <Link to="/calendario" className="module-card glass-card color-green" style={{ padding: '1.2rem' }}>
          <div className="module-icon" style={{ marginBottom: '12px' }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Calendario</h4><p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Eventos y feriados</p>
        </Link>
        <Link to="/contactos" className="module-card glass-card color-yellow" style={{ padding: '1.2rem' }}>
          <div className="module-icon" style={{ marginBottom: '12px' }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg></div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Contactos</h4><p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Familias y otros</p>
        </Link>
      </section>

      {/* MODAL DE FEEDBACK ⭐ */}
      {showFeedback && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>¿Cómo vienes con la App?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Tu opinión es el motor de esta agenda.</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem',
                    color: star <= rating ? '#facc15' : 'rgba(255,255,255,0.1)',
                    transition: '0.2s transform'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe una sugerencia o lo que más te gusta..."
              style={{
                width: '100%', height: '100px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                color: '#fff', padding: '12px', fontSize: '0.9rem', outline: 'none',
                marginBottom: '1.5rem', resize: 'none'
              }}
            />

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowFeedback(false)} disabled={sendingFeedback}>Ahora no</button>
              <button 
                className="btn-primary" 
                onClick={handleSendFeedback} 
                disabled={sendingFeedback || !comment.trim()}
                style={{ flex: 2 }}
              >
                {sendingFeedback ? 'Enviando...' : 'Enviar Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
