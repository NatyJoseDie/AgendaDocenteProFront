import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlumnosAPI, CursosAPI, CalificacionesAPI, SeguimientoAPI, IntensificacionesAPI, PlanillaOficialAPI, CalendarioAPI } from '../services/api';
import { ExportPDF } from '../services/pdfService';
import '../components/Modal.css';
import '../components/Chips.css';
import EventoAcademicoModal from '../components/EventoAcademicoModal';

export default function CursoDashboard({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const docenteId = session?.user?.id;
  
  const [curso, setCurso] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [seguimiento, setSeguimiento] = useState([]);
  const [intensificaciones, setIntensificaciones] = useState([]);
  const [activeTab, setActiveTab] = useState('menu');
  const [showEventoModal, setShowEventoModal] = useState(false);
  const [eventoData, setEventoData] = useState({
    tipo: 'Examen',
    titulo: '',
    fecha: new Date().toISOString().split('T')[0],
    curso_id: id, // PRE-CARGADO CON EL CURSO ACTUAL (MAGIA!)
    descripcion: '',
    alarma: false,
    dias_previos: 1
  });

  const COLORES_PROTOCOLO = {
    'Examen': '#f97316',
    'TP': '#0ea5e9',
    'Acto': '#10b981',
    'Administrativo': '#64748b',
    'Salida': '#a855f7'
  };

  const handleSaveEvento = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...eventoData,
        color: COLORES_PROTOCOLO[eventoData.tipo]
      };
      await CalendarioAPI.createAcademic(payload);
      setShowEventoModal(false);
      alert("¡Fecha agendada con éxito! La verás en tu Almanaque.");
    } catch (error) {
      console.error(error);
      alert("Error al agendar.");
    }
  };
  const [activePeriodoInt, setActivePeriodoInt] = useState('M-A');
  const [planillaOficial, setPlanillaOficial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRecursantes, setFilterRecursantes] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState(null); 
  const [editingCondicionId, setEditingCondicionId] = useState(null); // ID de la condición si existe
  const [tieneInclusion, setTieneInclusion] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    legajo: '',
    fecha_nacimiento: '',
    email_contacto: '',
    telefono_contacto: '',
    observaciones: '',
    estado_inscripcion: 'regular',
    condicion_inscripcion: 'regular',
    condicion_estudiante: 'regular',
    es_recursante: false
  });

  const [condicionData, setCondicionData] = useState({
    tipo_condicion: 'discapacidad',
    descripcion: ''
  });

  useEffect(() => {
    // Si no hay un ID de curso válido o es la palabra "null" (error de navegación), no cargar nada
    if (id && id !== 'null' && docenteId) {
      loadData();
    } else {
      setLoading(false); // Detenemos la carga si no hay ID
    }
  }, [id, docenteId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargamos Curso y Alumnos que son vitales
      const [dbCurso, dbAlumnos] = await Promise.all([
        CursosAPI.getById(id).catch(e => { console.error("Error Curso:", e); return null; }),
        AlumnosAPI.getByCurso(id).catch(e => { console.error("Error Alumnos:", e); return []; })
      ]);
      
      setCurso(dbCurso);
      setAlumnos(dbAlumnos || []);

      // Cargamos el resto de forma resiliente para no trabar la App
      const safeLoad = async (apiCall, setter, label) => {
        try {
          const data = await apiCall;
          setter(data || []);
        } catch (e) {
          console.error(`Error en ${label}:`, e);
          setter([]);
        }
      };

      await Promise.all([
        safeLoad(CalificacionesAPI.getByCurso(id), setCalificaciones, "Calificaciones"),
        safeLoad(SeguimientoAPI.getByCurso(id), setSeguimiento, "Seguimiento"),
        safeLoad(IntensificacionesAPI.getByCurso(id), setIntensificaciones, "Intensificaciones"),
        safeLoad(PlanillaOficialAPI.getByCurso(id), setPlanillaOficial, "Planilla Oficial")
      ]);

    } catch (error) {
      console.error('Error crítico al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (alumno = null) => {
    if (alumno) {
      setEditingAlumno(alumno);
      setFormData({
        nombre: alumno.nombre || '',
        apellido: alumno.apellido || '',
        dni: alumno.dni || '',
        legajo: alumno.legajo || '',
        fecha_nacimiento: alumno.fecha_nacimiento || '',
        email_contacto: alumno.email_contacto || '',
        telefono_contacto: alumno.telefono_contacto || '',
        observaciones: alumno.observaciones || '',
        estado_inscripcion: alumno.estado_inscripcion || 'regular',
        condicion_inscripcion: alumno.condicion_inscripcion || 'regular',
        condicion_estudiante: alumno.condicion_estudiante || 'regular',
        es_recursante: alumno.es_recursante || false
      });
      
      // Intentar cargar condición especial si existe
      AlumnosAPI.getCondicionesEspeciales(alumno.id).then(condiciones => {
        if (condiciones && condiciones.length > 0) {
          setTieneInclusion(true);
          setEditingCondicionId(condiciones[0].id);
          setCondicionData({
            tipo_condicion: condiciones[0].tipo_condicion,
            descripcion: condiciones[0].descripcion
          });
        } else {
          setTieneInclusion(false);
          setEditingCondicionId(null);
          setCondicionData({ tipo_condicion: 'discapacidad', descripcion: '' });
        }
      });
    } else {
      setEditingAlumno(null);
      setEditingCondicionId(null);
      setFormData({ nombre: '', apellido: '', dni: '', legajo: '', fecha_nacimiento: '', email_contacto: '', telefono_contacto: '', observaciones: '' });
    }
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCondicionChange = (e) => {
    setCondicionData({ ...condicionData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const alumnoToUpsert = {
        ...formData,
        docente_id: docenteId,
        curso_id: id,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        es_recursante: formData.es_recursante || false
      };

      const condicionToUpsert = tieneInclusion ? condicionData : null;

      if (editingAlumno) {
        // 1. ACTUALIZAR ALUMNO (PATCH)
        const updated = await AlumnosAPI.update(editingAlumno.id, alumnoToUpsert);
        
        // 2. MANEJAR CONDICIÓN ESPECIAL
        if (tieneInclusion) {
          if (editingCondicionId) {
            // Ya tenía una, ACTUALIZAMOS
            await AlumnosAPI.updateCondicion(editingCondicionId, condicionData);
          } else {
            // No tenía, CREAMOS
            await AlumnosAPI.create(null, { ...condicionData, alumno_id: editingAlumno.id, docente_id: docenteId });
            // Nota: Aquí adaptamos para que se cree la condición si no existía
          }
        } else if (editingCondicionId) {
          // El usuario desmarcó el checkbox y tenía condición: ELIMINAR
          await AlumnosAPI.deleteCondicion(editingCondicionId);
        }
        
        setAlumnos(alumnos.map(a => a.id === updated.id ? updated : a).sort((a,b) => a.apellido.localeCompare(b.apellido)));
      } else {
        // CREAR (POST)
        const nuevoAlumno = await AlumnosAPI.create(alumnoToUpsert, condicionToUpsert);
        setAlumnos([...alumnos, nuevoAlumno].sort((a,b) => a.apellido.localeCompare(b.apellido)));
      }
      
      setShowModal(false);
      resetForm();
    } catch (error) {
       console.error("Error:", error);
       alert("Ocurrió un error.");
    }
  };

  const resetForm = () => {
    setFormData({ 
      nombre: '', apellido: '', dni: '', legajo: '', fecha_nacimiento: '', 
      email_contacto: '', telefono_contacto: '', observaciones: '',
      estado_inscripcion: 'regular', 
      condicion_inscripcion: 'regular',
      condicion_estudiante: 'regular',
      es_recursante: false
    });
    setTieneInclusion(false);
    setCondicionData({ tipo_condicion: 'discapacidad', descripcion: '' });
    setEditingAlumno(null);
    setEditingCondicionId(null);
  };

  const handleDelete = async (alumnoId) => {
    if (window.confirm("¿Estás seguro de que querés dar de baja a este alumno?")) {
      try {
        await AlumnosAPI.delete(alumnoId);
        setAlumnos(alumnos.filter(a => a.id !== alumnoId));
      } catch (error) {
        console.error("Error al borrar:", error);
      }
    }
  };

  const handleSaveNota = async (alumnoId, periodo, valor) => {
    try {
      const data = {
        alumno_id: alumnoId,
        curso_id: id,
        docente_id: docenteId,
        periodo: periodo,
        calificacion: valor.toUpperCase()
      };
      await CalificacionesAPI.upsert(data);
      
      // Actualizar estado local
      setCalificaciones(prev => {
        const existe = prev.find(c => c.alumno_id === alumnoId && c.periodo === periodo);
        if (existe) {
          return prev.map(c => (c.alumno_id === alumnoId && c.periodo === periodo) ? { ...c, calificacion: valor.toUpperCase() } : c);
        }
        return [...prev, data];
      });
    } catch (error) {
       console.error("Error guardando nota:", error);
    }
  };

  const handleSavePlanilla = async (alumnoId, campo, valor) => {
    try {
      const data = {
        alumno_id: alumnoId,
        curso_id: id,
        docente_id: docenteId, // Inyección obligatoria para RLS
        [campo]: valor.toUpperCase()
      };
      await PlanillaOficialAPI.upsert(data);
      setPlanillaOficial(prev => {
        const existe = prev.find(p => p.alumno_id === alumnoId);
        if (existe) {
          return prev.map(p => p.alumno_id === alumnoId ? { ...p, [campo]: valor.toUpperCase() } : p);
        }
        return [...prev, data];
      });
    } catch (error) {
      console.error("Error guardando planilla oficial:", error);
    }
  };

  const getNotaColor = (nota) => {
    if (!nota) return 'transparent';
    const n = nota.toUpperCase();
    
    // Siglas Oficiales (Lógica Natalia)
    if (n === 'TEA') return 'rgba(79, 70, 229, 0.4)';  // AZUL INSTITUCIONAL (Intenso)
    if (n === 'TEP') return 'rgba(16, 185, 129, 0.4)';  // VERDE CLAVE (Vivid)
    if (n === 'TED' || n === 'A') return 'rgba(239, 68, 68, 0.4)'; // ROJO FURIOSO (Alerta)
    
    // Notas Numéricas
    const num = parseFloat(n);
    if (!isNaN(num)) {
      if (num <= 5) return 'rgba(239, 68, 68, 0.5)'; // Rojo más fuerte para insuficientes
      if (num === 6) return 'rgba(16, 185, 129, 0.3)'; // Verde suave para el 6
      return 'rgba(79, 70, 229, 0.3)'; // Azul para el resto
    }
    
    return 'rgba(255, 255, 255, 0.05)';
  };

  const handleSaveSeguimiento = async (alumnoId, temaId, valor, temaNombre, entregado = true) => {
    try {
      const tipoEv = temaNombre?.toLowerCase().includes('tp') ? 'TP' : 
                     (temaNombre?.toLowerCase().includes('eva') ? 'Examen' : 'Concepto');

      const existe = seguimiento.find(s => s.alumno_id === alumnoId && s.tema_id === temaId);
      const data = {
        ...(existe || {}),
        alumno_id: alumnoId,
        curso_id: id,
        docente_id: docenteId,
        tema_id: temaId,
        nota: entregado ? valor : 'NO',
        fecha: new Date().toISOString().split('T')[0],
        tipo_evaluacion: tipoEv,
        entregado: entregado
      };
      
      await SeguimientoAPI.upsert(data);
      setSeguimiento(prev => {
        if (existe) {
          return prev.map(s => (s.alumno_id === alumnoId && s.tema_id === temaId) ? data : s);
        }
        return [...prev, data];
      });
    } catch (error) {
      console.error("Error guardando seguimiento:", error);
    }
  };

  // Actividades predefinidas (pueden ser dinámicas luego)
  const actividades = [
    { id: 'tp1', nombre: 'TP 1', tipo: 'tp' },
    { id: 'tp2', nombre: 'TP 2', tipo: 'tp' },
    { id: 'eval1', nombre: 'Eva. 1', tipo: 'nota' },
    { id: 'carpeta', nombre: 'Carpeta', tipo: 'tp' }
  ];

  const periodos = ['1er Trim', '2do Trim', '3er Trim', 'Final'];

  const alumnosFiltrados = filterRecursantes 
    ? alumnos.filter(a => a.condicion_estudiante === 'recursante') 
    : alumnos;

  if (loading || !curso) return <p className="animate-pulse" style={{ marginTop: '2rem', textAlign: 'center' }}>Cargando...</p>;

  return (
    <div className="app-container dashboard-full animate-fade-in">
      {/* CABECERA (ESTILO PREMIUM DINÁMICO) */}
      <header style={{ maxWidth: '1000px', margin: '0 auto 2rem auto', padding: '1rem' }}>
        <button 
          onClick={() => {
            if (activeTab === 'menu') {
              // Si estamos en el menú principal del curso, volvemos a la escuela
              navigate(`/escuelas/${curso.escuela_id}`);
            } else {
              // Si estamos dentro de una sección (Notas, Asistencia, etc), volvemos al menú del curso
              setActiveTab('menu');
            }
          }}
          style={{ 
            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem',
            fontSize: '1rem', fontWeight: 600, transition: '0.3s color'
          }}
          onMouseOver={(e) => e.target.style.color = '#fff'}
          onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
          {activeTab === 'menu' ? 'Volver a Escuelas' : 'Volver al Curso'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px', color: '#fff' }}>
              PROFESOR "{curso.anio_o_grado} {curso.division && `${curso.division}`}"
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', fontWeight: 800 }}>
              {curso.materia || 'Rol General'}
            </p>
          </div>
        </div>
      </header>

      {/* NAVEGACIÓN SUPERIOR (ESTILO PREMIUM CENTRADO) */}
      <div style={{ maxWidth: '1000px', margin: '0 auto 2.5rem auto', padding: '0 1rem' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '1rem', 
          background: 'rgba(30, 41, 59, 0.5)', 
          padding: '0.6rem', 
          borderRadius: '25px',
          border: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)'
        }}>
          <button 
            onClick={() => setActiveTab('menu')}
            style={{ 
              padding: '1.2rem', 
              borderRadius: '20px', 
              border: 'none', 
              fontWeight: 900, 
              fontSize: '1rem',
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'menu' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'menu' ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'menu' ? '0 10px 25px rgba(79, 70, 229, 0.4)' : 'none',
              transform: activeTab === 'menu' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            DASHBOARD
          </button>
          <button 
            onClick={() => setActiveTab('notas_full')}
            style={{ 
              padding: '1.2rem', 
              borderRadius: '20px', 
              border: 'none', 
              fontWeight: 900, 
              fontSize: '1rem',
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'notas_full' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'notas_full' ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'notas_full' ? '0 10px 25px rgba(79, 70, 229, 0.4)' : 'none',
              transform: activeTab === 'notas_full' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            NOTAS / ACTAS
          </button>
        </div>
      </div>

      {/* DASHBOARD PRINCIPAL (GRILLA 3 COLUMNAS - ESTILO PREMIUM COMPACTO) */}
      {activeTab === 'menu' && (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '1.2rem', 
            marginTop: '2rem',
            padding: '0 1rem'
          }}>
            
            {/* FILA 1: FLUJO DIARIO */}
            <Link to={`/asistencia/${id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px',
                borderTop: '5px solid var(--primary)', background: 'linear-gradient(180deg, rgba(79, 70, 229, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
                <div style={{ background: 'var(--primary)', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(79, 70, 229, 0.4)' }}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20"></path></svg>
                </div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>ASISTENCIA</h4>
              </div>
            </Link>

            <div onClick={() => setActiveTab('nomina')} className="glass-card animate-slide-up" style={{ 
              padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px', cursor: 'pointer',
              borderTop: '5px solid #6366f1', background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
            }}>
              <div style={{ background: '#6366f1', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)' }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>NÓMINA</h4>
            </div>

            <div onClick={() => setActiveTab('seguimiento')} className="glass-card animate-slide-up" style={{ 
              padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px', cursor: 'pointer',
              borderTop: '5px solid #10b981', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
            }}>
              <div style={{ background: '#10b981', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)' }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>SEGUIMIENTO</h4>
            </div>

            {/* FILA 2: GESTIÓN Y CIERRES */}
            <Link to={`/libro-temas?curso=${id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px',
                borderTop: '5px solid var(--purple)', background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
                <div style={{ background: 'var(--purple)', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)' }}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#fff' }}>LIBRO DE TEMAS</h4>
              </div>
            </Link>

            <Link to={`/planificaciones?curso=${id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px',
                borderTop: '5px solid #3b82f6', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
                <div style={{ background: '#3b82f6', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)' }}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"></path></svg>
                </div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#fff' }}>PLANIFICACIONES</h4>
              </div>
            </Link>

            <div onClick={() => setActiveTab('notas')} className="glass-card animate-slide-up" style={{ 
              padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px', cursor: 'pointer',
              borderTop: '5px solid #f59e0b', background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
            }}>
              <div style={{ background: '#f59e0b', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)' }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#fff' }}>SÁBANA NOTAS</h4>
            </div>

            {/* FILA 3: CIERRES */}
            <div onClick={() => setActiveTab('intensificacion')} className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px', cursor: 'pointer',
                borderTop: '5px solid var(--danger)', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
              <div style={{ background: 'var(--danger)', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.4)' }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>INTENSIFICACIÓN</h4>
            </div>
            {/* FILA FINAL: FECHAS IMPORTANTES (ESTRELLA DEL SHOW - ANCHO COMPLETO) */}
            <div onClick={() => setShowEventoModal(true)} className="glass-card animate-slide-up" style={{ 
                gridColumn: '1 / -1', padding: '1.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', 
                background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.25) 0%, rgba(30, 41, 59, 1) 100%)', border: '1px solid var(--purple)', borderRadius: '30px', 
                cursor: 'pointer', boxShadow: '0 15px 40px rgba(124, 58, 237, 0.3)', marginTop: '0.5rem'
              }}>
                <div style={{ background: 'var(--purple)', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(124, 58, 237, 0.5)' }}>
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <h4 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>FECHAS IMPORTANTES</h4>
            </div>
          </div>
        </div>
      )}
 
      {activeTab === 'notas_planilla' && (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '3rem', borderRadius: '35px', textAlign: 'center', background: 'rgba(30, 41, 59, 0.7)' }}>
             <div style={{ background: '#f59e0b', width: '80px', height: '80px', borderRadius: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 2rem auto', boxShadow: '0 15px 30px rgba(245, 158, 11, 0.4)' }}>
               <svg viewBox="0 0 24 24" width="45" height="45" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
             </div>
             <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem', color: '#fff' }}>SÁBANA DE NOTAS</h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>Cargando planilla oficial del curso desde el servidor... Por favor, espere.</p>
           </div>
        </div>
      )}

      {activeTab === 'notas_full' && (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
           <div className="glass-card" style={{ padding: '3rem', borderRadius: '35px', textAlign: 'center', background: 'rgba(30, 41, 59, 0.7)' }}>
             <div style={{ background: '#ec4899', width: '80px', height: '80px', borderRadius: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 2rem auto', boxShadow: '0 15px 30px rgba(236, 72, 153, 0.4)' }}>
               <svg viewBox="0 0 24 24" width="45" height="45" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
             </div>
             <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem', color: '#fff' }}>NOTAS / ACTAS</h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>Sección de gestión de documentación oficial y actas de examen. Próximamente disponible.</p>
           </div>
        </div>
      )}

      {activeTab === 'nomina' && (
        <div className="animate-fade-in">
          {/* BOTÓN OCR ESCANEAR */}
          <button 
            onClick={() => setShowOCRModal(true)}
            style={{ 
              width: '100%', padding: '1rem', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', 
              border: '1.5px dashed var(--success)', color: 'var(--success)',
              fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem', cursor: 'pointer' 
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            📷 ESCANEAR PLANILLA (OCR)
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setFilterRecursantes(!filterRecursantes)}
                style={{ 
                  padding: '0.6rem 1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s',
                  background: filterRecursantes ? 'var(--danger)' : 'rgba(255,255,255,0.05)',
                  color: filterRecursantes ? '#fff' : 'var(--text-secondary)',
                  border: filterRecursantes ? 'none' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>R</span> {filterRecursantes ? 'Ver Todos' : 'Ver Recursantes'}
              </button>
            </div>
            <button onClick={() => handleOpenModal()} className="btn-primary" style={{ padding: '0.6rem 1rem', borderRadius: '12px', fontSize: '0.9rem' }}>
              + Agregar Manual
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {alumnosFiltrados.map((alumno, idx) => (
              <div key={alumno.id} className="glass-card animate-slide-up" style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--surface-hover)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {alumno.apellido}, {alumno.nombre}
                    {(alumno.es_recursante || alumno.condicion_estudiante === 'recursante') && (
                      <span title="Recursante" style={{ 
                        background: '#EF4444', color: '#fff',
                        width: '22px', height: '22px', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 900
                      }}>R</span>
                    )}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>DNI: {alumno.dni || '-'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => handleOpenModal(alumno)} style={{ background: 'rgba(79, 70, 229, 0.1)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                  </button>
                  <button onClick={() => handleDelete(alumno.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'var(--danger)', cursor: 'pointer' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'seguimiento' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary)' }}>Sábana de Seguimiento Profesional</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Esta planilla se expande al total de tu pantalla en PC.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={async () => {
                  const nombre = prompt('¿Qué nombre le ponés a la columna? (Ej: TP 1, Evaluación, Oral...)');
                  if (nombre) {
                    try {
                      const nueva = await SeguimientoAPI.createActividad({ 
                        curso_id: id, 
                        docente_id: docenteId, 
                        nombre: nombre, 
                        tipo: 'nota', 
                        fecha: new Date().toISOString().split('T')[0] 
                      });
                      setActividades([...actividades, nueva]);
                    } catch (e) {
                      console.error(e);
                      alert("Error al crear columna.");
                    }
                  }
                }}
                className="btn-primary" 
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', borderRadius: '12px' }}
              >
                + Nueva Actividad
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', maxHeight: '75vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                <tr style={{ background: '#121625', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', width: '220px', position: 'sticky', left: 0, background: '#121625', zIndex: 110, borderRight: '2px solid var(--border)' }}>Alumno</th>
                  {actividades.map((act, actIdx) => (
                    <th key={act.id} style={{ padding: '0.2rem', textAlign: 'center', width: '100px', borderRight: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                        <select 
                          value={['TP 1','TP 2','TP 3','Eva. 1','Eva. 2','Oral','Carpeta'].includes(act.nombre) ? act.nombre : 'OTRO'}
                          onChange={async (e) => {
                            let nuevoNombre = e.target.value;
                            if (nuevoNombre === 'BORRAR') {
                              if(window.confirm('¿Borrar esta columna?')) {
                                await SeguimientoAPI.deleteActividad(act.id);
                                loadData();
                              }
                              return;
                            }
                            if (nuevoNombre === 'OTRO') {
                              nuevoNombre = prompt('Ingresá el nombre personalizado:', act.nombre);
                            }
                            if (nuevoNombre) {
                                await SeguimientoAPI.update(act.id, { nombre: nuevoNombre });
                                loadData();
                            }
                          }}
                          style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: 'none', 
                            color: '#fff', 
                            fontSize: '0.7rem', 
                            fontWeight: 800, 
                            width: '100%', 
                            textAlign: 'center',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            outline: 'none',
                            padding: '2px'
                          }}
                        >
                          <option value="TP 1" style={{background: '#121625'}}>TP 1</option>
                          <option value="TP 2" style={{background: '#121625'}}>TP 2</option>
                          <option value="TP 3" style={{background: '#121625'}}>TP 3</option>
                          <option value="Eva. 1" style={{background: '#121625'}}>Eva. 1</option>
                          <option value="Eva. 2" style={{background: '#121625'}}>Eva. 2</option>
                          <option value="Oral" style={{background: '#121625'}}>Oral</option>
                          <option value="Carpeta" style={{background: '#121625'}}>Carpeta</option>
                          <option value="OTRO" style={{background: '#121625'}}>Otro...</option>
                          <option value="BORRAR" style={{background: '#EF4444', color: '#fff'}}>🗑️ Borrar</option>
                        </select>
                        
                        <input 
                          type="date" 
                          defaultValue={act.fecha}
                          onChange={async (e) => {
                            await SeguimientoAPI.update(act.id, { fecha: e.target.value });
                          }}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'var(--text-secondary)', 
                            fontSize: '0.6rem', 
                            width: '100%', 
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                        />
                        <button 
                          onClick={async () => {
                            const inputs = document.querySelectorAll(`[id$="-${actIdx}"]`);
                            const batch = [];
                            
                            inputs.forEach(input => {
                              const [_, rowIdx, colIdx] = input.id.split('-');
                              const alumno = alumnosFiltrados[parseInt(rowIdx)];
                              if (alumno && input.value) {
                                const tipoEv = act?.nombre.toLowerCase().includes('tp') ? 'TP' : 
                                               (act?.nombre.toLowerCase().includes('eva') ? 'Examen' : 'Concepto');
                                batch.push({
                                  alumno_id: alumno.id,
                                  curso_id: id,
                                  docente_id: docenteId,
                                  tema_id: act.id,
                                  nota: input.value.toUpperCase(),
                                  fecha: act.fecha || new Date().toISOString().split('T')[0],
                                  tipo_evaluacion: tipoEv
                                });
                              }
                            });

                            if (batch.length === 0) return;

                            try {
                              await SeguimientoAPI.saveMasivo(batch);
                              // Actualizar el estado local para que se refleje en toda la app
                              setSeguimiento(prev => {
                                const newSeg = [...prev];
                                batch.forEach(item => {
                                  const idx = newSeg.findIndex(s => s.alumno_id === item.alumno_id && s.tema_id === item.tema_id);
                                  if (idx !== -1) newSeg[idx] = item;
                                  else newSeg.push(item);
                                });
                                return newSeg;
                              });
                              alert(`¡Dato grabado! Notas de ${act.nombre} guardadas para siempre.`);
                            } catch (e) {
                              console.error(e);
                              alert("Error al guardar. Revisá la conexión.");
                            }
                          }}
                          style={{
                            background: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.6rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            marginTop: '2px',
                            padding: '2px 4px'
                          }}>
                          GUARDAR
                        </button>
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: '0.4rem', textAlign: 'center', width: '60px', color: 'var(--primary)', fontWeight: 900 }}>PROM</th>
                </tr>
              </thead>
              <tbody>
                {alumnosFiltrados.map((alumno, idx) => {
                  const segsAlumno = seguimiento.filter(s => s.alumno_id === alumno.id);
                  const notasNum = segsAlumno
                    .map(s => parseFloat(s.nota))
                    .filter(n => !isNaN(n));
                  const promedio = notasNum.length > 0 
                    ? (notasNum.reduce((a, b) => a + b, 0) / notasNum.length).toFixed(1) 
                    : '-';

                  return (
                    <tr key={alumno.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '32px' }}>
                      <td style={{ padding: '0.1rem 0.8rem', position: 'sticky', left: 0, background: '#121625', zIndex: 5, fontWeight: 600, borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.8rem' }}>
                            {alumno.apellido || 'Sin Apellido'}, {(alumno.nombre || ' ').charAt(0)}.
                          </span>
                          {(alumno.es_recursante || alumno.condicion_estudiante === 'recursante') && (
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.5rem', background: '#EF4444', padding: '0px 3px', borderRadius: '3px' }}>R</span>
                          )}
                        </div>
                      </td>
                      {actividades.map((act, actIdx) => {
                        const seg = segsAlumno.find(s => s.tema_id === act.id);
                        const entregado = seg ? seg.entregado !== false : true; 
                        const valor = seg?.nota ?? '';

                        return (
                          <td key={act.id} style={{ 
                            padding: '0.15rem', 
                            borderRight: '1px solid rgba(255,255,255,0.05)',
                            background: !entregado ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.05)',
                            transition: 'all 0.3s'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={entregado}
                                onChange={(e) => handleSaveSeguimiento(alumno.id, act.id, valor, act.nombre, e.target.checked)}
                                style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#10b981' }}
                              />
                              <input 
                                type="text"
                                id={`input-${idx}-${actIdx}`}
                                value={entregado ? valor : 'NO'}
                                disabled={!entregado}
                                onChange={(e) => {
                                   const newVal = e.target.value.toUpperCase();
                                   setSeguimiento(prev => prev.map(s => 
                                     (s.alumno_id === alumno.id && s.tema_id === act.id) ? { ...s, nota: newVal } : s
                                   ));
                                }}
                                onBlur={(e) => handleSaveSeguimiento(alumno.id, act.id, e.target.value, act.nombre, entregado)}
                                style={{
                                  width: '90%',
                                  padding: '0.1rem',
                                  textAlign: 'center',
                                  borderRadius: '3px',
                                  border: 'none',
                                  background: !entregado ? '#EF4444' : (valor ? getNotaColor(valor) : 'transparent'),
                                  color: '#fff',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  outline: 'none',
                                  opacity: !entregado ? 0.6 : 1
                                }}
                                onKeyDown={(e) => {
                                  const key = e.key;
                                  let nextIdx = idx;
                                  let nextActIdx = actIdx;
                                  if (key === 'ArrowDown' || key === 'Enter') { nextIdx = idx + 1; }
                                  else if (key === 'ArrowUp') { nextIdx = idx - 1; }
                                  else if (key === 'ArrowRight') { nextActIdx = actIdx + 1; }
                                  else if (key === 'ArrowLeft') { nextActIdx = actIdx - 1; }
                                  else return;
                                  const target = document.getElementById(`input-${nextIdx}-${nextActIdx}`);
                                  if (target) target.focus();
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '0.8rem' }}>
                        {promedio}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notas' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, letterSpacing: '1px' }}>PLANILLA OFICIAL DE CALIFICACIONES</h3>
            <button 
              onClick={() => ExportPDF.notas(curso, alumnos, planillaOficial, session?.user?.user_metadata?.full_name || 'Docente')}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              DESCARGAR PLANILLA PDF
            </button>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem', minWidth: '1800px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  <th rowSpan="2" style={{ padding: '0.8rem', textAlign: 'left', width: '220px', position: 'sticky', left: 0, background: '#121625', zIndex: 10, borderRight: '2px solid var(--border)' }}>APELLIDO Y NOMBRES</th>
                  <th colSpan="9" style={{ padding: '0.4rem', textAlign: 'center', borderRight: '2px solid var(--border)', background: 'rgba(79, 70, 229, 0.05)' }}>1° CUATRIMESTRE</th>
                  <th colSpan="9" style={{ padding: '0.4rem', textAlign: 'center', borderRight: '2px solid var(--border)', background: 'rgba(79, 70, 229, 0.05)' }}>2° CUATRIMESTRE</th>
                  <th colSpan="3" style={{ padding: '0.4rem', textAlign: 'center', borderRight: '1px solid var(--border)', background: 'rgba(16, 185, 129, 0.05)' }}>CIERRES ANUALES</th>
                  <th rowSpan="2" style={{ padding: '0.4rem', textAlign: 'center', width: '55px', borderRight: '1px solid var(--border)' }}>NOTA FINAL</th>
                  <th rowSpan="2" style={{ padding: '0.4rem', textAlign: 'center', minWidth: '350px', color: '#10b981' }}>OBSERVACIONES DE TRAYECTORIA</th>
                </tr>
                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '2px solid var(--border)' }}>
                  {/* 1er Cuat */}
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontSize: '0.5rem' }}>P1 M-A</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontSize: '0.5rem' }}>P2 M-A</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '50px', fontWeight: 900, fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>BIM 1</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontWeight: 900, color: '#3b82f6', fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.08)' }}>INT</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontSize: '0.5rem' }}>P3 M-J-J</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontSize: '0.5rem' }}>P4 M-J-J</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '50px', fontWeight: 900, fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>BIM 2</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontWeight: 900, color: '#3b82f6', fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.08)' }}>INT</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '55px', borderRight: '2px solid var(--border)', color: 'var(--primary)', fontWeight: 900 }}>CUATRI 1</th>
                  {/* 2do Cuat */}
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontSize: '0.5rem' }}>P5 A-S</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontSize: '0.5rem' }}>P6 A-S</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '50px', fontWeight: 900, fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>BIM 3</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontWeight: 900, color: '#3b82f6', fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.08)' }}>INT</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontSize: '0.5rem' }}>P7 O-N</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontSize: '0.5rem' }}>P8 O-N</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '50px', fontWeight: 900, fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>BIM 4</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '40px', fontWeight: 900, color: '#3b82f6', fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.08)' }}>INT</th>
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '55px', borderRight: '2px solid var(--border)', color: 'var(--primary)', fontWeight: 900 }}>CUATRI 2</th>
                  {/* Cierres */}
                  <th style={{ padding: '0.3rem', textAlign: 'center', width: '60px' }}>ANUAL</th>
                  <th style={{ padding: '0.3rem', textAlign: 'center', width: '60px' }}>INT. DIC</th>
                  <th style={{ padding: '0.3rem', textAlign: 'center', width: '60px', borderRight: '1px solid var(--border)' }}>INT. FEB</th>
                </tr>
              </thead>
              <tbody>
                {alumnosFiltrados.map((alumno, idx) => {
                  const dataOficial = planillaOficial.find(p => p.alumno_id === alumno.id) || {};
                  
                  return (
                    <tr key={alumno.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '0.4rem 0.8rem', position: 'sticky', left: 0, background: '#121625', zIndex: 5, fontWeight: 700, borderRight: '2px solid var(--border)', fontSize: '0.7rem' }}>
                        {alumno.apellido}, {alumno.nombre}
                      </td>
                      {[
                        // 1er Cuatrimestre
                        { key: 'c1_p1_sigla', w: '40px' }, { key: 'c1_p2_sigla', w: '40px' }, { key: 'c1_bim1_nota', w: '50px', bold: true },
                        { key: 'c1_b1_int', w: '40px', bg: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' },
                        { key: 'c1_p3_sigla', w: '40px' }, { key: 'c1_p4_sigla', w: '40px' }, { key: 'c1_bim2_nota', w: '50px', bold: true },
                        { key: 'c1_b2_int', w: '40px', bg: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' },
                        { key: 'c1_final', w: '55px', bold: true, thick: true },
                        // 2do Cuatrimestre
                        { key: 'c1_p5_sigla', w: '40px' }, { key: 'c1_p6_sigla', w: '40px' }, { key: 'c2_bim1_nota', w: '50px', bold: true },
                        { key: 'c2_b3_int', w: '40px', bg: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' },
                        { key: 'c1_p7_sigla', w: '40px' }, { key: 'c1_p8_sigla', w: '40px' }, { key: 'c2_bim2_nota', w: '50px', bold: true },
                        { key: 'c2_b4_int', w: '40px', bg: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' },
                        { key: 'c2_final', w: '55px', bold: true, thick: true },
                        // Cierres Anuales
                        { key: 'nota_anual', w: '60px' }, { key: 'intensif_dic', w: '60px' }, { key: 'intensif_feb', w: '60px' },
                        { key: 'nota_final', w: '55px', bold: true }
                      ].map((col, colIdx) => (
                        <td key={col.key} style={{ padding: '0.1rem', borderRight: col.thick ? '2px solid var(--border)' : '1px solid rgba(255,255,255,0.05)', background: col.bg || 'transparent' }}>
                          <input 
                            id={`nota-${idx}-${colIdx}`}
                            type="text"
                            value={dataOficial[col.key] || ''}
                            placeholder="-"
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setPlanillaOficial(prev => prev.map(p => 
                                p.alumno_id === alumno.id ? { ...p, [col.key]: val } : p
                              ));
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.toUpperCase();
                              if (!val || val === '-') return;

                              // Lógica de Validación Estricta (Vigilante)
                              const esSigla = col.key.includes('sigla');
                              const esBim = col.key.includes('bim') || col.key.includes('final') || col.key.includes('nota') || col.key.includes('intensif') || col.key.includes('int');
                              
                              let esValido = true;
                              if (esSigla) {
                                esValido = ['TEA', 'TEP', 'TED', 'A'].includes(val);
                                if (val === 'A') e.target.style.color = '#EF4444'; 
                              } else if (esBim) {
                                const num = parseFloat(val);
                                esValido = !isNaN(num) && num >= 1 && num <= 10;
                              }

                              if (!esValido) {
                                e.target.style.border = '2px solid #EF4444';
                                e.target.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
                                return; 
                              } else {
                                e.target.style.border = 'none';
                                e.target.style.boxShadow = 'none';
                                handleSavePlanilla(alumno.id, col.key, val);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0',
                              textAlign: 'center',
                              background: col.bg ? 'transparent' : getNotaColor(dataOficial[col.key]),
                              border: 'none',
                              color: col.key.includes('int') ? '#60a5fa' : (col.color || '#fff'),
                              fontWeight: col.key.includes('int') || col.bold ? 900 : 700,
                              fontSize: col.key.includes('int') ? '0.85rem' : (col.bold ? '0.8rem' : '0.65rem'),
                              outline: 'none',
                              borderRadius: '2px',
                              textTransform: 'uppercase'
                            }}
                            onKeyDown={(e) => {
                              const key = e.key;
                              let nextFila = idx;
                              let nextCol = colIdx;
                              if (key === 'ArrowDown' || key === 'Enter') { e.preventDefault(); nextFila = idx + 1; }
                              else if (key === 'ArrowUp') { e.preventDefault(); nextFila = idx - 1; }
                              else if (key === 'ArrowRight') { nextCol = colIdx + 1; }
                              else if (key === 'ArrowLeft') { nextCol = colIdx - 1; }
                              else return;
                              const target = document.getElementById(`nota-${nextFila}-${nextCol}`);
                              if (target) { target.focus(); target.select(); }
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '0.4rem 0.8rem', fontSize: '0.6rem', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                        {(() => {
                           let resumen = dataOficial.observaciones;
                           if (!resumen) {
                             const segsAlumno = seguimiento.filter(s => s.alumno_id === alumno.id);
                             if (segsAlumno.length > 0) {
                               resumen = segsAlumno.map(s => `${s.tema_id}: ${s.nota || 'NO'}`).join(' | ');
                             }
                           }
                           if (resumen) {
                             return resumen.split(' ').map((word, i) => (
                               <span key={i} style={{ color: (word.includes('NO') || word === 'A' || word === 'TED') ? '#EF4444' : 'inherit', fontWeight: (word.includes('NO') || word === 'A' || word === 'TED') ? 900 : 'normal' }}>
                                 {word}{' '}
                                </span>
                             ));
                           }
                           return <span style={{ fontStyle: 'italic', opacity: 0.3 }}>Sin registros</span>;
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL OCR PREMIUM */}
      {showOCRModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowOCRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Escanear Planilla de Papel</h3>
              <button className="btn-close" onClick={() => setShowOCRModal(false)}>✕</button>
            </div>
            
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
               <div style={{ 
                 width: '100%', height: '200px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '20px',
                 display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                 background: 'rgba(255,255,255,0.02)', cursor: 'pointer'
               }}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Soltá la foto de tu planilla acá o hacé clic para subir.</p>
               </div>
               
               <div style={{ marginTop: '2rem', textAlign: 'left', background: 'rgba(79, 70, 229, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>💡 Tip para maestros:</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Asegurate de que haya buena luz y que los nombres se vean claros. Nuestro sistema extraerá los datos y te los listará para que los confirmes.</p>
               </div>
            </div>

            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowOCRModal(false)}>Cerrar</button>
              <button className="btn-primary" disabled style={{ flex: 1.5, opacity: 0.5 }}>Procesar Imagen (Próximamente)</button>
            </div>
          </div>
        </div>
      )}

      {/* MÓDULO INTENSIFICACIÓN (BÚMERAN) */}
      {activeTab === 'intensificacion' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--danger)', fontWeight: 800 }}>Intensificación</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Recuperación de Procesos Pendientes</span>
             </div>
             
             {/* 🎯 SELECTORES DE PERIODO NATALIA STYLE */}
             <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', width: 'fit-content' }}>
                {[
                  { id: 'M-A', col: 'c1_b1_int', label: 'M - A' },
                  { id: 'M-J-J', col: 'c1_b2_int', label: 'M - J - J' },
                  { id: 'A-S', col: 'c2_b3_int', label: 'A - S' },
                  { id: 'O-N', col: 'c2_b4_int', label: 'O - N' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePeriodoInt(p.id)}
                    style={{
                      padding: '0.6rem 1.5rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s',
                      background: activePeriodoInt === p.id ? 'var(--danger)' : 'transparent',
                      color: activePeriodoInt === p.id ? '#fff' : 'var(--text-secondary)',
                      border: 'none', boxShadow: activePeriodoInt === p.id ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
             </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Alumno</th>
                  <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Estado Trayectoria</th>
                  <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Nota Recuperación (1-10 o A)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Funciones de Ayuda (Globales al Módulo)
                  const esRiesgo = (s) => s === 'TED' || s === 'TEP';
                  const noAcredito = (n) => !n || n === 'A' || parseFloat(n) < 7;
                  
                  // Mapeo dinámico según periodo Natalia
                  const mapeo = { 'M-A': 'c1_b1_int', 'M-J-J': 'c1_b2_int', 'A-S': 'c2_b3_int', 'O-N': 'c2_b4_int' };
                  const colDestino = mapeo[activePeriodoInt];
                  
                  const deudores = alumnos.filter(alumno => {
                    const dataO = planillaOficial.find(p => p.alumno_id === alumno.id) || {};

                    // Lógica de Arrastre Natalia: Aparece si tiene riesgo ACTUAL o si DEBE el anterior
                    if (activePeriodoInt === 'M-A') {
                       return esRiesgo(dataO.c1_p1_sigla) || esRiesgo(dataO.c1_p2_sigla);
                    }
                    if (activePeriodoInt === 'M-J-J') {
                       const riesgoActual = esRiesgo(dataO.c1_p3_sigla) || esRiesgo(dataO.c1_p4_sigla);
                       const debeAnterior = (esRiesgo(dataO.c1_p1_sigla) || esRiesgo(dataO.c1_p2_sigla)) && noAcredito(dataO.c1_b1_int);
                       return riesgoActual || debeAnterior;
                    }
                    if (activePeriodoInt === 'A-S') {
                       const riesgoActual = esRiesgo(dataO.c1_p5_sigla) || esRiesgo(dataO.c1_p6_sigla);
                       const debeAnterior = (esRiesgo(dataO.c1_p3_sigla) || esRiesgo(dataO.c1_p4_sigla)) && noAcredito(dataO.c1_b2_int);
                       return riesgoActual || debeAnterior;
                    }
                    if (activePeriodoInt === 'O-N') {
                       const riesgoActual = esRiesgo(dataO.c1_p7_sigla) || esRiesgo(dataO.c1_p8_sigla);
                       const debeAnterior = (esRiesgo(dataO.c1_p5_sigla) || esRiesgo(dataO.c1_p6_sigla)) && noAcredito(dataO.c2_b3_int);
                       return riesgoActual || debeAnterior;
                    }
                    return false;
                  });

                  if (deudores.length === 0) {
                    return (
                      <tr>
                        <td colSpan="3" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
                           🎉 No hay alumnos detectados con TED o TEP para el periodo {activePeriodoInt}.
                        </td>
                      </tr>
                    );
                  }

                  return deudores.map((alumno) => {
                    const dataO = planillaOficial.find(p => p.alumno_id === alumno.id) || {};
                    // Chequeo de Arrastre (si debe algo del bimestre anterior del mismo cuatrimestre)
                    const tieneArrastre = (activePeriodoInt === 'M-J-J' && (esRiesgo(dataO.c1_p1_sigla) || esRiesgo(dataO.c1_p2_sigla))) ||
                                          (activePeriodoInt === 'O-N' && (esRiesgo(dataO.c1_p5_sigla) || esRiesgo(dataO.c1_p6_sigla)));

                    return (
                      <tr key={alumno.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700 }}>{alumno.apellido}, {alumno.nombre}</span>
                                {(alumno.es_recursante || alumno.condicion_estudiante === 'recursante') && (
                                  <span style={{ 
                                    background: '#EF4444', color: '#fff',
                                    width: '20px', height: '20px', borderRadius: '4px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', fontWeight: 900
                                  }}>R</span>
                                )}
                             </div>
                             {tieneArrastre && (
                               <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '4px', width: 'fit-content', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 800 }}>
                                 🚩 PENDIENTE: {activePeriodoInt.startsWith('M') ? 'M-A' : 'A-S'}
                               </span>
                             )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              {(() => {
                                 const nota = dataO[colDestino];
                                 const esAprobado = !isNaN(nota) && parseFloat(nota) >= 7;
                                 
                                 return (
                                   <>
                                     <span style={{ 
                                       padding: '4px 12px', 
                                       background: esAprobado ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                                       color: esAprobado ? '#10b981' : '#f59e0b',
                                       borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900,
                                       border: `1px solid ${esAprobado ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                       textTransform: 'uppercase',
                                       letterSpacing: '0.5px'
                                     }}>
                                       {esAprobado ? '✓ Aprobado' : '⚡ En Proceso'}
                                     </span>
                                     {alumno.periodos_pendientes && (
                                       <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                          {alumno.periodos_pendientes}
                                       </span>
                                     )}
                                   </>
                                 );
                              })()}
                           </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <input 
                            type="text" 
                            value={dataO[colDestino] || ''}
                            onChange={(e) => {
                              const v = e.target.value.toUpperCase();
                              setPlanillaOficial(prev => prev.map(p => 
                                p.alumno_id === alumno.id ? { ...p, [colDestino]: v } : p
                              ));
                            }}
                            onBlur={async (e) => {
                              const v = e.target.value.toUpperCase();
                              if (!v) return;
                              // Validación Natalia: Número 1-10 o 'A'
                              if (v !== 'A' && (isNaN(v) || v < 1 || v > 10)) {
                                 e.target.style.border = '2px solid var(--danger)';
                                 return;
                              }
                              e.target.style.border = '1px solid var(--border)';
                              await handleSavePlanilla(alumno.id, colDestino, v);
                            }}
                            placeholder="7 o A"
                            style={{ width: '100px', margin: '0 auto', display: 'block', padding: '0.6rem', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#fff', borderRadius: '8px', textAlign: 'center', fontWeight: 900, fontSize: '1rem' }}
                          />
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAlumno ? 'Editar Alumno' : 'Registrar Alumno'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre (*)</label>
                  <input required type="text" name="nombre" className="input-field" value={formData.nombre} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Apellido (*)</label>
                  <input required type="text" name="apellido" className="input-field" value={formData.apellido} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>DNI</label>
                  <input type="text" name="dni" className="input-field" placeholder="Sin puntos" value={formData.dni} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Legajo</label>
                  <input type="text" name="legajo" className="input-field" placeholder="N° de Legajo" value={formData.legajo} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nacimiento</label>
                  <input type="date" name="fecha_nacimiento" className="input-field" value={formData.fecha_nacimiento} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="text" name="telefono_contacto" className="input-field" value={formData.telefono_contacto} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Email Tutor</label>
                <input type="email" name="email_contacto" className="input-field" value={formData.email_contacto} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Observaciones</label>
                <textarea name="observaciones" className="input-field" rows="2" value={formData.observaciones} onChange={handleInputChange}></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Estado Inscripción</label>
                  <select name="estado_inscripcion" className="input-field" value={formData.estado_inscripcion} onChange={handleInputChange}>
                    <option value="regular">Regular / Cursa</option>
                    <option value="no_cursa">No cursa más (Baja)</option>
                    <option value="cambio_colegio">Cambio de Colegio</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Condición Estudiante</label>
                  <select name="condicion_estudiante" className="input-field" value={formData.condicion_estudiante} onChange={handleInputChange}>
                    <option value="regular">Regular</option>
                    <option value="recursante">Recursante (Muestra R)</option>
                  </select>
                </div>
              </div>

              {/* CHECKBOX ES_RECURSANTE — campo del backend */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.8rem 1rem', background: formData.es_recursante ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: '12px', border: formData.es_recursante ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)', cursor: 'pointer', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={!!formData.es_recursante}
                  onChange={(e) => setFormData({ ...formData, es_recursante: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Alumno/a Recursante <span style={{ background: '#EF4444', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '5px', marginLeft: '6px' }}>R</span></span>
              </label>

              <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', border: tieneInclusion ? '1px solid var(--primary)' : '1px solid transparent' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={tieneInclusion} onChange={(e) => setTieneInclusion(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{editingAlumno ? 'Editar PPI / Inclusión' : '¿Tiene PPI / Inclusión?'}</span>
                </label>

                {tieneInclusion && (
                  <div className="animate-slide-up" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="form-group">
                      <label style={{ color: 'var(--primary)' }}>Tipo de Condición</label>
                      <select name="tipo_condicion" className="input-field" value={condicionData.tipo_condicion} onChange={handleCondicionChange}>
                        <option value="discapacidad">Discapacidad</option>
                        <option value="dificultad_aprendizaje">Dificultad de Aprendizaje</option>
                        <option value="talento_alto">Altas Capacidades</option>
                        <option value="problema_salud">Salud</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: 'var(--primary)' }}>Descripción PPI</label>
                      <textarea name="descripcion" className="input-field" rows="2" value={condicionData.descripcion} onChange={handleCondicionChange}></textarea>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1.5 }}>{editingAlumno ? 'Guardar Cambios' : 'Guardar Alumno'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DE EVENTOS ACADÉMICOS (PROTOCOLO NATALIA) */}
      <EventoAcademicoModal 
        isOpen={showEventoModal} 
        onClose={() => setShowEventoModal(false)}
        cursoId={id}
        docenteId={docenteId}
        cursoNombre={`${curso?.anio_o_grado || ''} ${curso?.division || ''}`}
      />
    </div>
  );
}
