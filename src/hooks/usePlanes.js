import { useEffect, useState, useCallback } from 'react';
import { PlanesAPI } from '../services/api';

export default function usePlanes() {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPlanes(await PlanesAPI.getPlanes());
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los precios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { planes, loading, error, recargar: cargar };
}
