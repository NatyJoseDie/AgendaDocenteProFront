import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NotificacionesAPI } from '../services/api';
import './BottomNav.css';

// Rutas donde la barra NO debe mostrarse (pantallas de trabajo)
const RUTAS_SIN_NAV = [
  '/asistencia',
  '/cursos/',
  '/planificacion',
  '/licencias',
  '/horarios'
];

export default function BottomNav({ session }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [markError, setMarkError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const openedFromPushRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get('notificaciones') !== '1') return;

    params.delete('notificaciones');
    openedFromPushRef.current = true;
    setPanelOpen(true);
    navigate({
      pathname,
      search: params.toString() ? `?${params.toString()}` : '',
    }, { replace: true });
  }, [navigate, pathname, search]);

  useEffect(() => {
    let active = true;
    if (openedFromPushRef.current) {
      openedFromPushRef.current = false;
    } else {
      setPanelOpen(false);
    }
    setNotifications([]);
    setUnreadCount(0);
    setNotificationsLoading(true);
    setNotificationsError('');

    NotificacionesAPI.getAll()
      .then(data => {
        if (!Array.isArray(data?.notificaciones) || !Number.isInteger(data?.noLeidas)) {
          throw new Error('La respuesta de notificaciones no tiene el formato esperado.');
        }
        if (!active) return;
        setNotifications(data.notificaciones);
        setUnreadCount(data.noLeidas);
      })
      .catch(error => {
        if (active) setNotificationsError(error.message || 'No se pudieron cargar las notificaciones.');
      })
      .finally(() => {
        if (active) setNotificationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pathname, session?.user?.id, reloadKey]);

  const markAsRead = async (notification) => {
    if (notification.leida_at || markingId) return;

    try {
      setMarkingId(notification.id);
      setMarkError('');
      const result = await NotificacionesAPI.markAsRead(notification.id);
      const readAt = result?.notificacion?.leida_at;
      if (!readAt) throw new Error('El servidor no confirmó que la notificación se marcó como leída.');

      setNotifications(current => current.map(item => (
        item.id === notification.id ? { ...item, leida_at: readAt } : item
      )));
      setUnreadCount(current => Math.max(0, current - 1));
    } catch (error) {
      setMarkError(error.message || 'No se pudo marcar la notificación como leída.');
    } finally {
      setMarkingId(null);
    }
  };

  const ocultar = RUTAS_SIN_NAV.some(ruta => pathname.startsWith(ruta));
  if (ocultar) return null;

  return (
    <nav className="bottom-nav">
      {panelOpen && (
        <section className="notification-panel" role="dialog" aria-label="Notificaciones">
          <header className="notification-panel-header">
            <h2>Notificaciones</h2>
            <button
              type="button"
              className="notification-close"
              aria-label="Cerrar notificaciones"
              onClick={() => setPanelOpen(false)}
            >
              ×
            </button>
          </header>

          {notificationsLoading && <p className="notification-message" role="status">Cargando notificaciones...</p>}
          {!notificationsLoading && notificationsError && (
            <div className="notification-message" role="alert">
              <p>{notificationsError}</p>
              <button type="button" className="notification-retry" onClick={() => setReloadKey(key => key + 1)}>
                Reintentar
              </button>
            </div>
          )}
          {!notificationsLoading && !notificationsError && notifications.length === 0 && (
            <p className="notification-message">No tenés notificaciones.</p>
          )}
          {markError && <p className="notification-action-error" role="alert">{markError}</p>}
          {!notificationsLoading && !notificationsError && notifications.length > 0 && (
            <ul className="notification-list">
              {notifications.map(notification => {
                const createdAt = notification.created_at ? new Date(notification.created_at) : null;
                const formattedDate = createdAt && !Number.isNaN(createdAt.valueOf())
                  ? createdAt.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                  : '';
                const unread = !notification.leida_at;

                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`notification-item ${unread ? 'unread' : ''}`}
                      onClick={() => markAsRead(notification)}
                      disabled={!unread || markingId !== null}
                    >
                      <span className="notification-item-heading">
                        <strong>{notification.titulo}</strong>
                        {unread && <span className="notification-unread-dot" aria-label="Sin leer" />}
                      </span>
                      <span className="notification-item-message">{notification.mensaje}</span>
                      {formattedDate && <time>{formattedDate}</time>}
                      {markingId === notification.id && <span className="notification-item-status">Marcando como leída...</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Inicio</span>
      </NavLink>

      <NavLink to="/escuelas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span>Escuelas</span>
      </NavLink>

      <NavLink to="/licencias" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>Licencias</span>
      </NavLink>

      <NavLink to="/horarios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>Horario</span>
      </NavLink>

      <button
        type="button"
        className={`nav-item nav-notifications-button ${panelOpen ? 'active' : ''}`}
        aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
        aria-expanded={panelOpen}
        onClick={() => {
          setMarkError('');
          setPanelOpen(open => !open);
        }}
      >
        <span className="notification-bell-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </span>
        <span>Avisos</span>
      </button>
    </nav>
  );
}
