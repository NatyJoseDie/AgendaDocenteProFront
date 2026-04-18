import React, { useState, useEffect } from 'react';
import { ContactosAPI, EscuelasAPI, CursosAPI } from '../services/api';
import { Link } from 'react-router-dom';

const ROLES = [
  { label: 'Director', color: '#f59e0b', bg: '#fef3c7' },
  { label: 'Secretario', color: '#3b82f6', bg: '#dbeafe' },
  { label: 'Vicedirector', color: '#8b5cf6', bg: '#ede9fe' },
  { label: 'Jefe de Preceptores', color: '#ec4899', bg: '#fce7f3' },
  { label: 'Preceptor', color: '#06b6d4', bg: '#cffafe' },
  { label: 'Jefe de Área', color: '#10b981', bg: '#d1fae5' },
  { label: 'Compañero', color: '#f43f5e', bg: '#ffe4e6' },
  { label: 'Familiar', color: '#84cc16', bg: '#ecfccb' },
  { label: 'Alumno', color: '#6366f1', bg: '#e0e7ff' },
  { label: 'Otro', color: '#94a3b8', bg: '#f1f5f9' }
];

/**
 * Función Maestra para limpiar y adaptar el número de teléfono para WhatsApp
 * Específicamente adaptada para Argentina (549)
 */
const formatWhatsAppNumber = (number) => {
  if (!number) return '';
  let cleaned = number.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) return '549' + cleaned;
  if (cleaned.startsWith('54') && cleaned.length === 12) return '549' + cleaned.substring(2);
  return cleaned;
};

export default function Contactos({ session }) {
  const [contactos, setContactos] = useState([]);
  const [escuelas, setEscuelas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEscuela, setSelectedEscuela] = useState('todas');
  const [showEmailMenu, setShowEmailMenu] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    rol: 'Otro',
    escuela_id: '',
    curso_id: '',
    telefono: '',
    email: '',
    notas: ''
  });

  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resCont, resEsc, resCur] = await Promise.all([
        ContactosAPI.getByDocente(session.user.id),
        EscuelasAPI.getByDocente(session.user.id),
        CursosAPI.getByDocente(session.user.id)
      ]);
      setContactos(resCont || []);
      setEscuelas(resEsc || []);
      setCursos(resCur || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        docente_id: session.user.id,
        escuela_id: formData.escuela_id || null,
        curso_id: formData.curso_id || null
      };
      await ContactosAPI.create(payload);
      setShowForm(false);
      setFormData({ nombre: '', apellido: '', rol: 'Otro', escuela_id: '', curso_id: '', telefono: '', email: '', notas: '' });
      loadData();
    } catch (error) {
      alert('Error al guardar contacto');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este contacto?')) {
      await ContactosAPI.delete(id);
      loadData();
    }
  };

  const handleEmailAction = (contacto, type) => {
    const subject = encodeURIComponent('Contacto Docente: ' + (session?.user?.email || ''));
    const mail = contacto.email;
    
    const links = {
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${mail}&su=${subject}`,
      outlook: `https://outlook.office.com/mail/deeplink/compose?to=${mail}&subject=${subject}`,
      system: `mailto:${mail}?subject=${subject}`
    };
    
    window.open(links[type], '_blank');
    setShowEmailMenu(null);
  };

  const filteredContactos = contactos.filter(c => {
    const matchesSearch = `${c.nombre} ${c.apellido || ''} ${c.rol} ${c.escuelas?.nombre || ''} ${c.escuelas?.numero || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEscuela = selectedEscuela === 'todas' || c.escuela_id === selectedEscuela;
    return matchesSearch && matchesEscuela;
  });

  const getRoleStyle = (rolLabel) => {
    return ROLES.find(r => r.label === rolLabel) || ROLES[ROLES.length - 1];
  };

  return (
    <div className="app-container animate-fade-in" style={{ paddingBottom: '7rem', maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', textDecoration: 'none' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Volver al Inicio
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 900 }}>Agenda Telefónica</h2>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="btn-primary" 
            style={{ borderRadius: '15px', padding: '0.7rem 1.2rem', fontWeight: 700, boxShadow: '0 10px 20px -5px var(--primary-light)' }}
          >
            {showForm ? 'Cerrar' : '+ Nuevo Contacto'}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{ 
          padding: '2rem', 
          marginBottom: '2rem', 
          border: '1px solid var(--primary)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
        }}>
          <h3 style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '1.2rem' }}>Agregar a la Agenda</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Nombre *</label>
              <input type="text" required placeholder="Ej: Juan" className="input-field" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input type="text" placeholder="Ej: Pérez" className="input-field" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Rol / Función</label>
              <select className="input-field" value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                {ROLES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="tel" className="input-field" placeholder="Sin espacios (Ej: 1112345678)" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
              <small style={{ color: 'var(--primary-light)', fontSize: '0.65rem', display: 'block', marginTop: '4px', fontStyle: 'italic' }}>
                💡 Se adaptará automáticamente para WhatsApp (549...)
              </small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Vincular a Escuela</label>
              <select className="input-field" value={formData.escuela_id} onChange={e => setFormData({...formData, escuela_id: e.target.value})}>
                <option value="">No vincular</option>
                {escuelas.map(esc => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nombre} {(!esc.nombre.includes('N°') && !esc.nombre.includes('Nº') && esc.numero) ? `N° ${esc.numero}` : (esc.numero || '')}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Vincular a Curso</label>
              <select className="input-field" value={formData.curso_id} onChange={e => setFormData({...formData, curso_id: e.target.value})} disabled={!formData.escuela_id}>
                <option value="">No vincular</option>
                {cursos.filter(cur => cur.escuela_id === formData.escuela_id).map(cur => (
                  <option key={cur.id} value={cur.id}>{cur.anio_o_grado} {cur.division} ({cur.materia})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Email</label>
            <input type="email" placeholder="ejemplo@correo.com" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', borderRadius: '15px' }}>Guardar en la Agenda</button>
        </form>
      )}

      {/* Controles de Vista */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar por nombre, apellido, escuela o función..." 
          className="input-field"
          style={{ height: '50px', borderRadius: '15px', fontSize: '1rem', paddingLeft: '1.5rem' }}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem', paddingRight: '1rem' }}>
          <button 
            onClick={() => setSelectedEscuela('todas')}
            style={{ 
              padding: '0.5rem 1.2rem', borderRadius: '20px', border: 'none', 
              background: selectedEscuela === 'todas' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Todos ({contactos.length})
          </button>
          {escuelas.map(esc => (
            <button 
              key={esc.id}
              onClick={() => setSelectedEscuela(esc.id)}
              style={{ 
                padding: '0.5rem 1.2rem', borderRadius: '20px', border: 'none', 
                background: selectedEscuela === esc.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {esc.nombre} {(!esc.nombre.includes('N°') && !esc.nombre.includes('Nº') && esc.numero) ? `N° ${esc.numero}` : (esc.numero || '')}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Agenda */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
             <p style={{ color: 'var(--text-secondary)' }}>Cargando agenda maestra...</p>
          </div>
        ) : filteredContactos.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
             <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No hay contactos que coincidan con la búsqueda.</p>
          </div>
        ) : (
          filteredContactos.map(c => {
            const roleStyle = getRoleStyle(c.rol);
            return (
              <div key={c.id} className="glass-card animate-slide-up" style={{ 
                padding: '1.2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderLeft: `6px solid ${roleStyle.color}`,
                background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.9) 0%, rgba(30, 41, 59, 0.5) 100%)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                     <span style={{ 
                       fontSize: '0.65rem', 
                       background: roleStyle.bg, 
                       color: roleStyle.color, 
                       padding: '3px 10px', 
                       borderRadius: '20px', 
                       fontWeight: 900,
                       textTransform: 'uppercase',
                       letterSpacing: '0.5px'
                     }}>
                      {c.rol}
                     </span>
                     {c.escuelas && (
                       <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                         🏛️ <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                           {c.escuelas.nombre} {(!c.escuelas.nombre.includes('N°') && !c.escuelas.nombre.includes('Nº') && c.escuelas.numero) ? `N° ${c.escuelas.numero}` : (c.escuelas.numero || '')}
                         </span>
                       </span>
                     )}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>{c.nombre} {c.apellido}</h4>
                  {c.cursos && <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{c.cursos.anio_o_grado} {c.cursos.division} — {c.cursos.materia}</p>}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Botón WhatsApp */}
                  {c.telefono && (
                    <a 
                      href={`https://wa.me/${formatWhatsAppNumber(c.telefono)}`} 
                      target="_blank" rel="noreferrer" 
                      style={{ 
                        width: '42px', height: '42px', borderRadius: '12px', 
                        background: 'rgba(37, 211, 102, 0.15)', color: '#25D366',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: '0.2s transform', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                  
                  {/* Botón Llamada */}
                  {c.telefono && (
                    <a 
                      href={`tel:${c.telefono}`} 
                      style={{ 
                        width: '42px', height: '42px', borderRadius: '12px', 
                        background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: '0.2s transform', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </a>
                  )}

                  {/* Email con Menú */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={() => setShowEmailMenu(showEmailMenu === c.id ? null : c.id)}
                      style={{ 
                        width: '42px', height: '42px', borderRadius: '12px', border: 'none',
                        background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: '0.2s transform', cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </button>

                    {showEmailMenu === c.id && (
                      <div className="glass-card animate-scale-in" style={{
                        position: 'absolute', bottom: '110%', right: 0, zIndex: 100,
                        width: '180px', padding: '8px', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)', background: 'rgb(24, 30, 41)'
                      }}>
                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', paddingLeft: '8px' }}>Enviar email por:</p>
                        <button onClick={() => handleEmailAction(c, 'gmail')} style={{ width: '100%', textAlign: 'left', padding: '10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                           <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" width="16" alt="Gmail" /> Gmail Web
                        </button>
                        <button onClick={() => handleEmailAction(c, 'outlook')} style={{ width: '100%', textAlign: 'left', padding: '10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                           <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" width="16" alt="Outlook" /> Outlook Web
                        </button>
                        <button onClick={() => handleEmailAction(c, 'system')} style={{ width: '100%', textAlign: 'left', padding: '10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                           📧 App del Sistema
                        </button>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleDelete(c.id)} 
                    style={{ 
                      padding: '8px', background: 'none', border: 'none', color: 'rgba(255, 77, 77, 0.3)', 
                      cursor: 'pointer'
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
