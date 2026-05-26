import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './Jugadores.css';

const PLAYERS_STORAGE_KEY = 'players.json';

const getDefaultPlayers = () => [
  { id: 1, name: 'Jugador Demo 1', edad: 21, nacionalidad: 'España' },
  { id: 2, name: 'Jugador Demo 2', edad: 24, nacionalidad: 'Argentina' },
];



function Jugadores() {
  const [players, setPlayers] = useState(() => {
    try {
      const raw = localStorage.getItem(PLAYERS_STORAGE_KEY);
      if (!raw) return getDefaultPlayers();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return getDefaultPlayers();
      return parsed.map((p) => ({
        ...p,
        edad: p.edad ?? '',
        nacionalidad: p.nacionalidad,
      }));
    } catch {
      return getDefaultPlayers();
    }
  });

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNationality, setNewPlayerNationality] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');

  const nextId = useMemo(() => {
    const maxId = players.reduce((acc, p) => Math.max(acc, p.id), 0);
    return maxId + 1;
  }, [players]);

  const persistPlayers = (playersToPersist) => {
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(playersToPersist, null, 2));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = newPlayerName.trim();
    const nat = newPlayerNationality.trim();

    const edad = newPlayerAge !== '' ? Number(newPlayerAge) : '';

    if (!trimmed) {
      alert('Error: El nombre del jugador es obligatorio.');
      return;
    }

    if (edad === '' || Number.isNaN(edad)) {
      alert('Error: La edad del jugador es obligatoria.');
      return;
    }

    setPlayers((prev) => {
      const updated = [
        ...prev,
        {
          id: nextId,
          name: trimmed,
          edad,
          nacionalidad: nat,
          createdAt: new Date().toISOString(),
        },
      ];
      persistPlayers(updated);
      return updated;
    });

    setNewPlayerName('');
    setNewPlayerNationality('');
    setNewPlayerAge('');

    const Swal = (await import('sweetalert2')).default;
    await Swal.fire({
      icon: 'success',
      title: 'Jugador creado',
      text: `El jugador "${trimmed}" se creó correctamente.`,
      confirmButtonText: 'OK'
    });
  };

  return (
    <div className="teams-page">
      <Link to="/" className="back-link">← Volver al inicio</Link>
      <h1>Jugadores</h1>

      <div className="teams-layout">
        <div className="teams-card">
          <h2>Crear nuevo jugador</h2>

          <form className="create-team-form" onSubmit={handleCreate}>
            <label>
              Nombre del jugador
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Ej: Lionel Messi"
                required
              />
            </label>

            <label>
              Edad
              <input
                type="number"
                value={newPlayerAge}
                onChange={(e) => setNewPlayerAge(e.target.value)}
                placeholder="Ej: 25"
                min={0}
                required
              />
            </label>

            <label>
              Nacionalidad
              <input
                type="text"
                value={newPlayerNationality}
                onChange={(e) => setNewPlayerNationality(e.target.value)}
                placeholder="Ej: Argentina"
              />
            </label>

            <button type="submit" className="submit-btn">Crear</button>
          </form>
        </div>

        <div className="teams-card">
          <h2>Lista de jugadores</h2>

          <div className="teams-table">
            <div className="teams-row teams-header">
              <div>Nombre</div>
              <div>Edad</div>
              <div>Nacionalidad</div>
            </div>


            {players.length === 0 ? (
              <div className="teams-empty">No hay jugadores.</div>
            ) : (
              players.map((player) => (
                <Link
                  key={player.id}
                  to={`/editar-jugador?playerId=${encodeURIComponent(player.id)}`}
                  className="teams-row teams-row-link"
                >
                  <div className="teams-name">{player.name}</div>
                  <div>{player.edad ?? '—'}</div>
                  <div className="teams-sede">{player.nacionalidad === null || player.nacionalidad === '' ? '—' : player.nacionalidad}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Jugadores;



