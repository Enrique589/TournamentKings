import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

function Hero() {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('lang') || 'es';
    } catch {
      return 'es';
    }
  });

  useEffect(() => {
    try {
      const onStorage = (e) => {
        if (e?.key === 'lang') setLang(e?.newValue || 'es');
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    } catch {
      return undefined;
    }
  }, []);

  const labels = useMemo(() => {
    const t = {
      es: {
        create: 'Crear Torneo',
        teams: 'Equipos',
        tournaments: 'Torneos',
        players: 'Jugadores',
      },
      en: {
        create: 'Create Tournament',
        teams: 'Teams',
        tournaments: 'Tournaments',
        players: 'Players',
      }
    };
    return t[lang] || t.es;
  }, [lang]);

  return (
    <section className="hero" id="inicio">
      <div className="hero-content">
        <div className="hero-logo-container">
          <img src="/images/Logo proyecto.png" alt="Logo Proyecto" className="hero-logo" />
        </div>
        <div className="hero-buttons">
          <Link to="/crear-torneo" className="hero-btn">{labels.create}</Link>
          <Link to="/equipos" className="hero-btn">{labels.teams}</Link>
          <Link to="/lista-torneos" className="hero-btn">{labels.tournaments}</Link>
          <Link to="/jugadores" className="hero-btn">{labels.players}</Link>
        </div>
      </div>
    </section>
  );
}

export default Hero;

