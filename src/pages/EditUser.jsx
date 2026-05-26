import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import '../components/Login.css';

function EditUser() {

  const { user, logout, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Rellena nombre, email y contraseña.',
        confirmButtonText: 'Ok',
      });
      return;
    }

    // Demo: reutilizamos login para validar contraseña.
    const result = login(email, password);
    if (!result.success) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo actualizar',
        text: result.error,
        confirmButtonText: 'Reintentar',
      });
      return;
    }

    // En esta app demo, actualizamos el nombre en el usuario actual (y en localStorage de sesión).
    const userData = {
      email,
      name,
    };

    // Mantener compatibilidad con la sesión usada por Header.
    localStorage.setItem('burjassot_user', JSON.stringify(userData));

    // Actualizar también el registro persistente (users.json) para que quede guardado.
    try {
      const raw = localStorage.getItem('users.json');
      const parsed = raw ? JSON.parse(raw) : { users: [] };
      const users = Array.isArray(parsed?.users) ? parsed.users : [];
      const nextUsers = users.map((u) => (u.email === email ? { ...u, name } : u));
      localStorage.setItem('users.json', JSON.stringify({ users: nextUsers }));
    } catch {
      // Si falla la lectura del storage, al menos dejamos la sesión actualizada.
    }

    Swal.fire({
      icon: 'success',
      title: 'Usuario actualizado',
      text: 'Tu nombre se ha guardado correctamente.',
      confirmButtonText: 'Continuar',
    }).then(() => {
      navigate('/');
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="create-tournament-page">
      <Link to="/" className="back-link">
        ← Volver al inicio
      </Link>

      <h1>Editar Usuario</h1>

      <form onSubmit={handleSubmit} className="create-tournament-form" style={{ maxWidth: 360, margin: '0 auto' }}>

        <div className="form-group">
          <label>Nombre de usuario</label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Contraseña (para confirmar)</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            required
          />
        </div>

        <button type="submit" className="submit-btn">
          Guardar cambios
        </button>

          <button
            type="button"
            className="submit-btn"
            onClick={handleLogout}
            style={{ background: '#6c757d', marginTop: 12, color: '#d4af37', border: 'none' }}
          >
            Cerrar sesión
          </button>

      </form>
    </div>
  );
}

export default EditUser;

