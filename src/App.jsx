import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Attendance from './pages/Attendance';
import BottomNav from './components/BottomNav';
import Escuelas from './pages/Escuelas';
import EscuelaDashboard from './pages/EscuelaDashboard';
import CursoDashboard from './pages/CursoDashboard';
import HorarioSemanal from './pages/HorarioSemanal';
import LibroTemas from './pages/LibroTemas';
import Planificaciones from './pages/Planificaciones';
import Licencias from './pages/Licencias';
import Calendario from './pages/Calendario';
import Contactos from './pages/Contactos';
import Suscripcion from './pages/Suscripcion';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Detectar si la app está instalada y ejecutándose de forma nativa (PWA mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsPWA(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p className="animate-pulse">Cargando Agenda Docente...</p>
      </div>
    );
  }

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Routes>
          {/* RUTA RAÍZ: Siempre Landing, excepto si es PWA Standalone que va al Dashboard/Login */}
          <Route 
            path="/" 
            element={isPWA ? (session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />) : <Landing />} 
          />

          <Route 
            path="/login" 
            element={!session ? <Login /> : <Navigate to="/dashboard" />} 
          />

          <Route 
            path="/dashboard" 
            element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} 
          />

          {/* RUTAS PROTEGIDAS: Si no hay login, ahora van a /login (no a la landing) */}
          <Route 
            path="/asistencias" 
            element={session ? <Attendance session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/escuelas" 
            element={session ? <Escuelas session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/escuelas/:id" 
            element={session ? <EscuelaDashboard session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/cursos/:id" 
            element={session ? <CursoDashboard session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/asistencia/:id" 
            element={session ? <Attendance session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/horarios" 
            element={session ? <HorarioSemanal session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/libro-temas" 
            element={session ? <LibroTemas session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/planificaciones" 
            element={session ? <Planificaciones session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/licencias" 
            element={session ? <Licencias session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/calendario" 
            element={session ? <Calendario session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/contactos" 
            element={session ? <Contactos session={session} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/suscripcion" 
            element={session ? <Suscripcion session={session} /> : <Navigate to="/login" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {session && <BottomNav />}
      </div>
    </Router>
  );
}

export default App;
