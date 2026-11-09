import React, { useEffect, useState } from 'react';
import { PushNotificationsAPI } from '../services/api';

const supportsPush = () => (
  typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window
);

const decodeVapidKey = (key) => {
  const base64 = key.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const raw = window.atob(`${base64}${padding}`);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
};

const isIosDevice = () => (
  /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

const isInstalledApp = () => (
  window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

export default function PushNotificationsSettings({ userId }) {
  const [status, setStatus] = useState(() => supportsPush() ? 'checking' : 'unsupported');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const iosSetupRequired = isIosDevice() && !isInstalledApp();

  useEffect(() => {
    if (!supportsPush()) return undefined;

    let active = true;
    PushNotificationsAPI.getDeviceStatus(userId)
      .then(deviceStatus => {
        if (!active) return;
        setStatus(deviceStatus === 'disabled' && Notification.permission === 'denied'
          ? 'denied'
          : deviceStatus);
      })
      .catch(error => {
        if (!active) return;
        setStatus('disabled');
        setFeedback({
          type: 'error',
          text: `No se pudo comprobar el estado de Push: ${error.message}`,
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const activatePush = async () => {
    if (!supportsPush()) {
      setStatus('unsupported');
      setFeedback({
        type: 'error',
        text: 'Este navegador no admite notificaciones Push. Podés seguir usando la agenda normalmente.',
      });
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      setFeedback({
        type: 'error',
        text: 'El permiso está bloqueado en el navegador. Cambialo desde la configuración del sitio para poder activar Push.',
      });
      return;
    }

    setBusy(true);
    setFeedback(null);
    let subscription;
    let createdSubscription = false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'disabled');
        setFeedback({
          type: 'error',
          text: permission === 'denied'
            ? 'No se concedió el permiso. La agenda sigue disponible; podés habilitarlo en la configuración del navegador.'
            : 'No se concedió el permiso. La agenda sigue disponible y podés intentarlo más tarde.',
        });
        return;
      }

      const publicKey = await PushNotificationsAPI.getPublicKey();
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(publicKey),
        });
        createdSubscription = true;
      }

      await PushNotificationsAPI.registerSubscription(subscription.toJSON(), userId);
      setStatus('enabled');
      setFeedback({ type: 'success', text: 'Notificaciones Push activadas en este dispositivo.' });
    } catch (error) {
      let detail = error.message || 'Ocurrió un error inesperado.';
      if (createdSubscription && subscription && error.code !== 'PUSH_SUBSCRIPTION_OWNED_BY_ANOTHER_ACCOUNT') {
        try {
          await subscription.unsubscribe();
        } catch (cleanupError) {
          detail = `${detail} No se pudo limpiar la suscripción local: ${cleanupError.message}.`;
        }
        try {
          await PushNotificationsAPI.removeSubscription(subscription.endpoint, userId);
        } catch (cleanupError) {
          detail = `${detail} No se pudo limpiar el registro del servidor: ${cleanupError.message}.`;
        }
      }
      try {
        setStatus(error.code === 'PUSH_SUBSCRIPTION_OWNED_BY_ANOTHER_ACCOUNT'
          ? 'unlinked'
          : await PushNotificationsAPI.getDeviceStatus(userId));
      } catch (statusError) {
        setStatus('disabled');
        detail = `${detail} No se pudo comprobar el estado local: ${statusError.message}.`;
      }
      setFeedback({
        type: 'error',
        text: `No se pudieron activar las notificaciones: ${detail}`,
      });
    } finally {
      setBusy(false);
    }
  };

  const deactivatePush = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await PushNotificationsAPI.unsubscribeCurrentDevice(userId);
      setStatus('disabled');
      setFeedback({ type: 'success', text: 'Notificaciones Push desactivadas en este dispositivo.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: `No se pudo completar la baja: ${error.message}`,
      });
      try {
        setStatus(await PushNotificationsAPI.getDeviceStatus(userId));
      } catch (statusError) {
        setStatus('enabled');
        setFeedback(current => ({
          type: 'error',
          text: `${current?.text || error.message} No se pudo comprobar el estado local: ${statusError.message}`,
        }));
      }
    } finally {
      setBusy(false);
    }
  };

  const checking = status === 'checking';
  const enabled = status === 'enabled';
  const pendingRemoval = status === 'pending-removal';
  const unlinked = status === 'unlinked';
  const unavailable = status === 'unsupported' || status === 'denied';

  return (
    <section
      aria-label="Notificaciones Push"
      style={{
        padding: '10px 8px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        margin: '4px 0',
      }}
    >
      <p style={{ margin: '0 0 7px', color: '#fff', fontSize: '0.86rem', fontWeight: 700 }}>
        Notificaciones Push
      </p>
      <button
        type="button"
        onClick={enabled || pendingRemoval ? deactivatePush : activatePush}
        disabled={busy || checking || unavailable}
        style={{
          width: '100%',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '9px',
          padding: '8px 10px',
          background: enabled ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.2)',
          color: enabled ? '#fca5a5' : '#c7d2fe',
          font: 'inherit',
          fontSize: '0.82rem',
          fontWeight: 700,
          textAlign: 'left',
          cursor: busy || checking || unavailable ? 'not-allowed' : 'pointer',
          opacity: busy || checking || unavailable ? 0.65 : 1,
        }}
      >
        {checking
          ? 'Verificando estado...'
          : busy
            ? enabled || pendingRemoval ? 'Desactivando...' : 'Activando...'
            : pendingRemoval
              ? 'Reintentar baja de este dispositivo'
              : enabled
              ? 'Desactivar notificaciones'
              : unlinked
                ? 'Verificar suscripción en este dispositivo'
              : status === 'denied'
                ? 'Permiso bloqueado'
                : status === 'unsupported'
                  ? 'No disponible en este navegador'
                  : 'Activar notificaciones'}
      </button>

      {iosSetupRequired && (
        <p style={{ margin: '8px 0 0', color: '#cbd5e1', fontSize: '0.75rem', lineHeight: 1.4 }}>
          En iPhone o iPad puede ser necesario agregar la web a la pantalla de inicio y abrir la app instalada para activar Push.
        </p>
      )}
      {status === 'unsupported' && (
        <p style={{ margin: '8px 0 0', color: '#cbd5e1', fontSize: '0.75rem', lineHeight: 1.4 }}>
          Este navegador no admite notificaciones Push. La agenda sigue funcionando normalmente.
        </p>
      )}
      {status === 'denied' && (
        <p style={{ margin: '8px 0 0', color: '#cbd5e1', fontSize: '0.75rem', lineHeight: 1.4 }}>
          Permití las notificaciones desde la configuración del navegador para activarlas. Esto no afecta el uso de la agenda.
        </p>
      )}
      {unlinked && (
        <p style={{ margin: '8px 0 0', color: '#cbd5e1', fontSize: '0.75rem', lineHeight: 1.4 }}>
          Hay una suscripción de navegador que no está asociada a esta cuenta. Al verificarla, el servidor solo permitirá vincularla si pertenece a esta cuenta; no se dará de baja una suscripción ajena.
        </p>
      )}
      {pendingRemoval && (
        <p style={{ margin: '8px 0 0', color: '#cbd5e1', fontSize: '0.75rem', lineHeight: 1.4 }}>
          Hay una baja pendiente para esta cuenta. Reintentá para avisar al servidor antes de activar otro dispositivo.
        </p>
      )}
      {feedback && (
        <p
          role={feedback.type === 'error' ? 'alert' : 'status'}
          style={{
            margin: '8px 0 0',
            color: feedback.type === 'error' ? '#fca5a5' : '#86efac',
            fontSize: '0.75rem',
            lineHeight: 1.4,
          }}
        >
          {feedback.text}
        </p>
      )}
    </section>
  );
}
