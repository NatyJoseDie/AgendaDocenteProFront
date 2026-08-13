import React, { useState, useEffect } from 'react';
import './OnboardingTour.css';

export default function OnboardingTour({
  steps: customSteps,
  storageKey = 'onboarding_completed',
  welcomeTitle = '¡Te damos la bienvenida! 👋',
  welcomeText = '¿Te gustaría realizar un recorrido rápido e interactivo de 1 minuto para conocer tu nueva agenda?',
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
      title: 'Tu Perfil Docente 🎒',
      content: 'Aquí puedes ver de un vistazo tu foto de perfil, tu plan actual (FREE o PREMIUM) y los días restantes de prueba.',
      position: 'bottom'
    },
    {
      target: '#tour-horarios',
      title: 'Horario Semanal 📅',
      content: 'Accede rápidamente a tu cronograma semanal de clases. Ideal para saber qué curso te toca hoy y en qué aula.',
      position: 'bottom'
    },
    {
      target: '#tour-iniciar-clase',
      title: 'Iniciar Clase 🚀',
      content: 'Este es tu botón de acción rápida. Te llevará directo a registrar asistencias, notas o el libro de temas.',
      position: 'top'
    },
    {
      target: '#tour-modulos',
      title: 'Acceso a Módulos 🛠️',
      content: 'Administra tus Escuelas, Planificaciones, Calendario de eventos y Contactos de familias en un solo lugar.',
      position: 'top'
    },
    {
      target: '#tour-config',
      title: 'Configuración y Respaldos ⚙️',
      content: 'Exporta tus datos en JSON, restaura copias de seguridad de la nube o envíanos comentarios para seguir mejorando.',
      position: 'bottom'
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
        bottom: '0px',
        left: '0px',
        right: '0px',
        width: '100%',
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

          <h3 className="tour-tooltip-title">{currentStep.title}</h3>
          <p className="tour-tooltip-content">{currentStep.content}</p>

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
