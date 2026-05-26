import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './EditJugador.css';

const PLAYERS_STORAGE_KEY = 'players.json';

function EditJugador() {
  const location = useLocation();

  const playerId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('playerId');
  }, [location.search]);

  const selectedPlayer = useMemo(() => {
    try {
      const raw = localStorage.getItem(PLAYERS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return null;
      return parsed.find((p) => String(p.id) === String(playerId)) ?? null;
    } catch {
      return null;
    }
  }, [playerId]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEdad, setEditEdad] = useState('');
  const [editNacionalidad, setEditNacionalidad] = useState('');

  useEffect(() => {
    if (!selectedPlayer) return;
    if (!isEditing) {
      setEditName(selectedPlayer.name ?? '');
      setEditEdad(selectedPlayer.edad ?? '');
      setEditNacionalidad(selectedPlayer.nacionalidad ?? '');
    }
  }, [selectedPlayer, isEditing]);

  const persistUpdate = (nextPlayer) => {
    const raw = localStorage.getItem(PLAYERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;

    const updated = parsed.map((p) => (String(p.id) === String(playerId) ? nextPlayer : p));
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(updated, null, 2));

    // fuerza que se refleje el nuevo estado en pantalla
    try {
      window.location.href = window.location.href;
    } catch {
      // ignore
    }
  };

  const handleEditClick = () => {
    if (!selectedPlayer) return;
    setIsEditing(true);
    setEditName(selectedPlayer.name ?? '');
    setEditEdad(selectedPlayer.edad ?? '');
    setEditNacionalidad(selectedPlayer.nacionalidad ?? '');
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (!selectedPlayer) return;
    setEditName(selectedPlayer.name ?? '');
    setEditEdad(selectedPlayer.edad ?? '');
    setEditNacionalidad(selectedPlayer.nacionalidad ?? '');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const nextName = editName.trim();
    const nextEdad = editEdad === '' ? '' : Number(editEdad);
    const nextNacionalidad = editNacionalidad.trim();

    if (!nextName) return;
    if (nextEdad === '' || Number.isNaN(nextEdad)) return;

    const nextPlayer = {
      ...selectedPlayer,
      name: nextName,
      edad: nextEdad,
      nacionalidad: nextNacionalidad === '' ? null : nextNacionalidad,
    };

    persistUpdate(nextPlayer);
    setIsEditing(false);

    const Swal = (await import('sweetalert2')).default;
    await Swal.fire({
      icon: 'success',
      title: 'Jugador actualizado',
      text: `Los cambios del jugador "${nextName}" se guardaron correctamente.`,
      confirmButtonText: 'OK',
    });
  };

  const placeholder = '—';

  const [activeTab, setActiveTab] = useState('Futbol');

  const title = selectedPlayer?.name ?? 'Jugador no encontrado';
  const edadValue = selectedPlayer?.edad ?? '';
  const nacionalidadValue = selectedPlayer?.nacionalidad;

  const stats = selectedPlayer?.stats && typeof selectedPlayer.stats === 'object' ? selectedPlayer.stats : {};
  const golesValue = Number(stats.goals ?? 0);
  const pasesValue = Number(stats.passes ?? 0);
  const asistenciasValue = Number(stats.assists ?? 0);


  return (
    <div className="edit-jugador-page">
      <Link to="/jugadores" className="back-link">
        ← Volver a Jugadores
      </Link>

      <div className="edit-jugador-card">
        <div className="edit-jugador-header">
          <div className="edit-jugador-title">{title}</div>

          <div className="edit-jugador-actions">
            {isEditing ? (
              <div className="edit-jugador-actions-group">
                <button type="button" className="edit-jugador-btn edit-jugador-btn-secondary" onClick={handleCancel}>
                  Cancelar
                </button>
                <button type="button" className="edit-jugador-btn edit-jugador-btn-primary" onClick={handleSave}>
                  Guardar
                </button>
              </div>
            ) : (
              <button type="button" className="edit-jugador-btn edit-jugador-btn-primary" onClick={handleEditClick}>
                Editar
              </button>
            )}
          </div>
        </div>

        {!selectedPlayer ? (
          <div className="edit-jugador-empty">Jugador no encontrado.</div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="edit-jugador-section">
              <div className="edit-jugador-kv">
                <div className="edit-jugador-k">Nombre</div>
                <div className="edit-jugador-v">
                  {isEditing ? (
                    <input
                      className="edit-jugador-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      type="text"
                      placeholder="Nombre del jugador"
                      required
                    />
                  ) : (
                    selectedPlayer.name || placeholder
                  )}
                </div>

                <div className="edit-jugador-k">Edad</div>
                <div className="edit-jugador-v">
                  {isEditing ? (
                    <input
                      className="edit-jugador-input"
                      value={editEdad}
                      onChange={(e) => setEditEdad(e.target.value)}
                      type="number"
                      placeholder="Ej: 25"
                      min={0}
                      required
                    />
                  ) : (
                    edadValue === '' || edadValue === null ? placeholder : String(edadValue)
                  )}
                </div>

                <div className="edit-jugador-k">Nacionalidad</div>
                <div className="edit-jugador-v">
                  {isEditing ? (
                    <input
                      className="edit-jugador-input"
                      value={editNacionalidad}
                      onChange={(e) => setEditNacionalidad(e.target.value)}
                      type="text"
                      placeholder="Ej: Argentina"
                    />
                  ) : (
                    nacionalidadValue === null || nacionalidadValue === '' || nacionalidadValue === undefined
                      ? placeholder
                      : nacionalidadValue
                  )}
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="edit-jugador-tabs-wrap">
        <div className="edit-jugador-tabs">
          <button
            type="button"
            className={`edit-jugador-tab ${activeTab === 'Futbol' ? 'edit-jugador-tab-active' : ''}`}
            onClick={() => setActiveTab('Futbol')}
          >
            Futbol
          </button>
          <button
            type="button"
            className={`edit-jugador-tab ${activeTab === 'League' ? 'edit-jugador-tab-active' : ''}`}
            onClick={() => setActiveTab('League')}
          >
            League
          </button>
        </div>

        {activeTab === 'Futbol' ? (
          <div className="edit-jugador-tab-panel">
            <div className="edit-jugador-stats-grid">
              <div className="edit-jugador-stat">
                <div className="edit-jugador-stat-num">{golesValue}</div>
                <div className="edit-jugador-stat-label">Goles</div>
              </div>
              <div className="edit-jugador-stat">
                <div className="edit-jugador-stat-num">{pasesValue}</div>
                <div className="edit-jugador-stat-label">Pases</div>
              </div>
              <div className="edit-jugador-stat">
                <div className="edit-jugador-stat-num">{asistenciasValue}</div>
                <div className="edit-jugador-stat-label">Asistencias</div>
              </div>
            </div>

          </div>
        ) : (
          <div className="edit-jugador-tab-panel">
            <div className="edit-jugador-stats-grid">
              {(() => {
                const lol = stats?.lol && typeof stats.lol === 'object' ? stats.lol : {};
                const bajas = Number(lol.kills ?? 0);
                const muertes = Number(lol.deaths ?? 0);
                const asist = Number(lol.assists ?? 0);

                return (
                  <>
                    <div className="edit-jugador-stat">
                      <div className="edit-jugador-stat-num">{Number.isNaN(bajas) ? 0 : bajas}</div>
                      <div className="edit-jugador-stat-label">Bajas</div>
                    </div>
                    <div className="edit-jugador-stat">
                      <div className="edit-jugador-stat-num">{Number.isNaN(muertes) ? 0 : muertes}</div>
                      <div className="edit-jugador-stat-label">Muertes</div>
                    </div>
                    <div className="edit-jugador-stat">
                      <div className="edit-jugador-stat-num">{Number.isNaN(asist) ? 0 : asist}</div>
                      <div className="edit-jugador-stat-label">Asistencias</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditJugador;

