import React, { useState, useEffect } from 'react';
import { CalendarioAPI } from '../services/api';
import './Modal.css';

const COLORES = {
  'Examen': '#f97316',
  'TP': '#0ea5e9',
  'Acto': '#10b981',
  'Administrativo': '#64748b',
  'Salida': '#a855f7'
};

export default function EventoAcademicoModal({ isOpen, onClose, cursoId, docenteId, cursoNombre, cursos = [] }) {
  const [formData, setFormData] = useState({
    tipo: 'Examen',
    titulo: '',
    fecha: new Date().toISOString().split('T')[0],
    curso_id: cursoId || '',
    descripcion: '',
    alarma: false,
    dias_previos: 1
  });

  // Unificamos la carga inicial en un solo efecto seguro
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        curso_id: cursoId || prev.curso_id || (cursos.length > 0 ? cursos[0].id : '')
      }));
    }
  }, [isOpen, cursoId]); // Quitamos 'cursos' de las dependencias para evitar bucles si la lista se regenera

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let payload = {
        ...formData,
        docente_id: docenteId,
        color: COLORES[formData.tipo] || '#64748b'
      };
      
      // Lógica de Endpoints según Protocolo Natalia
      if (formData.tipo === 'Salida') {
        const payloadSalida = {
          docente_id: docenteId,
          curso_id: formData.curso_id || null, // Permite nulo según esquema
          nombre_proyecto: formData.titulo, // Mapeo obligatorio
          destino: formData.titulo, // Lo usamos como destino provisorio
          fecha_salida: formData.fecha,
          recordatorio_habilitado: formData.alarma,
          dias_previos_aviso: formData.dias_previos,
          estado: 'pendiente'
        };
        await CalendarioAPI.createSalida(payloadSalida);
      } else {
        // Carga de Examen/TP/Acto/Admin: POST /api/eventos
        await CalendarioAPI.createAcademic(payload);
      }

      alert('¡Fecha agendada con éxito!');
      onClose();
    } catch (error) {
      console.error("Error detallado:", error);
      alert(`Error al agendar: ${error.message || 'Revisá los campos'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="modal-content animate-slide-up" style={{ 
        maxWidth: '500px', width: '90%', borderRadius: '35px', padding: '2.5rem',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            background: COLORES[formData.tipo], width: '65px', height: '65px', borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto',
            boxShadow: `0 8px 25px ${COLORES[formData.tipo]}55`
          }}>
             <svg viewBox="0 0 24 24" width="35" height="35" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14"></path></svg>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: 0 }}>AGENDAR FECHA</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Protocolo de Seguimiento Académico</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div className="form-group">
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>TIPO DE EVENTO</label>
            <select 
              name="tipo" 
              value={formData.tipo} 
              onChange={handleChange}
              style={{ width: '100%', padding: '1rem', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600 }}
            >
              <option value="Examen" style={{ background: '#1e293b', color: '#fff' }}>Examen</option>
              <option value="TP" style={{ background: '#1e293b', color: '#fff' }}>TP</option>
              <option value="Acto" style={{ background: '#1e293b', color: '#fff' }}>Acto</option>
              <option value="Administrativo" style={{ background: '#1e293b', color: '#fff' }}>Administrativo</option>
              <option value="Salida" style={{ background: '#1e293b', color: '#fff' }}>Salida</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>TÍTULO / TEMA</label>
            <input 
              required
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Ej: Evaluación Integradora II"
              style={{ width: '100%', padding: '1rem', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div className="form-group">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>FECHA</label>
                <input 
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '1rem', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
             </div>
             {(formData.tipo === 'Examen' || formData.tipo === 'TP') && (
                <div className="form-group">
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>CURSO OBLIGATORIO</label>
                    
                    {cursoId ? (
                      <input 
                        disabled
                        value={cursoNombre || 'Cargando...'}
                        style={{ width: '100%', padding: '1rem', borderRadius: '15px', background: 'rgba(255,255,255,0.02)', border: '1px dotted rgba(255,255,255,0.2)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}
                      />
                    ) : (
                      <select
                        value={formData.curso_id}
                        onChange={(e) => setFormData({ ...formData, curso_id: e.target.value })}
                        style={{ width: '100%', padding: '1rem', borderRadius: '15px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.9rem' }}
                      >
                        <option value="" style={{ background: '#1e293b', color: '#fff' }}>Seleccionar curso...</option>
                        {cursos.map(c => (
                          <option key={c.id} value={c.id} style={{ background: '#1e293b', color: '#fff' }}>
                            {c.anio_o_grado} {c.division} - {c.materia} {c.escuelas?.nombre ? `(${c.escuelas.nombre})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                </div>
             )}
          </div>

          {/* RECORDATORIOS (Magia Natalia!) */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700 }}>Activar Alarma</span>
                <input 
                  type="checkbox" 
                  name="alarma"
                  checked={formData.alarma}
                  onChange={handleChange}
                  style={{ width: '35px', height: '35px', cursor: 'pointer', accentColor: COLORES[formData.tipo] }}
                />
             </div>
             {formData.alarma && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Avisarme</span>
                   <input 
                     type="number" 
                     name="dias_previos"
                     value={formData.dias_previos}
                     onChange={handleChange}
                     min="1" max="15"
                     style={{ width: '60px', padding: '0.5rem', borderRadius: '10px', background: '#000', border: 'none', color: '#fff', textAlign: 'center' }}
                   />
                   <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>días antes</span>
                </div>
             )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', padding: '1.2rem', borderRadius: '20px', border: 'none',
              background: COLORES[formData.tipo], color: '#fff', fontWeight: 900,
              fontSize: '1.1rem', cursor: 'pointer', boxShadow: `0 10px 30px ${COLORES[formData.tipo]}44`,
              transition: 'all 0.3s'
            }}
          >
            {loading ? 'AGENDANDO...' : 'GUARDAR FECHA IMPORTANTE'}
          </button>
          
          <button 
            type="button" 
            onClick={onClose}
            style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
          >
            CANCELAR
          </button>

        </form>
      </div>
    </div>
  );
}
