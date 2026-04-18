import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function HorarioSemanal({ session }) {
  const [horarios, setHorarios] = useState([]);
  const [bloquesDinamicos, setBloquesDinamicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const docenteId = session?.user?.id;

  useEffect(() => {
    if (docenteId) loadHorarios();
  }, [docenteId]);

  const loadHorarios = async () => {
    try {
      const { data, error } = await supabase
        .from('horarios_curso')
        .select(`
          id, dia_semana, hora_inicio, hora_fin,
          cursos (
            id, nombre, anio_o_grado, division, materia,
            escuelas ( nombre, numero )
          )
        `)
        .eq('docente_id', docenteId);

      if (error) throw error;
      setHorarios(data || []);
      
      // ELIMINAMOS LOS BLOQUES DE 1 HORA.
      // Ahora vamos a identificar todos los horarios "únicos" que existen en la semana
      // para que cada fila sea un horario real.
      if (data && data.length > 0) {
        const rangosExistentes = data.map(h => `${h.hora_inicio.slice(0, 5)} - ${h.hora_fin.slice(0, 5)}`);
        // Quitamos duplicados y ordenamos por hora de inicio
        const rangosUnicos = [...new Set(rangosExistentes)].sort((a, b) => a.localeCompare(b));
        setBloquesDinamicos(rangosUnicos);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventos = (diaIdx, horaRango) => {
    const [inicioBloque, finBloque] = horaRango.split(' - ');
    
    return horarios.filter(h => {
      const hInicio = h.hora_inicio.slice(0, 5);
      const hFin = h.hora_fin.slice(0, 5);
      
      const coincideDia = h.dia_semana === (diaIdx + 1);
      // Ahora la coincidencia es EXACTA con el rango de la fila
      const coincideHorario = hInicio === inicioBloque && hFin === finBloque;
      
      return coincideDia && coincideHorario;
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem', color: '#6366f1' }}>Dibujando tu agenda... ✨</div>;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f6f1f8',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M794 371Q851 492 787 598.5t-138.5 131.5Q574 755 450 782t-271-63.5Q32 628 47 483.5t129.5-242Q306 144 430.5 141T655 249.5t139 121.5z' fill='rgba(139, 92, 246, 0.12)'/%3E%3Cpath d='M833.5 174Q892 298 840.5 417t-140.5 156.5Q611 611 501.5 677.5T237 733Q82 722 84 553t66-228.5Q214 165 348 114t254 1.5 231.5 58.5z' fill='rgba(244, 63, 94, 0.08)'/%3E%3Cpath d='M756.5 733.5Q642 841 490 850.5T202 770.5q-136-90-123-261t97-251Q260 178 409.5 125T682 173t149 203Q906 477 831 605.5t-74.5 128z' fill='rgba(16, 185, 129, 0.10)'/%3E%3C/svg%3E")`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center',
      padding: '1.5rem',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Botón Regresar */}
      <Link to="/dashboard" style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        color: '#4B2C82', 
        textDecoration: 'none', 
        fontWeight: 700,
        marginBottom: '1rem',
        fontSize: '0.9rem',
        background: 'rgba(255,255,255,0.6)',
        padding: '0.5rem 1rem',
        borderRadius: '12px',
        backdropFilter: 'blur(5px)',
        border: '1px solid rgba(75, 44, 130, 0.2)'
      }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Regresar al Inicio
      </Link>

      <header style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative' }}>
        <h1 style={{ 
          fontSize: '2.8rem', 
          color: '#4B2C82', 
          fontWeight: 900, 
          margin: 0,
          fontFamily: "'Outfit', sans-serif" 
        }}>
          Mi Agenda Semanal
        </h1>
        <div style={{ width: '60px', height: '4px', background: '#4B2C82', margin: '0.5rem auto', borderRadius: '2px' }}></div>
      </header>

      {/* Grilla Clásica con Fondo Nuevo */}
      <div style={{ overflowX: 'auto', paddingBottom: '2rem' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          minWidth: '700px',
          border: '3px solid #4B2C82',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(5px)'
        }}>
          <thead>
            <tr>
              <th style={{ border: '2px solid #4B2C82', width: '120px' }}></th>
              {DIAS_SEMANA.map(dia => (
                <th key={dia} style={{ 
                  border: '2px solid #4B2C82', 
                  padding: '1rem', 
                  color: '#4B2C82', 
                  textTransform: 'uppercase',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  letterSpacing: '1px'
                }}>
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloquesDinamicos.map((bloque) => (
              <tr key={bloque}>
                <td style={{ 
                  border: '1.5px solid #4B2C82', 
                  padding: '0.8rem', 
                  textAlign: 'center', 
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  color: '#4B2C82',
                  background: 'rgba(75, 44, 130, 0.05)'
                }}>
                  {bloque}
                </td>
                {DIAS_SEMANA.map((_, diaIdx) => {
                  const clases = getEventos(diaIdx, bloque);
                  return (
                    <td key={diaIdx} style={{ 
                      border: '1.5px solid #4B2C82', 
                      height: '80px',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.4)',
                      verticalAlign: 'top'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
                        {clases.map(clase => {
                          const esPreceptor = (clase.cursos?.materia || '').toLowerCase().includes('preceptor');
                          return (
                            <div key={clase.id} style={{
                              background: esPreceptor ? '#e8f5e9' : '#f3e5f5',
                              borderLeft: `5px solid ${esPreceptor ? '#2e7d32' : '#7b1fa2'}`,
                              borderRadius: '4px',
                              padding: '0.6rem',
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#444', lineHeight: 1.1 }}>
                                {clase.cursos?.escuelas?.nombre?.toUpperCase()} 
                                <span style={{ color: '#4B2C82' }}> {clase.cursos?.escuelas?.numero ? `Nº ${clase.cursos.escuelas.numero}` : ''}</span>
                              </span>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#000' }}>
                                  {clase.cursos?.anio_o_grado} {clase.cursos?.division}
                                </span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', opacity: 0.8 }}>
                                  {clase.hora_inicio.slice(0, 5)} - {clase.hora_fin.slice(0, 5)}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: esPreceptor ? '#2e7d32' : '#7b1fa2', marginTop: '2px' }}>
                                {clase.cursos?.materia || 'CARGO'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        body { background-color: #fdfbf7 !important; overflow-x: hidden; }
        .bottom-nav { display: none !important; }
      `}</style>
    </div>
  );
}
