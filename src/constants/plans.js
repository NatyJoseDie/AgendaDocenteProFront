export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Plan Gratuito',
    max_escuelas: 1,
    max_cursos: 2,
    features: [
      '🚀 Prueba completa de la app',
      '🏫 Hasta 1 Escuela y 2 Cursos',
      '👥 Carga de Alumnos y Asistencia',
      '📊 Calificaciones básicas'
    ]
  },
  pro: {
    name: 'Plan Profesional',
    max_escuelas: 10,
    max_cursos: 10,
    features: [
      '⭐ EL MÁS ELEGIDO POR DOCENTES',
      '🏫 Hasta 10 Escuelas / Cursos', 
      '📊 Calificaciones e Intensificación', 
      '📖 Libro de Temas y Contactos',
      '📄 Planillas Oficiales en PDF'
    ]
  },
  premium: {
    name: 'Plan Premium',
    max_escuelas: 100,
    max_cursos: 100,
    features: [
      '💎 TODO ILIMITADO - NIVEL ELITE', 
      '🏫 Sin límite de Escuelas o Cursos', 
      '📸 Digitalización OCR con IA',
      '☁️ Backups automáticos en la nube', 
      '🛡️ Soporte Prioritario VIP 24/7'
    ]
  }
};

SUBSCRIPTION_PLANS.expert = SUBSCRIPTION_PLANS.premium;

export const ADMIN_EMAILS = [
  'nbarzotti6@gmail.com',
  'natalia@agendadocente.com',
  'admin@agendadocente.com'
];

export const isUserAdmin = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * Evalúa el estado de suscripción del docente
 */
export const getSubscriptionStatus = (docente) => {
  if (!docente) return { isExpired: false, isReadOnly: false, daysLeft: null, label: 'Docente' };

  // 1. Dueña / Administradora (Acceso vitalicio absoluto)
  if (isUserAdmin(docente.email)) {
    return {
      isAdmin: true,
      isExpired: false,
      isReadOnly: false,
      label: 'FUNDADORA 👑',
      daysLeft: 9999
    };
  }

  // 2. Verificar vencimiento si tiene trial_ends_at
  if (docente.trial_ends_at) {
    const diff = new Date(docente.trial_ends_at) - new Date();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      // Vencido: Modo Solo Lectura
      return {
        isExpired: true,
        isReadOnly: true,
        daysLeft: 0,
        label: 'VENCIDO 🔒',
        message: 'Tu período de prueba ha finalizado. Tus datos están resguardados por 30 días.'
      };
    }

    // Si tiene más de 30 días restantes, es uno de los 10 Pases VIP Cuatrimestrales
    if (daysLeft > 30) {
      return {
        isVipBeta: true,
        isExpired: false,
        isReadOnly: false,
        daysLeft,
        label: `PASE VIP (${daysLeft}d)`
      };
    }

    // Prueba estándar (7 o 14 días)
    return {
      isTrial: true,
      isExpired: false,
      isReadOnly: false,
      daysLeft,
      label: `PRUEBA (${daysLeft}d)`
    };
  }

  // Si tiene is_premium activo
  if (docente.is_premium) {
    return {
      isPaid: true,
      isExpired: false,
      isReadOnly: false,
      label: docente.subscription_plan?.toUpperCase() || 'PREMIUM'
    };
  }

  // Plan gratuito por defecto
  return {
    isExpired: false,
    isReadOnly: false,
    label: 'PLAN FREE',
    daysLeft: 0
  };
};

/**
 * Controla si el docente puede seguir creando escuelas o cursos
 */
export const checkPlanLimit = (docente, currentCount, type = 'cursos') => {
  if (isUserAdmin(docente?.email)) {
    return { limited: false };
  }

  const status = getSubscriptionStatus(docente);

  // Si el período expiró, entra en Modo Solo Lectura
  if (status.isReadOnly) {
    return {
      limited: true,
      isReadOnly: true,
      message: 'Tu período de prueba ha finalizado y tu cuenta está en Modo Solo Lectura. Activá tu Plan PRO para continuar cargando información.'
    };
  }

  // Si tiene Pase VIP o es Premium activo, no tiene límites
  if (status.isVipBeta || docente?.is_premium === true) {
    return { limited: false };
  }

  const planKey = docente?.subscription_plan || 'free';
  const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free;
  const limit = type === 'escuelas' ? plan.max_escuelas : plan.max_cursos;

  if (currentCount >= limit) {
    return {
      limited: true,
      message: `Has alcanzado el límite de ${limit} ${type} en tu ${plan.name}. ¡Pasate a PRO para continuar creciendo!`
    };
  }

  return { limited: false };
};
