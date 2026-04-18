import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PlanificacionesAPI, CursosAPI } from '../services/api';

const TIPOS = [
  { value: 'anual',     label: 'Planificación Anual',  emoji: '📅', color: '#6366f1' },
  { value: 'secuencia', label: 'Secuencia Didáctica',  emoji: '📋', color: '#0ea5e9' },
  { value: 'proyecto',  label: 'Proyecto',             emoji: '🚀', color: '#f59e0b' },
  { value: 'clase',     label: 'Plan de Clase',        emoji: '📝', color: '#10b981' },
];

const PERIODOS = [
  'Anual 2025', 'Anual 2026',
  '1er Trimestre', '2do Trimestre', '3er Trimestre',
  '1er Bimestre', '2do Bimestre', '3er Bimestre', '4to Bimestre',
  'Otro',
];

function TipoBadge({ tipo }) {
  const t = TIPOS.find(t => t.value === tipo) || TIPOS[0];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: t.color + '22', color: t.color,
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '0.7rem', fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.5px'
    }}>
      {t.emoji} {t.label}
    </span>
  );
}

export default function Planificaciones({ session }) {
  const query = new URLSearchParams(useLocation().search);
  const cursoId = query.get('curso');
  const docenteId = session?.user?.id;

  const [planificaciones, setPlanificaciones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'anual',
    periodo: 'Anual 2026',
    fecha_entrega: '',
    curso_id: cursoId || '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    loadPlanificaciones();
    if (!cursoId || cursoId === 'null') {
      loadCursos();
    } else {
      setFormData(prev => ({ ...prev, curso_id: cursoId }));
    }
  }, [cursoId, docenteId]);

  const loadCursos = async () => {
    try {
      if (!docenteId) return;
      const data = await CursosAPI.getByDocente(docenteId);
      setCursos(data || []);
    } catch (err) {
      console.error('Error al cargar cursos:', err);
    }
  };

  const loadPlanificaciones = async () => {
    try {
      let data;
      if (cursoId && cursoId !== 'null') {
        data = await PlanificacionesAPI.getByCurso(cursoId);
      } else if (docenteId) {
        data = await PlanificacionesAPI.getByDocente(docenteId);
      }
      console.log('DATOS PLANIFICACIONES:', data); // <--- REVISAR ESTO EN F12
      setPlanificaciones(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Solo se aceptan archivos PDF.');
      e.target.value = null;
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('El archivo no puede superar los 20MB.');
      e.target.value = null;
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) { alert('Seleccioná un archivo PDF.'); return; }
    setUploading(true);
    setUploadProgress(30);
    try {
      const finalCursoId = cursoId && cursoId !== 'null' ? cursoId : formData.curso_id;
      if (!finalCursoId) {
        alert('Por favor, seleccioná un curso antes de subir.');
        setUploading(false);
        return;
      }

      const archivoUrl = await PlanificacionesAPI.uploadFile(selectedFile, finalCursoId);
      setUploadProgress(80);
      const payload = {
        curso_id: finalCursoId,
        docente_id: session.user.id,
        titulo: formData.titulo,
        tipo: formData.tipo,
        periodo: formData.periodo,
        fecha_entrega: formData.fecha_entrega || null,
        archivo_url: archivoUrl,
      };
      await PlanificacionesAPI.create(payload);
      setUploadProgress(100);
      setFormData({ titulo: '', tipo: 'anual', periodo: 'Anual 2026', fecha_entrega: '' });
      setSelectedFile(null);
      setFileName('');
      setShowForm(false);
      loadPlanificaciones();
    } catch (err) {
      console.error(err);
      alert('Error al subir: ' + (err.message || 'Intentá de nuevo.'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta planificación? No se puede deshacer.')) return;
    setDeletingId(id);
    try {
      await PlanificacionesAPI.delete(id);
      setPlanificaciones(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Error al eliminar.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleWhatsApp = (plan) => {
    if (!plan.archivo_url) return;
    const txt = `📄 *${plan.titulo}*\nTipo: ${plan.tipo} | ${plan.periodo || ''}\n🔗 ${plan.archivo_url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
  };

  const [showEmailMenu, setShowEmailMenu] = useState(null);

  const getEmailLinks = (plan) => {
    const subject = encodeURIComponent('Planificación: ' + plan.titulo);
    const body = encodeURIComponent('Hola,\n\nTe comparto la planificación "' + plan.titulo + '" (' + plan.tipo + ' - ' + (plan.periodo || '') + '):\n' + plan.archivo_url);
    
    return {
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
      outlook: `https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`,
      system: `mailto:?subject=${subject}&body=${body}`
    };
  };

  const handleEmailAction = (plan, type) => {
    const links = getEmailLinks(plan);
    window.open(links[type], '_blank');
    setShowEmailMenu(null);
  };

  const plansFiltradas = filtroTipo === 'todos'
    ? planificaciones
    : planificaciones.filter(p => p.tipo === filtroTipo);

  const conteo = TIPOS.reduce((acc, t) => {
    acc[t.value] = planificaciones.filter(p => p.tipo === t.value).length;
    return acc;
  }, {});

  return (
    <div className="app-container animate-fade-in" style={{ maxWidth: '900px', paddingBottom: '7rem' }}>

      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <Link
          to={cursoId ? '/cursos/' + cursoId : '/dashboard'}
          style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '1rem' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          {cursoId ? 'Volver al Curso' : 'Volver al Inicio'}
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.3rem' }}>
              Mis Planificaciones
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {cursoId ? 'Documentos PDF de este curso' : 'Todos mis documentos PDF'}
            </p>
          </div>
          {cursoId && cursoId !== 'null' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
              style={{ minWidth: '130px', borderRadius: '14px', padding: '0.7rem 1.2rem' }}
            >
              {showForm ? 'Cancelar' : '+ Subir PDF'}
            </button>
          )}
          {(!cursoId || cursoId === 'null') && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
              style={{ minWidth: '130px', borderRadius: '14px', padding: '0.7rem 1.2rem' }}
            >
              {showForm ? 'Cancelar' : '+ Nueva Planificación'}
            </button>
          )}
        </div>
      </header>

      {/* Formulario de carga */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{
          padding: '1.8rem', marginBottom: '2rem',
          border: '1px solid rgba(99,102,241,0.4)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(79,70,229,0.04))'
        }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
            Cargar nueva planificación
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Título del documento *</label>
              <input
                type="text" required className="input-field"
                placeholder="Ej: Planificación Anual Matemática"
                value={formData.titulo}
                onChange={e => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>
            <div className="form-group">
                <label>Tipo *</label>
                <select
                  className="input-field" value={formData.tipo}
                  onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                >
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
            </div>

            {(!cursoId || cursoId === 'null') && (
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label>Vincular a Escuela y Curso *</label>
                <select
                  required
                  className="input-field"
                  value={formData.curso_id}
                  onChange={e => setFormData({ ...formData, curso_id: e.target.value })}
                  style={{ border: '1px solid var(--primary)' }}
                >
                  <option value="">Selecciona un curso...</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.escuelas?.nombre ? `${c.escuelas.nombre} ${(!c.escuelas.nombre.includes('N°') && !c.escuelas.nombre.includes('Nº') && c.escuelas.numero) ? `N° ${c.escuelas.numero}` : (c.escuelas.numero || '')} - ` : ''} {c.anio_o_grado} {c.division || ''} — {c.materia || ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
            <div className="form-group">
              <label>Período</label>
              <select
                className="input-field" value={formData.periodo}
                onChange={e => setFormData({ ...formData, periodo: e.target.value })}
              >
                {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>
                Fecha entrega a Dirección{' '}
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="date" className="input-field"
                value={formData.fecha_entrega}
                onChange={e => setFormData({ ...formData, fecha_entrega: e.target.value })}
              />
            </div>
          </div>

          {/* Zona de selección de PDF */}
          <div style={{
            border: '2px dashed ' + (fileName ? '#10b981' : 'rgba(255,255,255,0.15)'),
            borderRadius: '14px', padding: '1.8rem', textAlign: 'center',
            marginBottom: '1.2rem',
            background: fileName ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s ease',
            position: 'relative', cursor: 'pointer'
          }}>
            <input
              type="file" accept=".pdf"
              onChange={handleFileChange}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
            {fileName ? (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>✅</div>
                <p style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>{fileName}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                  Clic para cambiar archivo
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  Hacé clic para seleccionar el PDF
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                  Solo archivos PDF · Máx. 20 MB
                </p>
              </>
            )}
          </div>

          {/* Barra de progreso */}
          {uploading && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subiendo archivo...</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{uploadProgress}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: uploadProgress + '%', height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), #818cf8)',
                  borderRadius: '99px', transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          )}

          <button
            type="submit" className="btn-primary"
            disabled={uploading || !selectedFile}
            style={{ width: '100%', opacity: (!selectedFile || uploading) ? 0.6 : 1 }}
          >
            {uploading ? 'Subiendo...' : 'Guardar Planificación'}
          </button>
        </form>
      )}

      {/* Filtros por tipo */}
      {!loading && planificaciones.length > 0 && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setFiltroTipo('todos')}
            style={{
              padding: '0.35rem 1rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8rem',
              background: filtroTipo === 'todos' ? 'var(--primary)' : 'rgba(255,255,255,0.07)',
              color: filtroTipo === 'todos' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            Todos ({planificaciones.length})
          </button>
          {TIPOS.filter(t => conteo[t.value] > 0).map(t => (
            <button
              key={t.value}
              onClick={() => setFiltroTipo(t.value)}
              style={{
                padding: '0.35rem 1rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.8rem',
                background: filtroTipo === t.value ? t.color : 'rgba(255,255,255,0.07)',
                color: filtroTipo === t.value ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {t.emoji} {t.label} ({conteo[t.value]})
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0' }}>
          Cargando documentos...
        </p>
      ) : plansFiltradas.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '20px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📂</div>
          <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            {planificaciones.length === 0 ? 'Todavía no hay planificaciones' : 'No hay documentos de este tipo'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {planificaciones.length === 0
              ? 'Subí tu primer PDF para tenerlo siempre a mano y compartirlo fácil.'
              : 'Probá seleccionando otro tipo.'}
          </p>
          {planificaciones.length === 0 && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Subir mi primera planificación
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {plansFiltradas.map(plan => {
            const tipo = TIPOS.find(t => t.value === plan.tipo) || TIPOS[0];
            return (
              <div
                key={plan.id}
                className="glass-card"
                style={{
                  padding: '1rem 1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  borderLeft: '4px solid ' + tipo.color,
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                {/* Ícono */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '13px', flexShrink: 0,
                  background: tipo.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
                }}>
                  {tipo.emoji}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                    <TipoBadge tipo={plan.tipo} />
                    {plan.periodo && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {plan.periodo}
                      </span>
                    )}
                  </div>
                  <h4 style={{
                    fontSize: '0.95rem', fontWeight: 700, margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {plan.titulo}
                  </h4>
                  {plan.cursos && (
                    <p style={{ fontSize: '0.72rem', color: '#818cf8', marginTop: '2px', fontWeight: 700 }}>
                      🏛️ {(() => {
                        const esc = plan.cursos.escuelas || plan.cursos.escuela;
                        if (!esc) return 'Escuela';
                        const hasNoFlag = !esc.nombre.includes('N°') && !esc.nombre.includes('Nº');
                        return hasNoFlag && esc.numero ? `${esc.nombre} N° ${esc.numero}` : `${esc.nombre} ${esc.numero || ''}`;
                      })()} — {plan.cursos.anio_o_grado} {plan.cursos.division || ''} ({plan.cursos.materia || ''})
                    </p>
                  )}
                  {plan.fecha_entrega && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      📅 Entrega a Dirección: {plan.fecha_entrega.split('-').reverse().join('/')}
                    </p>
                  )}
                </div>

                {/* Botones de acción */}
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>

                  {/* Ver PDF */}
                  <a
                    href={plan.archivo_url || '#'} target="_blank" rel="noopener noreferrer"
                    title="Ver PDF"
                    onClick={e => { if (!plan.archivo_url) e.preventDefault(); }}
                    style={{
                      width: '38px', height: '38px', borderRadius: '11px',
                      background: plan.archivo_url ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none', transition: 'background 0.2s',
                      cursor: plan.archivo_url ? 'pointer' : 'default',
                      pointerEvents: plan.archivo_url ? 'auto' : 'none'
                    }}
                    onMouseEnter={e => { if (plan.archivo_url) e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                    onMouseLeave={e => { if (plan.archivo_url) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={plan.archivo_url ? 'currentColor' : 'rgba(255,255,255,0.2)'} strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  </a>

                  {/* WhatsApp */}
                  <button
                    onClick={() => handleWhatsApp(plan)}
                    disabled={!plan.archivo_url}
                    title="Compartir por WhatsApp"
                    style={{
                      width: '38px', height: '38px', borderRadius: '11px', border: 'none',
                      background: plan.archivo_url ? '#25D36622' : 'rgba(255,255,255,0.03)',
                      cursor: plan.archivo_url ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if (plan.archivo_url) e.currentTarget.style.background = '#25D36644'; }}
                    onMouseLeave={e => { if (plan.archivo_url) e.currentTarget.style.background = '#25D36622'; }}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill={plan.archivo_url ? '#25D366' : 'rgba(255,255,255,0.2)'}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </button>

                  {/* Email con Menú de Opciones */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowEmailMenu(showEmailMenu === plan.id ? null : plan.id)}
                      disabled={!plan.archivo_url}
                      title="Compartir por Email"
                      style={{
                        width: '38px', height: '38px', borderRadius: '11px', border: 'none',
                        background: plan.archivo_url ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        cursor: plan.archivo_url ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => { if (plan.archivo_url) e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}
                      onMouseLeave={e => { if (plan.archivo_url) e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                    >
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={plan.archivo_url ? '#818cf8' : 'rgba(255,255,255,0.2)'} strokeWidth="2.5">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </button>

                    {showEmailMenu === plan.id && (
                      <div className="glass-card animate-scale-in" style={{
                        position: 'absolute', bottom: '110%', right: 0, zIndex: 100,
                        width: '180px', padding: '8px', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                      }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '8px' }}>Elegir correo:</p>
                        <button onClick={() => handleEmailAction(plan, 'gmail')} style={{ width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                           <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" width="16" alt="Gmail" /> Gmail
                        </button>
                        <button onClick={() => handleEmailAction(plan, 'outlook')} style={{ width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                           <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" width="16" alt="Outlook" /> Outlook Web
                        </button>
                        <button onClick={() => handleEmailAction(plan, 'system')} style={{ width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                           📧 Predeterminado
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={deletingId === plan.id}
                    title="Eliminar"
                    style={{
                      width: '38px', height: '38px', borderRadius: '11px', border: 'none',
                      background: 'rgba(239,68,68,0.1)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s',
                      opacity: deletingId === plan.id ? 0.5 : 1
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.28)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
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
