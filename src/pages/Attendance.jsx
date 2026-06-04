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
      
      // Actualizar el historial mensual inmediatamente para que se vea en la planilla
      const dataMensual = await AsistenciasAPI.getResumenMensual(id, selectedMonth + 1, selectedYear);
      setHistorialTodo(dataMensual || []);
      
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

  const [transcriptFeedback, setTranscriptFeedback] = useState("");
  const recognitionRef = React.useRef(null);

  const startVoiceControl = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Navegador no soportado.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = true; // ACTIVADO: Queremos toda la lista de una
    recognition.interimResults = false; // DESACTIVADO: Evita el error de 'Network' al no mandar datos parciales
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    const normalizeText = (text) => {
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    recognition.onstart = () => {
      setIsListening(true);
      setTranscriptFeedback("🎙️ Modo Continuo Activo: Decí toda la lista...");
    };

    recognition.onend = () => {
      // Si se apaga solo por un silencio largo, intentamos revivirlo si el usuario no tocó 'Stop'
      const botonActivo = document.querySelector('.btn-primary.animate-pulse');
      if (botonActivo) {
        try { recognition.start(); } catch(e) {}
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (e) => {
      console.error("Error de voz:", e.error);
      if (e.error === 'network') {
        setTranscriptFeedback("⚠️ Conexión inestable. Seguí hablando...");
      }
    };
    
    recognition.onresult = (e) => {
      // Procesamos todos los resultados que vayan llegando
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          const transcript = normalizeText(e.results[i][0].transcript);
          setTranscriptFeedback(`Último: ${e.results[i][0].transcript}`);
          console.log("Procesando frase:", transcript);

          let est = null;
          if (transcript.includes('justificado') || transcript.includes('justificada')) est = 'AJ';
          else if (transcript.includes('ausente') || transcript.includes('falta')) est = 'A';
          else if (transcript.includes('presente') || transcript.includes('vino')) est = 'P';
          
          if (!est) continue;

          const transcriptClean = transcript.replace(/\s/g, '');
          const matched = alumnos.find(a => {
            if (a.estado_inscripcion !== 'regular') return false;
            const nom = normalizeText(a.nombre);
            const ape = normalizeText(a.apellido);
            const completo = (ape + nom).replace(/\s/g, '');
            return transcriptClean.includes(nom) || transcriptClean.includes(ape) || transcriptClean.includes(completo);
          });

          if (matched) {
            toggleAsistencia(matched.id, est);
          }
        }
      }
    };

    recognition.start();
  };

  const tableData = useMemo(() => {
    // Volvemos a mostrar SOLO los días que tienen datos reales
    const diasSorted = Array.from(new Set(historialTodo.map(a => a.fecha))).sort();

    const filas = alumnos.map(alumno => {
      const asMap = {};
      historialTodo.filter(h => h.alumno_id === alumno.id).forEach(h => { 
        asMap[h.fecha] = h.estado; 
      });
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
      {!showResumen && (
        <header className="page-header" style={{ marginBottom: '0.8rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
          <Link to={`/cursos/${id}`} style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'none' }}>← Volver al curso</Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>
              ASISTENCIA DIARIA
            </h2>
            <input 
              type="date" 
              className="input-field" 
              style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem', borderRadius: '8px' }} 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)} 
            />
          </div>
        </header>
      )}

      {!showResumen ? (
        <>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
            <button 
              onClick={startVoiceControl} 
              className={`btn-primary ${isListening ? 'animate-pulse' : ''}`} 
              style={{ 
                flex: 1.5, 
                padding: '10px',
                height: '42px',
                background: isListening ? 'var(--danger)' : 'rgba(79, 70, 229, 0.05)', 
                border: '1px solid var(--primary)', 
                color: isListening ? '#fff' : 'var(--primary)',
                fontSize: '0.9rem',
                borderRadius: '12px'
              }}
            >
              🎙️ Voz
            </button>
            <button 
              onClick={() => setShowResumen(true)} 
              className="btn-secondary" 
              style={{ 
                flex: 1, 
                padding: '10px',
                height: '42px',
                fontSize: '0.9rem',
                borderRadius: '12px'
              }}
            >
              📊 Planilla
            </button>
          </div>

          {transcriptFeedback && (
            <div style={{ 
              background: 'rgba(79, 70, 229, 0.1)', 
              border: '1px solid var(--primary)',
              color: '#fff',
              padding: '0.8rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              textAlign: 'center',
              fontWeight: 600,
              animation: 'pulse 2s infinite'
            }}>
              {transcriptFeedback}
            </div>
          )}

          {/* ESTILO RESPONSIVE PARA ASISTENCIAS (Blindado contra caché) */}
          <style>{`
            .attendance-container {
              display: flex;
              flex-direction: column;
              background: rgba(30, 41, 59, 0.4);
              border-radius: 16px;
              overflow: hidden;
              border: 1px solid rgba(255,255,255,0.05);
              margin-bottom: 2rem;
            }
            .attendance-row {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 1rem 1.5rem; /* Tamaño PC Premium */
              border-bottom: 1px solid rgba(255,255,255,0.05);
              background: transparent;
            }
            .attendance-row:last-child { border-bottom: none; }
            
            .attendance-name {
              font-size: 1.05rem;
              font-weight: 600;
              color: #fff;
              line-height: 1.1;
              text-transform: capitalize;
            }
            .attendance-warning {
              font-size: 0.65rem;
              color: var(--danger);
              font-weight: 800;
              margin-top: 2px;
            }
            .attendance-btn {
              width: 40px;
              height: 40px;
              border-radius: 10px;
              border: none;
              font-weight: 900;
              cursor: pointer;
              font-size: 0.85rem;
              transition: all 0.2s;
            }

            /* ESTILOS PLANILLA MENSUAL */
            .monthly-table-container {
              overflow-x: auto;
              background: rgba(30, 41, 59, 0.4);
              border-radius: 16px;
              border: 1px solid rgba(255,255,255,0.05);
              margin-top: 1rem;
            }
            .monthly-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 1rem; /* Mucho más grande en PC */
            }
            .monthly-table th, .monthly-table td {
              padding: 12px 15px;
              text-align: center;
              border-bottom: 1px solid rgba(255,255,255,0.05);
              white-space: nowrap;
            }
            .monthly-table th:first-child, .monthly-table td:first-child {
              text-align: left;
              position: sticky;
              left: 0;
              background: #0f172a; /* Fondo sólido para que no se trasluzca al scrollear */
              z-index: 10;
              min-width: 180px;
              font-weight: 700;
            }
            .monthly-day-col {
              min-width: 50px;
              font-size: 0.85rem;
              color: rgba(255,255,255,0.6);
              font-weight: 800;
            }
            .attendance-dot {
              font-size: 1.1rem;
              font-weight: 900;
            }

            @media (max-width: 480px) {
              .attendance-row {
                padding: 8px 12px !important;
                gap: 10px !important;
              }
              .attendance-name {
                font-size: 0.85rem !important;
              }
              .attendance-btn {
                width: 34px !important;
                height: 34px !important;
                border-radius: 8px !important;
                font-size: 0.75rem !important;
              }
              .monthly-table {
                font-size: 0.7rem !important;
              }
              .monthly-table th, .monthly-table td {
                padding: 4px 2px !important;
              }
              .monthly-table th:first-child, .monthly-table td:first-child {
                min-width: 110px !important;
                font-size: 0.7rem !important;
              }
              .monthly-day-col {
                min-width: 30px !important;
                font-size: 0.65rem !important;
              }
              .attendance-dot-mobile {
                font-size: 0.8rem !important;
              }
            }
          `}</style>

          <div className="attendance-container">
            {alumnosRegulares.map((a) => {
              const tieneExceso = stats[a.id]?.exceso_inasistencias;
              const esRecursante = a.es_recursante === true || a.condicion_estudiante === 'recursante';
              return (
                <div key={a.id} className="attendance-row" style={{ borderLeft: tieneExceso ? '4px solid var(--danger)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="attendance-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(a.apellido + ', ' + a.nombre).toLowerCase()}
                      </span>
                      {esRecursante && (
                        <span style={{
                          background: '#EF4444', color: '#fff', fontSize: '0.55rem', fontWeight: 900,
                          padding: '1px 4px', borderRadius: '4px', flexShrink: 0
                        }}>R</span>
                      )}
                    </div>
                    {tieneExceso && <span className="attendance-warning">⚠️ FALTAS ({stats[a.id].faltas})</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                     {['P', 'A', 'AJ'].map(est => (
                        <button 
                          key={est} 
                          onClick={() => toggleAsistencia(a.id, est)} 
                          className="attendance-btn"
                          style={{
                            background: asistencias[a.id] === est ? (est === 'P' ? 'var(--primary)' : est === 'A' ? 'var(--danger)' : 'var(--success)') : 'rgba(255,255,255,0.06)',
                            color: asistencias[a.id] === est ? '#fff' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {est}
                        </button>
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
        <div className="animate-fade-in" style={{ padding: '0.5rem' }}>
          {/* CABECERA ESTILO VERCEL (ORIGINAL) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              RESUMEN: {['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][selectedMonth]} {selectedYear}
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
                <button 
                  onClick={() => {
                    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
                    else { setSelectedMonth(m => m - 1); }
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#fff', padding: '8px 12px', cursor: 'pointer' }}
                >
                  ❮
                </button>
                <button 
                  onClick={() => {
                    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
                    else { setSelectedMonth(m => m + 1); }
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#fff', padding: '8px 12px', cursor: 'pointer' }}
                >
                  ❯
                </button>
              </div>
              <button 
                onClick={() => setShowResumen(false)}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', width: '40px', height: '40px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Stats mensuales del curso</p>
             <button onClick={downloadPDF} style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8', border: '1px solid rgba(79, 70, 229, 0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
               📄 Descargar PDF
             </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '4px solid #4f46e5', background: 'rgba(79, 70, 229, 0.05)' }}>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 5px 0', fontWeight: 800, textTransform: 'uppercase' }}>PRESENTES</p>
              <p style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: '#818cf8' }}>{historialTodo.filter(h=>h.estado==='P').length}</p>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 5px 0', fontWeight: 800, textTransform: 'uppercase' }}>AUSENTES</p>
              <p style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: '#f87171' }}>{historialTodo.filter(h=>h.estado==='A').length}</p>
            </div>
          </div>

          {/* LA PLANILLA "ESTILO EXCEL" (QUE FUNCIONA) */}
          <div className="monthly-table-container" style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <table className="monthly-table">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '15px 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textAlign: 'left', minWidth: '200px' }}>ALUMNO</th>
                  {tableData.dias.map(d => ( 
                    <th key={d} className="monthly-day-col" style={{ textAlign: 'center' }}>{d.split('-')[2]}</th> 
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.filas.map(({ alumno, asistencias: asMap }, idx) => (
                  <tr key={alumno.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                      {alumno.apellido}, {alumno.nombre}
                    </td>
                    {tableData.dias.map(d => (
                      <td key={d} style={{ textAlign: 'center', padding: '10px' }}>
                        <span className="attendance-dot-mobile" style={{ 
                          fontWeight: 900, 
                          color: asMap[d]==='P' ? '#4ade80' : asMap[d]==='A' ? '#f87171' : asMap[d]==='AJ' ? '#fbbf24' : 'rgba(255,255,255,0.05)' 
                        }}>
                          {asMap[d] === 'B' ? '–' : (asMap[d] || '·')}
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
