import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function HorarioSemanal({ session }) {
  const [horarios, setHorarios] = useState([]);
  const [bloquesDinamicos, setBloquesDinamicos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState(window.innerWidth > 991 ? 'table' : 'cards'); 
  
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    const hoy = new Date().getDay(); // 0=Dom, 1=Lun...5=Vie
    return hoy >= 1 && hoy <= 5 ? hoy - 1 : 0; // 0=Lunes index
  });
  const docenteId = session?.user?.id;

  useEffect(() => {
    if (docenteId) loadHorarios();
    
    const handleResize = () => {
      if (window.innerWidth <= 991) setViewMode('cards');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [docenteId]);

  const loadHorarios = async () => {
    try {
      const { data, error } = await supabase
        .from('horarios_curso')
        .select(`
          id, dia_semana, hora_inicio, hora_fin,
          cursos (
            id, nombre, anio_o_grado, division, materia,
            escuelas ( nombre, numero )
          )
        `)
        .eq('docente_id', docenteId);

      if (error) throw error;
      setHorarios(data || []);

      if (data && data.length > 0) {
        const rangosExistentes = data.map(h => `${h.hora_inicio.slice(0, 5)} - ${h.hora_fin.slice(0, 5)}`);
        const rangosUnicos = [...new Set(rangosExistentes)].sort((a, b) => a.localeCompare(b));
        setBloquesDinamicos(rangosUnicos);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventos = (diaIdx, horaRango) => {
    const [inicioBloque, finBloque] = horaRango.split(' - ');
    return horarios.filter(h => {
      const hInicio = h.hora_inicio.slice(0, 5);
      const hFin = h.hora_fin.slice(0, 5);
      return h.dia_semana === (diaIdx + 1) && hInicio === inicioBloque && hFin === finBloque;
    });
  };

  const getClasesDia = (diaIdx) => horarios.filter(h => h.dia_semana === (diaIdx + 1))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const hoyIdx = (() => { const d = new Date().getDay(); return d >= 1 && d <= 5 ? d - 1 : -1; })();

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem', color: '#6366f1', fontFamily: "'Outfit', sans-serif" }}>Cargando tu agenda... ✨</div>;

  return (
    <div className="app-container" style={{ minHeight: '100vh', color: '#fff' }}>

      {/* ── HEADER ── */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 600,
            marginBottom: '16px', background: 'rgba(255,255,255,0.06)', padding: '7px 12px',
            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Volver
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 4px', color: '#fff' }}>Mi Horario Semanal</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Tus clases de la semana</p>
        </div>

        {/* Toggle - SOLO PARA DESKTOP */}
        <div className="desktop-only" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={() => setViewMode('table')} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800,
            background: viewMode === 'table' ? '#6366f1' : 'transparent', color: viewMode === 'table' ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s'
          }}>VISTA TABLA</button>
          <button onClick={() => setViewMode('cards')} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800,
            background: viewMode === 'cards' ? '#6366f1' : 'transparent', color: viewMode === 'cards' ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s'
          }}>VISTA LISTA</button>
        </div>
      </header>

      {/* ── VISTA CARDS (Mobile / Web Simplificada) ── */}
      <div className={(viewMode === 'cards' ? 'show-block' : 'hide-on-desktop') + ' horario-cards-container'}>
        <div className="dia-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none', padding: '12px 10px' }}>
          {DIAS_SEMANA.map((dia, idx) => {
            const activo = diaSeleccionado === idx;
            return (
              <button key={dia} onClick={() => setDiaSeleccionado(idx)} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: '10px', border: 'none',
                background: activo ? '#6366f1' : 'rgba(255,255,255,0.06)',
                color: activo ? '#fff' : 'rgba(255,255,255,0.55)',
                fontWeight: activo ? 800 : 600, fontSize: '0.8rem', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                outline: idx === hoyIdx && !activo ? '2px solid #6366f1' : 'none',
                animation: idx === hoyIdx ? 'glow-pulse 2s ease-in-out infinite' : 'none',
                position: 'relative'
              }}>
                {dia.slice(0, 3)}
                {idx === hoyIdx && <span style={{ display: 'block', fontSize: '0.45rem', fontWeight: 900, marginTop: '1px', opacity: 0.8 }}>HOY</span>}
              </button>
            );
          })}
        </div>

        <div style={{ paddingBottom: '100px' }}>
          {getClasesDia(diaSeleccionado).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Sin clases este día 🎉</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px', margin: viewMode === 'cards' && window.innerWidth > 991 ? '0 auto' : '0' }}>
              {getClasesDia(diaSeleccionado).map(clase => {
                const color = (clase.cursos?.materia || '').toLowerCase().includes('preceptor') ? '#10b981' : '#8b5cf6';
                return (
                  <div key={clase.id} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`, borderLeft: `4px solid ${color}`, borderRadius: '14px', padding: '14px', display: 'flex', gap: '12px' }}>
                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '48px' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color }}>{clase.hora_inicio.slice(0, 5)}</p>
                      <div style={{ width: '1px', height: '16px', background: `${color}44`, margin: '4px auto' }} />
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{clase.hora_fin.slice(0, 5)}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{clase.cursos?.escuelas?.nombre} {clase.cursos?.escuelas?.numero ? `Nº ${clase.cursos.escuelas.numero}` : ''}</p>
                      <p style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 900 }}>{clase.cursos?.anio_o_grado} {clase.cursos?.division}</p>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', background: `${color}22`, border: `1px solid ${color}44`, fontSize: '0.7rem', fontWeight: 700, color }}>{clase.cursos?.materia || 'Sin materia'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── VISTA TABLA (Desktop Default / Optional) ── */}
      <div className={(viewMode === 'table' ? 'show-block' : 'hide-always') + ' horario-table-container'} style={{ 
        overflowX: 'auto', 
        background: '#242f47', // Azul Slate 700/800 más claro y sólido
        borderRadius: '24px', 
        border: '1px solid rgba(255,255,255,0.12)', 
        padding: '1.5rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '12px', minWidth: '950px' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '1.5px' }}>HORARIO</th>
              {DIAS_SEMANA.map((dia, idx) => (
                <th key={dia} style={{ padding: '12px', textAlign: 'center', color: idx === hoyIdx ? '#818cf8' : '#fff', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '1px' }}>{dia.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloquesDinamicos.map(rango => (
              <tr key={rango}>
                <td style={{ padding: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '15px', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#818cf8', border: '1px solid rgba(255,255,255,0.05)' }}>{rango}</td>
                {DIAS_SEMANA.map((_, idx) => {
                  const eventos = getEventos(idx, rango);
                  return (
                    <td key={idx} style={{ verticalAlign: 'top', width: '18%' }}>
                      {eventos.map(ev => {
                        const color = (ev.cursos?.materia || '').toLowerCase().includes('preceptor') ? '#10b981' : '#8b5cf6';
                        return (
                          <div key={ev.id} style={{ background: 'rgba(15, 23, 42, 0.4)', border: `1px solid rgba(255,255,255,0.08)`, borderLeft: `5px solid ${color}`, padding: '12px', borderRadius: '15px', fontSize: '0.75rem', marginBottom: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>{ev.cursos?.anio_o_grado} {ev.cursos?.division}</p>
                            <p style={{ margin: 0, opacity: 0.9, fontWeight: 700, color: color, fontSize: '0.7rem' }}>{ev.cursos?.materia || 'Sin materia'}</p>
                            <p style={{ margin: '6px 0 0', opacity: 0.4, fontSize: '0.62rem', fontWeight: 600 }}>{ev.cursos?.escuelas?.nombre} {ev.cursos?.escuelas?.numero ? `Nº ${ev.cursos.escuelas.numero}` : ''}</p>
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes glow-pulse {
          0%   { box-shadow: 0 0 0px 0px rgba(249,115,22,0); }
          50%  { box-shadow: 0 0 14px 5px rgba(249,115,22,0.85); }
          100% { box-shadow: 0 0 0px 0px rgba(249,115,22,0); }
        }
        @media (min-width: 992px) {
          .desktop-only { display: flex !important; }
          .show-block { display: block !important; }
          .hide-on-desktop { display: none !important; }
          .hide-always { display: none !important; }
        }
        @media (max-width: 991px) {
          .desktop-only { display: none !important; }
          .horario-table-container { display: none !important; }
          .horario-cards-container { display: block !important; }
        }
      `}</style>
    </div>
  );
}
