import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Login from './components/Login';
import CreateTournament from './pages/CreateTournament';
import EditUser from './pages/EditUser';
import Teams from './pages/Teams';
import EditEquipo from './pages/EditEquipo';
import Jugadores from './pages/Jugadores';
import EditJugador from './pages/EditJugador';
import ListaTorneos from './pages/ListaTorneos';
import TorneoLiga from './pages/TorneoLiga';
import TorneoEli from './pages/TorneoEli';
import PartidoFutbol from './pages/partidoFutbol';
import PartidoLol from './pages/partidoLol';
import './App.css';


function HomePage() {

  return (
    <main>
      <Hero />
    </main>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/editar-usuario" element={<EditUser />} />
            <Route path="/crear-torneo" element={<CreateTournament />} />
            <Route path="/equipos" element={<Teams />} />
            <Route path="/editar-equipo" element={<EditEquipo />} />
            <Route path="/jugadores" element={<Jugadores />} />
            <Route path="/editar-jugador" element={<EditJugador />} />
            <Route path="/lista-torneos" element={<ListaTorneos />} />
            <Route path="/torneo/:torneoId" element={<ListaTorneos />} />
            <Route path="/torneo-liga/:torneoId" element={<TorneoLiga />} />
            <Route path="/torneo-eli/:torneoId" element={<TorneoEli />} />
            <Route path="/marcador-futbol/:torneoId/:round/:matchIndex" element={<ListaTorneos />} />
            <Route path="/partido-futbol/:torneoId/:round/:matchIndex" element={<PartidoFutbol />} />
            <Route path="/partido-lol/:torneoId/:round/:matchIndex" element={<PartidoLol />} />
            
          </Routes>

        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
