import { useState } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';


function Login() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isLoginMode) {
      // Login validation
      if (!email || !password) {
        setError('Por favor, completa todos los campos');
        setIsLoading(false);
        return;
      }

      const result = login(email, password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } else {
      // Register validation
      if (!name || !email || !password || !confirmPassword) {
        setError('Por favor, completa todos los campos');
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        setIsLoading(false);
        return;
      }

      const result = register({ name, email, password });
      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setError('');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setIsLoginMode(true); // Switch back to login mode

      Swal.fire({
        icon: 'success',
        title: 'Usuario registrado exitosamente',
        text: 'Ya puedes iniciar sesión.',
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#FFC107',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2>{isLoginMode ? 'Iniciar Sesión' : 'Registrarse'}</h2>
          <p>{isLoginMode ? 'Accede a tu cuenta de Tournament King' : 'Crea tu cuenta nueva'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          
          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="name" className="form-label">Nombre de usuario</label>
              <input
                type="text"
                id="name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                disabled={isLoading}
              />

            </div>
          )}


          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={isLoading}
            />
          </div>


          <div className="form-group">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              disabled={isLoading}
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirma tu contraseña"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="button-group">
            <button 
              type="submit" 
              className="btn btn-primary login-btn"
              disabled={isLoading}
            >
              {isLoading ? (isLoginMode ? 'Iniciando sesión...' : 'Registrando...') : (isLoginMode ? 'Iniciar Sesión' : 'Registrarse')}
            </button>
            <button
              type="button"
              className="btn btn-secondary toggle-btn"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
                setConfirmPassword('');
              }}
              disabled={isLoading}
            >
              {isLoginMode ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </div>
        </form>



        <div className="login-back">
          <Link to="/" className="back-link">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
