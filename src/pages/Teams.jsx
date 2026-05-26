import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './Teams.css';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES');
};

const TEAMS_STORAGE_KEY = 'teams.json';

const getDefaultTeams = () => [];



function Teams() {

  // Cargar desde localStorage (persistencia) o usar los datos de ejemplo
  const [teams, setTeams] = useState(() => {
    try {
      const raw = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (!raw) return getDefaultTeams();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return getDefaultTeams();

      // Migración suave: si existen equipos antiguos sin `sede`, no rellenamos valores inventados.
      // La UI mostrará "—" cuando `sede` sea null/undefined/vacío.
      return parsed.map((t) => ({
        ...t,
        sede: t.sede ?? ''
      }));
    } catch {
      return getDefaultTeams();
    }
  });


  const SEDES = [];
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSede, setNewTeamSede] = useState('');




  const nextId = useMemo(() => {
    const maxId = teams.reduce((acc, t) => Math.max(acc, t.id), 0);
    return maxId + 1;
  }, [teams]);

  const persistTeams = (teamsToPersist) => {
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teamsToPersist, null, 2));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = newTeamName.trim();
    if (!trimmed) return;

    setTeams((prev) => {
      const updated = [
        ...prev,
        {
          id: nextId,
          name: trimmed,
          sede: newTeamSede,
          createdAt: new Date().toISOString(),
        }
      ];
      persistTeams(updated);
      return updated;
    });

    setNewTeamName('');
    setNewTeamSede('');

    // Confirmación con SweetAlert2
    const Swal = (await import('sweetalert2')).default;
    await Swal.fire({
      icon: 'success',
      title: 'Equipo creado',
      text: `El equipo "${trimmed}" se creó correctamente.`,
      confirmButtonText: 'OK'
    });

  };



  return (
    <div className="teams-page">
      <Link to="/" className="back-link">← Volver al inicio</Link>
      <h1>Equipos</h1>

      <div className="teams-layout">
        <div className="teams-card">
          <h2>Crear nuevo equipo</h2>

          <form className="create-team-form" onSubmit={handleCreate}>
            <label>
              Nombre del equipo
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ej: Real Madrid"
                required
              />
            </label>

            <label>
              Sede
              <input
                type="text"
                value={newTeamSede}
                onChange={(e) => setNewTeamSede(e.target.value)}
                placeholder="Ej: Burjassot"
                required
              />
            </label>

            <button type="submit" className="submit-btn">Crear</button>

          </form>

        </div>

        <div className="teams-card">
          <h2>Lista de equipos</h2>

                  <div className="teams-table">
            <div className="teams-row teams-header">
              <div>Nombre</div>
              <div>Fecha de creación</div>
              <div>Sede</div>
            </div>

            {teams.length === 0 ? (

              <div className="teams-empty">No hay equipos.</div>
            ) : (
              teams.map((team) => (
                <Link
                  key={team.id}
                  to={`/editar-equipo?teamId=${encodeURIComponent(team.id)}`}
                  className="teams-row teams-row-link"
                >
                  <div className="teams-name">{team.name}</div>
                  <div>{formatDate(team.createdAt)}</div>
                  <div className="teams-sede">{team.sede ?? '—'}</div>

                </Link>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Teams;

