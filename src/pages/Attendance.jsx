import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlumnosAPI, CursosAPI, AsistenciasAPI } from '../services/api';
import { ExportPDF } from '../services/pdfService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Attendance({ session }) {
  const { id } = useParams(); // Curso ID
  const navigate = useNavigate();
  const docenteId = session?.user?.id;
  
  const [curso, setCurso] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [asistencias, setAsistencias] = useState({}); 
  const [stats, setStats] = useState({}); 
  const [historialTodo, setHistorialTodo] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [isListening, setIsListening] = useState(false);
  const [showResumen, setShowResumen] = useState(false);
  
  // Selector de Mes/Año (Default Actual)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadData = useCallback(async () => {
    if (!docenteId || !id) return;
    try {
      setLoading(true);
      const [dbCurso, dbAlumnos, dbAsistencias, dbStats] = await Promise.all([
        CursosAPI.getById(id),
        AlumnosAPI.getByCurso(id),
        AsistenciasAPI.getByCursoAndDate(id, fecha),
        AsistenciasAPI.getEstadisticas(id)
      ]);
      setCurso(dbCurso);
      setAlumnos(dbAlumnos || []);
      setStats(dbStats || {});
      const mapAsist = {};
      dbAsistencias.forEach(a => { mapAsist[a.alumno_id] = a.estado; });
      setAsistencias(mapAsist);
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setLoading(false);
    }
  }, [id, docenteId, fecha]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CARGA DE RESUMEN MENSUAL PROFESIONAL (MODO PRO)
  useEffect(() => {
    if (showResumen) {
      const loadMonthData = async () => {
        try {
          const data = await AsistenciasAPI.getResumenMensual(id, selectedMonth + 1, selectedYear);
          setHistorialTodo(data || []);
          
          // Recalcular stats locales para visualización de exceso
          const s = {};
          data.forEach(a => {
            if (!s[a.alumno_id]) s[a.alumno_id] = { faltas: 0 };
            if (a.estado === 'A') s[a.alumno_id].faltas += 1;
          });
          Object.keys(s).forEach(id => { s[id].exceso_inasistencias = s[id].faltas > 3; });
          setStats(s);
        } catch (error) {
          console.error("Error al cargar mes:", error);
        }
      };
      loadMonthData();
    }
  }, [showResumen, selectedMonth, selectedYear, id]);

  const toggleAsistencia = (alumnoId, estado) => {
    setAsistencias(prev => ({ ...prev, [alumnoId]: estado }));
  };

  const handleUpdateEstadoInscripcion = async (alumnoId, nuevoEstado) => {
    try {
      await AlumnosAPI.update(alumnoId, { estado_inscripcion: nuevoEstado });
      setAlumnos(prev => prev.map(a => a.id === alumnoId ? { ...a, estado_inscripcion: nuevoEstado } : a));
    } catch (error) { console.error(error); }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const payload = alumnos.map(alumno => {
        const belongsToBaja = (alumno.estado_inscripcion !== 'regular');
        return {
          alumno_id: alumno.id,
          curso_id: id,
          docente_id: docenteId,
          fecha,
          estado: belongsToBaja ? 'B' : (asistencias[alumno.id] || null)
        };
      }).filter(p => p.estado !== null);
      
      await AsistenciasAPI.saveMasivo(payload);
      alert("¡Asistencia blindada y guardada! 🎖️");
      
      // REDIRIGIR AL PANEL DE LA ESCUELA (Obteniendo datos frescos si es necesario)
      const cursoRefresco = await CursosAPI.getById(id);
      if (cursoRefresco?.escuela_id) {
        navigate(`/schools/${cursoRefresco.escuela_id}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      alert("Error al guardar.");
    } finally { setSaving(false); }
  };

  const startVoiceControl = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.toLowerCase();
      let est = transcript.includes('presente') ? 'P' : transcript.includes('ausente') ? 'A' : transcript.includes('justificado') ? 'AJ' : null;
      if (!est) return;
      const matched = alumnos.find(a => transcript.includes(a.nombre.toLowerCase()) || transcript.includes(a.apellido.toLowerCase()));
      if (matched && matched.estado_inscripcion === 'regular') toggleAsistencia(matched.id, est);
    };
    recognition.start();
  };

  const tableData = useMemo(() => {
    const diasSorted = Array.from(new Set(historialTodo.map(a => a.fecha))).sort();
    const filas = alumnos.map(alumno => {
      const asMap = {};
      historialTodo.filter(h => h.alumno_id === alumno.id).forEach(h => { asMap[h.fecha] = h.estado; });
      return { alumno, asistencias: asMap };
    });
    return { dias: diasSorted, filas };
  }, [historialTodo, alumnos]);

  // EXPORTACIÓN PDF PROFESIONAL (LANDSCAPE)
  const downloadPDF = () => {
    const mesNombre = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(selectedYear, selectedMonth));
    const docenteNombre = session?.user?.user_metadata?.full_name || 'Docente';
    ExportPDF.asistencia(curso, alumnos, historialTodo, mesNombre.toUpperCase(), docenteNombre);
  };

  if (loading || !curso) return <div className="animate-pulse" style={{textAlign:'center', marginTop:'3rem'}}>Sincronizando...</div>;

  const alumnosRegulares = alumnos.filter(a => a.estado_inscripcion === 'regular');

  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '120px' }}>
      <header className="page-header" style={{ marginBottom: '1rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
        <Link to={`/cursos/${id}`} style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>← Volver</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem' }}>
            {showResumen ? `RESUMEN: ${new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric' }).format(new Date(selectedYear, selectedMonth)).toUpperCase()}` : 'ASISTENCIA DIARIA'}
          </h2>
          {!showResumen ? (
            <input type="date" className="input-field" style={{ width: 'auto', padding: '0.4rem', fontSize: '0.8rem' }} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          ) : (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
               <button onClick={() => { if(selectedMonth===0){setSelectedMonth(11);setSelectedYear(y=>y-1)}else{setSelectedMonth(m=>m-1)} }} className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }}>‹</button>
               <button onClick={() => { if(selectedMonth===11){setSelectedMonth(0);setSelectedYear(y=>y+1)}else{setSelectedMonth(m=>m+1)} }} className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }}>›</button>
               <button onClick={() => setShowResumen(false)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', color: 'var(--danger)' }}>✕</button>
            </div>
          )}
        </div>
      </header>

      {!showResumen ? (
        <>
          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.2rem' }}>
            <button onClick={startVoiceControl} className={`btn-primary ${isListening ? 'animate-pulse' : ''}`} style={{ flex: 1.5, background: isListening ? 'var(--danger)' : 'rgba(7, 70, 229, 0.05)', border: '1px solid var(--primary)', color: isListening ? '#fff' : 'var(--primary)', fontSize: '0.85rem' }}>🎙️ Voz</button>
            <button onClick={() => setShowResumen(true)} className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}>📊 Planilla</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {alumnosRegulares.map((a) => {
              const tieneExceso = stats[a.id]?.exceso_inasistencias;
              const esRecursante = a.es_recursante === true || a.condicion_estudiante === 'recursante';
              return (
                <div key={a.id} className="glass-card" style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', border: tieneExceso ? '1px solid var(--danger)' : '1px solid transparent' }}>
                  <div style={{ flex: 1, fontWeight: 600, color: tieneExceso ? 'var(--danger)' : 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{a.apellido}, {a.nombre}</span>
                      {esRecursante && (
                        <span style={{
                          background: '#EF4444',
                          color: '#fff',
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          padding: '1px 5px',
                          borderRadius: '5px',
                          letterSpacing: '0.05em'
                        }}>R</span>
                      )}
                    </div>
                    {tieneExceso && <span style={{ fontSize: '0.6rem', color: 'var(--danger)', fontWeight: 800, display: 'block' }}>⚠️ FALTAS ({stats[a.id].faltas})</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                     {['P', 'A', 'AJ'].map(est => (
                        <button key={est} onClick={() => toggleAsistencia(a.id, est)} style={{
                          width: '32px', height: '32px', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer',
                          background: asistencias[a.id] === est ? (est === 'P' ? 'var(--primary)' : est === 'A' ? 'var(--danger)' : 'var(--success)') : 'rgba(255,255,255,0.05)',
                          color: asistencias[a.id] === est ? '#fff' : 'var(--text-secondary)'
                        }}>{est}</button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            onClick={handleSaveAll} 
            disabled={saving} 
            className="btn-primary" 
            style={{ 
              position: 'fixed', 
              bottom: '25px', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              width: '90%', 
              maxWidth: '500px',
              padding: '1.2rem', 
              borderRadius: '18px', 
              fontSize: '1rem', 
              fontWeight: 800, 
              zIndex: 9999, 
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)', 
              background: '#4F46E5', // Azul primario sólido
              color: '#ffffff',
              border: '2px solid rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }}
          >
            {saving ? 'Guardando...' : '💾 FINALIZAR ASISTENCIA'}
          </button>
        </>
      ) : (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stats mensuales del curso</p>
             <button onClick={downloadPDF} className="btn-secondary" style={{ fontSize: '0.7rem', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.3rem 0.6rem' }}>📄 Descargar PDF</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem', marginBottom: '1rem' }}>
            <div className="glass-card" style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '2px solid var(--primary)' }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', margin: 0 }}>PRESENTES</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--primary)' }}>{historialTodo.filter(h=>h.estado==='P').length}</p>
            </div>
            <div className="glass-card" style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '2px solid var(--danger)' }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', margin: 0 }}>AUSENTES</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--danger)' }}>{historialTodo.filter(h=>h.estado==='A').length}</p>
            </div>
          </div>

          {Object.keys(stats).some(id => stats[id].exceso_inasistencias) && (
            <div style={{ marginBottom: '1.2rem', padding: '0.8rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--danger)', marginBottom: '0.5rem', fontWeight: 800 }}>⚠️ EXCESO DE FALTAS ({'">'}3):</h4>
              {alumnos.filter(a => stats[a.id]?.exceso_inasistencias).map(a => (
                <span key={a.id} style={{ display:'block', fontSize: '0.75rem', color: 'var(--danger)' }}>• {a.apellido}, {a.nombre} ({stats[a.id].faltas} faltas)</span>
              ))}
            </div>
          )}

          <div style={{ overflowX: 'auto', background: '#121212', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '0.6rem', textAlign: 'left', position: 'sticky', left: 0, background: '#121212' }}>Alumno</th>
                  {tableData.dias.map(d => ( <th key={d} style={{ padding: '0.3rem' }}>{d.split('-')[2]}</th> ))}
                </tr>
              </thead>
              <tbody>
                {tableData.filas.map(({ alumno, asistencias: asMap }) => (
                  <tr key={alumno.id}>
                    <td style={{ padding: '0.5rem', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#121212', color: stats[alumno.id]?.exceso_inasistencias ? 'var(--danger)' : 'inherit' }}>{alumno.apellido}</td>
                    {tableData.dias.map(d => (
                      <td key={d} style={{ textAlign: 'center', padding: '0.2rem' }}>
                        <span style={{ fontWeight: 800, color: asMap[d]==='P' ? 'var(--primary)' : asMap[d]==='A' ? 'var(--danger)' : asMap[d]==='AJ' ? 'var(--success)' : (asMap[d]==='B' ? 'var(--danger)' : 'transparent') }}>
                          {asMap[d] === 'B' ? '-' : (asMap[d] || '·')}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
