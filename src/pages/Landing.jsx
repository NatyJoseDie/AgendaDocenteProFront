import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Landing.css';
import FeatureSection from '../components/FeatureSection';

const FaqItem = ({ q, a }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`faq-block ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
      <div className="faq-q-header">
        <strong>{q}</strong>
        <span className="faq-arrow">⌄</span>
      </div>
      {isOpen && (
        <div className="faq-a-content animate-fade-in">
          <p>{a}</p>
        </div>
      )}
    </div>
  );
};

export default function Landing() {
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const fullTitle = "Crea tu Agenda Docente Digital en simples pasos.";
  const pivotPoint = "Crea tu Agenda Docente ".length;

  React.useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedTitle(fullTitle.slice(0, index));
      index++;
      if (index > fullTitle.length) {
        clearInterval(interval);
        setIsFinished(true);
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const faqData = [
    {
      q: "¿Lleva mucho tiempo el registro?",
      a: "¡Para nada! En menos de 2 minutos creás tu cuenta con tu email. El sistema te guía paso a paso para que cargues tu primer escuela al instante."
    },
    {
      q: "¿Cómo funciona el sistema de recordatorios en fechas importantes?",
      a: "La App cuenta con un calendario de efemérides y fechas especiales integrado. Recibirás avisos preventivos sobre actos, jornadas y cierres de planillas para que nunca se te pase una fecha crítica."
    },
    {
      q: "¿La planilla de calificaciones tiene valoraciones TEA, TEP y TED separadas por bimestre?",
      a: "Exacto. El sistema está configurado según la normativa vigente: podés cargar valoraciones TEA, TEP y TED de forma independiente para cada bimestre, y la Agenda calcula automáticamente el estado final de la trayectoria."
    },
    {
      q: "¿En la planilla de intensificación qué pasa si el alumno aprueba?",
      a: "Al marcar al alumno como aprobado en el período de intensificación, el sistema genera el acta de acreditación automática y actualiza su historial pedagógico, reflejando su nuevo estado académico de forma inmediata."
    },
    {
      q: "¿Cómo es el período de prueba que ofrecen (Estrategia 30-30)?",
      a: "Ofrecemos 30 días de REGALO con ACCESO TOTAL. Podés gestionar hasta 5 escuelas y 5 cursos con todas las funciones Pro habilitadas por un ciclo lectivo inicial. Al finalizar los 30 días, podés decidir tu plan o mantenerte en el gratuito."
    },
    {
      q: "¿Realmente funciona el dictado por voz para pasar lista?",
      a: "¡Es nuestra función estrella! Simplemente abrís el micrófono, dictás el apellido y el estado (ej: 'Sosa Presente') y el sistema lo marca solo. Ahorrás hasta 10 minutos por clase."
    },
    {
      q: "¿Puedo administrar mi agenda docente desde el celular?",
      a: "Totalmente. La Agenda es Mobile-First. Podés entrar desde cualquier celular o tablet y 'añadirla a la pantalla de inicio' para que funcione como una App nativa."
    },
    {
      q: "¿Las planillas PDF que genera sirven para entregar en secretaría?",
      a: "Sí. Están diseñadas siguiendo los formatos oficiales de las escuelas argentinas. Emitís listas de asistencia, planillas de notas y seguimientos pedagógicos listos para imprimir o enviar."
    },
    {
      q: "¿El precio es en pesos argentinos? ¿Cómo puedo abonar?",
      a: "Sí, todos nuestros precios son finales en Pesos Argentinos (ARS). Podés abonar de forma segura por Mercado Pago con cualquier tarjeta o saldo en cuenta."
    },
    {
      q: "¿Necesito saber de diseño o programación para usar la Agenda?",
      a: "¡Para nada! Si sabés usar WhatsApp o Facebook, sabés usar nuestra Agenda. Es súper intuitiva y está pensada para el aula real."
    }
  ];

  const [contactData, setContactData] = useState({ nombre: '', email: '', mensaje: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase
      .from('contact_messages')
      .insert([contactData]);
    
    setSending(false);
    if (!error) {
      setSent(true);
      setContactData({ nombre: '', email: '', mensaje: '' });
      setTimeout(() => setSent(false), 5000);
    } else {
      alert("Error al enviar: " + error.message);
    }
  };

  return (
    <div className="landing-wrapper">
      {/* HEADER - COLORES AGENDA */}
      <nav className="navbar-pro">
        <div className="container-wide">
          <div className="nav-logo">
             <div className="img-logo-brand" style={{ display: 'flex', alignItems: 'center' }}>
               <img 
                 src="/logo_agenda_3d_final.png" 
                 alt="Logo Agenda Docente 3D" 
                 style={{ 
                   height: '52px', /* Mucho más grande y visible que el anterior */
                   width: 'auto',
                   filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))', /* Sombra para darle volumen en la Nav */
                   transition: 'transform 0.3s ease'
                 }} 
                 onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                 onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
               />
             </div>
             <div className="logo-text">
               <h1>Agenda Docente</h1>
               <span className="subtitle-app">Tu espacio inteligente</span>
             </div>
          </div>
          <div className="nav-links">
             <Link to="/login" className="link-secondary">Ingresar</Link>
             <Link to="/login" className="btn-nav-primary">Crear mi cuenta</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - COLORES AGENDA */}
      <header className="hero-pro">
        <div className="container-hero">
          <div className="hero-info animate-slide-in">
             <span className="badge-promo">✨ DISEÑADA PARA EL AULA REAL</span>
             <h2 className="hero-title chalk-writing">
               {displayedTitle.slice(0, pivotPoint)}
               <span className="hero-accent">
                 {displayedTitle.slice(pivotPoint)}
               </span>
               {!isFinished && <span className="chalk-cursor">|</span>}
             </h2>
             <p className="hero-desc">
               La herramienta definitiva para el docente moderno. Gestioná asistencias, 
               notas y proyectos en un solo lugar. <strong>Simple, rápida y profesional.</strong>
             </p>
             <div className="hero-actions">
                <Link to="/login" className="btn-hero-main">Empezar a usar ahora</Link>
                <div className="trust-badges">
                   <div className="trust-item">
                      <span className="trust-icon">⭐</span>
                      <p><strong>4.9/5</strong> de valoración</p>
                   </div>
                   <div className="trust-divider"></div>
                   <div className="trust-item">
                      <span className="trust-icon">🛡️</span>
                      <p>Datos <strong>100% Seguros</strong></p>
                   </div>
                </div>
             </div>
          </div>
          <div className="hero-image-wrapper">
             <div className="hero-bg-blob"></div>
             <img src="/teacher_hero.png" alt="Agenda Docente Pro" className="img-floating" />
          </div>
        </div>
      </header>

      {/* STATS BAR (COLORES AGENDA) */}
      <section className="stats-bar">
         <div className="container-main">
            <div className="stats-grid">
               <div className="stat-item"><strong>5.000+</strong> <p>Docentes activos</p></div>
               <div className="stat-item"><strong>1.200</strong> <p>Escuelas</p></div>
               <div className="stat-item"><strong>250k</strong> <p>PDFs Generados</p></div>
               <div className="stat-item"><strong>🇦🇷</strong> <p>Orgullo Nacional</p></div>
            </div>
         </div>
      </section>
      
      {/* SECCIÓN: ¿DE QUÉ SE TRATA? (ESTILO EMPRETIENDA) */}
      <section className="features-about">
        <div className="container-main">
          <span className="section-label">CARACTERÍSTICAS</span>
          <h2 className="section-title-alt">¿De qué se trata?</h2>
          <p className="section-desc-alt">
             Agenda Docente es la plataforma que te permite gestionar tu labor diaria de manera simple y completa. 
             Al crear tu cuenta automáticamente tenés acceso a:
          </p>

          <div className="features-grid-alt">
            <div className="feat-item-alt">
              <div className="feat-icon-animated">
                <img src="https://raw.githubusercontent.com/vijayverma86/3dicons/master/png/color/home-dynamic-color.png" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="feat-text-alt">
                <h4>Tu panel administrador</h4>
                <p>Donde vas a llevar el control total de tus escuelas, cursos y horarios semanales.</p>
              </div>
            </div>

            <div className="feat-item-alt">
              <div className="feat-icon-animated">
                <img src="https://raw.githubusercontent.com/vijayverma86/3dicons/master/png/color/mic-dynamic-color.png" alt="Voz" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="feat-text-alt">
                <h4>Asistencia por Voz</h4>
                <p>Pasar lista nunca fue tan fácil. Dictale los nombres a la app y cargá el presente al instante.</p>
              </div>
            </div>

            <div className="feat-item-alt">
              <div className="feat-icon-animated">
                <img src="https://raw.githubusercontent.com/vijayverma86/3dicons/master/png/color/chart-dynamic-color.png" alt="Notas" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="feat-text-alt">
                <h4>Notas y Trayectorias</h4>
                <p>Cálculo automático de TEA/TED. Visualizá el progreso pedagógico sin usar la calculadora.</p>
              </div>
            </div>

            <div className="feat-item-alt">
              <div className="feat-icon-animated">
                <img src="https://raw.githubusercontent.com/vijayverma86/3dicons/master/png/color/file-text-dynamic-color.png" alt="PDF" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="feat-text-alt">
                <h4>Generador de PDFs</h4>
                <p>Exportá planillas de asistencia, notas y planes de clase listos para entregar en secretaría.</p>
              </div>
            </div>

            <div className="feat-item-alt">
              <div className="feat-icon-animated">
                <img src="https://raw.githubusercontent.com/vijayverma86/3dicons/master/png/color/mobile-dynamic-color.png" alt="Celular" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="feat-text-alt">
                <h4>App en tu Celular</h4>
                <p><span className="badge-featured">¡Destacado!</span> Podés instalar la Agenda en tu pantalla de inicio y usarla como una app nativa.</p>
              </div>
            </div>

            <div className="feat-item-alt">
              <div className="feat-icon-animated">
                <img src="https://raw.githubusercontent.com/vijayverma86/3dicons/master/png/color/chat-bubble-dynamic-color.png" alt="Contactos" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="feat-text-alt">
                <h4>Agenda de Contactos</h4>
                <p>Vinculación directa con WhatsApp para comunicarte con familias y colegas en un clic.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCION FEATURES DINAMICAS (ESTILO APPLE) */}
      <section className="product-showcase-elite">
        <FeatureSection 
          title="Tu centro de control diario"
          description="Olvidate de las anotaciones en papel. Tené a mano tu horario semanal, tus cursos y tus tareas pendientes del día en una sola pantalla clara y amigable."
          bullets={["Vistas por Escuela y Curso", "Acceso rápido a Planificaciones", "Alertas de Exámenes"]}
          media="/landing/dashboard.png"
        />

        <FeatureSection 
          title="Calificaciones TEA/TED automáticas"
          description="Un sistema de notas que entiende el aula argentina. Cargá tus bimestres y dejá que la Agenda calcule las trayectorias finales sin esfuerzo."
          bullets={["Colores dinámicos por desempeño", "Reportes Bimestrales automáticos", "Exportación a PDF en segundos"]}
          media="/landing/calificaciones.png"
          reverse={true}
        />

        <FeatureSection 
          title="Pasar lista nunca fue tan rápido"
          description="¿Lista por voz? ¡Claro! O simplemente tocá y marcá. La app registra ausencias y presentes de forma instantánea para cada alumno."
          bullets={["Reconocimiento por Voz", "Historial completo por alumno", "Reporte mensual de asistencias"]}
          media="/landing/asistencia.png"
        />

        <FeatureSection 
          title="Tus documentos, siempre con vos"
          description="Subí tus planificaciones en PDF. Compartilas por WhatsApp o Email directamente desde la app sin perder tiempo en el aula."
          bullets={["Almacenamiento Seguro", "Compartir por WhatsApp directo", "Gestión de Licencias y Trámites"]}
          media="/landing/planificaciones.png"
          reverse={true}
        />
      </section>

      {/* SECCIÓN VIDEO EXPLICATIVO */}
      <section className="video-pro">
         <div className="container-small">
             <div className="video-card bg-agenda-gradient">
                <div className="video-info">
                   <h3>¿Querés ver más?</h3>
                   <p>Mirá cómo Natalia digitalizó sus cursos en menos de 5 minutos.</p>
                </div>
                <div className="video-btn-area">
                   <div className="play-circle">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M8 5v14l11-7z"/></svg>
                   </div>
                </div>
             </div>
         </div>
      </section>

      {/* SECCIÓN DE PRECIOS - VIDRIERA ELITE DE 3 PLANES */}
      <section className="pricing-section-elite">
        <div className="container-main">
          <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="section-label">MEMBRESÍAS 2026</span>
            <h2 className="section-title-alt">Elegí tu camino digital</h2>
            <p className="section-desc-alt">Un solo pago anual, organización para todo el ciclo lectivo.</p>
          </header>

          <style>
            {`
              @keyframes pulse-led-landing {
                0% { box-shadow: 0 0 5px var(--primary); }
                50% { box-shadow: 0 0 20px var(--primary), 0 0 35px var(--secondary); }
                100% { box-shadow: 0 0 5px var(--primary); }
              }
              @keyframes badge-pulse-landing {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); filter: brightness(1.2); }
                100% { transform: scale(1); }
              }
            `}
          </style>

          <div className="pricing-grid-elite">
            {/* PLAN FREE - EL GANCHO LED */}
            <div className="pricing-card-elite free-led">
              <span className="offer-badge-led">🎁 REGALO: 30 DÍAS FULL</span>
              <div className="card-header-elite">
                <h3>Plan Gratuito</h3>
                <div className="price-tag-elite">$0 <span>/ siempre</span></div>
              </div>
              <ul className="feats-list-elite">
                <li><span>⚡</span> Todas las funciones DESBLOQUEADAS</li>
                <li><span>🎁</span> 5 Escuelas/Cursos (30 días de REGALO)</li>
                <li><span>🏠</span> Luego máximo de 2 Escuelas</li>
                <li><span>📈</span> Seguimiento Pedagógico Completo</li>
              </ul>
              <Link to="/login" className="btn-card-elite secondary">Probar ahora gratis</Link>
            </div>

            {/* PLAN PRO - EL RECOMENDADO */}
            <div className="pricing-card-elite featured-pro">
              <span className="featured-badge-elite">⭐ EL MÁS ELEGIDO</span>
              <div className="card-header-elite">
                <h3>Plan Profesional</h3>
                <div className="price-tag-elite">$10.000 <span>/ año</span></div>
              </div>
              <ul className="feats-list-elite">
                <li><span>🚀</span> Hasta 10 Escuelas / Cursos</li>
                <li><span>📊</span> Calificaciones e Intensificación</li>
                <li><span>📞</span> Libro de Temas y Contactos</li>
                <li><span>💬</span> Soporte por WhatsApp</li>
              </ul>
              <Link to="/login" className="btn-card-elite primary">Mejorar a PRO</Link>
            </div>

            {/* PLAN PREMIUM - ELITE */}
            <div className="pricing-card-elite premium-elite">
              <div className="card-header-elite">
                <h3>Plan Premium</h3>
                <div className="price-tag-elite">$15.000 <span>/ año</span></div>
              </div>
              <ul className="feats-list-elite">
                <li><span>👑</span> TODO ILIMITADO - NIVEL ELITE</li>
                <li><span>♾️</span> Sin límite de Escuelas o Cursos</li>
                <li><span>☁️</span> Backups automáticos en la nube</li>
                <li><span>🛡️</span> Soporte Prioritario VIP 24/7</li>
              </ul>
              <Link to="/login" className="btn-card-elite secondary-outline">Ser Premium</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ ESTILO EMPRETIENDA (ACORDEÓN) */}
      <section className="faq-pro">
         <div className="container-main">
            <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <span className="section-label">SOPORTE</span>
              <h2 className="section-title-alt" style={{ color: 'var(--background)' }}>Preguntas frecuentes</h2>
            </header>
            
            <div className="faq-accordion-grid">
               {faqData.map((item, idx) => (
                 <FaqItem key={idx} {...item} />
               ))}
            </div>
         </div>
      </section>

      {/* SECCIÓN DE CONTACTO CON CARD CAPSULA */}
      <section className="contact-pro">
        <div className="container-main">
          <div className="contact-card-elite">
            <div className="contact-grid-elite">
              {/* IZQUIERDA: MENSAJE */}
              <div className="contact-info-panel">
                 <span className="label-hola">HOLA</span>
                 <h2 className="contact-heading">¿Tenés alguna consulta para hacernos?</h2>
              </div>

              {/* DERECHA: FORMULARIO */}
              <div className="contact-form-panel">
                 {sent ? (
                    <div className="sent-success animate-fade-in" style={{ background: 'white', padding: '2rem', borderRadius: '15px', textAlign: 'center' }}>
                       <span style={{ fontSize: '3rem' }}>✅</span>
                       <h3 style={{ color: 'var(--primary)', marginTop: '1rem' }}>¡Mensaje enviado con éxito!</h3>
                       <p>Natalia se pondrá en contacto pronto.</p>
                    </div>
                 ) : (
                    <form className="form-elite" onSubmit={handleContactSubmit}>
                       <div className="form-group-elite">
                          <input 
                            type="text" 
                            placeholder="Tu nombre" 
                            required 
                            value={contactData.nombre}
                            onChange={(e) => setContactData({...contactData, nombre: e.target.value})}
                          />
                       </div>
                       <div className="form-group-elite">
                          <input 
                            type="email" 
                            placeholder="Tu email" 
                            required 
                            value={contactData.email}
                            onChange={(e) => setContactData({...contactData, email: e.target.value})}
                          />
                       </div>
                       <div className="form-group-elite">
                          <textarea 
                            placeholder="Tu mensaje" 
                            rows="5" 
                            required
                            value={contactData.mensaje}
                            onChange={(e) => setContactData({...contactData, mensaje: e.target.value})}
                          ></textarea>
                       </div>
                       <button type="submit" className="btn-send-elite" disabled={sending}>
                          {sending ? 'Enviando...' : 'Enviar mensaje'}
                       </button>
                    </form>
                 )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER ELITE */}
      <footer className="footer-pro">
         <div className="container-main">
            <div className="footer-grid">
               {/* LOGO & INFO */}
                <div className="footer-col brand-col">
                   <div className="f-logo" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <img 
                        src="/logo_agenda_3d_final.png" 
                        alt="Logo" 
                        style={{ 
                          height: '65px', 
                          width: '65px', 
                          objectFit: 'contain',
                          borderRadius: '50%',
                          clipPath: 'circle(42%)', /* Recorte más agresivo para asegurar limpieza */
                          filter: 'brightness(1.1) contrast(1.1)' 
                        }} 
                      />
                      Agenda Docente
                   </div>
                  <p className="f-description">
                    Simplificando la gestión pedagógica de miles de docentes argentinos. 
                    Organización, dictado por voz y reportes en segundos.
                  </p>
               </div>

               {/* LINKS RÁPIDOS */}
               <div className="footer-col">
                  <h4>Navegación</h4>
                  <ul className="f-links">
                     <li><a href="#hero">Inicio</a></li>
                     <li><a href="#pricing">Planes</a></li>
                     <li><a href="#faq">Preguntas</a></li>
                  </ul>
               </div>

               {/* SOPORTE */}
               <div className="footer-col">
                  <h4>Ayuda</h4>
                  <ul className="f-links">
                     <li><a href="#contact">Contacto</a></li>
                     <li><a href="#">Manual de Usuario</a></li>
                     <li><a href="#">Términos y condiciones</a></li>
                  </ul>
               </div>

               {/* REDES */}
               <div className="footer-col social-col">
                  <h4>Seguinos</h4>
                  <div className="f-social-row">
                     <a href="#" className="f-social-icon-link" title="Facebook">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                     </a>
                     <a href="#" className="f-social-icon-link" title="Instagram">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.51"/></svg>
                     </a>
                     <a href="#" className="f-social-icon-link" title="YouTube">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                     </a>
                  </div>
               </div>
            </div>

            <div className="footer-bottom-bar">
               <p>
                  © 2026 Agenda Docente PRO. Hecho con 
                  <span className="heart-brand">
                     <svg width="22" height="22" viewBox="0 0 24 24" fill="url(#heart-grad)">
                        <defs>
                           <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--primary)" />
                              <stop offset="100%" stopColor="var(--secondary)" />
                           </linearGradient>
                        </defs>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                     </svg>
                  </span>
                  para los docentes de todo el país.
               </p>
            </div>
         </div>
      </footer>
    </div>
  );
}
