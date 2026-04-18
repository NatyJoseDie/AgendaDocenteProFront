import React, { useState, useEffect } from 'react';
import { CalendarioAPI, CursosAPI } from '../services/api';
import { Link } from 'react-router-dom';
import EventoAcademicoModal from '../components/EventoAcademicoModal';

export default function Calendario({ session }) {
  const [eventos, setEventos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('anual'); 
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // MODAL STATES
  const [showModal, setShowModal] = useState(false);

  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // PROTOCOLO DE COLORES NATALIA
  const COLORES = {
    'Feriado': '#ef4444',
    'Examen': '#f97316',
    'TP': '#0ea5e9',
    'Acto': '#10b981',
    'Salida': '#a855f7',
    'Administrativo': '#64748b'
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const dId = session?.user?.id;
    try {
      // Cargamos TODO de la vista maestra (Efemérides + Personales)
      const dataEventos = await CalendarioAPI.getMaestro();
      setEventos(dataEventos || []);
      
      if (dId) {
        const dataCursos = await CursosAPI.getAll(dId);
        setCursos(dataCursos || []);
      }
    } catch (error) {
      console.error("Error cargando calendario unificado:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseFechaLocal = (dateStr) => {
    if (!dateStr) return null;
    
    // Si ya es un objeto Date por alguna razón, lo convertimos
    if (dateStr instanceof Date) {
      return { year: dateStr.getFullYear(), month: dateStr.getMonth(), day: dateStr.getDate() };
    }

    try {
      const limpio = String(dateStr).split('T')[0]; // Quitamos horas si las hay
      const partes = limpio.includes('-') ? limpio.split('-') : limpio.split('/');
      
      if (partes.length === 3) {
        let y, m, d;
        // Caso YYYY-MM-DD
        if (partes[0].length === 4) {
          y = parseInt(partes[0], 10);
          m = parseInt(partes[1], 10);
          d = parseInt(partes[2], 10);
        } else {
          // Caso DD-MM-YYYY o MM-DD-YYYY (asumimos DD primero por Natalia)
          d = parseInt(partes[0], 10);
          m = parseInt(partes[1], 10);
          y = parseInt(partes[2], 10);
        }
        
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return { year: y, month: m - 1, day: d };
        }
      }
      
      // Último recurso: Date nativo
      const fallback = new Date(dateStr);
      if (!isNaN(fallback.getTime())) {
        return { 
          year: fallback.getFullYear(), 
          month: fallback.getMonth(), 
          day: fallback.getDate() 
        };
      }
    } catch (err) {
      console.error("Error crítico parseando:", dateStr);
    }
    return null;
  };

  const eventosDelMes = eventos.filter(e => {
    const f = parseFechaLocal(e.fecha);
    return f && f.month === selectedMonth && f.year === selectedYear;
  });

  if (view === 'anual') {
    return (
      <div className="app-container animate-fade-in" style={{ minHeight: '100vh', backgroundColor: '#0f172a', padding: '2.5rem 1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '4rem', position: 'relative' }}>
          <Link to="/dashboard" style={{ position: 'absolute', left: '0', top: '0', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, opacity: 0.8 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            VOLVER
          </Link>
          <h1 style={{ fontSize: '5rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-2px' }}>{selectedYear}</h1>
          <div style={{ height: '4px', width: '80px', backgroundColor: 'var(--purple)', margin: '15px auto', borderRadius: '10px', boxShadow: '0 0 15px var(--purple)' }}></div>
          <p style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase' }}>Planner Catedral</p>
          
          <button onClick={() => setShowModal(true)} style={{
            position: 'absolute', right: 0, top: '10px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '18px', padding: '1rem 2rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(124, 58, 237, 0.4)'
          }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            AGENDAR
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', rowGap: '3rem' }}>
          {MESES.map((mes, index) => {
            const firstDay = new Date(selectedYear, index, 1).getDay();
            const daysInMonth = new Date(selectedYear, index + 1, 0).getDate();
            const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

            return (
              <div key={mes} onClick={() => { setSelectedMonth(index); setView('mensual'); }} style={{ 
                cursor: 'pointer', textAlign: 'center', backgroundColor: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)', padding: '2rem 1.5rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#fff', fontWeight: 900 }}>{mes}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '10px' }}>
                   {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = eventos.filter(e => {
                      const f = parseFechaLocal(e.fecha);
                      return f && f.day === day && f.month === index && f.year === selectedYear;
                    });
                    const hasEvent = dayEvents.length > 0;
                    return (
                      <div key={day} style={{ fontSize: '0.85rem', padding: '5px 0', color: hasEvent ? '#fff' : '#94a3b8', backgroundColor: hasEvent ? (dayEvents[0].color || 'var(--purple)') : 'transparent', borderRadius: '10px', fontWeight: hasEvent ? 900 : 500 }}>
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // VISTA MENSUAL
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const blankSpaces = Array.from({ length: adjustedFirstDay });
  const monthDays = Array.from({ length: daysInMonth });

  return (
    <div className="app-container animate-fade-in" style={{ minHeight: '100vh', backgroundColor: '#0f172a', padding: '2.5rem 1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* MODAL OFICIAL PROTOCOLO NATALIA */}
      <EventoAcademicoModal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); loadData(); }}
        docenteId={session?.user?.id}
        cursos={cursos} 
      />

      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={() => setView('anual')} style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 700, padding: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            VISTA ANUAL
          </button>
          <h2 className="text-gradient" style={{ fontSize: '4rem', fontWeight: 900, margin: '0.5rem 0 0 0', color: '#fff' }}>{MESES[selectedMonth]}</h2>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
           <button onClick={() => setShowModal(true)} style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '12px', padding: '0.8rem 1.5rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              AGENDAR
           </button>
           <button onClick={() => setSelectedMonth(selectedMonth === 0 ? 11 : selectedMonth - 1)} className="btn-primary" style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}>Anterior</button>
           <button onClick={() => setSelectedMonth(selectedMonth === 11 ? 0 : selectedMonth + 1)} className="btn-primary" style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}>Siguiente</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '3rem' }}>
        
        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(15px)', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(d => (
              <div key={d} style={{ padding: '1.5rem 0.5rem', fontSize: '0.85rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '2px' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {blankSpaces.map((_, i) => (
              <div key={`blank-${i}`} style={{ minHeight: '150px', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(15, 23, 42, 0.1)' }}></div>
            ))}
            {monthDays.map((_, i) => {
              const day = i + 1;
              const dayEvents = eventosDelMes.filter(e => {
                const f = parseFechaLocal(e.fecha || e.fecha_inicio || e.fecha_salida || e.fecha_entrega);
                return f && f.day === day;
              });
              const hasEvents = dayEvents.length > 0;
              
              return (
                <div key={day} style={{ 
                  minHeight: '150px', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '1.2rem', position: 'relative',
                  backgroundColor: hasEvents ? `${dayEvents[0].color || 'var(--purple)'}10` : 'transparent'
                }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: hasEvents ? (dayEvents[0].color || 'var(--purple)') : '#475569' }}>{day}</span>
                  {dayEvents.map((e, idx) => (
                    <div key={idx} style={{ 
                      fontSize: '0.75rem', backgroundColor: e.color || 'var(--purple)', color: '#fff', padding: '8px 12px', borderRadius: '12px', marginTop: '10px', fontWeight: 900, boxShadow: '0 4px 10px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {e.titulo}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <aside style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(15px)', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--purple), #4f46e5)', color: '#fff', padding: '2.5rem', borderRadius: '35px 35px 15px 15px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.8rem', letterSpacing: '4px' }}>IMPORTANTE</h3>
          </div>
          <div style={{ padding: '3rem 2rem', flexGrow: 1 }}>
            {eventosDelMes.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '6rem', color: '#64748b' }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 900 }}>Nada anotado ✨</p>
                <p style={{ fontSize: '1rem' }}>Todo bajo control.</p>
              </div>
            ) : (
              eventosDelMes.map(e => {
                const f = parseFechaLocal(e.fecha);
                const diaTexto = f ? `${f.day} de ${MESES[f.month]}` : 'Fecha pendiente';
                
                return (
                  <div key={e.id} style={{ marginBottom: '2.5rem', borderLeft: `6px solid ${e.color || 'var(--purple)'}`, paddingLeft: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: e.color || 'var(--purple)', marginBottom: '4px' }}>
                      {diaTexto} • {e.tipo?.toUpperCase()}
                    </div>
                    <h4 style={{ fontSize: '1.3rem', margin: 0, color: '#f1f5f9', fontWeight: 900, lineHeight: 1.3 }}>{e.titulo}</h4>
                    {e.descripcion && <p style={{ margin: '8px 0 0', fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6 }}>{e.descripcion}</p>}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
