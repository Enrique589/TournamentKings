import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './EditEquipo.css';

const TEAMS_STORAGE_KEY = 'teams.json';
const PLAYERS_STORAGE_KEY = 'players.json';
const TORNEOS_STORAGE_KEY = 'torneos.json';


function EditEquipo() {
  const location = useLocation();

  const teamId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('teamId');
  }, [location.search]);

  const selectedTeam = useMemo(() => {
    try {
      const raw = localStorage.getItem(TEAMS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return null;
      return parsed.find((t) => String(t.id) === String(teamId)) ?? null;
    } catch {
      return null;
    }
  }, [teamId]);

  const allPlayers = useMemo(() => {
    try {
      const raw = localStorage.getItem(PLAYERS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }, []);

  const stats = useMemo(() => {
    return {
      torneos: 0,
      partidosJugados: 0,
      victorias: 0,
    };
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSede, setEditSede] = useState('');

  // UI: jugadores asociados al equipo
  const [selectedPlayerIdToAdd, setSelectedPlayerIdToAdd] = useState('');
  const [playersRefreshNonce, setPlayersRefreshNonce] = useState(0);

  // Marcados para eliminar (al guardar se eliminan todos)
  const [playerIdsMarkedToRemove, setPlayerIdsMarkedToRemove] = useState([]);

  // Cálculo de estadísticas a persistir en teams.json:
  // Cuando editamos un equipo, recalculamos torneos/partidos/victorias acumulados
  // basándonos en el torneo y en el storage de partidos.
const computeTeamStatsFromStorage = () => {
    const torneosRaw = localStorage.getItem(TORNEOS_STORAGE_KEY);

    const torneos = torneosRaw ? JSON.parse(torneosRaw) : [];
    const teamsPlayers = Array.isArray(selectedTeam?.jugadores) ? selectedTeam.jugadores : [];

    const teamPlayerSet = new Set((teamsPlayers || []).map((x) => String(x)));

    let torneosCount = 0;
    let partidosJugadosCount = 0;
    let victoriasCount = 0;

    if (!Array.isArray(torneos)) return { torneos: 0, partidosJugados: 0, victorias: 0 };

    for (const t of torneos) {
      if (!t || typeof t !== 'object') continue;
      const tId = t?.id;
      if (tId == null) continue;

      const participants = Array.isArray(t.selectedTeamIds) ? t.selectedTeamIds : [];
      const isParticipant = participants.some((id) => String(id) === String(teamId));
      if (!isParticipant) continue;

      torneosCount += 1;

const storageKey = `ListaEncuentros-${String(tId)}.json`;
      let store;
      try {
        const rawPartidos = localStorage.getItem(storageKey);
        store = rawPartidos ? JSON.parse(rawPartidos) : {};
      } catch {
        store = {};
      }

      const keys = store && typeof store === 'object' ? Object.keys(store) : [];
      for (const k of keys) {
        const match = store?.[k];
        if (!match || match.finalizado !== true) continue;

        const homeId = match?.localTeamId ?? null;
        const awayId = match?.awayTeamId ?? null;

        const marcadorLocal = Number(match?.marcadorLocal ?? 0);
        const marcadorAway = Number(match?.marcadorAway ?? 0);

        // Solo contabilizamos partidos donde este equipo participa en el encuentro
        const participates = String(homeId) === String(teamId) || String(awayId) === String(teamId);
        if (!participates) continue;

        partidosJugadosCount += 1;

        const won =
          (String(homeId) === String(teamId) && marcadorLocal > marcadorAway) ||
          (String(awayId) === String(teamId) && marcadorAway > marcadorLocal);

        if (won) victoriasCount += 1;
      }
    }

    return {
      torneos: torneosCount,
      partidosJugados: partidosJugadosCount,
      victorias: victoriasCount,
    };
  };




  useEffect(() => {
    if (!selectedTeam) return;
    if (!isEditing) {
      setEditName(selectedTeam.name ?? '');
      setEditSede(selectedTeam.sede ?? '');
    }
  }, [selectedTeam, isEditing]);

  const persistUpdate = (nextTeam) => {
    const raw = localStorage.getItem(TEAMS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;

    const updated = parsed.map((t) => (String(t.id) === String(teamId) ? nextTeam : t));
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(updated, null, 2));

    setEditName(nextTeam.name ?? '');
    setEditSede(nextTeam.sede ?? '');

    // Refresca la UI de jugadores instantáneamente
      setPlayersRefreshNonce((n) => n + 1);
  };

  // --- Torneos persistidos: si el campo ya existe en teams.json, lo usamos como valor base.
  // Así, aunque el usuario todavía no haya jugado partidos, se mostrará correctamente el número de torneos.
  const statsPersisted = useMemo(() => {
    const current = selectedTeam?.torneos;
    const torneosCount = Number.isFinite(Number(current)) ? Number(current) : 0;
    return torneosCount;
  }, [selectedTeam?.torneos]);

  // Recalcular stats desde storage, pero manteniendo el conteo de torneos persistido.
  // (En tu sistema actual, EditEquipo antes sobreescribía `torneos` con el cálculo basado en partidos finalizados.)
  const effectiveStats = useMemo(() => {
    const computed = computeTeamStatsFromStorage();
    return {
      torneos: statsPersisted,
      partidosJugados: computed.partidosJugados,
      victorias: computed.victorias,
    };
  }, [statsPersisted, computeTeamStatsFromStorage]);



  const handleEditClick = () => {
    if (!selectedTeam) return;
    setIsEditing(true);
    setEditName(selectedTeam.name ?? '');
    setEditSede(selectedTeam.sede ?? '');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPlayerIdsMarkedToRemove([]);
    if (selectedTeam) {
      setEditName(selectedTeam.name ?? '');
      setEditSede(selectedTeam.sede ?? '');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;

    const nextName = editName.trim();
    const nextSede = editSede.trim();

    if (!nextName) return;

    // Al guardar: eliminar todos los marcados
    const toRemoveSet = new Set(playerIdsMarkedToRemove.map((id) => String(id)));
    const current = Array.isArray(selectedTeam.jugadores) ? selectedTeam.jugadores : [];
    const updatedJugadores = current.filter((id) => !toRemoveSet.has(String(id)));

    const nextTeam = {
      ...selectedTeam,
      name: nextName,
      sede: nextSede,
      jugadores: updatedJugadores,
    };

    persistUpdate(nextTeam);
    setPlayerIdsMarkedToRemove([]);

    try {
      window.location.href = window.location.href;
    } catch {
      // ignore
    }

    setIsEditing(false);

    const Swal = (await import('sweetalert2')).default;
    await Swal.fire({
      icon: 'success',
      title: 'Equipo actualizado',
      text: `Los cambios del equipo "${nextName}" se guardaron correctamente.`,
      confirmButtonText: 'OK',
    });
  };


  const handleAddPlayer = () => {
    if (!selectedTeam) return;
    if (!selectedPlayerIdToAdd) return;

    const idNum = Number(selectedPlayerIdToAdd);
    if (Number.isNaN(idNum)) return;

    const current = Array.isArray(selectedTeam.jugadores) ? selectedTeam.jugadores : [];
    const exists = current.some((p) => String(p) === String(idNum));
    const updatedJugadores = exists ? current : [...current, idNum];

    const nextTeam = {
      ...selectedTeam,
      jugadores: updatedJugadores,
    };

    persistUpdate(nextTeam);
    setSelectedPlayerIdToAdd('');
    try {
      window.location.href = window.location.href;
    } catch {
      // ignore
    }
  };

  const title = selectedTeam?.name ?? 'Equipo no encontrado';
  const sedeValue = selectedTeam?.sede ?? '';

  const teamPlayersIds = Array.isArray(selectedTeam?.jugadores) ? selectedTeam.jugadores : [];
  const teamPlayers = teamPlayersIds
    .map((id) => allPlayers.find((p) => String(p.id) === String(id)))
    .filter(Boolean);

  const availablePlayersToAdd = allPlayers.filter((p) => {
    return !teamPlayersIds.some((id) => String(id) === String(p.id));
  });

  // Dependencia para refrescar instantáneamente sin recargar la página.
  const _refresh = playersRefreshNonce;

  return (
    <div className="edit-equipo-page">
      <Link to="/equipos" className="back-link">
        ← Volver a Equipos
      </Link>

      <div className="edit-equipo-card">
        <div className="edit-equipo-header">
          <div className="edit-equipo-title">{title}</div>

          <div className="edit-equipo-actions">
            {isEditing ? (
              <div className="edit-equipo-actions-group">
                <button type="button" className="edit-equipo-btn edit-equipo-btn-secondary" onClick={handleCancel}>
                  Cancelar
                </button>
                <button type="button" className="edit-equipo-btn edit-equipo-btn-primary" onClick={(e) => handleSave(e)}>
                  Guardar
                </button>
              </div>
            ) : (
              <button type="button" className="edit-equipo-btn edit-equipo-btn-primary" onClick={handleEditClick}>
                Editar
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="edit-equipo-section">
            <h2 className="edit-equipo-section-title">Características</h2>
            <div className="edit-equipo-kv">
              <div className="edit-equipo-k">Fecha de creación</div>
              <div className="edit-equipo-v">
                {selectedTeam?.createdAt ? new Date(selectedTeam.createdAt).toLocaleDateString('es-ES') : '—'}
              </div>

              <div className="edit-equipo-k">Nombre</div>
              <div className="edit-equipo-v">
                {isEditing ? (
                  <input
                    className="edit-equipo-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    type="text"
                    placeholder="Nombre del equipo"
                  />
                ) : (
                  title || '—'
                )}
              </div>

              <div className="edit-equipo-k">Sede</div>
              <div className="edit-equipo-v">
                {isEditing ? (
                  <input
                    className="edit-equipo-input"
                    value={editSede}
                    onChange={(e) => setEditSede(e.target.value)}
                    type="text"
                    placeholder="Ej: Burjassot"
                  />
                ) : (
                  sedeValue ? sedeValue : '—'
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="edit-equipo-section">
          <h2 className="edit-equipo-section-title">Estadísticas</h2>

          <div className="edit-equipo-stats-grid">
            <div className="edit-equipo-stat">
              <div className="edit-equipo-stat-num">{effectiveStats.torneos}</div>
              <div className="edit-equipo-stat-label">Torneos</div>
            </div>
            <div className="edit-equipo-stat">
              <div className="edit-equipo-stat-num">{effectiveStats.partidosJugados}</div>
              <div className="edit-equipo-stat-label">Partidos jugados</div>
            </div>
            <div className="edit-equipo-stat">
              <div className="edit-equipo-stat-num">{effectiveStats.victorias}</div>
              <div className="edit-equipo-stat-label">Victorias</div>
            </div>
          </div>

        </div>

        <div className="edit-equipo-section">
          <h2 className="edit-equipo-section-title">Jugadores</h2>

          {teamPlayers.length === 0 ? (
            <div className="edit-equipo-empty">No hay jugadores en este equipo.</div>
          ) : (
            <div className="edit-equipo-players-list">
              {teamPlayers.map((player) => (
                <details
                  key={player.id}
                  className={`edit-equipo-player-item${playerIdsMarkedToRemove.some((x) => String(x) === String(player.id)) ? ' edit-equipo-player-item--marked' : ''}`}
                  open={false}
                >
                  <summary className="edit-equipo-player-summary">
                    {player.name}
                    {isEditing && (
                      <button
                        type="button"
                        className="edit-equipo-player-remove"
                        aria-label={`Eliminar ${player.name}`}
                        title="Eliminar"
                        onClick={() => {
                          // marcar para borrar: se eliminarán al guardar
                          setPlayerIdsMarkedToRemove((prev) => {
                            const idStr = String(player.id);
                            const alreadyMarked = prev.some((x) => String(x) === idStr);
                            if (alreadyMarked) return prev.filter((x) => String(x) !== idStr);
                            return [...prev, player.id];
                          });
                        }}
                      >
                        <span className="edit-equipo-player-remove-icon">✕</span>
                      </button>
                    )}
                  </summary>
                  <div className="edit-equipo-player-meta">Edad: {player.edad ?? '—'}</div>
                  <div className="edit-equipo-player-meta">
                    Nacionalidad: {player.nacionalidad === null || player.nacionalidad === '' || player.nacionalidad === undefined ? '—' : player.nacionalidad}
                  </div>
                </details>
              ))}
            </div>
          )}

          <div className="edit-equipo-players-add">
            <div className="edit-equipo-players-add-controls">
              <select
                className="edit-equipo-select"
                value={selectedPlayerIdToAdd}
                onChange={(e) => setSelectedPlayerIdToAdd(e.target.value)}
              >
                <option value="">-- Añadir jugadores --</option>
                {availablePlayersToAdd.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button type="button" className="edit-equipo-btn edit-equipo-btn-primary" onClick={handleAddPlayer}>
                Añadir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditEquipo;









