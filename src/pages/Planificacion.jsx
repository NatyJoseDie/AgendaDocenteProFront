import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PlanificacionesAPI } from '../services/api';

export default function Planificacion({ session }) {
  const query = new URLSearchParams(useLocation().search);
  const cursoId = query.get('curso');
  const [planificaciones, setPlanificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'secuencia', // 'anual', 'clase', 'secuencia', 'proyecto'
    fecha_entrega: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (cursoId) loadPlanificaciones();
  }, [cursoId]);

  const loadPlanificaciones = async () => {
    if (!cursoId || cursoId === 'null') {
      setLoading(false);
      return;
    }
    try {
      const data = await PlanificacionesAPI.getByCurso(cursoId);
      setPlanificaciones(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
       setSelectedFile(file);
    } else {
       alert("Por favor, selecciona solo archivos PDF.");
       e.target.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalFileUrl = '';
      
      // 1. Subir archivo si existe
      if (selectedFile) {
        finalFileUrl = await PlanificacionesAPI.uploadFile(selectedFile, cursoId);
      }

      // 2. Crear registro en DB
      const payload = {
        curso_id: cursoId,
        docente_id: session.user.id,
        titulo: formData.titulo,
        tipo: formData.tipo,
        archivo_url: finalFileUrl,
        fecha_entrega: formData.fecha_entrega || null
      };

      await PlanificacionesAPI.create(payload);
      
      // Reset y Recarga
      setSelectedFile(null);
      setFormData({ titulo: '', tipo: 'secuencia', fecha_entrega: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      loadPlanificaciones();
      alert("¡Planificación guardada con éxito!");

    } catch (error) {
      console.error("Error en upload/save:", error);
      alert("No se pudo guardar la planificación. Verifique los permisos del bucket de Storage.");
    } finally {
      setLoading(false);
    }
  };

  // Funciones de Compartir (Natalia's Logic)
  const handleWhatsAppShare = (plan) => {
    if (!plan.archivo_url) return alert("Esta planificación no tiene archivo adjunto.");
    const texto = `¡Hola! Te comparto la planificación "${plan.titulo}": ${plan.archivo_url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleEmailShare = (plan) => {
    if (!plan.archivo_url) return alert("Esta planificación no tiene archivo adjunto.");
    const subject = `Planificación: ${plan.titulo}`;
    const body = `¡Hola! Te adjunto el link a la planificación "${plan.titulo}": ${plan.archivo_url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Mapeo de Colores por Tipo
  const getTipoEstilo = (tipo) => {
    switch(tipo) {
      case 'anual': return { bg: 'rgba(79, 70, 229, 0.15)', text: '#818cf8', label: 'ANUAL' };
      case 'secuencia': return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', label: 'SECUENCIA' };
      case 'proyecto': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', label: 'PROYECTO' };
      default: return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', label: 'CLASE' };
    }
  };

  return (
    <div className="app-container animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <Link to={`/cursos/${cursoId}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '10px' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
              Volver al Curso
           </Link>
           <h2 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>Planificaciones</h2>
           <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 600 }}>Gestión de Documentación Académica PDF</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ borderRadius: '15px', padding: '0.8rem 1.5rem', fontWeight: 800 }}>
          {showForm ? 'Cerrar' : '+ Nueva Planificación'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{ padding: '2.5rem', marginBottom: '3rem', border: '1px solid var(--primary)' }}>
           <h3 style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '1.4rem' }}>Cargar Documento</h3>
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label style={{ color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Título / Nombre</label>
                <input type="text" required className="input-field" placeholder="Ej: Planificación Anual 2024" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Tipo de Planificación</label>
                <select className="input-field" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                   <option value="anual">Plan Anual</option>
                   <option value="secuencia">Secuencia Didáctica</option>
                   <option value="proyecto">Proyecto Áulico</option>
                   <option value="clase">Plan de Clase</option>
                </select>
              </div>
           </div>

           <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Archivo PDF (Obligatorio)</label>
              <div style={{ 
                border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', position: 'relative'
              }}>
                <input type="file" required accept=".pdf" onChange={handleFileChange} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                <div style={{ color: selectedFile ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 700 }}>
                   <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '10px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"></path></svg>
                   <p>{selectedFile ? `Archivo seleccionado: ${selectedFile.name}` : 'Haz clic o arrastra tu PDF aquí'}</p>
                </div>
              </div>
           </div>

           <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }}>
             {loading ? 'Subiendo Archivo...' : 'Guardar Planificación'}
           </button>
        </form>
      )}

      {loading && !showForm ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
           <div className="animate-pulse" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Cargando documentos...</div>
        </div>
      ) : planificaciones.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
           <h3 style={{ color: 'var(--text-secondary)' }}>No hay planificaciones cargadas</h3>
           <p>Empezá subiendo tu primera planificación PDF.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {planificaciones.map(plan => {
            const estilo = getTipoEstilo(plan.tipo);
            return (
              <div key={plan.id} className="glass-card animate-slide-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px 15px', background: estilo.bg, color: estilo.text, fontSize: '0.7rem', fontWeight: 900, borderRadius: '0 0 0 15px', letterSpacing: '1px' }}>
                  {estilo.label}
                </div>
                
                <div style={{ marginTop: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>{plan.titulo}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Actualizado: {new Date(plan.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <a href={plan.archivo_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '0.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', textDecoration: 'none', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                    Ver PDF
                  </a>
                  <button onClick={() => handleWhatsAppShare(plan)} style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#25D366', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)' }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </button>
                  <button onClick={() => handleEmailShare(plan)} style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#EA4335', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(234, 67, 53, 0.3)' }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
