import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LicenciasAPI } from '../services/api';

const TIPOS_LICENCIA = [
  'Médica (114.a.1)', 'Familiar enfermo (114.a.2)', 'Examen (114.i)', 
  'Personal (114.l)', 'Matrimonio (114.d)', 'Nacimiento (114.c)', 'Duelo (114.e)'
];

export default function Licencias({ session }) {
  const query = new URLSearchParams(useLocation().search);
  const escuelaId = query.get('escuela');
  const [licencias, setLicencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    tipo_licencia: TIPOS_LICENCIA[0],
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    articulo: '114.a.1',
    observaciones: '',
    certificado_url: ''
  });

  useEffect(() => {
    loadLicencias();
  }, []);

  const loadLicencias = async () => {
    try {
      const data = await LicenciasAPI.getByDocente(session.user.id);
      setLicencias(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await LicenciasAPI.uploadCertificado(file, session.user.id);
      // USAR LA CLAVE OFICIAL EN ESPAÑOL
      setFormData({ ...formData, certificado_url: url });
      alert('Certificado subido correctamente');
    } catch (error) {
      alert('Error al subir certificado');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // VALIDACIÓN CORRECTA EN ESPAÑOL
      if (!formData.certificado_url && TIPOS_LICENCIA.indexOf(formData.tipo_licencia) < 3) {
        if (!window.confirm('No subiste certificado. ¿Seguro quieres guardar así?')) return;
      }
      
      // Formateo de fechas a ISO YYYY-MM-DD
      const body = {
        ...formData,
        fecha_inicio: new Date(formData.fecha_inicio).toISOString().split('T')[0],
        fecha_fin: new Date(formData.fecha_fin).toISOString().split('T')[0]
      };
      
      // El docente_id NO se manda, el servidor lo pone solo.
      await LicenciasAPI.create(body);
      
      setFormData({ 
        tipo_licencia: TIPOS_LICENCIA[0], 
        fecha_inicio: new Date().toISOString().split('T')[0], 
        fecha_fin: new Date().toISOString().split('T')[0], 
        articulo: '114.a.1', 
        observaciones: '', 
        certificado_url: '' 
      });
      setShowForm(false);
      loadLicencias();
      alert('Licencia cargada con éxito');
    } catch (error) {
      console.error("ERROR DETALLADO:", error);
      alert(`Error al cargar la licencia: ${error.message || 'Error desconocido'}`);
    }
  };

  return (
    <div className="app-container animate-fade-in">
      <header className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Volver al Inicio
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem' }}>Mis Licencias</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
            {showForm ? 'Cancelar' : '+ Nueva Licencia'}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label>Tipo de Licencia</label>
            <select className="input-field" value={formData.tipo_licencia} onChange={e => setFormData({...formData, tipo_licencia: e.target.value})}>
              {TIPOS_LICENCIA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha Inicio</label>
              <input type="date" className="input-field" value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Fecha Fin</label>
              <input type="date" className="input-field" value={formData.fecha_fin} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Artículo / Ley</label>
            <input type="text" className="input-field" placeholder="Ej: 114.a.1" value={formData.articulo} onChange={e => setFormData({...formData, articulo: e.target.value})} />
          </div>
          <div className="form-group">
             <label>Certificado (Subir imagen o PDF) {uploading && <span style={{ color: 'var(--warning)', fontSize: '0.7rem' }}>(Subiendo...)</span>}</label>
             <input type="file" className="input-field" accept="image/*,application/pdf" onChange={handleFileUpload} />
             {formData.certificado_url && <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px' }}>✓ Certificado listo.</p>}
          </div>
          <div className="form-group">
            <label>Observaciones</label>
            <textarea className="input-field" rows="2" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>Dar de Alta Licencia</button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center' }}>Cargando historial...</p>
        ) : licencias.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '20px' }}>
             <p style={{ color: 'var(--text-secondary)' }}>No tenés licencias registradas este año.</p>
          </div>
        ) : (
          licencias.map(l => (
            <div key={l.id} className="glass-card" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #EF4444' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{l.tipo_licencia}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {(l.fecha_inicio || '').split('-').reverse().join('/')} - {(l.fecha_fin || '').split('-').reverse().join('/')} (Art. {l.articulo})
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {l.certificado_url ? (
                  <a href={l.certificado_url} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <span style={{ fontSize: '0.75rem', marginLeft: '5px', fontWeight: 700 }}>VER</span>
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}>S/ Certif.</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
