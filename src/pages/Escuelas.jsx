import React, { useState, useEffect } from 'react';
import { EscuelasAPI, PerfilAPI } from '../services/api';
import { checkPlanLimit } from '../constants/plans';
import { Link } from 'react-router-dom';
import '../components/Modal.css';

export default function Escuelas({ session }) {
  const [escuelas, setEscuelas] = useState([]);
  const [docente, setDocente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const docenteId = session.user.id;
  
  const [formData, setFormData] = useState({
    nombre: '',
    numero: '',
    nivel: 'primaria',
    direccion: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [escData, profData] = await Promise.all([
        EscuelasAPI.getByDocente(docenteId),
        PerfilAPI.getProfile(docenteId)
      ]);
      setEscuelas(escData || []);
      setDocente(profData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (editingId) return; // Si estamos editando, pasamos
    const check = checkPlanLimit(docente, escuelas.length, 'escuelas');
    if (check.limited) {
      alert(check.message);
      return;
    }
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const actualizada = await EscuelasAPI.update(editingId, formData);
        setEscuelas(escuelas.map(e => e.id === editingId ? actualizada : e));
      } else {
        const nuevaEscuela = await EscuelasAPI.create({
          ...formData,
          docente_id: docenteId
        });
        setEscuelas([...escuelas, nuevaEscuela]);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ nombre: '', numero: '', nivel: 'primaria', direccion: '' });
    } catch (error) {
      console.error('Error al crear escuela:', error);
      alert('Hubo un error al guardar. Verifica la consola.');
    }
  };

  const handleEdit = (e, escuela) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(escuela.id);
    setFormData({
      nombre: escuela.nombre,
      numero: escuela.numero || '',
      nivel: escuela.nivel,
      direccion: escuela.direccion || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('¿Seguro quieres eliminar este colegio?')) {
      try {
        await EscuelasAPI.delete(id);
        setEscuelas(escuelas.filter(e => e.id !== id));
      } catch (error) { console.error(error); }
    }
  };

  return (
    <div className="app-container animate-fade-in">
      <header className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Volver
          </Link>
          <h2 style={{ fontSize: '1.8rem' }}>Mis Escuelas</h2>
        </div>
        <button className="btn-primary" onClick={handleOpenModal} style={{ padding: '0.8rem 1.2rem' }}>
          + Agregar
        </button>
      </header>

      {loading ? (
        <p className="animate-pulse" style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '3rem' }}>Cargando escuelas...</p>
      ) : escuelas.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Aún no agregaste escuelas</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Da de alta tu primer colegio para empezar a organizar tus cursos.</p>
        </div>
      ) : (
        <div className="modules-grid" style={{ gridTemplateColumns: '1fr' }}>
          {escuelas.map((escuela) => {
            // Lógica para no duplicar el "Nº" si el usuario ya lo escribió en el nombre o en el número
            const tieneNum = escuela.numero ? (escuela.numero.includes('N') || escuela.nombre.includes('N') ? ` ${escuela.numero}` : ` Nº ${escuela.numero}`) : '';
            
            return (
            <Link key={escuela.id} to={`/escuelas/${escuela.id}`} className="module-card glass-card color-blue" style={{ flexDirection: 'row', alignItems: 'center', padding: '1.2rem', gap: '1rem', position: 'relative' }}>
              <div className="module-icon" style={{ margin: 0, minWidth: '50px', height: '50px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{escuela.nombre}{tieneNum}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'capitalize' }}>{escuela.nivel}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={(e) => handleEdit(e, escuela)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                </button>
                <button onClick={(e) => handleDelete(e, escuela.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </Link>
            );
          })}
        </div>
      )}

      {/* Modal Alta Escuela */}
      {showModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Escuela' : 'Agregar Escuela'}</h3>
              <button className="btn-close" onClick={() => { setShowModal(false); setEditingId(null); setFormData({ nombre:'', numero:'', nivel:'primaria', direccion:'' }) }}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre de la Institución (*)</label>
                <input required type="text" name="nombre" className="input-field" placeholder="Ej: E.E.S Domingo Faustino Sarmiento" value={formData.nombre} onChange={handleInputChange} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Número</label>
                  <input type="text" name="numero" className="input-field" placeholder="Ej: 5" value={formData.numero} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Nivel</label>
                  <select name="nivel" className="input-field" value={formData.nivel} onChange={handleInputChange}>
                    <option value="inicial">Inicial</option>
                    <option value="primaria">Primaria</option>
                    <option value="secundaria">Secundaria</option>
                    <option value="terciario">Terciario</option>
                    <option value="especial">Especial</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Dirección (Opcional)</label>
                <input type="text" name="direccion" className="input-field" placeholder="Calle y número" value={formData.direccion} onChange={handleInputChange} />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1.5 }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
