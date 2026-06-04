import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LibroTemasAPI } from '../services/api';

const COLORES = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

export default function LibroTemas({ session }) {
  const isMobile = useIsMobile();
  const query = new URLSearchParams(useLocation().search);
  const cursoId = query.get('curso');
  const [temas, setTemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    unidad: '', numero_clase: '', temas_dados: '',
    recursos_actividades: '', observaciones: ''
  });

  useEffect(() => { if (cursoId) loadTemas(); }, [cursoId]);

  const loadTemas = async () => {
    if (!cursoId || cursoId === 'null') { setLoading(false); return; }
    try {
      const data = await LibroTemasAPI.getByCurso(cursoId);
      setTemas(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        curso_id: cursoId,
        fecha: new Date(formData.fecha).toISOString().split('T')[0],
        unidad: formData.unidad,
        numero_clase: parseInt(formData.numero_clase, 10) || 0,
        temas_dados: formData.temas_dados,
        recursos_actividades: formData.recursos_actividades,
        observaciones: formData.observaciones || ''
      };
      if (editingId) await LibroTemasAPI.update(editingId, body);
      else await LibroTemasAPI.create(body);
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
    <div className="app-container animate-fade-in" style={{ maxWidth: '1100px' }}>

      {/* ── HEADER ── */}
      <header style={{ marginBottom: '1.5rem' }}>
        <Link to={`/cursos/${cursoId}`} style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Volver al Curso
        </Link>

        {isMobile ? (
          /* MÓVIL: título arriba full width, botón abajo a la derecha */
          <>
            <div className="text-gradient" style={{
              fontSize: '1.6rem',
              fontFamily: "'Gloria Hallelujah', cursive",
              fontWeight: 400, lineHeight: 1.3, marginBottom: '0.5rem'
            }}>Libro de Temas</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!loading && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {temas.length} clase{temas.length !== 1 ? 's' : ''} registrada{temas.length !== 1 ? 's' : ''}
                </div>
              )}
              <button
                onClick={() => setShowForm(!showForm)}
                style={{
                  padding: '0.55rem 1rem', fontSize: '0.85rem', borderRadius: '12px',
                  background: showForm ? 'rgba(255,255,255,0.1)' : 'var(--primary)',
                  color: '#fff', border: showForm ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: showForm ? 'none' : '0 3px 10px rgba(79,70,229,0.4)'
                }}
              >
                {showForm ? '✕ Cerrar' : '+ Cargar Clase'}
              </button>
            </div>
          </>
        ) : (
          /* DESKTOP: título y botón en la misma fila */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <div className="text-gradient" style={{
                fontSize: '3rem',
                fontFamily: "'Gloria Hallelujah', cursive",
                fontWeight: 400, lineHeight: 1.2, margin: 0
              }}>Libro de Temas</div>
              {!loading && (
                <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                  {temas.length} clase{temas.length !== 1 ? 's' : ''} registrada{temas.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '0.9rem 2rem', fontSize: '1.05rem', borderRadius: '14px',
                background: showForm ? 'rgba(255,255,255,0.1)' : 'var(--primary)',
                color: '#fff', border: showForm ? '1px solid rgba(255,255,255,0.2)' : 'none',
                fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                boxShadow: showForm ? 'none' : '0 4px 15px rgba(79,70,229,0.4)'
              }}
            >
              {showForm ? '✕ Cerrar' : '+ Cargar Clase'}
            </button>
          </div>
        )}
      </header>

      {/* ── FORMULARIO ── */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          padding: isMobile ? '1.2rem' : '1.8rem', marginBottom: '2rem',
          background: 'var(--card-bg)', border: '1px solid var(--primary)',
          borderRadius: '20px', boxShadow: '0 0 40px rgba(99,102,241,0.15)'
        }}>
          <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 800, marginBottom: '1.2rem' }}>
            {editingId ? '✏️ Editar Registro' : '📋 Nueva Entrada — Libro de Temas'}
          </div>

          {/* Fila 1: Fecha, Unidad, Clase N° */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 120px', gap: '0.8rem', marginBottom: '0.8rem' }}>
            {[
              { label: 'Fecha', type: 'date', key: 'fecha', placeholder: '' },
              { label: 'Unidad', type: 'text', key: 'unidad', placeholder: 'Ej: Unidad 1' },
              { label: 'Clase N°', type: 'number', key: 'numero_clase', placeholder: '1' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</label>
                <input type={f.type} required={f.key !== 'observaciones'} placeholder={f.placeholder} className="input-field"
                  value={formData[f.key]} onChange={e => setFormData({...formData, [f.key]: e.target.value})} />
              </div>
            ))}
          </div>

          {/* Fila 2: Temas y Recursos */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📚 Temas Dados</label>
              <textarea required className="input-field" rows="4" placeholder="Describí los temas de la clase..."
                value={formData.temas_dados} onChange={e => setFormData({...formData, temas_dados: e.target.value})}
                style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🛠️ Recursos y Actividades</label>
              <textarea required className="input-field" rows="4" placeholder="Ej: Láminas, dictado, debate..."
                value={formData.recursos_actividades} onChange={e => setFormData({...formData, recursos_actividades: e.target.value})}
                style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: '1.4rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📝 Observaciones (opcional)</label>
            <textarea className="input-field" rows="2" placeholder="Notas internas, ausencias, comportamiento del grupo..."
              value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})}
              style={{ resize: 'vertical' }} />
          </div>

          <button type="submit" style={{
            width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 800,
            borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
          }}>
            💾 Guardar en el Libro
          </button>
        </form>
      )}

      {/* ── CARGANDO ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          ⏳ Cargando clases...
        </div>
      )}

      {/* ── VACÍO ── */}
      {!loading && temas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--card-bg)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📖</div>
          <div style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.5rem' }}>El libro está vacío</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Tocá "+ Cargar Clase" para registrar la primera clase.</div>
        </div>
      )}

      {/* ══════════════════════════════════════
          VISTA MÓVIL — Tarjetas tipo diario
      ══════════════════════════════════════ */}
      {!loading && temas.length > 0 && isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {temas.map((t, i) => (
            <div key={t.id} style={{
              borderRadius: '20px', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--card-bg)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.25)'
            }}>
              {/* Banda superior con gradiente — más compacta en móvil */}
              <div style={{
                background: COLORES[i % COLORES.length],
                padding: '0.7rem 1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1px' }}>Clase</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>#{t.numero_clase}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 700, marginBottom: '2px' }}>
                    {t.fecha.split('-').reverse().join('/')}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, opacity: 0.9 }}>{t.unidad}</div>
                </div>
              </div>

              {/* Cuerpo de la tarjeta */}
              <div style={{ padding: '1.3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Temas */}
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--primary)', marginBottom: '6px' }}>
                    📚 Temas Dados
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 500, lineHeight: '1.6', color: 'var(--text)' }}>
                    {t.temas_dados}
                  </div>
                </div>

                {/* Recursos */}
                {t.recursos_actividades && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#10b981', marginBottom: '6px' }}>
                      🛠️ Recursos y Actividades
                    </div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {t.recursos_actividades}
                    </div>
                  </div>
                )}

                {/* Observaciones */}
                {t.observaciones && (
                  <div style={{
                    background: 'rgba(245,158,11,0.08)', borderRadius: '12px',
                    padding: '0.9rem', borderLeft: '3px solid #f59e0b'
                  }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#f59e0b', marginBottom: '5px' }}>
                      📝 Observaciones
                    </div>
                    <div style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {t.observaciones}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          VISTA PC — Grid de cards 2 columnas
      ══════════════════════════════════════ */}
      {!loading && temas.length > 0 && !isMobile && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: temas.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '1.5rem'
        }}>
          {temas.map((t, i) => (
            <div key={t.id} style={{
              borderRadius: '20px', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'var(--card-bg)',
              boxShadow: '0 6px 28px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.3)'; }}
            >
              {/* Header de la card con gradiente */}
              <div style={{
                background: COLORES[i % COLORES.length],
                padding: '1.8rem 2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '6px' }}>Clase</div>
                  <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}>#{t.numero_clase}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', opacity: 0.9, fontWeight: 700, marginBottom: '8px' }}>
                    {t.fecha.split('-').reverse().join('/')}
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.25)', borderRadius: '10px',
                    padding: '5px 16px', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.5px'
                  }}>{t.unidad}</div>
                </div>
              </div>

              {/* Cuerpo */}
              <div style={{ padding: '1.8rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📚 Temas Dados
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: '1.7' }}>
                    {t.temas_dados}
                  </div>
                </div>

                {t.recursos_actividades && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#10b981', marginBottom: '8px' }}>
                      🛠️ Recursos y Actividades
                    </div>
                    <div style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                      {t.recursos_actividades}
                    </div>
                  </div>
                )}

                {t.observaciones && (
                  <div style={{
                    background: 'rgba(245,158,11,0.08)', borderRadius: '12px',
                    padding: '1rem 1.2rem', borderLeft: '4px solid #f59e0b'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#f59e0b', marginBottom: '6px' }}>
                      📝 Observaciones
                    </div>
                    <div style={{ fontSize: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {t.observaciones}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
