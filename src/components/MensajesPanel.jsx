import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MensajesAPI } from '../services/api';

const TIPOS = {
  aviso: { label: 'Aviso', icon: '📣', color: '#60a5fa' },
  oferta: { label: 'Oferta', icon: '🎁', color: '#fbbf24' },
  plan: { label: 'Plan', icon: '💎', color: '#a78bfa' },
  personal: { label: 'Personal', icon: '✉️', color: '#34d399' },
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        top: '1rem',
        transform: 'translateX(-50%)',
        zIndex: 3000,
        width: 'min(380px, calc(100vw - 2rem))',
        background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)',
        border: `1px solid ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)'}`,
        borderRadius: '18px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(12px)',
        padding: '0.95rem 1rem',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.9rem',
        lineHeight: 1.4,
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '1.1rem' }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
        <span style={{ flex: 1 }}>{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            opacity: 0.8,
            fontWeight: 800,
            fontSize: '1rem',
            padding: 0,
          }}
          aria-label="Cerrar mensaje"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export function MensajesBell() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState('inbox');
  const [noLeidos, setNoLeidos] = useState(0);
  const [mensajeList, setMensajeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState(null);
  const [docenteAdminMessages, setDocenteAdminMessages] = useState([]);
  const [docenteAdminLoading, setDocenteAdminLoading] = useState(false);
  const [docenteAdminForm, setDocenteAdminForm] = useState({ titulo: '', cuerpo: '' });
  const [docenteAdminSending, setDocenteAdminSending] = useState(false);
  const [docenteAdminSelectedId, setDocenteAdminSelectedId] = useState(null);
  const [docenteAdminDetail, setDocenteAdminDetail] = useState(null);
  const [docenteAdminDetailLoading, setDocenteAdminDetailLoading] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const cargarMensajesDocenteAdmin = useCallback(async () => {
    try {
      setDocenteAdminLoading(true);
      const data = await MensajesAPI.getDocenteAdminMensajes();
      setDocenteAdminMessages(Array.isArray(data?.mensajes) ? data.mensajes : []);
    } catch (err) {
      setDocenteAdminMessages([]);
      console.warn('No se pudieron cargar tus mensajes al administrador:', err);
    } finally {
      setDocenteAdminLoading(false);
    }
  }, []);

  const openDocenteAdminCompose = useCallback(async () => {
    setSection('docenteAdminCompose');
    try {
      await cargarMensajesDocenteAdmin();
    } catch (err) {
      console.warn('No se pudo recargar el historial de mensajes al administrador:', err);
    }
  }, [cargarMensajesDocenteAdmin]);

  const refreshNoLeidos = useCallback(async () => {
    try {
      const data = await MensajesAPI.getNoLeidos();
      setNoLeidos(Number(data?.noLeidos ?? 0) || 0);
    } catch (err) {
      console.warn('No se pudo actualizar el badge de mensajes:', err);
      setNoLeidos(0);
    }
  }, []);

  const cargarBandeja = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MensajesAPI.getBandeja();
      setMensajeList(Array.isArray(data?.mensajes) ? data.mensajes : []);
      setNoLeidos(Number(data?.noLeidos ?? 0) || 0);
    } catch (err) {
      setMensajeList([]);
      setNoLeidos(0);
      setError(null);
      console.warn('La bandeja de mensajes no está disponible:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const abrirDetalle = useCallback(async (mensaje) => {
    try {
      setSelectedId(mensaje.id);
      setDetailLoading(true);
      const data = await MensajesAPI.getDetalle(mensaje.id);
      setDetalle(data?.mensaje ? data : { mensaje: null, respuestas: [] });
      setMensajeList((prev) =>
        prev.map((item) =>
          item.id === mensaje.id
            ? { ...item, leida_at: item.leida_at || new Date().toISOString() }
            : item
        )
      );
      setNoLeidos((prev) => Math.max(prev - (mensaje.leida_at ? 0 : 1), 0));
    } catch (err) {
      showToast(err.message || 'No se pudo abrir este mensaje.', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  const abrirDetalleDocenteAdmin = useCallback(async (mensaje) => {
    try {
      setDocenteAdminSelectedId(mensaje.id);
      setDocenteAdminDetailLoading(true);
      const data = await MensajesAPI.getDocenteAdminDetalle(mensaje.id);
      setDocenteAdminDetail({
        mensaje: data?.mensaje || null,
        respuestas: Array.isArray(data?.respuestas) ? data.respuestas : [],
      });
    } catch (err) {
      showToast(err.message || 'No se pudo abrir este mensaje.', 'error');
    } finally {
      setDocenteAdminDetailLoading(false);
    }
  }, [showToast]);

  const responder = useCallback(async () => {
    const cuerpo = replyText.trim();
    if (!cuerpo) {
      showToast('Escribí un mensaje para responder.', 'error');
      return;
    }
    if (!selectedId) return;

    try {
      const data = await MensajesAPI.responder(selectedId, cuerpo);
      const nuevaRespuesta = data?.respuesta || { id: Date.now(), autor: 'docente', cuerpo, created_at: new Date().toISOString() };
      setDetalle((prev) => ({
        ...(prev || { mensaje: null, respuestas: [] }),
        respuestas: [...(prev?.respuestas || []), nuevaRespuesta],
      }));
      setMensajeList((prev) =>
        prev.map((item) =>
          item.id === selectedId
            ? { ...item, ultima_actividad_at: nuevaRespuesta.created_at }
            : item
        )
      );
      setReplyText('');
      showToast('Respuesta enviada.');
    } catch (err) {
      showToast(err.message || 'No se pudo enviar la respuesta.', 'error');
    }
  }, [replyText, selectedId, showToast]);

  const enviarMensajeDocenteAdmin = useCallback(async (event) => {
    event.preventDefault();
    const titulo = docenteAdminForm.titulo.trim();
    const cuerpo = docenteAdminForm.cuerpo.trim();

    if (!titulo) {
      showToast('Ingresá un título para tu mensaje.', 'error');
      return;
    }

    if (!cuerpo) {
      showToast('Escribí el mensaje que querés enviar.', 'error');
      return;
    }

    if (titulo.length > 150) {
      showToast('El título no puede superar 150 caracteres.', 'error');
      return;
    }

    if (cuerpo.length > 2000) {
      showToast('El mensaje no puede superar 2000 caracteres.', 'error');
      return;
    }

    try {
      setDocenteAdminSending(true);
      await MensajesAPI.createDocenteAdminMensaje({ titulo, cuerpo });
      showToast('Tu mensaje fue enviado correctamente.');
      setDocenteAdminForm({ titulo: '', cuerpo: '' });
      await cargarMensajesDocenteAdmin();
      setSection('docenteAdminCompose');
    } catch (err) {
      showToast(err.message || 'No se pudo enviar el mensaje al administrador.', 'error');
    } finally {
      setDocenteAdminSending(false);
    }
  }, [cargarMensajesDocenteAdmin, docenteAdminForm, showToast]);

  useEffect(() => {
    refreshNoLeidos();
    const handleFocus = () => refreshNoLeidos();
    window.addEventListener('focus', handleFocus);
    const interval = window.setInterval(refreshNoLeidos, 60000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(interval);
    };
  }, [refreshNoLeidos]);

  const handleOpen = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      await cargarBandeja();
    }
  };

  const unreadCount = useMemo(() => noLeidos, [noLeidos]);
  const isCompactMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const getEstadoMeta = (estado) => {
    const value = (estado || '').toString().toLowerCase();
    if (value === 'respondido') return { label: 'Respondido', color: '#fbbf24' };
    if (value === 'cerrado') return { label: 'Cerrado', color: '#94a3b8' };
    return { label: 'Abierto', color: '#34d399' };
  };

  const renderInbox = () => {
    const selectedMessage = mensajeList.find((mensaje) => mensaje.id === selectedId) || null;

    if (selectedId && selectedMessage) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '320px', background: 'rgba(17, 24, 39, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}
            >
              ← Volver
            </button>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 800 }}>
              Mensaje
            </div>
          </div>

          <div style={{ overflowY: 'auto', padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {detailLoading ? (
              <div style={{ color: 'rgba(255,255,255,0.7)', paddingTop: '12px' }}>Cargando conversación…</div>
            ) : detalle?.mensaje ? (
              <>
                <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span>{(TIPOS[detalle.mensaje.tipo] || { icon: '💬' }).icon}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 800 }}>
                      {(TIPOS[detalle.mensaje.tipo] || { label: 'Mensaje' }).label}
                    </span>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', lineHeight: 1.3, marginBottom: '8px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{detalle.mensaje.titulo}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', marginBottom: '12px' }}>{formatDate(detalle.mensaje.created_at)}</div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#fff', fontSize: '0.94rem', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{detalle.mensaje.cuerpo}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(Array.isArray(detalle?.respuestas) ? detalle.respuestas : []).map((respuesta) => {
                    const isDocente = respuesta.autor === 'docente';
                    return (
                      <div key={respuesta.id} style={{ display: 'flex', justifyContent: isDocente ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '92%', padding: '12px 14px', borderRadius: '14px', background: isDocente ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.06)', border: isDocente ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(255,255,255,0.08)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                          <div style={{ fontSize: '0.68rem', textTransform: 'capitalize', color: 'rgba(255,255,255,0.6)', marginBottom: '5px' }}>
                            {isDocente ? 'Tú' : 'Administrador'}
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{respuesta.cuerpo}</div>
                          <div style={{ marginTop: '6px', fontSize: '0.64rem', color: 'rgba(255,255,255,0.45)' }}>{formatDate(respuesta.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.7)', paddingTop: '12px' }}>No se pudo cargar el detalle, pero podés responder igual a este mensaje.</div>
            )}

            <div style={{ marginTop: '4px' }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, 2000))}
                placeholder="Responder…"
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>{replyText.length}/2000</span>
                <button type="button" onClick={responder} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', color: '#fff', borderRadius: '10px', padding: '8px 14px', fontWeight: 800, cursor: 'pointer' }}>Enviar</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div style={{ padding: '12px 12px 0' }}>
          <button
            type="button"
            onClick={openDocenteAdminCompose}
            style={{
              width: '100%',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))',
              color: '#fff',
              borderRadius: '12px',
              padding: isCompactMobile ? '9px 10px' : '10px 12px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: isCompactMobile ? '0.82rem' : '0.92rem',
            }}
          >
            Contactar con administración
          </button>
        </div>

        {loading && !mensajeList.length ? (
          <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>Cargando mensajes…</div>
        ) : error ? (
          <div style={{ padding: '16px', color: '#fca5a5' }}>{error}</div>
        ) : !mensajeList.length ? (
          <div style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>No tenés mensajes.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
            {mensajeList.map((mensaje) => {
              const meta = TIPOS[mensaje.tipo] || { label: 'Mensaje', icon: '💬', color: '#9ca3af' };
              const isUnread = !mensaje.leida_at;
              return (
                <button
                  key={mensaje.id}
                  type="button"
                  onClick={() => abrirDetalle(mensaje)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: isCompactMobile ? '10px 10px' : '12px 12px',
                    background: selectedId === mensaje.id ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.02)',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span>{meta.icon}</span>
                      <span style={{ fontSize: isCompactMobile ? '0.74rem' : '0.8rem', fontWeight: isUnread ? 800 : 600 }}>{meta.label}</span>
                    </div>
                    {isUnread && <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />}
                  </div>
                  <div style={{ marginTop: '6px', fontWeight: isUnread ? 800 : 600, fontSize: isCompactMobile ? '0.78rem' : '0.86rem', color: '#fff', wordBreak: 'break-word' }}>{mensaje.titulo}</div>
                  <div style={{ marginTop: '4px', fontSize: isCompactMobile ? '0.68rem' : '0.74rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{mensaje.cuerpo}</div>
                  <div style={{ marginTop: '6px', fontSize: isCompactMobile ? '0.64rem' : '0.68rem', color: 'rgba(255,255,255,0.5)' }}>{formatDate(mensaje.ultima_actividad_at || mensaje.created_at)}</div>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const renderDocenteAdmin = () => (
    <div style={{ padding: isCompactMobile ? '10px' : '12px', display: 'flex', flexDirection: 'column', gap: isCompactMobile ? '10px' : '12px', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>

      <form onSubmit={enviarMensajeDocenteAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>Título</label>
          <input
            value={docenteAdminForm.titulo}
            maxLength={150}
            onChange={(event) => setDocenteAdminForm((prev) => ({ ...prev, titulo: event.target.value }))}
            placeholder="Ej: Consulta sobre actividades"
            style={{ width: '100%', boxSizing: 'border-box', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '10px 12px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>Mensaje</label>
          <textarea
            value={docenteAdminForm.cuerpo}
            maxLength={2000}
            rows={5}
            onChange={(event) => setDocenteAdminForm((prev) => ({ ...prev, cuerpo: event.target.value }))}
            placeholder="Escribí tu consulta para administración…"
            style={{ width: '100%', boxSizing: 'border-box', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{docenteAdminForm.cuerpo.length}/2000</span>
          <button type="submit" disabled={docenteAdminSending} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px 14px', fontWeight: 800, cursor: docenteAdminSending ? 'not-allowed' : 'pointer', opacity: docenteAdminSending ? 0.7 : 1 }}>
            {docenteAdminSending ? 'Enviando…' : 'Enviar mensaje'}
          </button>
        </div>
      </form>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
        {docenteAdminLoading ? (
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>Cargando historial…</div>
        ) : !docenteAdminMessages.length ? (
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>Todavía no enviaste mensajes.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {docenteAdminMessages.map((mensaje) => {
              const estado = getEstadoMeta(mensaje.estado || mensaje.status || 'abierto');
              return (
                <button
                  key={mensaje.id}
                  type="button"
                  onClick={() => abrirDetalleDocenteAdmin(mensaje)}
                  style={{ width: '100%', textAlign: 'left', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', color: '#fff', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.82rem' }}>{mensaje.titulo}</strong>
                    <span style={{ fontSize: '0.66rem', padding: '3px 6px', borderRadius: '999px', background: `${estado.color}22`, color: '#fff', border: `1px solid ${estado.color}` }}>{estado.label}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{mensaje.cuerpo}</div>
                  <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>{formatDate(mensaje.created_at)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {docenteAdminSelectedId && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 800 }}>Detalle</div>
          {docenteAdminDetailLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Cargando detalle…</div>
          ) : docenteAdminDetail?.mensaje ? (
            <>
              <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 12px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, marginBottom: '4px' }}>{docenteAdminDetail.mensaje.titulo}</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>{docenteAdminDetail.mensaje.cuerpo}</div>
              </div>

          {(Array.isArray(docenteAdminDetail.respuestas) ? docenteAdminDetail.respuestas : []).map((respuesta) => (
                <div key={respuesta.id} style={{ marginBottom: '8px', padding: '10px 12px', borderRadius: '12px', background: respuesta.autor === 'admin' ? 'rgba(52,211,153,0.12)' : 'rgba(139,92,246,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{respuesta.autor === 'admin' ? 'Administración' : 'Tú'}</div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45, fontSize: '0.8rem' }}>{respuesta.cuerpo}</div>
                  <div style={{ marginTop: '6px', fontSize: '0.64rem', color: 'rgba(255,255,255,0.45)' }}>{formatDate(respuesta.created_at)}</div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Seleccioná un mensaje del historial para ver el detalle.</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        aria-label="Mensajes"
        className="btn-header-trigger"
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: isCompactMobile ? '34px' : '40px',
          height: isCompactMobile ? '34px' : '40px',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.15)',
          background: open ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" width={isCompactMobile ? '16' : '19'} height={isCompactMobile ? '16' : '19'} fill="none" stroke={open ? '#fff' : 'rgba(255,255,255,0.6)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
          <path d="m5 7 7 5 7-5" />
        </svg>
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: isCompactMobile ? '15px' : '18px', height: isCompactMobile ? '15px' : '18px', padding: '0 4px', borderRadius: '9px', background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Mensajes" style={{ position: 'fixed', top: isCompactMobile ? '12px' : '64px', right: isCompactMobile ? '8px' : '12px', left: isCompactMobile ? '8px' : '12px', zIndex: 9999, width: isCompactMobile ? 'calc(100vw - 16px)' : 'min(420px, calc(100vw - 24px))', maxWidth: isCompactMobile ? '100%' : '420px', margin: '0 auto', maxHeight: isCompactMobile ? 'calc(100dvh - 20px)' : 'calc(100vh - 80px)', overflow: 'hidden', background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '0.6rem', margin: 0, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Mensajes</p>
              <button type="button" onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            {section === 'inbox' ? renderInbox() : renderDocenteAdmin()}
          </div>
        </>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

export default MensajesBell;
