import { supabase } from '../supabaseClient';
import { PAID_PLAN_KEYS, PLAN_CICLOS } from '../constants/plans';

const saveByNaturalKey = async (table, record, keyFields) => {
  let lookup = supabase.from(table).select('id');
  for (const field of keyFields) {
    lookup = lookup.eq(field, record[field]);
  }

  const { data: existing, error: lookupError } = await lookup.limit(1).maybeSingle();
  if (lookupError) throw lookupError;

  const query = existing
    ? supabase.from(table).update(record).eq('id', existing.id)
    : supabase.from(table).insert([record]);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
};

// ─── ESCUELAS ──────────────────────────────────────────────
export const EscuelasAPI = {
  getByDocente: async (docenteId) => {
    const { data, error } = await supabase
      .from('escuelas')
      .select('*')
      .eq('docente_id', docenteId)
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return data;
  },
  create: async (escuelaData) => {
    const { data, error } = await supabase.from('escuelas').insert([escuelaData]).select();
    if (error) throw error;
    return data[0];
  },
  getById: async (id) => {
    const { data, error } = await supabase.from('escuelas').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  update: async (id, escuelaData) => {
    const { data, error } = await supabase.from('escuelas').update(escuelaData).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  delete: async (id) => {
    // Borrado lógico
    const { error } = await supabase.from('escuelas').update({ activo: false }).eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── CURSOS & HORARIOS ─────────────────────────────────────
export const CursosAPI = {
  getAll: async (docenteId) => {
    // Alias para compatibilidad con Calendario y otras vistas maestras
    return CursosAPI.getByDocente(docenteId);
  },
  getByDocente: async (docenteId) => {
    const { data, error } = await supabase
      .from('cursos')
      .select(`
        *,
        escuelas ( nombre, numero ),
        horarios_curso ( * )
      `)
      .eq('docente_id', docenteId)
      .eq('activo', true);
    if (error) throw error;
    return data;
  },
  getByEscuela: async (escuelaId) => {
    const { data, error } = await supabase
      .from('cursos')
      .select('*, horarios_curso ( dia_semana, hora_inicio, hora_fin )')
      .eq('escuela_id', escuelaId)
      .eq('activo', true);
    if (error) throw error;
    return data;
  },
  getById: async (id) => {
    const { data, error } = await supabase.from('v_cursos_con_escuela').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (cursoData, horariosData = []) => {
    const { data: curso, error: cursoError } = await supabase.from('cursos').insert([cursoData]).select().single();
    if (cursoError) throw cursoError;

    if (horariosData.length > 0) {
      const horariosToInsert = horariosData.map(h => ({
        ...h,
        curso_id: curso.id,
        docente_id: cursoData.docente_id
      }));
      const { error: horError } = await supabase.from('horarios_curso').insert(horariosToInsert);
      if (horError) throw horError;
    }

    return { ...curso, horarios_curso: horariosData };
  },
  update: async (id, cursoData, horariosData = []) => {
    const { data: curso, error: cursoError } = await supabase.from('cursos').update(cursoData).eq('id', id).select().single();
    if (cursoError) throw cursoError;

    if (horariosData.length > 0) {
      // Eliminar horarios viejos e insertar nuevos
      await supabase.from('horarios_curso').delete().eq('curso_id', id);
      const horariosToInsert = horariosData.map(h => ({
        ...h,
        curso_id: id,
        docente_id: cursoData.docente_id
      }));
      await supabase.from('horarios_curso').insert(horariosToInsert);
    }
    return curso;
  },
  delete: async (id) => {
    // Borrado lógico
    const { error } = await supabase.from('cursos').update({ activo: false }).eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── ALUMNOS ───────────────────────────────────────────────
export const AlumnosAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .eq('curso_id', cursoId)
      .eq('activo', true)
      .order('apellido');
    if (error) throw error;
    return data;
  },
  getCondicionesEspeciales: async (alumnoId) => {
    const { data, error } = await supabase
      .from('condiciones_especiales')
      .select('*')
      .eq('alumno_id', alumnoId);
    if (error) throw error;
    return data;
  },
  createCondicion: async (condicionData) => {
    const { data, error } = await supabase.from('condiciones_especiales').insert([condicionData]).select().single();
    if (error) throw error;
    return data;
  },
  create: async (alumnoData, condicionData = null) => {
    if (!alumnoData) throw new Error("Faltan datos del alumno");
    const { data: alumno, error } = await supabase.from('alumnos').insert([alumnoData]).select().single();
    if (error) throw error;

    if (condicionData && alumno) {
      const condicionToInsert = {
        ...condicionData,
        alumno_id: alumno.id,
        docente_id: alumnoData.docente_id
      };
      const { error: condError } = await supabase.from('condiciones_especiales').insert([condicionToInsert]);
      if (condError) console.error("Error al guardar condición especial:", condError);
    }

    return alumno;
  },
  updateCondicion: async (id, condicionData) => {
    const { data, error } = await supabase
      .from('condiciones_especiales')
      .update(condicionData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  deleteCondicion: async (id) => {
    const { error } = await supabase
      .from('condiciones_especiales')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
  update: async (id, alumnoData) => {
    const { data, error } = await supabase
      .from('alumnos')
      .update(alumnoData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('alumnos')
      .update({ activo: false }) // Soft delete recomendado
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

export const AsistenciasAPI = {
  getByCursoAndDate: async (cursoId, fecha) => {
    const { data, error } = await supabase
      .from('asistencias')
      .select('*, alumnos(nombre, apellido)')
      .eq('curso_id', cursoId)
      .eq('fecha', fecha);
    if (error) throw error;
    return data;
  },
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('curso_id', cursoId)
      .order('fecha', { ascending: true });
    if (error) throw error;
    return data;
  },
  getEstadisticas: async (cursoId) => {
    // Simulamos el endpoint de estadísticas sumando las faltas 'A'
    const { data, error } = await supabase
      .from('asistencias')
      .select('alumno_id, estado')
      .eq('curso_id', cursoId);
    if (error) throw error;

    // Agrupamos por alumno para detectar excesos (>3 faltas)
    const stats = {};
    data.forEach(a => {
      if (!stats[a.alumno_id]) stats[a.alumno_id] = { faltas: 0 };
      if (a.estado === 'A') stats[a.alumno_id].faltas += 1;
    });

    // Marcamos exceso_inasistencias
    Object.keys(stats).forEach(id => {
      stats[id].exceso_inasistencias = stats[id].faltas > 3;
    });

    return stats;
  },
  getResumenMensual: async (cursoId, mes, anio) => {
    // Simulamos el endpoint del backend /api/asistencias/resumen-mensual
    // En una implementación real con Supabase esto podría ser un RPC o una consulta filtrada
    const lastDay = new Date(anio, mes, 0).getDate(); 
    const endDate = `${anio}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('asistencias')
      .select('*, alumnos(apellido, nombre)')
      .eq('curso_id', cursoId)
      .gte('fecha', `${anio}-${String(mes).padStart(2, '0')}-01`)
      .lte('fecha', endDate);
    if (error) throw error;
    return data;
  },
  upsertAsistencia: async (asistenciaData) => {
    const { data, error } = await supabase
      .from('asistencias')
      .upsert([asistenciaData], { onConflict: 'alumno_id, fecha, curso_id' })
      .select();
    if (error) throw error;
    return data[0];
  },
  saveMasivo: async (asistencias) => {
    const { data, error } = await supabase
      .from('asistencias')
      .upsert(asistencias, { onConflict: 'alumno_id, fecha, curso_id' });
    if (error) throw error;
    return data;
  }
};

// ─── CALIFICACIONES ────────────────────────────────────────
export const CalificacionesAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('calificaciones')
      .select('*')
      .eq('curso_id', cursoId);
    if (error) throw error;
    return data;
  },
  upsert: async (calificacionData) => {
    return saveByNaturalKey('calificaciones', calificacionData, [
      'alumno_id',
      'curso_id',
      'periodo',
      'tipo'
    ]);
  }
};

// ─── INTENSIFICACIONES ──────────────────────────────────────
export const IntensificacionesAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('intensificaciones')
      .select('*')
      .eq('curso_id', cursoId);
    if (error) throw error;
    return data;
  },
  upsert: async (intensifData) => {
    return saveByNaturalKey('intensificaciones', intensifData, [
      'alumno_id',
      'curso_id',
      'periodo',
      'semestre'
    ]);
  }
};

// ─── PLANILLA OFICIAL (PROVINCIA) ──────────────────────────  
export const PlanillaOficialAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('planilla_oficial')
      .select('*')
      .eq('curso_id', cursoId);
    if (error) throw error;
    return data.map((row) => ({
      ...row,
      observaciones: row.observaciones ?? row.observaciones_manuales ?? ''
    }));
  },
  upsert: async (gradeData) => {
    const record = { ...gradeData };
    if (Object.prototype.hasOwnProperty.call(record, 'observaciones')) {
      record.observaciones_manuales = record.observaciones;
      delete record.observaciones;
    }

    return saveByNaturalKey('planilla_oficial', record, ['alumno_id', 'curso_id']);
  }
};

// ─── SEGUIMIENTO DIARIO (TPs y NOTAS) ──────────────────────
export const SeguimientoAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('seguimiento_diario')
      .select('*')
      .eq('curso_id', cursoId);
    if (error) throw error;
    return data;
  },
  upsert: async (seguimientoData) => {
    const payload = { ...seguimientoData };
    delete payload.updated_at;

    const { data, error } = await supabase
      .from('seguimiento_diario')
      .upsert(payload, { onConflict: 'alumno_id, tema_id' })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  update: async (actividadId, patch) => {
    // Si la actividad tiene id numérico o existe en seguimiento_diario
    const { data, error } = await supabase
      .from('seguimiento_diario')
      .update(patch)
      .eq('tema_id', actividadId);
    if (error) {
      console.warn("SeguimientoAPI.update:", error.message);
    }
    return data;
  },
  createActividad: async (actData) => {
    return {
      id: actData.id || `act_${Date.now()}`,
      nombre: actData.nombre,
      tipo: actData.tipo || 'nota',
      fecha: actData.fecha || new Date().toISOString().split('T')[0]
    };
  },
  deleteActividad: async (actividadId) => {
    const { error } = await supabase
      .from('seguimiento_diario')
      .delete()
      .eq('tema_id', actividadId);
    if (error) {
      console.warn("SeguimientoAPI.deleteActividad:", error.message);
    }
    return true;
  },
  saveMasivo: async (seguimientoArray) => {
    const payload = (seguimientoArray || []).map((row) => {
      const cleanRow = { ...row };
      delete cleanRow.updated_at;
      return cleanRow;
    });

    const { data, error } = await supabase
      .from('seguimiento_diario')
      .upsert(payload, { onConflict: 'alumno_id, tema_id' })
      .select();
    if (error) throw error;
    return data;
  }
};

// ─── LIBRO DE TEMAS (PLAN DE CLASE) ────────────────────────
export const LibroTemasAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('libro_temas')
      .select('*')
      .eq('curso_id', cursoId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (temaData) => {
    const { data, error } = await supabase
      .from('libro_temas')
      .insert([temaData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, temaData) => {
    const { data, error } = await supabase
      .from('libro_temas')
      .update(temaData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('libro_temas').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── LICENCIAS ─────────────────────────────────────────────
export const LicenciasAPI = {
  getByDocente: async (docenteId) => {
    const { data, error } = await supabase
      .from('licencias')
      .select('*')
      .eq('docente_id', docenteId)
      .order('fecha_inicio', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (licenciaData) => {
    const { data, error } = await supabase
      .from('licencias')
      .insert([licenciaData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('licencias')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },
  uploadCertificado: async (file, docenteId) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${docenteId}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    // Usamos tu bucket oficial 'certificados'
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('certificados')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('certificados')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};

// ─── EVENTOS CALENDARIO (Feriados y Eventos) ────────────────
export const CalendarioAPI = {
  getCurrentUserId: async () => {
    return (await supabase.auth.getUser())?.data?.user?.id;
  },
  getMaestro: async (yearParam) => {
    const currentYear = yearParam || new Date().getFullYear();

    const [efemRes, acadRes] = await Promise.all([
      supabase.from('efemerides_nacionales').select('*'),
      supabase.from('eventos_academicos').select('*')
    ]);

    if (efemRes.error) throw efemRes.error;
    if (acadRes.error) throw acadRes.error;

    const efemList = (efemRes.data || []).map(ef => {
      const mesStr = String(ef.mes).padStart(2, '0');
      const diaStr = String(ef.dia).padStart(2, '0');
      return {
        id: `efem_${ef.id}`,
        titulo: ef.titulo,
        fecha: `${currentYear}-${mesStr}-${diaStr}`,
        tipo: 'Feriado',
        color: ef.color || '#ef4444',
        es_feriado: ef.es_feriado !== false
      };
    });

    const acadList = (acadRes.data || []).map(ac => ({
      id: ac.id,
      titulo: ac.titulo,
      fecha: ac.fecha,
      tipo: ac.tipo || 'Acto',
      color: ac.color || '#f97316',
      curso_id: ac.curso_id,
      descripcion: ac.descripcion
    }));

    return [...efemList, ...acadList];
  },
  createAcademic: async (evento) => {
    // POST /api/eventos (Tabla academica unificada)
    const cleaned = {
      ...evento,
      curso_id: evento.curso_id ? evento.curso_id : null,
      docente_id: evento.docente_id || (await supabase.auth.getUser())?.data?.user?.id
    };
    const { data, error } = await supabase.from('eventos_academicos').insert([cleaned]).select().single();
    if (error) throw error;
    return data;
  },
  createSalida: async (salida) => {
    // POST /api/salidas (Tabla de salidas propia)
    const { data, error } = await supabase.from('salidas').insert([salida]).select().single();
    if (error) throw error;
    return data;
  },
  getAll: async () => {
    const { data, error } = await supabase
      .from('calendario')
      .select('*')
      .order('fecha_inicio', { ascending: true });
    if (error) throw error;
    return data;
  },
  create: async (eventoData) => {
    const { data, error } = await supabase
      .from('calendario')
      .insert([eventoData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('calendario').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── SALIDAS EDUCATIVAS ─────────────────────────────────────
export const SalidasAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('salidas')
      .select('*')
      .eq('curso_id', cursoId)
      .order('fecha_salida', { ascending: true });
    if (error) throw error;
    return data;
  },
  create: async (salidaData) => {
    const { data, error } = await supabase
      .from('salidas')
      .insert([salidaData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('salidas').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};


// ─── CONTACTOS & COMUNICACIONES ─────────────────────────────
export const ContactosAPI = {
  getByDocente: async (docenteId) => {
    const { data, error } = await supabase
      .from('contactos')
      .select('*, escuelas(nombre, numero), cursos(anio_o_grado, division)')
      .eq('docente_id', docenteId)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data;
  },
  create: async (contactoData) => {
    const { data, error } = await supabase
      .from('contactos')
      .insert([contactoData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, contactoData) => {
    const { data, error } = await supabase
      .from('contactos')
      .update(contactoData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('contactos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── PERFIL DOCENTE ────────────────────────────────────────
export const PerfilAPI = {
  getProfile: async () => {
    const response = await fetch(`${BACKEND_URL}/docentes/me`, {
      headers: await getAuthHeaders()
    });
    if (!response.ok) {
      throw await buildApiError(response, 'No se pudo obtener el perfil');
    }
    return response.json();
  },
  upsertProfile: async (profileData) => {
    const { data, error } = await supabase.from('docentes').upsert(profileData).select().single();
    if (error) throw error;
    return data;
  },
  pushSubscribe: async (docenteId, subscription) => {
    const { error } = await supabase
      .from('docentes')
      .update({ push_subscription: subscription })
      .eq('id', docenteId);
    if (error) throw error;
    return true;
  }
};

// ─── PLANIFICACIONES (PDF) ─────────────────────────────────
export const PlanificacionesAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('planificaciones')
      .select('*, cursos(*, escuelas(*))')
      .eq('curso_id', cursoId)
      .order('fecha_entrega', { ascending: true });
    if (error) throw error;
    return data;
  },
  getByDocente: async (docenteId) => {
    const { data, error } = await supabase
      .from('planificaciones')
      .select('*, cursos(anio_o_grado, division, materia, escuelas(nombre, numero))')
      .eq('docente_id', docenteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (planData) => {
    const { data, error } = await supabase
      .from('planificaciones')
      .insert([planData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('planificaciones')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
  uploadFile: async (file, cursoId) => {
    const timestamp = Date.now();
    const filePath = `${cursoId}/${timestamp}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('planificaciones')
      .upload(filePath, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage
      .from('planificaciones')
      .getPublicUrl(filePath);
    return urlData.publicUrl;
  }
};

export const BackupAPI = {
  createSnapshot: async (docenteId) => {
    try {
      // Recopilación masiva de TODO
      const [resEsc, resCur, resAlu, resAsis, resTemas, resNotas, resPlan, resCont] = await Promise.all([
        EscuelasAPI.getByDocente(docenteId),
        CursosAPI.getByDocente(docenteId),
        supabase.from('alumnos').select('*').eq('docente_id', docenteId),
        supabase.from('asistencias').select('*').eq('docente_id', docenteId),
        supabase.from('libro_temas').select('*').eq('docente_id', docenteId),
        supabase.from('calificaciones').select('*').eq('docente_id', docenteId),
        supabase.from('planificaciones').select('*').eq('docente_id', docenteId),
        supabase.from('contactos').select('*').eq('docente_id', docenteId)
      ]);

      const totalBackup = {
        metadata: { app: 'Agenda Docente', version: '2.0', date: new Date().toISOString() },
        escuelas: resEsc || [],
        cursos: resCur || [],
        alumnos: resAlu.data || [],
        asistencias: resAsis.data || [],
        libro_temas: resTemas.data || [],
        calificaciones: resNotas.data || [],
        planificaciones: resPlan.data || [],
        contactos: resCont.data || []
      };

      const { error } = await supabase.from('copias_seguridad').insert({ docente_id: docenteId, datos: totalBackup });

      if (error) {
        console.error('Error de Supabase:', error.message);
        return;
      }

      console.log('📦 Backup Total (JSON) guardado en la nube');
    } catch (e) {
      console.error('Error backup inesperado:', e);
    }
  },

  restoreLast: async (docenteId) => {
    const { data: copia } = await supabase
      .from('copias_seguridad')
      .select('*')
      .eq('docente_id', docenteId)
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    if (!copia) throw new Error('No hay copias disponibles');
    const b = copia.datos;

    // Restauración Masiva (Upsert inteligente)
    if (b.escuelas) await supabase.from('escuelas').upsert(b.escuelas.map(x => ({ ...x, docente_id: docenteId })));
    if (b.cursos) await supabase.from('cursos').upsert(b.cursos.map(x => ({ ...x, docente_id: docenteId })));
    if (b.alumnos) await supabase.from('alumnos').upsert(b.alumnos.map(x => ({ ...x, docente_id: docenteId })));
    if (b.asistencias) await supabase.from('asistencias').upsert(b.asistencias.map(x => ({ ...x, docente_id: docenteId })));
    if (b.libro_temas) await supabase.from('libro_temas').upsert(b.libro_temas.map(x => ({ ...x, docente_id: docenteId })));
    if (b.calificaciones) await supabase.from('calificaciones').upsert(b.calificaciones.map(x => ({ ...x, docente_id: docenteId })));
    if (b.contactos) await supabase.from('contactos').upsert(b.contactos.map(x => ({ ...x, docente_id: docenteId })));
    if (b.planificaciones) await supabase.from('planificaciones').upsert(b.planificaciones.map(x => ({ ...x, docente_id: docenteId })));

    return true;
  }
};

// --- FEEDBACK Y VALORACIONES ---
export const FeedbackAPI = {
  create: async (data) => {
    const { data: result, error } = await supabase
      .from('valoraciones')
      .insert([data])
      .select();
    if (error) throw error;
    return result[0];
  },
  getByDocente: async (docenteId) => {
    const { data, error } = await supabase
      .from('valoraciones')
      .select('*')
      .eq('docente_id', docenteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};

// ─── OCR PROFESIONAL (BACKEND) ─────────────────────────────
const BACKEND_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_URL_RENDER ||
  'http://localhost:3000/api'
).replace(/\/+$/, '');

const getAuthHeaders = async (headers = {}, expectedUserId) => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;

  const token = session?.access_token;
  if (!token) throw new Error('Tu sesión expiró. Iniciá sesión nuevamente.');
  if (expectedUserId && session.user.id !== expectedUserId) {
    throw new Error('La sesión cambió. Volvé a intentar la operación con la cuenta actual.');
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
};

const buildApiError = async (response, fallback) => {
  const body = await response.json().catch(() => ({}));
  const error = new Error(body.error || body.details || fallback);
  error.status = response.status;
  error.code = body.code;
  return error;
};

const buildAdminMensajesError = async (response, fallback) => {
  const error = await buildApiError(response, fallback);
  if (response.status === 403) error.message = 'No tenés permisos de administrador.';
  else if (response.status >= 500) error.message = 'Ocurrió un error en el servidor. Probá de nuevo en unos minutos.';
  return error;
};

export const OCRAPI = {
  processImage: async (imageFile, cursoId) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (cursoId) formData.append('curso_id', cursoId);

    const response = await fetch(`${BACKEND_URL}/ocr/process`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: formData
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error en el escaneo');
    }

    return await response.json();
  }
};

// 💲 PLANES Y PRECIOS (públicos, editables desde el panel de la dueña)
export const PlanesAPI = {
  getPlanes: async () => {
    const response = await fetch(`${BACKEND_URL}/pagos/planes`);
    if (!response.ok) {
      throw await buildApiError(response, 'No se pudieron cargar los precios');
    }
    const data = await response.json();
    return Array.isArray(data?.planes) ? data.planes : [];
  }
};

// 💳 PAGOS & MERCADO PAGO 💳
export const PagosAPI = {
  crearPreferencia: async (plan, ciclo = 'ciclo_lectivo') => {
    if (!PAID_PLAN_KEYS.includes(plan) || !PLAN_CICLOS.includes(ciclo)) {
      throw new Error('La combinación de plan y ciclo no es válida.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${BACKEND_URL}/pagos/crear-preferencia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ plan, ciclo })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al iniciar pago');
    }

    return await response.json();
  },

  getEstado: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${BACKEND_URL}/pagos/estado`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al obtener estado del plan');
    }

    return await response.json();
  }
};
// 👑 PANEL ADMINISTRATIVO (DUEÑA) 👑
export const AdminAPI = {
  getMetricas: async () => {
    const response = await fetch(`${BACKEND_URL}/admin/metricas`, {
      headers: await getAuthHeaders()
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const fallback = response.status === 403
        ? 'Acceso denegado: solo disponible para la administradora.'
        : response.status === 401
          ? 'Tu sesión expiró. Volvé a iniciar sesión.'
          : 'Error al obtener métricas';
      const error = new Error(err.error || fallback);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const resumen = data?.resumen || {};
    return {
      resumen: {
        totalRecaudado: Number(resumen.totalRecaudado) || 0,
        totalPagos: Number(resumen.totalPagos) || 0,
        totalDocentes: Number(resumen.totalDocentes) || 0,
        countVip: Number(resumen.countVip) || 0,
        countPro: Number(resumen.countPro) || 0,
        countPremium: Number(resumen.countPremium) || 0,
        countFree: Number(resumen.countFree) || 0,
        countVencidos: Number(resumen.countVencidos) || 0,
      },
      docentes: Array.isArray(data?.docentes) ? data.docentes : [],
      pagos: Array.isArray(data?.pagos) ? data.pagos : [],
    };
  },

  getPrecios: async () => {
    const response = await fetch(`${BACKEND_URL}/admin/precios`, {
      headers: await getAuthHeaders()
    });
    if (!response.ok) {
      throw await buildApiError(response, 'No se pudieron obtener los precios');
    }
    const data = await response.json();
    return {
      planes: Array.isArray(data?.planes) ? data.planes : [],
      recordatorio: data?.recordatorio || null
    };
  },

  updatePrecios: async (payload) => {
    const response = await fetch(`${BACKEND_URL}/admin/precios`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders())
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw await buildApiError(response, 'No se pudieron guardar los precios');
    }
    const data = await response.json();
    return {
      planes: Array.isArray(data?.planes) ? data.planes : [],
      recordatorio: data?.recordatorio || null
    };
  },

  modificarDocente: async (docenteId, nuevoPlan, diasExtra) => {
    const response = await fetch(`${BACKEND_URL}/admin/modificar-docente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders())
      },
      body: JSON.stringify({
        docente_id: docenteId,
        nuevo_plan: nuevoPlan,
        dias_extra: diasExtra
      })
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al modificar docente');
    }

    return await response.json();
  },

  getMensajesEnviados: async () => MensajesAPI.adminEnviados(),

  getRespuestasPendientes: async () => MensajesAPI.adminRespuestasPendientes(),

  getMensajesDeDocentes: async () => MensajesAPI.adminDocenteAdminLista(),

  getMensajesDeDocentesNoLeidos: async () => MensajesAPI.adminDocenteAdminNoLeidos(),

  getMensajeDeDocente: async (id) => MensajesAPI.adminDocenteAdminDetalle(id),

  responderMensajeDeDocente: async (id, cuerpo) => MensajesAPI.adminDocenteAdminResponder(id, cuerpo),

  getConversacion: async (id) => MensajesAPI.adminDetalleConversacion(id),

  enviarMensaje: async (payload) => MensajesAPI.adminEnviar(payload),

  responderConversacion: async (id, cuerpo) => MensajesAPI.adminResponderConversacion(id, cuerpo),
};

export const NotificacionesAPI = {
  getAll: async (limite = 20) => {
    const response = await fetch(`${BACKEND_URL}/notificaciones?limite=${limite}`, {
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'No se pudieron obtener las notificaciones');
    }

    const data = await response.json();
    return {
      notificaciones: Array.isArray(data?.notificaciones) ? data.notificaciones : (Array.isArray(data) ? data : []),
      noLeidas: Number(data?.noLeidas ?? data?.no_leidas ?? 0) || 0
    };
  },

  marcarLeida: async (id) => {
    const response = await fetch(`${BACKEND_URL}/notificaciones/${encodeURIComponent(id)}/leida`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'No se pudo marcar la notificación');
    }

    const data = await response.json();
    return data?.notificacion || data;
  },

  markAsRead: async (id) => NotificacionesAPI.marcarLeida(id),
};

export const MensajesAPI = {
  getNoLeidos: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/mensajes/no-leidos`, {
        headers: await getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return { noLeidos: Number(data?.noLeidos ?? data?.no_leidos ?? 0) || 0 };
      }

      if ([401, 403, 404].includes(response.status) || response.status >= 500) {
        return { noLeidos: 0 };
      }

      throw await buildApiError(response, 'No se pudieron obtener tus mensajes sin leer');
    } catch (error) {
      if (error?.message?.includes('sesión') || error?.message?.includes('Token')) {
        return { noLeidos: 0 };
      }
      try {
        const response = await fetch(`${BACKEND_URL}/mensajes/docente-admin`, {
          headers: await getAuthHeaders(),
        });
        if (!response.ok) return { noLeidos: 0 };
        const data = await response.json();
        const mensajes = Array.isArray(data?.mensajes) ? data.mensajes : [];
        return { noLeidos: mensajes.filter((m) => !m.leido_por_admin_at && !m.leida_at).length };
      } catch {
        return { noLeidos: 0 };
      }
    }
  },

  getBandeja: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/mensajes`, {
        headers: await getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const mensajes = Array.isArray(data?.mensajes) ? data.mensajes : [];
        return {
          mensajes,
          noLeidos: Number(data?.noLeidos ?? data?.no_leidos ?? 0) || 0,
        };
      }

      if ([401, 403, 404].includes(response.status)) {
        try {
          const legacyResponse = await fetch(`${BACKEND_URL}/mensajes/docente-admin`, {
            headers: await getAuthHeaders(),
          });
          if (!legacyResponse.ok) return { mensajes: [], noLeidos: 0 };
          const legacyData = await legacyResponse.json();
          const mensajes = Array.isArray(legacyData?.mensajes) ? legacyData.mensajes : [];
          return { mensajes, noLeidos: 0 };
        } catch {
          return { mensajes: [], noLeidos: 0 };
        }
      }

      if (response.status >= 500) {
        throw new Error('Los mensajes no están disponibles por el momento. Probá de nuevo más tarde.');
      }
      throw await buildApiError(response, 'No se pudo cargar la bandeja de mensajes');
    } catch (error) {
      if (error?.message?.includes('sesión') || error?.message?.includes('Token')) {
        return { mensajes: [], noLeidos: 0 };
      }
      throw error;
    }
  },

  getDetalle: async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/mensajes/${encodeURIComponent(id)}`, {
        headers: await getAuthHeaders(),
      });

      if (response.ok) {
        return await response.json();
      }

      if ([401, 403, 404].includes(response.status)) {
        try {
          const legacyResponse = await fetch(`${BACKEND_URL}/mensajes/docente-admin/${encodeURIComponent(id)}`, {
            headers: await getAuthHeaders(),
          });
          if (!legacyResponse.ok) return { mensaje: null, respuestas: [] };
          const legacyData = await legacyResponse.json();
          return legacyData?.mensaje ? legacyData : { mensaje: legacyData?.mensaje || legacyData, respuestas: legacyData?.respuestas || [] };
        } catch {
          return { mensaje: null, respuestas: [] };
        }
      }

      throw await buildApiError(response, 'No se pudo abrir este mensaje');
    } catch (error) {
      if (error?.message?.includes('sesión') || error?.message?.includes('Token')) {
        return { mensaje: null, respuestas: [] };
      }
      throw error;
    }
  },

  responder: async (id, cuerpo) => {
    try {
      const response = await fetch(`${BACKEND_URL}/mensajes/${encodeURIComponent(id)}/responder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ cuerpo }),
      });

      if (response.ok) {
        return await response.json();
      }

      if ([401, 403, 404].includes(response.status)) {
        const legacyResponse = await fetch(`${BACKEND_URL}/mensajes/docente-admin/${encodeURIComponent(id)}/responder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify({ cuerpo }),
        });

        if (!legacyResponse.ok) {
          throw await buildApiError(legacyResponse, 'No se pudo enviar la respuesta');
        }
        return await legacyResponse.json();
      }

      throw await buildApiError(response, 'No se pudo enviar la respuesta');
    } catch (error) {
      if (error?.message?.includes('sesión') || error?.message?.includes('Token')) {
        throw new Error('Tu sesión expiró. Volvé a iniciar sesión para seguir.');
      }
      throw error;
    }
  },

  adminEnviar: async (payload) => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/enviar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'No se pudo enviar el mensaje');
    }

    return await response.json();
  },

  adminEnviados: async () => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/enviados`, {
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'No se pudo cargar el historial de mensajes');
    }

    const data = await response.json();
    return { mensajes: Array.isArray(data?.mensajes) ? data.mensajes : [] };
  },

  adminRespuestasPendientes: async () => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/respuestas-pendientes`, {
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'No se pudieron obtener las respuestas pendientes');
    }

    const data = await response.json();
    return { conversaciones: Array.isArray(data?.conversaciones) ? data.conversaciones : [] };
  },

  adminDetalleConversacion: async (id) => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/conversacion/${encodeURIComponent(id)}`, {
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'No se pudo abrir la conversación');
    }

    return await response.json();
  },

  adminResponderConversacion: async (id, cuerpo) => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/conversacion/${encodeURIComponent(id)}/responder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ cuerpo }),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'No se pudo responder la conversación');
    }

    return await response.json();
  },

  adminDocenteAdminLista: async () => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/docente-admin`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) {
      throw await buildAdminMensajesError(response, 'No se pudieron cargar los mensajes de docentes');
    }
    const data = await response.json();
    return { mensajes: Array.isArray(data?.mensajes) ? data.mensajes : [] };
  },

  adminDocenteAdminNoLeidos: async () => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/docente-admin-no-leidos`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) {
      throw await buildAdminMensajesError(response, 'No se pudo obtener el contador de mensajes');
    }
    const data = await response.json();
    return { noLeidos: Number(data?.noLeidos ?? data?.no_leidos ?? 0) || 0 };
  },

  adminDocenteAdminDetalle: async (id) => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/docente-admin/${encodeURIComponent(id)}`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) {
      throw await buildAdminMensajesError(response, 'No se pudo abrir el mensaje');
    }
    const data = await response.json();
    return { mensaje: data?.mensaje || null, respuestas: Array.isArray(data?.respuestas) ? data.respuestas : [] };
  },

  adminDocenteAdminResponder: async (id, cuerpo) => {
    const response = await fetch(`${BACKEND_URL}/mensajes/admin/docente-admin/${encodeURIComponent(id)}/responder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ cuerpo }),
    });
    if (!response.ok) {
      throw await buildAdminMensajesError(response, 'No se pudo enviar la respuesta');
    }
    return await response.json();
  },

  docenteAdminResponder: async (id, cuerpo) => {
    const response = await fetch(`${BACKEND_URL}/mensajes/docente-admin/${encodeURIComponent(id)}/responder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ cuerpo }),
    });
    if (!response.ok) {
      throw await buildApiError(response, 'No se pudo enviar la respuesta');
    }
    return await response.json();
  },

  getDocenteAdminMensajes: async () => {
    const response = await fetch(`${BACKEND_URL}/mensajes/docente-admin`, {
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      if ([400, 403, 404, 500].includes(response.status)) {
        return { mensajes: [] };
      }
      throw await buildApiError(response, 'No se pudieron cargar tus mensajes al administrador');
    }

    const data = await response.json();
    return {
      mensajes: Array.isArray(data?.mensajes)
        ? data.mensajes
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [],
    };
  },

  createDocenteAdminMensaje: async ({ titulo, cuerpo }) => {
    const response = await fetch(`${BACKEND_URL}/mensajes/docente-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ titulo, cuerpo }),
    });

    if (!response.ok) {
      if ([400, 403, 404, 500].includes(response.status)) {
        throw new Error('El servicio de mensajes de administración no está disponible en este momento. Intentá nuevamente más tarde.');
      }
      throw await buildApiError(response, 'No se pudo enviar tu mensaje');
    }

    const data = await response.json();
    return data?.mensaje || data;
  },

  getDocenteAdminDetalle: async (id) => {
    const response = await fetch(`${BACKEND_URL}/mensajes/docente-admin/${encodeURIComponent(id)}`, {
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      if ([400, 403, 404, 500].includes(response.status)) {
        return { mensaje: null, respuestas: [] };
      }
      throw await buildApiError(response, 'No se pudo abrir este mensaje');
    }

    const data = await response.json();
    return data?.mensaje ? data : { mensaje: data?.mensaje || data, respuestas: data?.respuestas || [] };
  },
};

const PUSH_OWNERS_STORAGE_KEY = 'agenda-docente-push-owners';

const readPushOwners = () => {
  const savedOwners = window.localStorage.getItem(PUSH_OWNERS_STORAGE_KEY);
  if (!savedOwners) return [];

  const owners = JSON.parse(savedOwners);
  if (!Array.isArray(owners) || owners.some(owner => (
    typeof owner?.endpoint !== 'string' || typeof owner?.userId !== 'string'
  ))) {
    throw new Error('No se pudo verificar a qué cuenta pertenece esta suscripción Push.');
  }
  return owners;
};

const savePushOwners = (owners) => {
  try {
    window.localStorage.setItem(PUSH_OWNERS_STORAGE_KEY, JSON.stringify(owners));
  } catch (error) {
    throw new Error(`No se pudo guardar el estado local de la suscripción Push: ${error.message}`);
  }
};

const pushResponseError = async (response, fallback) => {
  let message = `${fallback} (HTTP ${response.status}).`;
  try {
    const data = await response.json();
    message = data.error || data.message || message;
  } catch {
    // El servidor puede devolver una respuesta no JSON en errores de infraestructura.
  }

  const error = new Error(message);
  if (response.status === 409) error.code = 'PUSH_SUBSCRIPTION_OWNED_BY_ANOTHER_ACCOUNT';
  return error;
};

export const PushNotificationsAPI = {
  getPublicKey: async () => {
    const response = await fetch(`${BACKEND_URL}/notificaciones/push/vapid-public-key`);

    if (!response.ok) {
      let errorMessage = `No se pudo obtener la clave pública de notificaciones (HTTP ${response.status}).`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // El backend puede devolver una respuesta no JSON en errores de infraestructura.
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (typeof data?.publicKey !== 'string' || !data.publicKey) {
      throw new Error('El backend no devolvió una clave pública VAPID válida.');
    }
    return data.publicKey;
  },

  registerSubscription: async (subscription, userId) => {
    if (!userId) throw new Error('No se pudo determinar la cuenta para registrar este dispositivo.');
    const response = await fetch(`${BACKEND_URL}/notificaciones/push/suscripciones`, {
      method: 'POST',
      headers: await getAuthHeaders({ 'Content-Type': 'application/json' }, userId),
      body: JSON.stringify(subscription),
    });

    if (!response.ok) throw await pushResponseError(response, 'No se pudo registrar este dispositivo');

    const result = await response.json();
    if (result?.registered !== true) {
      throw new Error('El backend no confirmó el registro de este dispositivo.');
    }
    const owners = readPushOwners().filter(owner => owner.endpoint !== subscription.endpoint);
    owners.push({ endpoint: subscription.endpoint, userId });
    try {
      savePushOwners(owners);
    } catch (storageError) {
      try {
        await PushNotificationsAPI.removeSubscription(subscription.endpoint, userId);
      } catch (cleanupError) {
        throw new Error(`${storageError.message} Además, no se pudo revertir el registro del servidor: ${cleanupError.message}`);
      }
      throw storageError;
    }
    return result;
  },

  removeSubscription: async (endpoint, userId) => {
    if (!userId) throw new Error('No se pudo determinar la cuenta para dar de baja este dispositivo.');
    const response = await fetch(`${BACKEND_URL}/notificaciones/push/suscripciones`, {
      method: 'DELETE',
      headers: await getAuthHeaders({ 'Content-Type': 'application/json' }, userId),
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) throw await pushResponseError(response, 'No se pudo dar de baja este dispositivo');
    const result = await response.json();
    if (typeof result?.deleted !== 'boolean') {
      throw new Error('El backend no confirmó la baja de este dispositivo.');
    }
    return result;
  },

  getCurrentSubscription: async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.pushManager.getSubscription() || null;
  },

  getDeviceStatus: async (userId) => {
    const subscription = await PushNotificationsAPI.getCurrentSubscription();
    const owners = readPushOwners();
    const owner = subscription && owners.find(item => item.endpoint === subscription.endpoint);
    if (subscription && owner?.userId === userId) return 'enabled';
    if (subscription) return 'unlinked';
    if (owners.some(item => item.userId === userId)) return 'pending-removal';
    return 'disabled';
  },

  unsubscribeCurrentDevice: async (userId) => {
    if (!userId) throw new Error('No se pudo determinar la cuenta para dar de baja este dispositivo.');

    const subscription = await PushNotificationsAPI.getCurrentSubscription();
    const owners = readPushOwners();
    const ownedEndpoints = owners.filter(owner => owner.userId === userId);
    if (ownedEndpoints.length === 0) return false;

    const failures = [];
    const removedEndpoints = [];
    for (const { endpoint } of ownedEndpoints) {
      let unsubscribeError;
      if (subscription?.endpoint === endpoint) {
        try {
          await subscription.unsubscribe();
        } catch (error) {
          unsubscribeError = error;
          failures.push(`No se pudo desuscribir el navegador: ${error.message}`);
        }
      }

      try {
        await PushNotificationsAPI.removeSubscription(endpoint, userId);
        if (!unsubscribeError) removedEndpoints.push(endpoint);
      } catch (error) {
        failures.push(`No se pudo avisar al servidor: ${error.message}`);
      }
    }

    if (removedEndpoints.length > 0) {
      savePushOwners(owners.filter(owner => !removedEndpoints.includes(owner.endpoint)));
    }
    if (failures.length > 0) throw new Error(failures.join(' '));
    return true;
  },
};




