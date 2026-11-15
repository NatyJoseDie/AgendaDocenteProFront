import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Login.css';

export default function Login() {
  const [selectedLevel, setSelectedLevel] = useState('');

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error('Error al iniciar sesión:', error.message);
  };

  return (
    <div className="login-container">
      <div className="login-background" aria-hidden="true">
        <div className="blobs blob-1"></div>
        <div className="blobs blob-2"></div>
      </div>

      <main className="login-page-content animate-slide-up">
        <Link to="/inicio" className="login-back-link">← Volver a la landing</Link>

        <header className="login-brand-header">
          <img src="/logo_agenda_3d_final.png" alt="Logo Agenda Docente" className="login-logo" />
          <h1>¡Bienvenidos a<br /><span>AGENDA DOCENTE PRO!</span></h1>
          <p>Tu espacio para organizar y disfrutar cada día en el aula.</p>
        </header>

        <section className="level-card" aria-labelledby="level-question">
          <p className="level-eyebrow">EMPECEMOS</p>
          <h2 id="level-question">¿En qué nivel te desempeñás?</h2>
          <p className="level-description">Elegí tu nivel para continuar.</p>

          <div className="level-options">
            <button type="button" className="level-option level-option-disabled" disabled>
              <span className="level-option-title">Primaria</span>
              <span className="level-coming-soon">Próximamente</span>
            </button>
            <button
              type="button"
              className={`level-option ${selectedLevel === 'secundaria' ? 'selected' : ''}`}
              onClick={() => setSelectedLevel('secundaria')}
            >
              <span className="level-option-title">Secundaria / Adultos</span>
              <span className="level-option-arrow" aria-hidden="true">→</span>
            </button>
          </div>

          {selectedLevel === 'secundaria' && (
            <div className="login-action">
              <button className="btn-google" onClick={handleGoogleLogin}>
                <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Ingresar con Google
              </button>
            </div>
          )}

          <p className="login-hint">Diseñado especialmente para docentes de Argentina.</p>
        </section>
      </main>
    </div>
  );
}
