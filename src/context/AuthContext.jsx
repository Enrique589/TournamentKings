import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const DEMO_USER = {
  email: 'joven@burjassot.es',
  password: 'joven2024',
  name: 'Usuario',
};

const USERS_STORAGE_KEY = 'users.json';
const LEGACY_USER_KEY = 'burjassot_user';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getUsersFromStorage() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.users) ? parsed.users : [];
  } catch {
    return [];
  }
}

function setUsersToStorage(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify({ users }));
}

function ensureSeedUsers() {
  const users = getUsersFromStorage();
  if (users.length > 0) return;

  setUsersToStorage([
    {
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      name: DEMO_USER.name,
    },
  ]);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem(LEGACY_USER_KEY) : null;
    if (!storedUser) return null;
    return safeParseJson(storedUser);
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  function containsProhibitedWord(text) {
    const prohibited = ['fuck'];
    const normalized = String(text || '').toLowerCase();
    return prohibited.some((w) => normalized.includes(w));
  }

  const register = ({ name, email, password }) => {
    const users = getUsersFromStorage();

    const normalizedEmail = normalizeEmail(email);
    if (!name || !normalizedEmail || !password) {
      return { success: false, error: 'Por favor, completa todos los campos' };
    }

    // Filtro anti-profanidad: impedir que el nombre contenga "fuck" (case-insensitive)
    if (containsProhibitedWord(name)) {
      return {
        success: false,
        error: 'El nombre de usuario no puede contener palabras ofensivas.',
      };
    }

    const exists = users.some((u) => normalizeEmail(u.email) === normalizedEmail);
    if (exists) {
      return { success: false, error: 'Ese email ya está registrado' };
    }

    const nextUsers = [...users, { name, email: normalizedEmail, password }];
    setUsersToStorage(nextUsers);

    return { success: true };
  };

  const login = (email, password) => {
    ensureSeedUsers();

    const users = getUsersFromStorage();
    const normalizedEmail = normalizeEmail(email);

    const found = users.find(
      (u) => normalizeEmail(u.email) === normalizedEmail && u.password === password
    );

    if (!found) {
      return { success: false, error: 'Email o contraseña incorrectos' };
    }

    const userData = {
      email: found.email,
      name: found.name,
    };

    setUser(userData);
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(userData));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LEGACY_USER_KEY);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

