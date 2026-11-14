export const PLAN_LIMITS = {
  gratuito: { escuelas: 1, cursos: 2, ocrCursos: 0, ocr: false, nombre: 'Gratuito' },
  basico:   { escuelas: 3, cursos: 5, ocrCursos: 0, ocr: false, nombre: 'BÁSICO' },
  pro:      { escuelas: 6, cursos: 10, ocrCursos: 5, ocr: true, nombre: 'PRO' },
  premium:  { escuelas: null, cursos: null, ocrCursos: null, ocr: true, nombre: 'Premium' },
};

export const PLAN_CICLOS = ['mensual', 'ciclo_lectivo'];
export const PAID_PLAN_KEYS = ['basico', 'pro', 'premium'];
const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Plan Gratuito',
    max_escuelas: 1,
    max_cursos: 2,
    max_cursos_ocr: 0,
    features: [
      '🏫 1 Escuela y 2 Cursos',
      '👥 Alumnos, Asistencia y Calificaciones',
      '☁️ Backups automáticos en la nube',
      '🚫 Sin escaneo OCR'
    ]
  },
  basico: {
    name: 'Plan BÁSICO',
    max_escuelas: 3,
    max_cursos: 5,
    max_cursos_ocr: 0,
    features: [
      '🏫 3 Escuelas y 5 Cursos',
      '👥 Alumnos, Asistencia y Calificaciones',
      '☁️ Backups automáticos en la nube',
      '🚫 Sin escaneo OCR'
    ]
  },
  pro: {
    name: 'Plan Profesional',
    max_escuelas: 6,
    max_cursos: 10,
    max_cursos_ocr: 5,
    features: [
      '⭐ EL MÁS ELEGIDO POR DOCENTES',
      '🏫 Hasta 6 Escuelas y 10 Cursos',
      '📸 OCR con IA en hasta 5 cursos',
      '📊 Calificaciones e Intensificación',
      '📖 Libro de Temas y Contactos',
      '📄 Planillas Oficiales en PDF',
      '☁️ Backups automáticos en la nube'
    ]
  },
  premium: {
    name: 'Plan Premium',
    max_escuelas: null,
    max_cursos: null,
    max_cursos_ocr: null,
    features: [
      '💎 TODO ILIMITADO - NIVEL ELITE',
      '🏫 Escuelas y Cursos sin límite',
      '📸 OCR con IA sin límite de cursos',
      '☁️ Backups automáticos en la nube',
      '🛡️ Soporte prioritario'
    ]
  }
};

SUBSCRIPTION_PLANS.gratuito = SUBSCRIPTION_PLANS.free;
SUBSCRIPTION_PLANS.expert = SUBSCRIPTION_PLANS.premium;

export const CICLOS = {
  mensual: { label: 'Mensual', sufijo: '/ mes' },
  ciclo_lectivo: { label: 'Ciclo lectivo', sufijo: '/ ciclo lectivo' }
};

export const getPlanPrecio = (planes, plan, ciclo) =>
  (planes || []).find(p => p.id === `${plan}_${ciclo}` || (p.plan === plan && p.ciclo === ciclo)) || null;

export const formatPrecio = (monto) =>
  monto === null || monto === undefined || monto === '' || Number.isNaN(Number(monto))
    ? '—'
    : `$${Number(monto).toLocaleString('es-AR')}`;

export const formatFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

export const isUserAdmin = (value) => {
  if (!value) return false;
  if (typeof value === 'string') return false;

  return Boolean(
    value.is_admin === true ||
    value.es_admin === true ||
    value.rol === 'admin' ||
    value.role === 'admin' ||
    value.rol === 'dueña' ||
    value.role === 'dueña'
  );
};

/**
 * Evalúa el estado de suscripción del docente
 */
export const getSubscriptionStatus = (docente, now = new Date()) => {
  if (!docente) return { isExpired: false, isReadOnly: false, daysLeft: null, label: 'Docente' };

  // 1. Dueña / Administradora (Acceso vitalicio absoluto)
  if (isUserAdmin(docente)) {
    return {
      isAdmin: true,
      isExpired: false,
      isReadOnly: false,
      label: 'FUNDADORA 👑',
      daysLeft: 9999
    };
  }

  const plan = String(docente.plan || docente.subscription_plan || '').toLowerCase();
  const paidPlan = PAID_PLAN_KEYS.includes(plan) ? plan : null;
  const isVipBeta = docente.is_vip_beta === true;

  if (docente.trial_ends_at && (paidPlan || isVipBeta)) {
    const expiresAt = new Date(docente.trial_ends_at);
    const expiresAtMs = expiresAt.getTime();
    const nowMs = now.getTime();

    if (!Number.isFinite(expiresAtMs)) {
      return {
        isExpired: true,
        isReadOnly: true,
        daysLeft: null,
        label: 'VENCIMIENTO NO DISPONIBLE',
        message: 'No pudimos verificar la fecha de vencimiento de tu suscripción.'
      };
    }

    if (expiresAtMs <= nowMs) {
      const graceExpired = nowMs - expiresAtMs >= GRACE_PERIOD_MS;
      return {
        isExpired: true,
        isReadOnly: !graceExpired,
        isFreeAfterGrace: graceExpired,
        daysLeft: 0,
        label: graceExpired ? 'PLAN GRATUITO' : 'VENCIDO · SOLO LECTURA 🔒',
        message: graceExpired
          ? 'Finalizó el período de solo lectura. Tu cuenta continúa con el plan gratuito y tus datos se conservan.'
          : 'Tu suscripción venció. Tus datos están resguardados y la cuenta permanece en solo lectura durante 30 días.'
      };
    }

    const daysLeft = Math.ceil((expiresAtMs - nowMs) / (1000 * 60 * 60 * 24));
    return {
      isPaid: !isVipBeta,
      isVipBeta,
      isExpired: false,
      isReadOnly: false,
      daysLeft,
      label: isVipBeta ? `PASE VIP (${daysLeft}d)` : `${paidPlan.toUpperCase()} (${daysLeft}d)`
    };
  }

  if (isVipBeta) {
    return {
      isVipBeta: true,
      isExpired: false,
      isReadOnly: false,
      label: 'PASE VIP'
    };
  }

  if (paidPlan) {
    return {
      isPaid: true,
      isExpired: false,
      isReadOnly: false,
      label: paidPlan.toUpperCase()
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
 * Plan efectivo para límites. Se decide por plan / subscription_plan
 * (el backend pone is_premium=true también en PRO). VIP beta cuenta como Premium.
 */
export const getPlanKey = (docente) => {
  if (!docente) return 'gratuito';
  if (isUserAdmin(docente)) return 'premium';
  const status = getSubscriptionStatus(docente);
  if (status.isFreeAfterGrace) return 'gratuito';
  if (status.isVipBeta) return 'premium';
  const plan = String(docente.plan || docente.subscription_plan || '').toLowerCase();
  if (plan === 'premium' || plan === 'expert') return 'premium';
  if (plan === 'pro') return 'pro';
  if (plan === 'basico' || plan === 'básico' || plan === 'basic') return 'basico';
  if (plan === 'free' || plan === 'gratuito') return 'gratuito';
  return 'gratuito';
};

export function getPlanLimits(plan, subscriptionPlan, isVipBeta) {
  if (isVipBeta) return PLAN_LIMITS.premium;
  const p = (plan || subscriptionPlan || 'gratuito').toLowerCase();
  if (p === 'free') return PLAN_LIMITS.gratuito;
  if (p === 'básico' || p === 'basic') return PLAN_LIMITS.basico;
  return PLAN_LIMITS[p] || PLAN_LIMITS.gratuito;
}

export function canCreateEscuela(limits, currentEscuelas) {
  if (limits.escuelas === null) return true;
  return currentEscuelas < limits.escuelas;
}

export function canCreateCurso(limits, currentCursos) {
  if (limits.cursos === null) return true;
  return currentCursos < limits.cursos;
}

export function canUseOcrInCurso(limits, cursosConOcrUsados, cursoId) {
  if (!limits.ocr) return false;
  if (limits.ocrCursos === null) return true;
  if (cursosConOcrUsados.has(cursoId)) return true;
  return cursosConOcrUsados.size < limits.ocrCursos;
}

/**
 * Controla si el docente puede seguir creando escuelas o cursos
 */
export const checkPlanLimit = (docente, currentCount, type = 'cursos') => {
  if (isUserAdmin(docente)) {
    return { limited: false };
  }
  const status = getSubscriptionStatus(docente);

  if (status.isReadOnly) {
    return {
      limited: true,
      isReadOnly: true,
      message: 'Tu suscripción venció y la cuenta está en modo solo lectura durante 30 días. Renovala para recuperar el acceso de escritura.'
    };
  }

  const planKey = getPlanKey(docente);
  const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.gratuito || SUBSCRIPTION_PLANS.free;
  const limit = type === 'escuelas' ? plan.max_escuelas : plan.max_cursos;

  if (limit !== null && currentCount >= limit) {
    return {
      limited: true,
      message: `El ${plan.name} permite hasta ${limit} ${limit === 1 ? type.replace(/s$/, '') : type}. Mejorá tu plan para seguir creciendo.`
    };
  }

  return { limited: false };
};

/** Error de Supabase por límite de plan (trigger con code 42501). */
export const isPlanLimitError = (error) => error?.code === '42501';
