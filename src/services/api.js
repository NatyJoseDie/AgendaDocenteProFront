import { supabase } from '../supabaseClient';

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
  create: async (alumnoData, condicionData = null) => {
    const { data: alumno, error } = await supabase.from('alumnos').insert([alumnoData]).select().single();
    if (error) throw error;

    if (condicionData) {
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
    const { data, error } = await supabase
      .from('asistencias')
      .select('*, alumnos(apellido, nombre)')
      .eq('curso_id', cursoId)
      .gte('fecha', `${anio}-${String(mes).padStart(2, '0')}-01`)
      .lte('fecha', `${anio}-${String(mes).padStart(2, '0')}-31`);
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
    const { data, error } = await supabase
      .from('calificaciones')
      .upsert([calificacionData], { onConflict: 'alumno_id, curso_id, periodo' })
      .select()
      .single();
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('intensificaciones')
      .upsert([intensifData], { onConflict: 'alumno_id, curso_id, periodo_intensifica' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ─── PLANILLA OFICIAL (PROVINCIA) ──────────────────────────  
export const PlanillaOficialAPI = {
  getByCurso: async (cursoId) => {
    const { data, error } = await supabase
      .from('v_planilla_oficial')
      .select('*, alumnos(apellido, nombre)')
      .eq('curso_id', cursoId);
    if (error) throw error;
    return data;
  },
  upsert: async (gradeData) => {
    const { data, error } = await supabase
      .from('planilla_oficial')
      .upsert([gradeData], { onConflict: 'alumno_id, curso_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('seguimiento_diario')
      .upsert([seguimientoData], { onConflict: 'alumno_id, tema_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  saveMasivo: async (seguimientoArray) => {
    const { data, error } = await supabase
      .from('seguimiento_diario')
      .upsert(seguimientoArray, { onConflict: 'alumno_id, tema_id' });
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
  getMaestro: async () => {
    // Lectura UNIFICADA desde la vista (Regla de Oro)
    const { data, error } = await supabase.from('v_calendario_maestro').select('*');
    if (error) throw error;
    return data;
  },
  createAcademic: async (evento) => {
    // POST /api/eventos (Tabla academica unificada)
    const { data, error } = await supabase.from('eventos_academicos').insert([evento]).select().single();
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
  getProfile: async (docenteId) => {
    const { data, error } = await supabase.from('docentes').select('*').eq('id', docenteId).single();
    if (error) throw error;
    return data;
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
        console.error('❌ Error de Supabase:', error.message);
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
