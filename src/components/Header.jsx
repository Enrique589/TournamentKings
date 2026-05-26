import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

function Header() {
  const { user, logout, isAuthenticated } = useAuth();
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
      // ignore
    }
  }, []);


  return (
    <header className="header">
      <div className="header-content">
        <Link to="/">
          <img src="/images/Logo proyecto.png" alt="Logo Proyecto" className="header-logo" />
        </Link>
        <nav className="nav-menu">
          <React.Fragment>
            {isAuthenticated ? (
              <div className="user-menu">
                <Link to="/editar-usuario" className="user-name">
                  {user?.name}
                </Link>

                <button onClick={logout} className="btn btn-logout">
                  {lang === 'en' ? 'Log out' : 'Cerrar Sesión'}
                </button>

              </div>
            ) : (
              <div className="guest-menu">
                <Link to="/login" className="nav-link btn-login">
                  Iniciar Sesión
                </Link>
              </div>
            )}
            <select
              className="language-selector"
              value={lang}
              onChange={(e) => {
                const next = e.target.value;
                setLang(next);
                try {
                  localStorage.setItem('lang', next);
                } catch {
                  // ignore
                }
                try {
                  window.dispatchEvent(new StorageEvent('storage', { key: 'lang', newValue: next }));
                } catch {
                  // ignore
                }
              }}
            >

              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>

          </React.Fragment>
        </nav>
      </div>
    </header>
  );
}

export default Header;


