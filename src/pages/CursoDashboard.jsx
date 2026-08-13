import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlumnosAPI, CursosAPI, CalificacionesAPI, SeguimientoAPI, IntensificacionesAPI, PlanillaOficialAPI, CalendarioAPI, OCRAPI } from '../services/api';
import { ExportPDF } from '../services/pdfService';
import '../components/Modal.css';
import '../components/Chips.css';
import EventoAcademicoModal from '../components/EventoAcademicoModal';
import OnboardingTour from '../components/OnboardingTour';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

export default function CursoDashboard({ session }) {
  const isMobile = useIsMobile();
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
  const [forceStartTour, setForceStartTour] = useState(false);

  const cursoPlanillasTourSteps = [
    {
      target: '#tour-curso-header',
      title: 'Panel del Curso 📚',
      content: 'Este es el centro de control de tu curso. Desde aquí administras la lista de alumnos y todas las planillas docentes.',
      position: 'bottom'
    },
    {
      target: '#tour-planilla-asistencia',
      title: 'Planilla de Asistencia ⏱️',
      content: 'Registra el presente, ausente o tardanza diaria de tus alumnos con un solo clic de forma rápida y sencilla.',
      position: 'bottom'
    },
    {
      target: '#tour-planilla-nomina',
      title: 'Nómina y Escaneo OCR 📷',
      content: 'Gestiona la lista de tus estudiantes. ¡Puedes escanear listas impresas sacándoles una foto con la cámara usando IA!',
      position: 'bottom'
    },
    {
      target: '#tour-planilla-seguimiento',
      title: 'Seguimiento Continuo 📝',
      content: 'Lleva el registro continuo de Trabajos Prácticos, evaluaciones parciales y valoraciones conceptuales de cada alumno.',
      position: 'bottom'
    },
    {
      target: '#tour-planilla-libro',
      title: 'Libro de Temas 📖',
      content: 'Firma y registra los contenidos dictados en cada módulo o clase para tener tu libro de temas al día.',
      position: 'top'
    },
    {
      target: '#tour-planilla-planificaciones',
      title: 'Planificaciones PDF 📁',
      content: 'Sube y consulta las planificaciones anuales y secuencias didácticas de esta materia en formato PDF.',
      position: 'top'
    },
    {
      target: '#tour-planilla-sabana',
      title: 'Sábana de Notas y Actas 📊',
      content: 'Planilla de calificaciones oficiales. Carga valoraciones pedagógicas (TEA, TEP, TED) o notas numéricas por trimestre/cuatrimestre.',
      position: 'top'
    },
    {
      target: '#tour-planilla-intensificacion',
      title: 'Intensificación de Saberes 🔄',
      content: 'Sección para hacer el seguimiento y cierre de alumnos en período de intensificación o recuperación.',
      position: 'top'
    },
    {
      target: '#tour-planilla-fechas',
      title: 'Fechas Importantes 📆',
      content: 'Agenda exámenes, salidas o actos escolares asociados directamente a este curso para que figuren en tu almanaque.',
      position: 'top'
    }
  ];

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
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResults, setOcrResults] = useState([]); // Alumnos detectados temporalmente
  const fileInputRef = useRef(null);
  const [editingAlumno, setEditingAlumno] = useState(null); 
  const [editingCondicionId, setEditingCondicionId] = useState(null); // ID de la condición si existe
  const [activeActividadIdx, setActiveActividadIdx] = useState(0);
  const [tieneInclusion, setTieneInclusion] = useState(false);
  const [alumnoEdicion, setAlumnoEdicion] = useState(null);
  const [modalTab, setModalTab] = useState('valoraciones');
  const [mobileCargaTab, setMobileCargaTab] = useState('resumen');

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

  const handleProcessOCR = async (file) => {
    if (!file) return;
    setIsProcessingOCR(true);
    setOcrResults([]);
    
    try {
      // LLAMADA AL BACKEND PROFESIONAL (GOOGLE VISION)
      const { alumnos } = await OCRAPI.processImage(file);
      
      // Mapeamos los resultados para que el usuario los confirme
      const mappedResults = alumnos.map((al, index) => ({
        ...al,
        id: `ocr-${index}`,
        checked: true
      }));

      setOcrResults(mappedResults);
    } catch (error) {
      console.error("Error OCR Profesional:", error);
      alert("Error al procesar la imagen con la IA del servidor. Asegurate de tener configurada la API de Google.");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleSaveBulkAlumnos = async () => {
    const toSave = ocrResults.filter(a => a.checked);
    if (toSave.length === 0) return;

    try {
      setIsProcessingOCR(true);
      for (const al of toSave) {
        await AlumnosAPI.create({
          nombre: al.nombre,
          apellido: al.apellido,
          curso_id: id,
          docente_id: docenteId,
          activo: true
        });
      }
      alert(`¡${toSave.length} alumnos agregados con éxito!`);
      setShowOCRModal(false);
      setOcrResults([]);
      loadData(); // Recargar la lista
    } catch (error) {
      console.error("Error al guardar masivamente:", error);
      alert("Hubo un error al guardar algunos alumnos.");
    } finally {
      setIsProcessingOCR(false);
    }
  };

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
            // No tenía, CREAMOS con la nueva función dedicada
            await AlumnosAPI.createCondicion({ 
              ...condicionData, 
              alumno_id: editingAlumno.id, 
              docente_id: docenteId 
            });
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

  const renderModalInputField = (field, alumnoId) => {
    const dataOficial = planillaOficial.find(p => p.alumno_id === alumnoId) || {};
    const val = dataOficial[field.key] || '';
    
    return (
      <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {field.label}
        </label>
        <input
          type="text"
          value={val}
          placeholder="-"
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setPlanillaOficial(prev => prev.map(p => 
              p.alumno_id === alumnoId ? { ...p, [field.key]: v } : p
            ));
          }}
          onBlur={(e) => {
            const v = e.target.value.toUpperCase();
            if (!v || v === '-') return;

            const esSigla = field.key.includes('sigla');
            const esBim = field.key.includes('bim') || field.key.includes('final') || field.key.includes('nota') || field.key.includes('intensif') || field.key.includes('int');
            
            let esValido = true;
            if (esSigla) {
              esValido = ['TEA', 'TEP', 'TED', 'A'].includes(v);
            } else if (esBim) {
              const num = parseFloat(v);
              esValido = !isNaN(num) && num >= 1 && num <= 10;
            }

            if (!esValido) {
              e.target.style.border = '1.5px solid #EF4444';
              e.target.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
              return;
            } else {
              e.target.style.border = '1.5px solid var(--border)';
              e.target.style.boxShadow = 'none';
              handleSavePlanilla(alumnoId, field.key, v);
            }
          }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            color: '#fff',
            padding: '0.6rem 0.8rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            textAlign: 'center',
            outline: 'none',
            textTransform: 'uppercase',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
        />
      </div>
    );
  };

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

        <div id="tour-curso-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#fff', textTransform: 'capitalize', letterSpacing: '3px' }}>
              {(curso.anio_o_grado + (curso.division ? ` ${curso.division}` : '')).toLowerCase().replace(/([º°oa])([0-9])/gi, '$1 $2')}
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', fontWeight: 800 }}>
              {curso.materia || 'Rol General'}
            </p>
          </div>
          <button
            onClick={() => setForceStartTour(true)}
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', borderRadius: '12px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ❓ Guía de Planillas
          </button>
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
            Dashboard
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
            Notas / Actas
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
            <Link id="tour-planilla-asistencia" to={`/asistencia/${id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px',
                borderTop: '5px solid var(--primary)', background: 'linear-gradient(180deg, rgba(79, 70, 229, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
                <div style={{ background: 'var(--primary)', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(79, 70, 229, 0.4)' }}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20"></path></svg>
                </div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Asistencia</h4>
              </div>
            </Link>

            <div id="tour-planilla-nomina" onClick={() => setActiveTab('nomina')} className="glass-card animate-slide-up" style={{ 
              padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px', cursor: 'pointer',
              borderTop: '5px solid #6366f1', background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
            }}>
              <div style={{ background: '#6366f1', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)' }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Nómina</h4>
            </div>

            <div id="tour-planilla-seguimiento" onClick={() => setActiveTab('seguimiento')} className="glass-card animate-slide-up" style={{ 
              padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px', cursor: 'pointer',
              borderTop: '5px solid #10b981', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
            }}>
              <div style={{ background: '#10b981', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)' }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Seguimiento</h4>
            </div>

            {/* FILA 2: GESTIÓN Y CIERRES */}
            <Link id="tour-planilla-libro" to={`/libro-temas?curso=${id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px',
                borderTop: '5px solid var(--purple)', background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
                <div style={{ background: 'var(--purple)', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)' }}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Libro de Temas</h4>
              </div>
            </Link>

            <Link id="tour-planilla-planificaciones" to={`/planificaciones?curso=${id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px',
                borderTop: '5px solid #3b82f6', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
                <div style={{ background: '#3b82f6', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)' }}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"></path></svg>
                </div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Planificaciones</h4>
              </div>
            </Link>

            <div id="tour-planilla-sabana" onClick={() => setActiveTab('notas')} className="glass-card animate-slide-up" style={{ 
              padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px', cursor: 'pointer',
              borderTop: '5px solid #f59e0b', background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
            }}>
              <div style={{ background: '#f59e0b', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)' }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Sábana de Notas</h4>
            </div>

            {/* FILA 3: CIERRES */}
            <div id="tour-planilla-intensificacion" onClick={() => setActiveTab('intensificacion')} className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem 0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', height: '170px', cursor: 'pointer',
                borderTop: '5px solid var(--danger)', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%)', borderRadius: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: '0.3s transform'
              }}>
              <div style={{ background: 'var(--danger)', width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.4)' }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Intensificación</h4>
            </div>
            {/* FILA FINAL: FECHAS IMPORTANTES (ESTRELLA DEL SHOW - ANCHO COMPLETO) */}
            <div id="tour-planilla-fechas" onClick={() => setShowEventoModal(true)} className="glass-card animate-slide-up" style={{ 
                gridColumn: '1 / -1', padding: '1.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', 
                background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.25) 0%, rgba(30, 41, 59, 1) 100%)', border: '1px solid var(--purple)', borderRadius: '30px', 
                cursor: 'pointer', boxShadow: '0 15px 40px rgba(124, 58, 237, 0.3)', marginTop: '0.5rem'
              }}>
                <div style={{ background: 'var(--purple)', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(124, 58, 237, 0.5)' }}>
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <h4 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>Fechas Importantes</h4>
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
             <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#fff' }}>Sábana de Notas</h2>
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
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
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

          {/* ESTILO RESPONSIVE BLINDADO (Directo en el componente para evitar caché) */}
          <style>{`
            .student-list-container {
              display: flex;
              flex-direction: column;
              background: rgba(30, 41, 59, 0.4);
              border-radius: 16px;
              overflow: hidden;
              border: 1px solid rgba(255,255,255,0.05);
              margin-bottom: 2rem;
            }
            .student-row {
              display: flex;
              align-items: center;
              gap: 15px;
              padding: 1.2rem 2rem; /* Tamaño PC Premium */
              border-bottom: 1px solid rgba(255,255,255,0.05);
              transition: background 0.2s;
            }
            .student-row:last-child { border-bottom: none; }
            .student-name {
              font-size: 1.15rem;
              font-weight: 600;
              color: #fff;
              line-height: 1.2;
            }
            .student-dni {
              font-size: 0.85rem;
              color: var(--text-secondary);
              opacity: 0.6;
              margin-top: 4px;
            }
            .student-index {
              font-size: 0.9rem;
              width: 35px;
              font-weight: 800;
              color: var(--text-secondary);
              opacity: 0.4;
              text-align: center;
            }

            /* --- AJUSTES PARA CELULAR (MÓVIL) --- */
            @media (max-width: 480px) {
              .student-row {
                padding: 8px 12px !important; /* Super compacto en móvil */
                gap: 10px !important;
              }
              .student-name {
                font-size: 0.85rem !important;
              }
              .student-dni {
                font-size: 0.62rem !important;
                margin-top: 2px !important;
              }
              .student-index {
                font-size: 0.65rem !important;
                width: 18px !important;
              }
              .student-row button svg {
                width: 15px !important;
                height: 15px !important;
              }
            }
          `}</style>

          <div className="student-list-container">
            {alumnosFiltrados.map((alumno, idx) => (
              <div key={alumno.id} className="student-row">
                <div className="student-index">
                  {idx + 1}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="student-name" style={{ 
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {(alumno.apellido + ' ' + alumno.nombre).toLowerCase()}
                    {(alumno.es_recursante || alumno.condicion_estudiante === 'recursante') && (
                      <span style={{ 
                        background: '#EF4444', color: '#fff',
                        fontSize: '0.55rem', padding: '1px 5px', borderRadius: '4px',
                        fontWeight: 900, marginLeft: '8px'
                      }}>R</span>
                    )}
                  </div>
                  <div className="student-dni">
                    DNI: {alumno.dni || '-'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button 
                    onClick={() => handleOpenModal(alumno)}
                    style={{ background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', padding: '6px', cursor: 'pointer' }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button 
                    onClick={() => handleDelete(alumno.id)}
                    style={{ background: 'transparent', color: 'rgba(239, 68, 68, 0.3)', border: 'none', padding: '6px', cursor: 'pointer' }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'seguimiento' && (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
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
                      setActiveActividadIdx(actividades.length); // Ir a la nueva en móvil
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

          {/* VISTA MÓVIL: CARGA RÁPIDA POR ACTIVIDAD (CARRUSEL) */}
          <div className="show-mobile-only" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)' }}>
            {actividades.length > 0 ? (
              <>
                <div style={{ background: 'rgba(79, 70, 229, 0.1)', borderRadius: '12px', padding: '10px', marginBottom: '1rem', border: '1px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <button 
                      onClick={() => setActiveActividadIdx(prev => Math.max(0, prev - 1))}
                      disabled={activeActividadIdx === 0}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', opacity: activeActividadIdx === 0 ? 0.3 : 1 }}
                    >❮</button>
                    
                    <select 
                      value={['TP 1','TP 2','TP 3','Eva. 1','Eva. 2','Oral','Carpeta'].includes(actividades[activeActividadIdx].nombre) ? actividades[activeActividadIdx].nombre : 'OTRO'}
                      onChange={async (e) => {
                        let nuevoNombre = e.target.value;
                        const act = actividades[activeActividadIdx];
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
                        if (nuevoNombre && nuevoNombre !== act.nombre) {
                            // Actualización silenciosa local
                            setActividades(prev => {
                              const newAct = [...prev];
                              newAct[activeActividadIdx] = { ...newAct[activeActividadIdx], nombre: nuevoNombre };
                              return newAct;
                            });
                            await SeguimientoAPI.update(act.id, { nombre: nuevoNombre });
                        }
                      }}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        fontSize: '1rem', 
                        fontWeight: 900, 
                        textAlign: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: '4px 10px'
                      }}
                    >
                      <option value="TP 1">TP 1</option>
                      <option value="TP 2">TP 2</option>
                      <option value="TP 3">TP 3</option>
                      <option value="Eva. 1">Eva. 1</option>
                      <option value="Eva. 2">Eva. 2</option>
                      <option value="Oral">Oral</option>
                      <option value="Carpeta">Carpeta</option>
                      <option value="OTRO">Otro...</option>
                      <option value="BORRAR">🗑️ Borrar</option>
                    </select>

                    <button 
                      onClick={() => setActiveActividadIdx(prev => Math.min(actividades.length - 1, prev + 1))}
                      disabled={activeActividadIdx === actividades.length - 1}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', opacity: activeActividadIdx === actividades.length - 1 ? 0.3 : 1 }}
                    >❯</button>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                     <input 
                        type="date" 
                        defaultValue={actividades[activeActividadIdx]?.fecha}
                        onChange={async (e) => {
                          await SeguimientoAPI.update(actividades[activeActividadIdx].id, { fecha: e.target.value });
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.7rem', textAlign: 'center' }}
                      />
                  </div>
                </div>

                <div key={activeActividadIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alumnosFiltrados.map((alumno, idx) => {
                    const act = actividades[activeActividadIdx];
                    const segsAlumno = seguimiento.filter(s => s.alumno_id === alumno.id);
                    const seg = segsAlumno.find(s => s.tema_id === act.id);
                    const valor = seg?.nota ?? '';
                    
                    // Cálculo de promedio para el celular
                    const notasNum = segsAlumno.map(s => parseFloat(s.nota)).filter(n => !isNaN(n));
                    const promedio = notasNum.length > 0 
                      ? (notasNum.reduce((a, b) => a + b, 0) / notasNum.length).toFixed(1) 
                      : '-';
                    
                    return (
                      <div key={alumno.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{alumno.apellido}, {alumno.nombre.charAt(0)}.</p>
                             <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', background: 'rgba(79, 70, 229, 0.1)', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>PROM: {promedio}</span>
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Nota Actual: {valor || '—'}</span>
                        </div>
                        <input 
                          key={`${alumno.id}-${activeActividadIdx}`}
                          type="text"
                          defaultValue={valor}
                          onBlur={async (e) => {
                             const nVal = e.target.value.toUpperCase();
                             if (nVal !== valor) {
                               const tipoEv = act?.nombre.toLowerCase().includes('tp') ? 'TP' : 
                                              (act?.nombre.toLowerCase().includes('eva') ? 'Examen' : 'Concepto');
                               
                               const nuevoDato = {
                                 alumno_id: alumno.id,
                                 curso_id: id,
                                 docente_id: docenteId,
                                 tema_id: act.id,
                                 nota: nVal,
                                 fecha: act.fecha || new Date().toISOString().split('T')[0],
                                 tipo_evaluacion: tipoEv
                               };

                               // Actualizamos localmente INSTANTÁNEO
                               setSeguimiento(prev => {
                                 const newSeg = [...prev];
                                 const idxSeg = newSeg.findIndex(s => s.alumno_id === alumno.id && s.tema_id === act.id);
                                 if (idxSeg !== -1) newSeg[idxSeg] = nuevoDato;
                                 else newSeg.push(nuevoDato);
                                 return newSeg;
                               });

                               // Guardamos en la base de datos "por atrás"
                               try {
                                 await SeguimientoAPI.saveMasivo([nuevoDato]);
                               } catch (err) {
                                 console.error("Error al guardar en la DB:", err);
                                 alert("No se pudo guardar la nota en la base de datos. Revisá tu conexión.");
                               }
                             }
                          }}
                          style={{ 
                            width: '50px', 
                            height: '40px', 
                            textAlign: 'center', 
                            background: 'var(--card-bg)', 
                            border: '2px solid var(--primary)', 
                            color: '#fff', 
                            borderRadius: '8px',
                            fontWeight: 900,
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Agregá una actividad para empezar a cargar notas.
              </div>
            )}
          </div>

          {/* VISTA PC: TABLA COMPLETA (SÁBANA) */}
          <div className="hide-mobile" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', maxHeight: '75vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                <tr style={{ background: '#121625', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', width: '220px', position: 'sticky', left: 0, background: '#121625', zIndex: 110, borderRight: '2px solid var(--border)' }}>Alumno</th>
                  {actividades.map((act, actIdx) => (
                    <th key={act.id} style={{ padding: '0.15rem', textAlign: 'center', width: '110px', borderRight: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center' }}>
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
                          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: '0.65rem', fontWeight: 800, width: '100%', textAlign: 'center', borderRadius: '4px', cursor: 'pointer', outline: 'none', padding: '1px' }}
                        >
                          <option value="TP 1">TP 1</option>
                          <option value="TP 2">TP 2</option>
                          <option value="TP 3">TP 3</option>
                          <option value="Eva. 1">Eva. 1</option>
                          <option value="Eva. 2">Eva. 2</option>
                          <option value="Oral">Oral</option>
                          <option value="Carpeta">Carpeta</option>
                          <option value="OTRO">Otro...</option>
                          <option value="BORRAR">🗑️ Borrar</option>
                        </select>
                        <input 
                          type="date" 
                          defaultValue={act.fecha}
                          onChange={async (e) => { await SeguimientoAPI.update(act.id, { fecha: e.target.value }); }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.55rem', width: '100%', textAlign: 'center', cursor: 'pointer' }}
                        />
                        <button 
                          onClick={async () => {
                            const inputs = document.querySelectorAll(`[id$="-${actIdx}"]`);
                            const batch = [];
                            inputs.forEach(input => {
                              const [_, rowIdx, colIdx] = input.id.split('-');
                              const alumno = alumnosFiltrados[parseInt(rowIdx)];
                              if (alumno && input.value) {
                                batch.push({
                                  alumno_id: alumno.id, curso_id: id, docente_id: docenteId, tema_id: act.id,
                                  nota: input.value.toUpperCase(), fecha: act.fecha || new Date().toISOString().split('T')[0],
                                  tipo_evaluacion: act?.nombre.toLowerCase().includes('tp') ? 'TP' : (act?.nombre.toLowerCase().includes('eva') ? 'Examen' : 'Concepto')
                                });
                              }
                            });
                            if (batch.length === 0) return;
                            try {
                              await SeguimientoAPI.saveMasivo(batch);
                              setSeguimiento(prev => {
                                const newSeg = [...prev];
                                batch.forEach(item => {
                                  const ix = newSeg.findIndex(s => s.alumno_id === item.alumno_id && s.tema_id === item.tema_id);
                                  if (ix !== -1) newSeg[ix] = item; else newSeg.push(item);
                                });
                                return newSeg;
                              });
                              alert(`¡Guardado! Notas de ${act.nombre} listas.`);
                            } catch (e) { alert("Error al guardar."); }
                          }}
                          style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 900, cursor: 'pointer', padding: '1px 3px' }}
                        >
                          GUARDAR
                        </button>
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: '0.2rem', textAlign: 'center', width: '60px', color: 'var(--primary)', fontWeight: 900 }}>PROM</th>
                </tr>
              </thead>
              <tbody>
                {alumnosFiltrados.map((alumno, idx) => {
                  const segsAlumno = seguimiento.filter(s => s.alumno_id === alumno.id);
                  const notasNum = segsAlumno.map(s => parseFloat(s.nota)).filter(n => !isNaN(n));
                  const promedio = notasNum.length > 0 ? (notasNum.reduce((a, b) => a + b, 0) / notasNum.length).toFixed(1) : '-';

                  return (
                    <tr key={alumno.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '32px' }}>
                      <td style={{ padding: '0px 0.8rem', position: 'sticky', left: 0, background: '#121625', zIndex: 5, fontWeight: 600, borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.95rem' }}>{alumno.apellido}, {alumno.nombre}.</span>
                          {(alumno.es_recursante || alumno.condicion_estudiante === 'recursante') && (
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.55rem', background: '#EF4444', padding: '1px 4px', borderRadius: '4px' }}>R</span>
                          )}
                        </div>
                      </td>
                      {actividades.map((act, actIdx) => {
                        const seg = segsAlumno.find(s => s.tema_id === act.id);
                        const entregado = seg ? seg.entregado !== false : true; 
                        const valor = seg?.nota ?? '';
                        return (
                          <td key={act.id} style={{ padding: '0 4px', borderRight: '1px solid rgba(255,255,255,0.05)', background: !entregado ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', height: '100%' }}>
                              <input 
                                type="checkbox" checked={entregado} 
                                onChange={(e) => handleSaveSeguimiento(alumno.id, act.id, valor, act.nombre, e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981', flexShrink: 0 }}
                              />
                              <input 
                                type="text" id={`input-${idx}-${actIdx}`} value={entregado ? valor : 'NO'} disabled={!entregado}
                                onChange={(e) => {
                                   const nV = e.target.value.toUpperCase();
                                   setSeguimiento(prev => prev.map(s => (s.alumno_id === alumno.id && s.tema_id === act.id) ? { ...s, nota: nV } : s));
                                }}
                                onBlur={(e) => handleSaveSeguimiento(alumno.id, act.id, e.target.value, act.nombre, entregado)}
                                onKeyDown={(e) => {
                                  const k = e.key;
                                  let nI = idx, nAI = actIdx;
                                  if (k === 'ArrowDown' || k === 'Enter') nI = idx + 1;
                                  else if (k === 'ArrowUp') nI = idx - 1;
                                  else if (k === 'ArrowRight') nAI = actIdx + 1;
                                  else if (k === 'ArrowLeft') nAI = actIdx - 1;
                                  else return;
                                  const t = document.getElementById(`input-${nI}-${nAI}`);
                                  if (t) t.focus();
                                }}
                                style={{
                                  width: '45px', height: '26px', textAlign: 'center', borderRadius: '6px', border: '1.5px solid rgba(255,255,255,0.1)',
                                  background: !entregado ? '#EF4444' : (valor ? getNotaColor(valor) : 'rgba(255,255,255,0.05)'),
                                  color: '#fff', fontWeight: 900, fontSize: '0.95rem', outline: 'none', opacity: !entregado ? 0.6 : 1
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', padding: '0.2rem', color: 'var(--primary)', fontWeight: 900, fontSize: '0.9rem', borderLeft: '1px solid var(--border)' }}>
                        {promedio}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {activeTab === 'notas' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{
            padding: isMobile ? '1rem' : '1.2rem',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: isMobile ? '0.8rem' : '1.2rem',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <h3 style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', margin: 0, fontWeight: 800, letterSpacing: '1px', textAlign: isMobile ? 'center' : 'left' }}>
              PLANILLA OFICIAL DE CALIFICACIONES
            </h3>
            <button 
              onClick={() => ExportPDF.notas(curso, alumnos, planillaOficial, session?.user?.user_metadata?.full_name || 'Docente')}
              style={{
                padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'var(--primary)', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: isMobile ? '100%' : 'auto', transition: 'all 0.3s'
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              DESCARGAR PLANILLA PDF
            </button>
          </div>

          {isMobile ? (
            /* VISTA MOBILE: CARDS PEDAGÓGICAS DINÁMICAS Y INTERACTIVAS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Selector Deslizante de Carga Rápida */}
              <div style={{ padding: '0 1rem', marginBottom: '4px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Columna / Período a Cargar Rápido:
                </div>
                <div className="no-scrollbar" style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  overflowX: 'auto', 
                  paddingBottom: '8px',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {[
                    { id: 'resumen', label: '📊 Vista General' },
                    { id: 'c1_val', label: '🟣 1° Cuatri (Val)' },
                    { id: 'c1_notas', label: '🔢 1° Cuatri (Notas)' },
                    { id: 'c2_val', label: '🟣 2° Cuatri (Val)' },
                    { id: 'c2_notas', label: '🔢 2° Cuatri (Notas)' },
                    { id: 'cierres', label: '🏆 Cierres Anuales' },
                    { id: 'observaciones', label: '📝 Observaciones' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setMobileCargaTab(tab.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: mobileCargaTab === tab.id ? 'var(--primary)' : 'rgba(30, 41, 59, 0.6)',
                        color: mobileCargaTab === tab.id ? '#fff' : 'var(--text-secondary)',
                        boxShadow: mobileCargaTab === tab.id ? '0 4px 15px rgba(79, 70, 229, 0.3)' : 'none',
                        transform: mobileCargaTab === tab.id ? 'scale(1.03)' : 'scale(1)'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Listado de Tarjetas */}
              <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alumnosFiltrados.map((alumno) => {
                  const dataOficial = planillaOficial.find(p => p.alumno_id === alumno.id) || {};
                  const notaFinal = dataOficial.nota_final || '-';
                  const c1Final = dataOficial.c1_final || '-';
                  const c2Final = dataOficial.c2_final || '-';
                  
                  return (
                    <div 
                      key={alumno.id} 
                      onClick={() => { 
                        if (mobileCargaTab === 'resumen') { 
                          setAlumnoEdicion(alumno); 
                          setModalTab('valoraciones'); 
                        } 
                      }}
                      style={{ 
                        background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border)', 
                        padding: '1.2rem',
                        cursor: mobileCargaTab === 'resumen' ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.8rem'
                      }}
                      onMouseEnter={(e) => {
                        if (mobileCargaTab === 'resumen') {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      }}
                    >
                      {/* Cabecera de la Tarjeta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
                            {alumno.apellido}, {alumno.nombre}
                          </h4>
                          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {(alumno.es_recursante || alumno.condicion_estudiante === 'recursante') ? 'Recursante' : 'Estudiante Regular'}
                          </p>
                        </div>
                      </div>

                      {/* CONTENIDO SEGÚN LA SUB-SOLAPA SELECCIONADA */}
                      
                      {/* 1. VISTA GENERAL (RESUMEN DE SÁBANA) */}
                      {mobileCargaTab === 'resumen' && (
                        <>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1.1fr', 
                            gap: '8px', 
                            marginTop: '4px' 
                          }}>
                            {/* Columna 1° Cuatrimestre */}
                            <div style={{ 
                              background: 'rgba(255, 255, 255, 0.01)', 
                              border: '1px solid rgba(255,255,255,0.03)', 
                              borderRadius: '12px', 
                              padding: '6px 8px 8px 8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ fontSize: '0.55rem', color: '#a78bfa', fontWeight: 900, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px', marginBottom: '2px', letterSpacing: '0.5px' }}>
                                1° CUATRI
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 4px', fontSize: '0.65rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>P1</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_p1_sigla), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_p1_sigla || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>P2</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_p2_sigla), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_p2_sigla || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>BIM 1</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_bim1_nota), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_bim1_nota || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>INT</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_b1_int), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_b1_int || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>P3</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_p3_sigla), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_p3_sigla || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>P4</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_p4_sigla), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_p4_sigla || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>BIM 2</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_bim2_nota), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_bim2_nota || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>INT</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_b2_int), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_b2_int || '-'}</span>
                                </div>
                              </div>
                              <div style={{ 
                                marginTop: 'auto', 
                                background: 'rgba(255,255,255,0.03)', 
                                padding: '4px', 
                                borderRadius: '6px', 
                                textAlign: 'center',
                                border: '1px solid rgba(255,255,255,0.05)'
                              }}>
                                <span style={{ display: 'block', fontSize: '0.42rem', color: 'var(--text-secondary)', fontWeight: 700 }}>PROM C1</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff' }}>{c1Final}</span>
                              </div>
                            </div>

                            {/* Columna 2° Cuatrimestre */}
                            <div style={{ 
                              background: 'rgba(255, 255, 255, 0.01)', 
                              border: '1px solid rgba(255,255,255,0.03)', 
                              borderRadius: '12px', 
                              padding: '6px 8px 8px 8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ fontSize: '0.55rem', color: '#a78bfa', fontWeight: 900, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px', marginBottom: '2px', letterSpacing: '0.5px' }}>
                                2° CUATRI
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 4px', fontSize: '0.65rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>P5</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_p5_sigla), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_p5_sigla || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>P6</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_p6_sigla), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_p6_sigla || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>BIM 3</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c2_bim1_nota), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c2_bim1_nota || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>INT</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c2_b3_int), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c2_b3_int || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>P7</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_p7_sigla), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_p7_sigla || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>P8</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c1_p8_sigla), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c1_p8_sigla || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>BIM 4</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c2_bim2_nota), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c2_bim2_nota || '-'}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ display: 'block', fontSize: '0.45rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>INT</span>
                                  <span style={{ fontWeight: 800, color: '#fff', background: getNotaColor(dataOficial.c2_b4_int), padding: '2px 3px', borderRadius: '4px', fontSize: '0.6rem', display: 'inline-block', minWidth: '22px' }}>{dataOficial.c2_b4_int || '-'}</span>
                                </div>
                              </div>
                              <div style={{ 
                                marginTop: 'auto', 
                                background: 'rgba(255,255,255,0.03)', 
                                padding: '4px', 
                                borderRadius: '6px', 
                                textAlign: 'center',
                                border: '1px solid rgba(255,255,255,0.05)'
                              }}>
                                <span style={{ display: 'block', fontSize: '0.42rem', color: 'var(--text-secondary)', fontWeight: 700 }}>PROM C2</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff' }}>{c2Final}</span>
                              </div>
                            </div>

                            {/* Columna Cierres Anuales */}
                            <div style={{ 
                              background: 'rgba(255, 255, 255, 0.01)', 
                              border: '1px solid rgba(255,255,255,0.03)', 
                              borderRadius: '12px', 
                              padding: '6px 8px 8px 8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '7px'
                            }}>
                              <div style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 900, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px', marginBottom: '4px', letterSpacing: '0.5px' }}>
                                CIERRES
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.65rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '2px 5px', borderRadius: '6px' }}>
                                  <span style={{ fontSize: '0.45rem', color: 'var(--text-secondary)' }}>ANUAL</span>
                                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.65rem' }}>{dataOficial.nota_anual || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '2px 5px', borderRadius: '6px' }}>
                                  <span style={{ fontSize: '0.45rem', color: 'var(--text-secondary)' }}>INT. DIC</span>
                                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.65rem' }}>{dataOficial.intensif_dic || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '2px 5px', borderRadius: '6px' }}>
                                  <span style={{ fontSize: '0.45rem', color: 'var(--text-secondary)' }}>INT. FEB</span>
                                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.65rem' }}>{dataOficial.intensif_feb || '-'}</span>
                                </div>
                              </div>
                              <div style={{ 
                                marginTop: 'auto', 
                                background: 'rgba(79, 70, 229, 0.15)', 
                                padding: '4px 6px', 
                                borderRadius: '8px', 
                                textAlign: 'center',
                                border: '1.5px solid var(--primary)',
                                boxShadow: '0 0 10px rgba(79, 70, 229, 0.2)'
                              }}>
                                <span style={{ display: 'block', fontSize: '0.42rem', color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.5px' }}>NOTA FINAL</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>{notaFinal}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ 
                            borderTop: '1px solid rgba(255,255,255,0.05)', 
                            paddingTop: '0.6rem', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            fontSize: '0.7rem' 
                          }}>
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(() => {
                                if (dataOficial.observaciones) return `📝 ${dataOficial.observaciones}`;
                                const segsAlumno = seguimiento.filter(s => s.alumno_id === alumno.id);
                                if (segsAlumno.length > 0) {
                                  return `📋 ${segsAlumno.map(s => `${s.tema_id}: ${s.nota || 'NO'}`).join(' | ')}`;
                                }
                                return 'Sin observaciones cargadas';
                              })()}
                            </span>
                            <span style={{ color: 'var(--primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Editar Ficha ➔
                            </span>
                          </div>
                        </>
                      )}

                      {/* 2. CARGA RÁPIDA: 1° CUATRI VALORACIONES */}
                      {mobileCargaTab === 'c1_val' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                          {[
                            { key: 'c1_p1_sigla', label: 'P1 (M-A)' },
                            { key: 'c1_p2_sigla', label: 'P2 (M-A)' },
                            { key: 'c1_p3_sigla', label: 'P3 (M-J-J)' },
                            { key: 'c1_p4_sigla', label: 'P4 (M-J-J)' }
                          ].map(field => {
                            const valAct = dataOficial[field.key] || '';
                            return (
                              <div key={field.key} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 800 }}>{field.label}</span>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                  {['TEA', 'TEP', 'TED'].map(opc => {
                                    const isSel = valAct === opc;
                                    return (
                                      <button
                                        key={opc}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSavePlanilla(alumno.id, field.key, isSel ? '' : opc);
                                        }}
                                        style={{
                                          border: 'none', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, padding: '4px 0', flex: 1, cursor: 'pointer',
                                          background: isSel ? getNotaColor(opc) : 'rgba(255,255,255,0.04)',
                                          color: isSel ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s'
                                        }}
                                      >
                                        {opc}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. CARGA RÁPIDA: 1° CUATRI NOTAS */}
                      {mobileCargaTab === 'c1_notas' && (
                        <div style={{ display: 'flex', gap: '8px', padding: '4px 0', alignItems: 'center' }}>
                          {[
                            { key: 'c1_bim1_nota', label: 'BIM 1' },
                            { key: 'c1_b1_int', label: 'INT 1' },
                            { key: 'c1_bim2_nota', label: 'BIM 2' },
                            { key: 'c1_b2_int', label: 'INT 2' },
                            { key: 'c1_final', label: 'PROM C1' }
                          ].map(field => {
                            const isFinal = field.key === 'c1_final';
                            return (
                              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', fontWeight: 800 }}>{field.label}</span>
                                <input
                                  type="text"
                                  value={dataOficial[field.key] || ''}
                                  onChange={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    setPlanillaOficial(prev => prev.map(p => p.alumno_id === alumno.id ? { ...p, [field.key]: v } : p));
                                  }}
                                  onBlur={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    if (v && v !== '-') {
                                      const num = parseFloat(v);
                                      if (isNaN(num) || num < 1 || num > 10) {
                                        e.target.style.borderColor = '#EF4444';
                                        return;
                                      }
                                    }
                                    e.target.style.borderColor = 'var(--border)';
                                    handleSavePlanilla(alumno.id, field.key, v);
                                  }}
                                  placeholder="-"
                                  style={{
                                    width: '100%', height: '30px', textAlign: 'center',
                                    background: isFinal ? 'rgba(79,70,229,0.05)' : 'rgba(255,255,255,0.02)',
                                    border: isFinal ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                    borderRadius: '8px', color: '#fff', fontSize: '0.8rem', fontWeight: 900, outline: 'none'
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 4. CARGA RÁPIDA: 2° CUATRI VALORACIONES */}
                      {mobileCargaTab === 'c2_val' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                          {[
                            { key: 'c1_p5_sigla', label: 'P5 (A-S)' },
                            { key: 'c1_p6_sigla', label: 'P6 (A-S)' },
                            { key: 'c1_p7_sigla', label: 'P7 (O-N)' },
                            { key: 'c1_p8_sigla', label: 'P8 (O-N)' }
                          ].map(field => {
                            const valAct = dataOficial[field.key] || '';
                            return (
                              <div key={field.key} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 800 }}>{field.label}</span>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                  {['TEA', 'TEP', 'TED'].map(opc => {
                                    const isSel = valAct === opc;
                                    return (
                                      <button
                                        key={opc}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSavePlanilla(alumno.id, field.key, isSel ? '' : opc);
                                        }}
                                        style={{
                                          border: 'none', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, padding: '4px 0', flex: 1, cursor: 'pointer',
                                          background: isSel ? getNotaColor(opc) : 'rgba(255,255,255,0.04)',
                                          color: isSel ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s'
                                        }}
                                      >
                                        {opc}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. CARGA RÁPIDA: 2° CUATRI NOTAS */}
                      {mobileCargaTab === 'c2_notes' || mobileCargaTab === 'c2_notas' ? (
                        <div style={{ display: 'flex', gap: '8px', padding: '4px 0', alignItems: 'center' }}>
                          {[
                            { key: 'c2_bim1_nota', label: 'BIM 3' },
                            { key: 'c2_b3_int', label: 'INT 3' },
                            { key: 'c2_bim2_nota', label: 'BIM 4' },
                            { key: 'c2_b4_int', label: 'INT 4' },
                            { key: 'c2_final', label: 'PROM C2' }
                          ].map(field => {
                            const isFinal = field.key === 'c2_final';
                            return (
                              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', fontWeight: 800 }}>{field.label}</span>
                                <input
                                  type="text"
                                  value={dataOficial[field.key] || ''}
                                  onChange={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    setPlanillaOficial(prev => prev.map(p => p.alumno_id === alumno.id ? { ...p, [field.key]: v } : p));
                                  }}
                                  onBlur={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    if (v && v !== '-') {
                                      const num = parseFloat(v);
                                      if (isNaN(num) || num < 1 || num > 10) {
                                        e.target.style.borderColor = '#EF4444';
                                        return;
                                      }
                                    }
                                    e.target.style.borderColor = 'var(--border)';
                                    handleSavePlanilla(alumno.id, field.key, v);
                                  }}
                                  placeholder="-"
                                  style={{
                                    width: '100%', height: '30px', textAlign: 'center',
                                    background: isFinal ? 'rgba(79,70,229,0.05)' : 'rgba(255,255,255,0.02)',
                                    border: isFinal ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                    borderRadius: '8px', color: '#fff', fontSize: '0.8rem', fontWeight: 900, outline: 'none'
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {/* 6. CARGA RÁPIDA: CIERRES ANUALES */}
                      {mobileCargaTab === 'cierres' && (
                        <div style={{ display: 'flex', gap: '8px', padding: '4px 0', alignItems: 'center' }}>
                          {[
                            { key: 'nota_anual', label: 'ANUAL' },
                            { key: 'intensif_dic', label: 'INT DIC' },
                            { key: 'intensif_feb', label: 'INT FEB' },
                            { key: 'nota_final', label: 'NOTA FINAL' }
                          ].map(field => {
                            const isFinal = field.key === 'nota_final';
                            return (
                              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', fontWeight: 800 }}>{field.label}</span>
                                <input
                                  type="text"
                                  value={dataOficial[field.key] || ''}
                                  onChange={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    setPlanillaOficial(prev => prev.map(p => p.alumno_id === alumno.id ? { ...p, [field.key]: v } : p));
                                  }}
                                  onBlur={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    if (v && v !== '-') {
                                      const num = parseFloat(v);
                                      if (isNaN(num) || num < 1 || num > 10) {
                                        e.target.style.borderColor = '#EF4444';
                                        return;
                                      }
                                    }
                                    e.target.style.borderColor = 'var(--border)';
                                    handleSavePlanilla(alumno.id, field.key, v);
                                  }}
                                  placeholder="-"
                                  style={{
                                    width: '100%', height: '30px', textAlign: 'center',
                                    background: isFinal ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                                    border: isFinal ? '1.5px solid var(--success)' : '1px solid var(--border)',
                                    borderRadius: '8px', color: '#fff', fontSize: '0.8rem', fontWeight: 900, outline: 'none'
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 7. CARGA RÁPIDA: OBSERVACIONES Y TRAYECTORIA */}
                      {mobileCargaTab === 'observaciones' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800 }}>Notas de Seguimiento (Trabajos, Carpetas, etc.)</span>
                          {(() => {
                            const segsAlumno = seguimiento.filter(s => s.alumno_id === alumno.id);
                            if (segsAlumno.length > 0) {
                              return (
                                <div style={{ 
                                  background: 'rgba(255,255,255,0.01)', 
                                  padding: '8px 10px', 
                                  borderRadius: '12px', 
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px'
                                }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {segsAlumno.map((s, idx) => {
                                      const colorNota = getNotaColor(s.nota);
                                      return (
                                        <div 
                                          key={idx}
                                          style={{
                                            background: colorNota !== 'transparent' ? colorNota : 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            padding: '3px 8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontSize: '0.7rem',
                                            fontWeight: 800
                                          }}
                                        >
                                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>{s.tema_id}</span>
                                          <span style={{ 
                                            background: 'rgba(0,0,0,0.3)', 
                                            padding: '1px 5px', 
                                            borderRadius: '4px', 
                                            color: '#fff',
                                            fontWeight: 900
                                          }}>
                                            {s.nota || '-'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Sin notas de seguimiento registradas
                              </div>
                            );
                          })()}
                          
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, marginTop: '4px' }}>Observaciones / Informe de Trayectoria</span>
                          <textarea
                            value={dataOficial.observaciones || ''}
                            placeholder="Escriba aquí observaciones de trayectoria..."
                            onChange={(e) => {
                              const v = e.target.value;
                              setPlanillaOficial(prev => prev.map(p => p.alumno_id === alumno.id ? { ...p, observaciones: v } : p));
                            }}
                            onBlur={(e) => handleSavePlanilla(alumno.id, 'observaciones', e.target.value)}
                            style={{
                              width: '100%', height: '55px', background: 'rgba(255,255,255,0.02)',
                              border: '1px solid var(--border)', borderRadius: '10px', color: '#fff',
                              padding: '6px 10px', fontSize: '0.75rem', outline: 'none', resize: 'none', lineHeight: '1.4'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VISTA DESKTOP: TABLA HORIZONTAL (SÁBANA DE NOTAS) */
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem', minWidth: '1800px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                    <th rowSpan="2" style={{
                      padding: '0.8rem',
                      textAlign: 'left',
                      width: '220px',
                      position: 'sticky',
                      left: 0,
                      background: '#121625',
                      zIndex: 10,
                      borderRight: '2px solid var(--border)',
                      boxShadow: '3px 0 5px rgba(0,0,0,0.3)',
                      fontSize: '0.6rem'
                    }}>APELLIDO Y NOMBRES</th>
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
                        <td style={{
                          padding: '0.4rem 0.8rem',
                          position: 'sticky',
                          left: 0,
                          background: '#121625',
                          zIndex: 5,
                          fontWeight: 700,
                          borderRight: '2px solid var(--border)',
                          boxShadow: '3px 0 5px rgba(0,0,0,0.3)',
                          fontSize: '0.7rem'
                        }}>
                          <div style={{
                            maxWidth: '200px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={`${alumno.apellido}, ${alumno.nombre}`}>
                            {alumno.apellido}, {alumno.nombre}
                          </div>
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

                                // Lógica de Validación Estricta
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
          )}
        </div>
      )}

      {/* MODAL FULLSCREEN DE EDICIÓN MÓVIL POR ALUMNO */}
      {isMobile && alumnoEdicion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#0a0d16',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }} className="animate-fade-in">
          {/* Header del Modal */}
          <div style={{ 
            padding: '1.2rem 1rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid var(--border)',
            background: '#121625',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <button 
              onClick={() => setAlumnoEdicion(null)} 
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', padding: '0 8px' }}
            >
              ✕
            </button>
            <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {alumnoEdicion.apellido}, {alumnoEdicion.nombre}
              </h3>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Edición de Ficha Pedagógica</p>
            </div>
            <button 
              onClick={() => setAlumnoEdicion(null)} 
              style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Listo
            </button>
          </div>

          {/* Selector de Pestañas (Tabs) */}
          <div style={{ 
            display: 'flex', 
            background: '#121625', 
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: '55px',
            zIndex: 10
          }}>
            {[
              { id: 'valoraciones', label: 'Valoraciones' },
              { id: 'notas', label: 'Calificaciones' },
              { id: 'observaciones', label: 'Observaciones' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setModalTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '1rem 0.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: modalTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                  color: modalTab === tab.id ? '#fff' : 'var(--text-secondary)',
                  fontWeight: modalTab === tab.id ? 800 : 500,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenido de los Tabs */}
          <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {modalTab === 'valoraciones' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Valoraciones Pedagógicas (TEA / TEP / TED / A)
                </h4>
                
                <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.8rem', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>1° Cuatrimestre</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { key: 'c1_p1_sigla', label: 'P1 (M-A)' },
                      { key: 'c1_p2_sigla', label: 'P2 (M-A)' },
                      { key: 'c1_p3_sigla', label: 'P3 (M-J-J)' },
                      { key: 'c1_p4_sigla', label: 'P4 (M-J-J)' }
                    ].map(field => renderModalInputField(field, alumnoEdicion.id))}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.8rem', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>2° Cuatrimestre</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { key: 'c1_p5_sigla', label: 'P5 (A-S)' },
                      { key: 'c1_p6_sigla', label: 'P6 (A-S)' },
                      { key: 'c1_p7_sigla', label: 'P7 (O-N)' },
                      { key: 'c1_p8_sigla', label: 'P8 (O-N)' }
                    ].map(field => renderModalInputField(field, alumnoEdicion.id))}
                  </div>
                </div>
              </div>
            )}

            {modalTab === 'notas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Calificaciones & Cierres
                </h4>

                <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.8rem', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>1° Cuatrimestre</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { key: 'c1_bim1_nota', label: 'BIM 1' },
                      { key: 'c1_b1_int', label: 'INT 1' },
                      { key: 'c1_bim2_nota', label: 'BIM 2' },
                      { key: 'c1_b2_int', label: 'INT 2' }
                    ].map(field => renderModalInputField(field, alumnoEdicion.id))}
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    {renderModalInputField({ key: 'c1_final', label: 'CUATRI 1 (Cierre)' }, alumnoEdicion.id)}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.8rem', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>2° Cuatrimestre</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { key: 'c2_bim1_nota', label: 'BIM 3' },
                      { key: 'c2_b3_int', label: 'INT 3' },
                      { key: 'c2_bim2_nota', label: 'BIM 4' },
                      { key: 'c2_b4_int', label: 'INT 4' }
                    ].map(field => renderModalInputField(field, alumnoEdicion.id))}
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    {renderModalInputField({ key: 'c2_final', label: 'CUATRI 2 (Cierre)' }, alumnoEdicion.id)}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.8rem', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>Cierres Anuales</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { key: 'nota_anual', label: 'ANUAL' },
                      { key: 'intensif_dic', label: 'INTENS. DIC' },
                      { key: 'intensif_feb', label: 'INTENS. FEB' },
                      { key: 'nota_final', label: 'NOTA FINAL' }
                    ].map(field => renderModalInputField(field, alumnoEdicion.id))}
                  </div>
                </div>
              </div>
            )}

            {modalTab === 'observaciones' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Trayectoria Pedagógica & Observaciones
                </h4>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    Notas de Seguimiento (Trabajos, Carpetas, etc.)
                  </label>
                  {(() => {
                    const segsAlumno = seguimiento.filter(s => s.alumno_id === alumnoEdicion.id);
                    if (segsAlumno.length > 0) {
                      return (
                        <div style={{ 
                          background: 'rgba(255,255,255,0.01)', 
                          padding: '10px 12px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          marginBottom: '8px'
                        }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {segsAlumno.map((s, idx) => {
                              const colorNota = getNotaColor(s.nota);
                              return (
                                <div 
                                  key={idx}
                                  style={{
                                    background: colorNota !== 'transparent' ? colorNota : 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    padding: '4px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800
                                  }}
                                >
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{s.tema_id}</span>
                                  <span style={{ 
                                    background: 'rgba(0,0,0,0.3)', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px', 
                                    color: '#fff',
                                    fontWeight: 900
                                  }}>
                                    {s.nota || '-'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '8px' }}>
                        Sin notas de seguimiento registradas
                      </div>
                    );
                  })()}
                  
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    Observaciones / Informe de Trayectoria Manual
                  </label>
                  <textarea
                    value={(() => {
                      const dataOficial = planillaOficial.find(p => p.alumno_id === alumnoEdicion.id) || {};
                      return dataOficial.observaciones || '';
                    })()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlanillaOficial(prev => prev.map(p => 
                        p.alumno_id === alumnoEdicion.id ? { ...p, observaciones: val } : p
                      ));
                    }}
                    onBlur={(e) => {
                      handleSavePlanilla(alumnoEdicion.id, 'observaciones', e.target.value);
                    }}
                    placeholder="Ingrese observaciones sobre el alumno..."
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: '250px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1.5px solid var(--border)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '1rem',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      outline: 'none',
                      resize: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {showOCRModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => !isProcessingOCR && setShowOCRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: '1px', fontSize: '1.2rem', textTransform: 'uppercase' }}>
                Escanear Planilla de Papel
              </h3>
              <button className="btn-close" disabled={isProcessingOCR} onClick={() => setShowOCRModal(false)}>✕</button>
            </div>
            
            <div style={{ padding: '1.5rem 1rem' }}>
               {!ocrResults.length ? (
                 <div 
                   onClick={() => !isProcessingOCR && fileInputRef.current.click()}
                   style={{ 
                     width: '100%', height: '220px', border: '2px dashed var(--primary)', borderRadius: '25px',
                     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.2rem',
                     background: 'rgba(79, 70, 229, 0.03)', cursor: isProcessingOCR ? 'wait' : 'pointer',
                     transition: '0.3s all', position: 'relative', overflow: 'hidden'
                   }}
                 >
                    {isProcessingOCR ? (
                      <div style={{ textAlign: 'center' }}>
                        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
                        <p style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: "'Outfit', sans-serif" }}>Procesando imagen...</p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, fontFamily: "'Outfit', sans-serif" }}>Esto puede tardar unos segundos</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ background: 'var(--primary)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)' }}>
                          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <div style={{ textAlign: 'center', fontFamily: "'Outfit', sans-serif" }}>
                          <p style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 5px 0' }}>Cargar Foto de Planilla</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Hacé clic aquí para elegir una foto o PDF</p>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      accept="image/*"
                      onChange={(e) => handleProcessOCR(e.target.files[0])}
                    />
                 </div>
               ) : (
                 <div className="animate-fade-in" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <p style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Alumnos Detectados:
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 0 }}>Confirmá los nombres antes de guardar</span>
                    </p>
                    <div style={{ maxHeight: '350px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {ocrResults.map((al, idx) => (
                        <div key={al.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.7rem', borderBottom: idx < ocrResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                          <input 
                            type="checkbox" 
                            checked={al.checked} 
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            onChange={() => {
                              const newRes = [...ocrResults];
                              newRes[idx].checked = !newRes[idx].checked;
                              setOcrResults(newRes);
                            }}
                          />
                          <input 
                            type="text" 
                            value={al.apellido} 
                            onChange={(e) => {
                              const newRes = [...ocrResults];
                              newRes[idx].apellido = e.target.value;
                              setOcrResults(newRes);
                            }}
                            style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1.5px solid rgba(79, 70, 229, 0.3)', color: '#fff', fontSize: '1rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif", padding: '4px 0' }}
                          />
                          <input 
                            type="text" 
                            value={al.nombre} 
                            onChange={(e) => {
                              const newRes = [...ocrResults];
                              newRes[idx].nombre = e.target.value;
                              setOcrResults(newRes);
                            }}
                            style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1.5px solid rgba(79, 70, 229, 0.3)', color: '#fff', fontSize: '1rem', fontWeight: 500, fontFamily: "'Outfit', sans-serif", padding: '4px 0' }}
                          />
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setOcrResults([])}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', marginTop: '10px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ← Volver a cargar otra foto
                    </button>
                 </div>
               )}
               
               {!ocrResults.length && (
                 <div style={{ marginTop: '1.5rem', textAlign: 'left', background: 'rgba(79, 70, 229, 0.05)', padding: '1rem', borderRadius: '15px', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.4rem' }}>💡 Tip para profes:</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>Asegurate de que haya buena luz. La App buscará nombres con formato "Apellido, Nombre". Podrás editarlos si lee algo mal.</p>
                 </div>
               )}
            </div>

            <div className="form-actions" style={{ marginTop: '0.5rem' }}>
              <button className="btn-secondary" disabled={isProcessingOCR} onClick={() => setShowOCRModal(false)}>Cerrar</button>
              {ocrResults.length > 0 && (
                <button 
                  className="btn-primary" 
                  disabled={isProcessingOCR || !ocrResults.some(a => a.checked)} 
                  onClick={handleSaveBulkAlumnos}
                  style={{ flex: 1.5 }}
                >
                  {isProcessingOCR ? 'Guardando...' : `Cargar ${ocrResults.filter(a => a.checked).length} Alumnos`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MÓDULO INTENSIFICACIÓN (BÚMERAN) */}
      {activeTab === 'intensificacion' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)' }}>
             <div style={{ 
               display: 'flex', 
               flexDirection: isMobile ? 'column' : 'row', 
               justifyContent: 'space-between', 
               alignItems: isMobile ? 'flex-start' : 'center', 
               gap: isMobile ? '6px' : '0', 
               marginBottom: '1.2rem' 
             }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--danger)', fontWeight: 800 }}>Intensificación</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Recuperación de Procesos Pendientes</span>
             </div>
             
             {/* 🎯 SELECTORES DE PERIODO NATALIA STYLE */}
             <div style={{ 
               display: 'flex', 
               gap: isMobile ? '4px' : '8px', 
               padding: '4px', 
               background: 'rgba(0,0,0,0.2)', 
               borderRadius: '14px', 
               width: isMobile ? '100%' : 'fit-content',
               justifyContent: isMobile ? 'space-between' : 'flex-start',
               overflowX: 'auto'
             }}>
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
                      flex: isMobile ? 1 : 'initial',
                      textAlign: 'center',
                      padding: isMobile ? '0.6rem 0.5rem' : '0.6rem 1.5rem', 
                      borderRadius: '10px', 
                      fontSize: isMobile ? '0.75rem' : '0.8rem', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      transition: 'all 0.3s',
                      background: activePeriodoInt === p.id ? 'var(--danger)' : 'transparent',
                      color: activePeriodoInt === p.id ? '#fff' : 'var(--text-secondary)',
                      border: 'none', 
                      boxShadow: activePeriodoInt === p.id ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
             </div>
          </div>

          {isMobile ? (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                const esRiesgo = (s) => s === 'TED' || s === 'TEP';
                const noAcredito = (n) => !n || n === 'A' || parseFloat(n) < 7;
                const mapeo = { 'M-A': 'c1_b1_int', 'M-J-J': 'c1_b2_int', 'A-S': 'c2_b3_int', 'O-N': 'c2_b4_int' };
                const colDestino = mapeo[activePeriodoInt];
                
                const deudores = alumnos.filter(alumno => {
                  const dataO = planillaOficial.find(p => p.alumno_id === alumno.id) || {};
                  if (activePeriodoInt === 'M-A') return esRiesgo(dataO.c1_p1_sigla) || esRiesgo(dataO.c1_p2_sigla);
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
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.5, fontSize: '0.85rem' }}>
                       🎉 No hay alumnos detectados con TED o TEP para el periodo {activePeriodoInt}.
                    </div>
                  );
                }

                return deudores.map((alumno) => {
                  const dataO = planillaOficial.find(p => p.alumno_id === alumno.id) || {};
                  const tieneArrastre = (activePeriodoInt === 'M-J-J' && (esRiesgo(dataO.c1_p1_sigla) || esRiesgo(dataO.c1_p2_sigla))) ||
                                        (activePeriodoInt === 'O-N' && (esRiesgo(dataO.c1_p5_sigla) || esRiesgo(dataO.c1_p6_sigla)));

                  const nota = dataO[colDestino];
                  const esAprobado = !isNaN(nota) && parseFloat(nota) >= 7;

                  return (
                    <div key={alumno.id} style={{ 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '16px', 
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem'
                    }}>
                      {/* Fila 1: Nombre de alumno y recursante/pendiente */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{alumno.apellido}, {alumno.nombre}</span>
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

                      {/* Fila 2: Estado trayectoria y Nota de recuperación */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        {/* Estado */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Trayectoria</span>
                          <div>
                            <span style={{ 
                              padding: '4px 12px', 
                              background: esAprobado ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                              color: esAprobado ? '#10b981' : '#f59e0b',
                              borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900,
                              border: `1px solid ${esAprobado ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'inline-block'
                            }}>
                              {esAprobado ? '✓ Aprobado' : '⚡ En Proceso'}
                            </span>
                          </div>
                          {alumno.periodos_pendientes && (
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                               {alumno.periodos_pendientes}
                            </span>
                          )}
                        </div>

                        {/* Nota */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Nota Recup.</span>
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
                              if (v !== 'A' && (isNaN(v) || v < 1 || v > 10)) {
                                 e.target.style.border = '2px solid var(--danger)';
                                 return;
                              }
                              e.target.style.border = '1px solid var(--border)';
                              await handleSavePlanilla(alumno.id, colDestino, v);
                            }}
                            placeholder="7 o A"
                            style={{ 
                              width: '80px', 
                              padding: '0.5rem', 
                              border: '1px solid var(--border)', 
                              background: 'rgba(0,0,0,0.2)', 
                              color: '#fff', 
                              borderRadius: '8px', 
                              textAlign: 'center', 
                              fontWeight: 900, 
                              fontSize: '0.95rem' 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
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
          )}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 0.8rem', background: formData.es_recursante ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', border: formData.es_recursante ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)', cursor: 'pointer', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={!!formData.es_recursante}
                  onChange={(e) => setFormData({ ...formData, es_recursante: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Alumno/a Recursante <span style={{ background: '#EF4444', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px' }}>R</span></span>
              </label>

              <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '12px', border: tieneInclusion ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={tieneInclusion} onChange={(e) => setTieneInclusion(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{editingAlumno ? 'Editar PPI / Inclusión' : '¿Tiene PPI / Inclusión?'}</span>
                </label>

                {tieneInclusion && (
                  <div className="animate-slide-up" style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                      <label style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>Tipo de Condición</label>
                      <select name="tipo_condicion" className="input-field" style={{ padding: '0.5rem' }} value={condicionData.tipo_condicion} onChange={handleCondicionChange}>
                        <option value="discapacidad">Discapacidad</option>
                        <option value="dificultad_aprendizaje">Dificultad de Aprendizaje</option>
                        <option value="talento_alto">Altas Capacidades</option>
                        <option value="problema_salud">Salud</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>Descripción PPI</label>
                      <textarea name="descripcion" className="input-field" rows="2" style={{ padding: '0.5rem' }} value={condicionData.descripcion} onChange={handleCondicionChange}></textarea>
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
      <OnboardingTour
        steps={cursoPlanillasTourSteps}
        storageKey="tour_curso_planillas_completed"
        welcomeTitle="¡Guía de Planillas Docentes! 📊"
        welcomeText="Te acompañamos a recorrer cada una de las planillas del curso para que sepas exactamente cómo utilizarlas."
        welcomeIcon="📊"
        forceStart={forceStartTour}
        onTourEnd={() => setForceStartTour(false)}
      />
    </div>
  );
}
