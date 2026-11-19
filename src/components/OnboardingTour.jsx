import React, { useState, useEffect } from 'react';
import './OnboardingTour.css';

export default function OnboardingTour({
  steps: customSteps,
  storageKey = 'onboarding_completed',
  welcomeTitle = '¡Te damos la bienvenida! 👋',
  welcomeText = 'Te acompañamos con una guía premium para que empieces a usar la app sin perder tiempo.',
  welcomeIcon = '🚀',
  forceStart,
  onTourEnd
}) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1); // -1 is Welcome Modal
  const [coords, setCoords] = useState(null);

  const defaultSteps = [
    {
      target: '#tour-profile',
      title: 'Bienvenida',
      icon: '👋',
      content: 'Tu agenda docente ya está lista para acompañarte en clase, en la gestión escolar y en el día a día.',
      points: ['Acceso rápido a tu cuenta', 'Vista general del plan y cronograma', 'Todo pensado para usar desde móvil o PC']
    },
    {
      target: '#tour-escuelas',
      title: 'Crear escuela',
      icon: '🏫',
      content: 'Comenzá cargando tu escuela con nombre, número, dirección y datos básicos para organizar todo en un solo lugar.',
      points: ['Alta de escuela rápida', 'Agrupación por institución', 'Acceso con una sola vista']
    },
    {
      target: '#tour-curso',
      title: 'Crear curso',
      icon: '📚',
      content: 'Armá cada curso con grado, división, turno, materia y horarios para tener la base del año listo.',
      points: ['Curso por materia', 'Horarios visibles', 'Organización del ciclo lectivo']
    },
    {
      target: '#tour-alumnos',
      title: 'Agregar alumnos',
      icon: '👥',
      content: 'Registrá a tus estudiantes y usá OCR para cargar nombres desde una foto de planilla en segundos.',
      points: ['Carga manual o por imagen', 'Datos familiares y contacto', 'PPI / condiciones especiales']
    },
    {
      target: '#tour-asistencia',
      title: 'Usar asistencia',
      icon: '✅',
      content: 'Marcá presentes, ausentes y justificaciones de forma rápida para que la administración diaria sea mucho más ágil.',
      points: ['Modo visual y rápido', 'Indicadores de inasistencias', 'Guardado seguro de la jornada']
    },
    {
      target: '#tour-planes',
      title: 'Ver plan y suscripción',
      icon: '💳',
      content: 'Revisá tu plan, renovaciones y acceso premium para mantener tus escuelas, cursos y funciones activas.',
      points: ['Estado de suscripción', 'Avisos de prueba y límites', 'Actualización del plan']
    },
    {
      target: '#tour-calendario',
      title: 'Calendario, fechas y recordatorios',
      icon: '📅',
      content: 'Agendá exámenes, fechas importantes, efemérides y actividades para no perder ningún evento clave.',
      points: ['Eventos académicos', 'Recordatorios visibles', 'Organización escolar']
    },
    {
      target: '#tour-planificaciones',
      title: 'Planificaciones, licencias y contactos',
      icon: '🗂️',
      content: 'Subí documentos, gestioná licencias y mantené a mano los contactos de familias y referentes.',
      points: ['Documentos PDF', 'Licencias y trámites', 'Contactos y comunicación']
    }
  ];

  const steps = customSteps && customSteps.length > 0 ? customSteps : defaultSteps;

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed || forceStart) {
      setActive(true);
      setStepIndex(-1); // Start with Welcome Modal
    }
  }, [forceStart, storageKey]);

  // Track target coordinates
  useEffect(() => {
    if (!active || stepIndex < 0 || stepIndex >= steps.length) {
      setCoords(null);
      return;
    }

    const currentStep = steps[stepIndex];
    const updateCoords = () => {
      const el = document.querySelector(currentStep.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setCoords(null);
      }
    };

    // Delay slightly to allow layout calculations
    const timer = setTimeout(updateCoords, 250);

    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
    };
  }, [stepIndex, active]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else if (stepIndex === 0) {
      setStepIndex(-1); // Back to Welcome
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    localStorage.setItem(storageKey, 'true');
    setActive(false);
    setStepIndex(-1);
    if (onTourEnd) onTourEnd();
  };

  if (!active) return null;

  const currentStep = stepIndex >= 0 ? steps[stepIndex] : null;

  // Calculate tooltip styles based on coordinates and screen size
  const getTooltipStyle = () => {
    if (!coords) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' };

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: '95px',
        left: '12px',
        right: '12px',
        width: 'calc(100% - 24px)',
        zIndex: 10001
      };
    }

    const tooltipWidth = 320;
    const horizontalCenter = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 24, coords.left + (coords.width - tooltipWidth) / 2));

    const isTopHalf = coords.top < window.innerHeight / 2;
    if (isTopHalf) {
      return {
        position: 'fixed',
        top: `${coords.top + coords.height + 16}px`,
        left: `${horizontalCenter}px`,
        width: `${tooltipWidth}px`,
        zIndex: 10001
      };
    } else {
      return {
        position: 'fixed',
        bottom: `${window.innerHeight - coords.top + 16}px`,
        left: `${horizontalCenter}px`,
        width: `${tooltipWidth}px`,
        zIndex: 10001
      };
    }
  };

  return (
    <div className="tour-wrapper">
      {/* Dimmed backdrop */}
      <div className="tour-backdrop" onClick={handleSkip} />

      {/* Spotlight highlight */}
      {coords && (
        <div 
          className="tour-spotlight"
          style={{
            top: `${coords.top - 6}px`,
            left: `${coords.left - 6}px`,
            width: `${coords.width + 12}px`,
            height: `${coords.height + 12}px`
          }}
        />
      )}

      {/* Welcome Dialog */}
      {stepIndex === -1 && (
        <div className="tour-welcome-card glass-card animate-scale-in">
          <div className="tour-welcome-icon">{welcomeIcon}</div>
          <h2>{welcomeTitle}</h2>
          <p>{welcomeText}</p>
          <div className="tour-welcome-actions">
            <button className="tour-btn-skip" onClick={handleSkip}>Ahora no</button>
            <button className="tour-btn-start" onClick={() => setStepIndex(0)}>Empezar</button>
          </div>
        </div>
      )}

      {/* Interactive Tooltip Card */}
      {currentStep && (
        <div className="tour-tooltip-card glass-card" style={getTooltipStyle()}>
          <button className="tour-btn-close" onClick={handleSkip}>&times;</button>

          <div className="tour-tooltip-header">
            <span className="tour-tooltip-badge">Paso {stepIndex + 1} de {steps.length}</span>
          </div>

          <div className="tour-feature-icon">{currentStep.icon || '✨'}</div>
          <h3 className="tour-tooltip-title">{currentStep.title}</h3>
          <p className="tour-tooltip-content">{currentStep.content}</p>

          {currentStep.points && (
            <ul className="tour-feature-list">
              {currentStep.points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          )}

          <div className="tour-tooltip-footer">
            <button className="tour-btn-back" onClick={handlePrev}>
              Atrás
            </button>

            <div className="tour-dot-indicators">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`tour-dot ${i === stepIndex ? 'active' : ''}`}
                  onClick={() => setStepIndex(i)}
                />
              ))}
            </div>

            <button className="tour-btn-next" onClick={handleNext}>
              {stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
