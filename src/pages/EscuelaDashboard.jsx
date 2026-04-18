import React, { useState, useEffect } from 'react';
import { EscuelasAPI, CursosAPI, PerfilAPI } from '../services/api';
import { checkPlanLimit } from '../constants/plans';
import { useParams, Link } from 'react-router-dom';
import '../components/Modal.css';

const DIAS_SEMANA = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes'
};

export default function EscuelaDashboard({ session }) {
  const { id } = useParams();
  const [escuela, setEscuela] = useState(null);
  const [cursos, setCursos] = useState([]);
  const [totalCursosCount, setTotalCursosCount] = useState(0);
  const [docente, setDocente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCursoModal, setShowCursoModal] = useState(false);
  const docenteId = session?.user?.id;

  const [cursoData, setCursoData] = useState({
    nombre: '',
    anio_o_grado: '',
    division: '',
    materia: '',
    turno: 'mañana'
  });

  const [horarios, setHorarios] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (docenteId) loadData();
  }, [id, docenteId]);

  const loadData = async () => {
    try {
      const [dbEscuela, dbCursos, allCursos, profData] = await Promise.all([
        EscuelasAPI.getById(id),
        CursosAPI.getByEscuela(id),
        CursosAPI.getByDocente(docenteId),
        PerfilAPI.getProfile(docenteId)
      ]);
      setEscuela(dbEscuela);
      setCursos(dbCursos || []);
      setTotalCursosCount(allCursos?.length || 0);
      setDocente(profData);
    } catch (error) {
      console.error('Error al cargar dashboard de escuela:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCursoModal = () => {
    if (editingId) return;
    const check = checkPlanLimit(docente, totalCursosCount, 'cursos');
    if (check.limited) {
      alert(check.message);
      return;
    }
    setShowCursoModal(true);
  };

  const handleInputChange = (e) => {
    setCursoData({ ...cursoData, [e.target.name]: e.target.value });
  };

  const addHorario = () => {
    setHorarios([...horarios, { dia_semana: 1, hora_inicio: '07:30', hora_fin: '12:00' }]);
  };

  const updateHorario = (index, field, value) => {
    const newHorarios = [...horarios];
    newHorarios[index][field] = value;
    setHorarios(newHorarios);
  };

  const removeHorario = (index) => {
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const handleSubmitCurso = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const actualizado = await CursosAPI.update(
          editingId,
          {
            nombre: cursoData.nombre,
            anio_o_grado: cursoData.anio_o_grado,
            division: cursoData.division,
            materia: cursoData.materia || 'Sin materia',
            turno: cursoData.turno,
            escuela_id: id,
            docente_id: docenteId
          },
          horarios
        );
        setCursos(cursos.map(c => c.id === editingId ? { ...actualizado, horarios_curso: horarios } : c));
      } else {
        const nuevoCurso = await CursosAPI.create(
          {
            nombre: cursoData.nombre,
            anio_o_grado: cursoData.anio_o_grado,
            division: cursoData.division,
            materia: cursoData.materia || 'Sin materia',
            turno: cursoData.turno,
            escuela_id: id,
            docente_id: docenteId
          },
          horarios
        );
        setCursos([...cursos, nuevoCurso]);
      }
      
      setShowCursoModal(false);
      setEditingId(null);
      setCursoData({ nombre: '', anio_o_grado: '', division: '', materia: '', turno: 'mañana' });
      setHorarios([]);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar el curso o cargo');
    }
  };

  const handleEdit = (e, curso) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(curso.id);
    setCursoData({
      nombre: curso.nombre || '',
      anio_o_grado: curso.anio_o_grado || '',
      division: curso.division || '',
      materia: curso.materia === 'Sin materia' ? '' : curso.materia,
      turno: curso.turno
    });
    setHorarios(curso.horarios_curso || []);
    setShowCursoModal(true);
  };

  const handleDelete = async (e, cursoId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('¿Seguro quieres eliminar este curso/cargo? Se ocultará de la lista.')) {
      try {
        await CursosAPI.delete(cursoId);
        setCursos(cursos.filter(c => c.id !== cursoId));
      } catch (error) { console.error(error); }
    }
  };

  if (loading || !escuela) return <p className="animate-pulse" style={{ marginTop: '2rem', textAlign: 'center' }}>Cargando colegio...</p>;

  // Filtrar el número doble N°
  const tieneNum = escuela.numero ? (escuela.numero.includes('N') || escuela.nombre.includes('N') ? ` ${escuela.numero}` : ` Nº ${escuela.numero}`) : '';

  return (
    <div className="app-container animate-fade-in">
      <header className="page-header" style={{ marginBottom: '1.5rem', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <Link to="/escuelas" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Volver a Escuelas
        </Link>
        <div>
          <h2 style={{ fontSize: '1.8rem', lineHeight: 1.1 }}>{escuela.nombre}{tieneNum}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem', textTransform: 'capitalize' }}>
            {escuela.nivel} {escuela.direccion ? `• ${escuela.direccion}` : ''}
          </p>
        </div>
      </header>
 
      {/* Botones de Gestión de Escuela */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <Link to={`/planificacion?escuela=${id}`} style={{ textDecoration: 'none' }}>
           <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ background: 'var(--purple-bg)', color: 'var(--purple)', padding: '8px', borderRadius: '10px' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Plan de Clase</span>
           </div>
        </Link>
        <Link to={`/licencias?escuela=${id}`} style={{ textDecoration: 'none' }}>
           <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px', borderRadius: '10px' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Licencias</span>
           </div>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem' }}>Roles y Cursos dictados</h3>
        <button onClick={handleOpenCursoModal} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Agregar
        </button>
      </div>

      {cursos.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Aún no diste de alta ningún rol ni horario acá.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cursos.map(c => (
            <div key={c.id} style={{ position: 'relative' }}>
              <Link to={`/cursos/${c.id}`} className="glass-card module-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem', textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                    {c.nombre || 'CURSO'}
                    <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 800 }}>
                      {c.anio_o_grado} {c.division}
                    </span>
                    <span style={{ fontWeight: 500, background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', textTransform: 'uppercase', marginLeft: 'auto' }}>
                      {c.turno}
                    </span>
                  </h4>
                  {c.materia !== 'Sin materia' && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{c.materia}</p>
                  )}
                </div>
                </div>

                {/* Horarios listados */}
                {c.horarios_curso && c.horarios_curso.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                    {c.horarios_curso.map((h, i) => (
                      <div key={i} style={{ background: 'var(--surface-hover)', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <strong>{DIAS_SEMANA[h.dia_semana]}</strong>: {h.hora_inicio.slice(0,5)} a {h.hora_fin.slice(0,5)}
                      </div>
                    ))}
                  </div>
                )}
              </Link>
              <div style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', display: 'flex', gap: '0.5rem' }}>
                <button onClick={(e) => handleEdit(e, c)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                </button>
                <button onClick={(e) => handleDelete(e, c.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Curso/Rol */}
      {showCursoModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowCursoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Curso / Cargo' : 'Agregar Curso / Cargo'}</h3>
              <button className="btn-close" onClick={() => { setShowCursoModal(false); setEditingId(null); setCursoData({ nombre: '', anio_o_grado: '', division: '', materia: '', turno: 'mañana' }); setHorarios([]); }}>✕</button>
            </div>
            
            <form onSubmit={handleSubmitCurso}>
              <div className="form-group">
                <label>Rol (Ej: PROFESOR, PRECEPTOR) (*)</label>
                <input required type="text" name="nombre" className="input-field" placeholder="Cómo figurás en este cargo" value={cursoData.nombre} onChange={handleInputChange} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Año / Grado (*)</label>
                  <input required type="text" name="anio_o_grado" className="input-field" placeholder="Ej: 1º, 3ro" value={cursoData.anio_o_grado} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>División (*)</label>
                  <input required type="text" name="division" className="input-field" placeholder="Ej: 3ª, B" value={cursoData.division} onChange={handleInputChange} />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Materia (Opcional)</label>
                  <input type="text" name="materia" className="input-field" placeholder="Ej: Biología" value={cursoData.materia} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Turno</label>
                  <select name="turno" className="input-field" value={cursoData.turno} onChange={handleInputChange}>
                    <option value="mañana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="noche">Noche</option>
                  </select>
                </div>
              </div>

              {/* Sección de Horarios */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Días y Horarios (*)</label>
                  <button type="button" onClick={addHorario} style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px dashed var(--success)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                    + Sumar día
                  </button>
                </div>

                {horarios.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '1rem' }}>No asignaste ningún día todavía.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    {horarios.map((h, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '12px' }}>
                        <select className="input-field" style={{ padding: '0.6rem', height: '100%', flex: 1.2 }}
                          value={h.dia_semana} onChange={(e) => updateHorario(index, 'dia_semana', parseInt(e.target.value))}>
                          {Object.entries(DIAS_SEMANA).map(([num, nombre]) => (
                            <option key={num} value={num}>{nombre}</option>
                          ))}
                        </select>
                        <input type="time" className="input-field" style={{ padding: '0.6rem', flex: 1 }}
                          value={h.hora_inicio} onChange={(e) => updateHorario(index, 'hora_inicio', e.target.value)} />
                        <span style={{ color: 'var(--text-secondary)' }}>a</span>
                        <input type="time" className="input-field" style={{ padding: '0.6rem', flex: 1 }}
                          value={h.hora_fin} onChange={(e) => updateHorario(index, 'hora_fin', e.target.value)} />
                        <button type="button" onClick={() => removeHorario(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '0.5rem', cursor: 'pointer' }}>
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCursoModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1.5 }} disabled={horarios.length === 0}>
                  Guardar Rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
