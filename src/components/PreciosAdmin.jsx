import React, { useCallback, useEffect, useState } from 'react';
import { AdminAPI } from '../services/api';
import { formatPrecio, formatFecha } from '../constants/plans';

const ORDEN = ['basico_mensual', 'basico_ciclo_lectivo', 'pro_mensual', 'pro_ciclo_lectivo', 'premium_mensual', 'premium_ciclo_lectivo'];

const toInputDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const toForm = (p) => ({
  id: p.id,
  titulo: p.titulo || p.id,
  precio: p.precio ?? '',
  precio_promocional: p.precio_promocional ?? '',
  promo_hasta: toInputDate(p.promo_hasta),
  activo: p.activo !== false,
  en_promocion: !!p.en_promocion,
  precio_vigente: p.precio_vigente,
});
const mesesDesde = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
};

const inputStyle = { width: '100%', minWidth: '90px', padding: '6px 8px', fontSize: '0.85rem', boxSizing: 'border-box' };

export default function PreciosAdmin() {
  const [filas, setFilas] = useState([]);
  const [recordatorio, setRecordatorio] = useState(null);
  const [meses, setMeses] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const aplicar = useCallback(({ planes, recordatorio: rec }) => {
    const ordenados = [...planes].sort((a, b) => ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id));
    setFilas(ordenados.map(toForm));
    setRecordatorio(rec);
    setMeses(rec?.meses_recordatorio ?? '');
  }, []);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      aplicar(await AdminAPI.getPrecios());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [aplicar]);

  useEffect(() => { cargar(); }, [cargar]);

  const update = (id, field, value) =>
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, [field]: value } : f)));

  const guardar = async () => {
    setError(null);
    setOk(null);
    const planes = [];
    for (const f of filas) {
      const precio = Number(f.precio);
      if (f.precio === '' || !Number.isFinite(precio) || precio <= 0) {
        setError(`${f.titulo}: el precio normal tiene que ser un número mayor a 0.`);
        return;
      }
      const sinPromo = f.precio_promocional === '' || f.precio_promocional === null;
      const promo = sinPromo ? null : Number(f.precio_promocional);
      if (!sinPromo && (!Number.isFinite(promo) || promo <= 0)) {
        setError(`${f.titulo}: el precio promocional tiene que ser un número mayor a 0 o quedar vacío.`);
        return;
      }
      if (!sinPromo && !f.promo_hasta) {
        setError(`${f.titulo}: indicá hasta cuándo dura la promo.`);
        return;
      }
      planes.push({
        id: f.id,
        precio,
        precio_promocional: promo,
        promo_hasta: sinPromo || !f.promo_hasta ? null : new Date(`${f.promo_hasta}T23:59:59-03:00`).toISOString(),
        activo: !!f.activo,
      });
    }
    const payload = { planes };
    if (meses !== '' && meses !== null) {
      const m = Number(meses);
      if (!Number.isInteger(m) || m < 1 || m > 24) {
        setError('Los meses de recordatorio tienen que ser un entero entre 1 y 24.');
        return;
      }
      payload.meses_recordatorio = m;
    }
    try {
      setSaving(true);
      aplicar(await AdminAPI.updatePrecios(payload));
      setOk('¡Precios guardados!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const mesesPasados = mesesDesde(recordatorio?.ultimo_ajuste_at);

  return (
    <div className="glass-card" style={{ padding: '1.4rem', marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>💰 Precios</h3>
        <button onClick={cargar} disabled={loading || saving} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
          🔄 Recargar
        </button>
      </div>

      {recordatorio?.ajuste_pendiente && (
        <div role="alert" style={{ padding: '0.9rem 1rem', borderRadius: '12px', marginBottom: '1rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#fcd34d' }}>
          <strong>⚠️ {mesesPasados !== null ? `Pasaron ${mesesPasados} ${mesesPasados === 1 ? 'mes' : 'meses'} desde el último ajuste.` : 'Hay un ajuste de precios pendiente.'}</strong>
          <div style={{ fontSize: '0.82rem', marginTop: '4px', color: 'rgba(255,255,255,0.8)' }}>
            Último ajuste: {formatFecha(recordatorio.ultimo_ajuste_at) || 'sin registro'} · Próximo ajuste: {formatFecha(recordatorio.proximo_ajuste_at) || '—'}
          </div>
        </div>
      )}
      {recordatorio && !recordatorio.ajuste_pendiente && (
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 1rem' }}>
          Último ajuste: {formatFecha(recordatorio.ultimo_ajuste_at) || 'sin registro'} · Próximo ajuste: {formatFecha(recordatorio.proximo_ajuste_at) || '—'}
        </p>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Cargando precios...</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px' }}>Plan</th>
                  <th style={{ padding: '8px' }}>Precio normal</th>
                  <th style={{ padding: '8px' }}>Precio promo</th>
                  <th style={{ padding: '8px' }}>Fin de promo</th>
                  <th style={{ padding: '8px' }}>Activo</th>
                  <th style={{ padding: '8px' }}>Vigente hoy</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{f.titulo}</td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" min="1" step="100" className="input-field" style={inputStyle} value={f.precio} onChange={e => update(f.id, 'precio', e.target.value)} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" min="1" step="100" placeholder="Sin promo" className="input-field" style={inputStyle} value={f.precio_promocional} onChange={e => update(f.id, 'precio_promocional', e.target.value)} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="date" className="input-field" style={inputStyle} value={f.promo_hasta} onChange={e => update(f.id, 'promo_hasta', e.target.value)} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input type="checkbox" checked={f.activo} onChange={e => update(f.id, 'activo', e.target.checked)} />
                    </td>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap', color: f.en_promocion ? '#22c55e' : '#fff', fontWeight: 700 }}>
                      {formatPrecio(f.precio_vigente)}{f.en_promocion ? ' (promo)' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '1rem' }}>
            <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)' }}>
              Recordarme ajustar precios cada (meses, 1–24)
              <input type="number" min="1" max="24" className="input-field" style={{ ...inputStyle, maxWidth: '100px', display: 'block', marginTop: '4px' }} value={meses} onChange={e => setMeses(e.target.value)} />
            </label>
            <button className="btn-primary" onClick={guardar} disabled={saving || !filas.length} style={{ padding: '10px 22px', borderRadius: '10px' }}>
              {saving ? 'Guardando...' : '💾 Guardar precios'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '8px 0 0' }}>
            Dejá el precio promo vacío para quitar la promoción.
          </p>
        </>
      )}

      {error && <p role="alert" style={{ color: '#fca5a5', fontSize: '0.85rem', margin: '10px 0 0' }}>{error}</p>}
      {ok && <p style={{ color: '#22c55e', fontSize: '0.85rem', margin: '10px 0 0' }}>{ok}</p>}
    </div>
  );
}
