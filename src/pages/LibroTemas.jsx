import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LibroTemasAPI } from '../services/api';

export default function LibroTemas({ session }) {
  const query = new URLSearchParams(useLocation().search);
  const cursoId = query.get('curso');
  const [temas, setTemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    unidad: '',
    numero_clase: '',
    temas_dados: '',
    recursos_actividades: '',
    observaciones: ''
  });

  useEffect(() => {
    if (cursoId) loadTemas();
  }, [cursoId]);

  const loadTemas = async () => {
    if (!cursoId || cursoId === 'null') {
      setLoading(false);
      return;
    }
    try {
      const data = await LibroTemasAPI.getByCurso(cursoId);
      setTemas(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fechaISO = new Date(formData.fecha).toISOString().split('T')[0];
      const body = {
        curso_id: cursoId,
        fecha: fechaISO,
        unidad: formData.unidad,
        numero_clase: parseInt(formData.numero_clase, 10) || 0,
        temas_dados: formData.temas_dados,
        recursos_actividades: formData.recursos_actividades,
        observaciones: formData.observaciones || ''
      };

      if (editingId) {
        await LibroTemasAPI.update(editingId, body);
      } else {
        await LibroTemasAPI.create(body);
      }
      
      setFormData({ fecha: new Date().toISOString().split('T')[0], unidad: '', numero_clase: '', temas_dados: '', recursos_actividades: '', observaciones: '' });
      setEditingId(null);
      setShowForm(false);
      loadTemas();
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="app-container animate-fade-in" style={{ maxWidth: '900px' }}>
      <header className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Link to={`/cursos/${cursoId}`} style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Volver al Curso
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem' }}>Libro de Temas</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
            {showForm ? 'Cerrar' : '+ Cargar Clase'}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--purple)' }}>
          <h3 style={{ marginBottom: '1.2rem', fontSize: '1.1rem' }}>{editingId ? 'Editar Registro' : 'Nueva Entrada Libro de Temas'}</h3>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Fecha</label>
              <input type="date" required className="input-field" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
            </div>
            <div className="form-group" style={{ flex: 0.6 }}>
              <label>Unidad</label>
              <input type="text" required placeholder="Ej: Unidad 1" className="input-field" value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})} />
            </div>
            <div className="form-group" style={{ flex: 0.4 }}>
              <label>Clase N°</label>
              <input type="number" required placeholder="Ej: 1" className="input-field" value={formData.numero_clase} onChange={e => setFormData({...formData, numero_clase: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Temas Dados</label>
            <textarea required className="input-field" rows="3" placeholder="Descripción detallada de los temas..." value={formData.temas_dados} onChange={e => setFormData({...formData, temas_dados: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Recursos y Actividades</label>
            <textarea required className="input-field" rows="3" placeholder="Ej: Láminas, dictado, debate..." value={formData.recursos_actividades} onChange={e => setFormData({...formData, recursos_actividades: e.target.value})} />
          </div>
          <div className="form-group" style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem' }}>
             <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar en el Libro</button>
          </div>
        </form>
      )}

      <div className="glass-card" style={{ padding: '0', overflowX: 'auto', background: '#fff', color: '#1e293b', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', width: '100px' }}>Fecha</th>
              <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', width: '90px' }}>U / Clase</th>
              <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase' }}>Temas Dados</th>
              <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase' }}>Recursos / Actividades</th>
              <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', width: '150px' }}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>Cargando hojas...</td></tr>
            ) : temas.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' }}>Aún no hay entradas registradas para este curso.</td></tr>
            ) : (
              temas.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                  <td style={{ padding: '0.8rem', color: '#64748b', fontWeight: 600, verticalAlign: 'top', fontSize: '0.8rem' }}>{t.fecha.split('-').reverse().join('/')}</td>
                  <td style={{ padding: '0.8rem', verticalAlign: 'top', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{t.unidad}</div>
                    <div style={{ color: '#94a3b8' }}>N° {t.numero_clase}</div>
                  </td>
                  <td style={{ padding: '0.8rem', fontWeight: 500, fontSize: '0.8rem', verticalAlign: 'top', lineHeight: '1.4' }}>{t.temas_dados}</td>
                  <td style={{ padding: '0.8rem', color: '#475569', fontSize: '0.8rem', verticalAlign: 'top', lineHeight: '1.4' }}>{t.recursos_actividades}</td>
                  <td style={{ padding: '0.8rem', fontSize: '0.75rem', fontStyle: 'italic', verticalAlign: 'top', color: '#64748b' }}>{t.observaciones}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
