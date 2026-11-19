import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, ArrowRight, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Login.css';

export default function Login() {
  const [level, setLevel] = useState('secundaria');
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) console.error('Error al iniciar sesión:', error.message);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="login-container">
      {/* Fondo dinámico estilo Aceternity / Cyber Glow */}
      <div className="login-background" aria-hidden="true">
        <div className="aceternity-grid-pattern"></div>
        <div className="blobs blob-1"></div>
        <div className="blobs blob-2"></div>
        <div className="blobs blob-3"></div>
      </div>

      <main className="login-page-content">
        {/* Botón Volver flotante y discreto */}
        <motion.div 
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="login-top-nav"
        >
          <Link to="/inicio" className="login-back-link">
            <ArrowLeft size={16} />
            <span>Volver a la landing</span>
          </Link>
        </motion.div>

        {/* HERO PRINCIPAL: Logo 3D + Nombre Gigante */}
        <header className="login-brand-header">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="logo-badge-wrapper"
          >
            <div className="logo-glow-halo"></div>
            <img src="/logo_agenda_3d_final.png" alt="Logo Agenda Docente" className="login-logo floating-3d-logo" />
            <span className="badge-pro-pill">
              <Sparkles size={12} className="sparkle-icon" /> EDICIÓN 2026
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            ¡Bienvenidos a<br />
            <span className="text-shimmer">AGENDA DOCENTE PRO!</span>
          </motion.h1>

          <motion.p
            className="login-brand-subtitle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Tu espacio inteligente para organizar, calificar y disfrutar el aula cada día.
          </motion.p>
        </header>

        {/* SECTOR DE ACCESO MINIMALISTA (Opción A) */}
        <motion.section 
          className="login-minimal-box"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Selector de Nivel tipo Toggle Pills */}
          <div className="level-pill-switch">
            <button
              type="button"
              className={`pill-btn ${level === 'secundaria' ? 'active' : ''}`}
              onClick={() => setLevel('secundaria')}
            >
              <GraduationCap size={16} />
              <span>Secundaria / Adultos</span>
              <span className="pill-dot"></span>
            </button>

            <button
              type="button"
              className="pill-btn disabled"
              disabled
              title="Próximamente disponible"
            >
              <BookOpen size={16} />
              <span>Primaria</span>
              <span className="pill-tag-soon">Pronto</span>
            </button>
          </div>

          {/* Botón de Google Principal Destacado */}
          <motion.button 
            className="btn-google-hero"
            onClick={handleGoogleLogin}
            whileHover={{ scale: 1.025, boxShadow: "0 14px 38px rgba(139, 92, 246, 0.45)" }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoadingGoogle}
          >
            <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="btn-google-text">
              {isLoadingGoogle ? 'Iniciando sesión...' : 'Ingresar con Google'}
            </span>
            <div className="btn-google-arrow-box">
              <ArrowRight size={17} />
            </div>
          </motion.button>

          {/* Sello de Seguridad */}
          <div className="login-security-tag">
            <ShieldCheck size={14} />
            <span>Acceso seguro • Diseñado especialmente para docentes de Argentina</span>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
