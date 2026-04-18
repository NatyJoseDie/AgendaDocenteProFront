export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Plan Gratuito',
    getLimits: (createdAt) => {
      const diff = new Date() - new Date(createdAt);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      // Si tiene menos de 30 días, le damos 5 escuelas/cursos (Trial). Si no, solo 2.
      return days <= 30 
        ? { escuelas: 5, cursos: 5, label: 'Trial (30 días)' } 
        : { escuelas: 2, cursos: 2, label: 'Límite Free' };
    },
    features: [
      '⚡ Todas las funciones DESBLOQUEADAS', 
      '🎁 5 Escuelas/Cursos (30 días de REGALO)', 
      '🏠 Luego máximo de 2 Escuelas para siempre',
      '📈 Seguimiento Pedagógico Completo'
    ]
  },
  pro: {
    name: 'Plan Profesional',
    max_escuelas: 10,
    max_cursos: 10,
    features: [
      '⭐ EL MÁS ELEGIDO POR DOCENTES',
      '🚀 Hasta 10 Escuelas / Cursos', 
      '📊 Calificaciones e Intensificación', 
      '📞 Libro de Temas y Contactos'
    ]
  },
  premium: {
    name: 'Plan Premium',
    max_escuelas: 100,
    max_cursos: 100,
    features: [
      '👑 TODO ILIMITADO - NIVEL ELITE', 
      '♾️ Sin límite de Escuelas o Cursos', 
      '☁️ Backups automáticos en la nube', 
      '🛡️ Soporte Prioritario VIP 24/7'
    ]
  }
};

// COMPATIBILIDAD
SUBSCRIPTION_PLANS.expert = SUBSCRIPTION_PLANS.premium;

export const checkPlanLimit = (docente, currentCount, type = 'cursos') => {
  const planKey = docente?.subscription_plan || 'free';
  const plan = SUBSCRIPTION_PLANS[planKey];
  
  let limit = 0;
  if (planKey === 'free') {
    const dynamicLimits = plan.getLimits(docente?.created_at || new Date());
    limit = type === 'escuelas' ? dynamicLimits.escuelas : dynamicLimits.cursos;
  } else {
    limit = type === 'escuelas' ? plan.max_escuelas : plan.max_cursos;
  }
  
  if (currentCount >= limit) {
    return {
      limited: true,
      message: `Has alcanzado el límite de ${limit} ${type} en tu ${plan.name}. ¡Pasate a PRO para seguir creciendo!`
    };
  }
  
  return { limited: false };
};
