import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Swal from 'sweetalert2';

import './partidoLol.css';

const TORNEOS_STORAGE_KEY = 'torneos.json';
const TEAMS_STORAGE_KEY = 'teams.json';

const readJsonFromLocalStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES');
};

function normalizeTeams(t) {
  return Array.isArray(t) ? t : [];
}

function normalizePlayers(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
}

export default function PartidoLol() {
  const { torneoId, round, matchIndex } = useParams();

  const [torneo, setTorneo] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const listT = readJsonFromLocalStorage(TORNEOS_STORAGE_KEY, []);
    const safeT = Array.isArray(listT) ? listT : [];
    const found = safeT.find((t) => String(t?.id) === String(torneoId));
    setTorneo(found ?? null);
  }, [torneoId]);

  useEffect(() => {
    const parsedTeams = readJsonFromLocalStorage(TEAMS_STORAGE_KEY, []);
    setTeams(normalizeTeams(parsedTeams));
  }, []);

  const teamIds = useMemo(() => {
    if (!torneo) return [];
    const ids = Array.isArray(torneo.selectedTeamIds) ? torneo.selectedTeamIds : [];
    return ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  }, [torneo]);

  const localTeamId = teamIds[0] ?? null;
  const awayTeamId = teamIds[1] ?? null;

  const localTeam = useMemo(() => teams.find((t) => Number(t?.id) === Number(localTeamId)), [teams, localTeamId]);
  const awayTeam = useMemo(() => teams.find((t) => Number(t?.id) === Number(awayTeamId)), [teams, awayTeamId]);

  const localPlayerIds = useMemo(() => normalizePlayers(localTeam?.jugadores), [localTeam]);
  const awayPlayerIds = useMemo(() => normalizePlayers(awayTeam?.jugadores), [awayTeam]);

  // players.json catalog
  const JUGADORES_STORAGE_KEY = 'players.json';
  const [playersCatalog, setPlayersCatalog] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem(JUGADORES_STORAGE_KEY);
    if (!raw) {
      setPlayersCatalog([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setPlayersCatalog(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPlayersCatalog([]);
    }
  }, []);

  const playersById = useMemo(() => {
    const map = new Map();
    for (const p of playersCatalog || []) {
      const pid = p?.id ?? p?._id;
      if (pid == null) continue;
      map.set(String(pid), p);
    }
    return map;
  }, [playersCatalog]);

  const getPlayerDisplayName = (player) => {
    if (!player) return '—';
    return player?.name ?? player?.nick ?? player?.nickName ?? `Jugador #${player?.id ?? player?._id ?? '—'}`;
  };

  const localPlayerOptions = useMemo(() => {
    return localPlayerIds.map((id) => {
      const pid = String(id);
      const player = playersById.get(pid);
      return { id: pid, name: getPlayerDisplayName(player) };
    });
  }, [localPlayerIds, playersById]);

  const awayPlayerOptions = useMemo(() => {
    return awayPlayerIds.map((id) => {
      const pid = String(id);
      const player = playersById.get(pid);
      return { id: pid, name: getPlayerDisplayName(player) };
    });
  }, [awayPlayerIds, playersById]);

  const teamSlots = Array.from({ length: 5 }, (_, i) => i);

  const [selectedLocalBySlot, setSelectedLocalBySlot] = useState({});

  const [selectedAwayBySlot, setSelectedAwayBySlot] = useState({});

  // stats por slot (bajas/kills, muertes/deaths, asistencias/assists)
  const [localStatsBySlot, setLocalStatsBySlot] = useState({});
  const [awayStatsBySlot, setAwayStatsBySlot] = useState({});

  // Rehidratación cuando el partido ya está finalizado
  useEffect(() => {
    const matchKey = `${String(torneoId ?? '')}::${String(round)}::${String(matchIndex)}`;
    const partidosRaw = localStorage.getItem(matchStorageKey);
    const partidosStoreLocal = partidosRaw ? JSON.parse(partidosRaw) : {};
    const existing = partidosStoreLocal?.[matchKey];

    if (!existing || existing?.finalizado !== true) return;

    const localPlayers = Array.isArray(existing?.localTeamPlayers) ? existing.localTeamPlayers : [];
    const awayPlayers = Array.isArray(existing?.awayTeamPlayers) ? existing.awayTeamPlayers : [];

    // Rellenamos los selects por slot (slot 0..4)
    const nextLocal = {};
    for (let i = 0; i < teamSlots.length; i++) {
      nextLocal[String(i)] = localPlayers[i] != null ? String(localPlayers[i]) : '';
    }
    const nextAway = {};
    for (let i = 0; i < teamSlots.length; i++) {
      nextAway[String(i)] = awayPlayers[i] != null ? String(awayPlayers[i]) : '';
    }

    setSelectedLocalBySlot(nextLocal);
    setSelectedAwayBySlot(nextAway);

    const localLolStats = Array.isArray(existing?.lolStats?.local) ? existing.lolStats.local : [];
    const awayLolStats = Array.isArray(existing?.lolStats?.away) ? existing.lolStats.away : [];

    const nextLocalStats = {};
    for (let i = 0; i < teamSlots.length; i++) {
      const s = localLolStats[i];
      if (!s) {
        nextLocalStats[String(i)] = { bajas: 0, muertes: 0, asistencias: 0 };
        continue;
      }
      nextLocalStats[String(i)] = {
        bajas: Number(s?.bajas ?? 0),
        muertes: Number(s?.muertes ?? 0),
        asistencias: Number(s?.asistencias ?? 0),
      };
    }

    const nextAwayStats = {};
    for (let i = 0; i < teamSlots.length; i++) {
      const s = awayLolStats[i];
      if (!s) {
        nextAwayStats[String(i)] = { bajas: 0, muertes: 0, asistencias: 0 };
        continue;
      }
      nextAwayStats[String(i)] = {
        bajas: Number(s?.bajas ?? 0),
        muertes: Number(s?.muertes ?? 0),
        asistencias: Number(s?.asistencias ?? 0),
      };
    }

    setLocalStatsBySlot(nextLocalStats);
    setAwayStatsBySlot(nextAwayStats);
  }, [torneoId, round, matchIndex]);





  const selectedLocalIds = useMemo(() => {
    return teamSlots
      .map((slot) => selectedLocalBySlot[String(slot)])
      .filter((v) => v !== '' && v != null);
  }, [selectedLocalBySlot, teamSlots]);

  const selectedAwayIds = useMemo(() => {
    return teamSlots
      .map((slot) => selectedAwayBySlot[String(slot)])
      .filter((v) => v !== '' && v != null);
  }, [selectedAwayBySlot, teamSlots]);

  const matchStorageKey = useMemo(() => `ListaEncuentros-${String(torneoId)}.json`, [torneoId]);
  const partidosStore = useMemo(() => {
    const raw = localStorage.getItem(matchStorageKey);
    return raw ? (JSON.parse(raw) ?? {}) : {};
  }, [matchStorageKey]);

  const isPartidoFinalizado = Boolean(
    partidosStore?.[`${String(torneoId ?? '')}::${String(round)}::${String(matchIndex)}`]?.finalizado === true
  );

  return (
    <div style={{ padding: '2rem', background: '#737373', minHeight: '100vh' }}>
      <Link
        to={(() => {
          try {
            const listT = readJsonFromLocalStorage(TORNEOS_STORAGE_KEY, []);
            const safeT = Array.isArray(listT) ? listT : [];
            const found = safeT.find((t) => String(t?.id) === String(torneoId));
            const rawStyle = (found?.style ?? found?.estilo ?? '').toString().toLowerCase();
            const normalized = rawStyle === 'clasico' ? 'liga' : rawStyle;
            const isLiga = normalized === 'liga';
            return isLiga
              ? `/torneo-liga/${encodeURIComponent(String(torneoId))}`
              : `/torneo-eli/${encodeURIComponent(String(torneoId))}`;
          } catch {
            return `/torneo-liga/${encodeURIComponent(String(torneoId))}`;
          }
        })()}
        style={{
          display: 'inline-block',
          marginBottom: '1.5rem',
          color: '#c7a64b',
          textDecoration: 'none',
          fontWeight: 700,
        }}
      >
        ← Volver
      </Link>

      <div style={{ maxWidth: 1100, margin: '0 auto', borderRadius: 18, padding: 18 }}>
        <h1 style={{ margin: '0 0 0.75rem 0', color: '#d4af37' }}>Partido LoL</h1>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div
            style={{
              background: 'rgba(248,249,250,0.95)',
              borderRadius: 999,
              padding: '8px 12px',
              fontWeight: 800,
              color: '#737373',
            }}
          >
            Torneo: {torneo?.name ?? '—'}
          </div>
          <div
            style={{
              background: 'rgba(248,249,250,0.95)',
              borderRadius: 999,
              padding: '8px 12px',
              fontWeight: 800,
              color: '#737373',
            }}
          >
            Fecha: {formatDate(torneo?.date ?? torneo?.createdAt)}
          </div>
          <div
            style={{
              background: 'rgba(248,249,250,0.95)',
              borderRadius: 999,
              padding: '8px 12px',
              fontWeight: 800,
              color: '#737373',
            }}
          >
            Ronda: {round} • Partido: {matchIndex}
          </div>
        </div>

        <div style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 950, color: '#d4af37', marginBottom: 10 }}>
                Local • {localTeam?.name ?? localTeam?.nick ?? '—'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {teamSlots.map((slot) => {
                  const myValue = selectedLocalBySlot[String(slot)] ?? '';
                  const othersSelected = selectedLocalIds.filter((id) => id !== myValue);
                  const allowed = localPlayerOptions.filter((p) => {
                    if (p.id === myValue) return true;
                    return !othersSelected.includes(p.id);
                  });

                  return (
                    <div
                      key={`local-slot-${slot}`}
                      style={{ border: '2px solid #e0e0e0', borderRadius: 12, padding: 12, background: 'rgba(248,249,250,0.95)' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label className="partido-lol-player-label">Jugador</label>
                        <select
                          className="partido-lol-player-select"
                          value={myValue}
                          disabled={isPartidoFinalizado}
                          onChange={(e) => {
                            if (isPartidoFinalizado) return;
                            const nextVal = e.target.value;
                            setSelectedLocalBySlot((prev) => ({
                              ...prev,
                              [String(slot)]: nextVal,
                            }));
                          }}
                        >
                          <option value="">—</option>
                          {allowed.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="partido-lol-stats-grid">
                        <div className="partido-lol-stat">
                          <label style={{ fontWeight: 800, color: '#737373' }}>Bajas</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            disabled={isPartidoFinalizado}
                            value={localStatsBySlot[String(slot)]?.bajas ?? 0}
                            onChange={(e) => {
                              const value = Number(e.target.value);

                              setLocalStatsBySlot((prev) => ({
                                ...prev,
                                [String(slot)]: {
                                  ...(prev[String(slot)] ?? {}),
                                  bajas: value,
                                },
                              }));
                            }}
                          />                        </div>
                        <div className="partido-lol-stat">
                          <label style={{ fontWeight: 800, color: '#737373' }}>Muertes</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            disabled={isPartidoFinalizado}
                            value={localStatsBySlot[String(slot)]?.muertes ?? 0}
                            onChange={(e) => {
                              const value = Number(e.target.value);

                              setLocalStatsBySlot((prev) => ({
                                ...prev,
                                [String(slot)]: {
                                  ...(prev[String(slot)] ?? {}),
                                  muertes: value,
                                },
                              }));
                            }}
                          />                        </div>
                        <div className="partido-lol-stat">
                          <label style={{ fontWeight: 800, color: '#737373' }}>Asistencias</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            disabled={isPartidoFinalizado}
                            value={localStatsBySlot[String(slot)]?.asistencias ?? 0}
                            onChange={(e) => {
                              const value = Number(e.target.value);

                              setLocalStatsBySlot((prev) => ({
                                ...prev,
                                [String(slot)]: {
                                  ...(prev[String(slot)] ?? {}),
                                  asistencias: value,
                                },
                              }));
                            }}
                          />                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 950, color: '#d4af37', marginBottom: 10 }}>
                Visitante • {awayTeam?.name ?? awayTeam?.nick ?? '—'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {teamSlots.map((slot) => {
                  const myValue = selectedAwayBySlot[String(slot)] ?? '';
                  const othersSelected = selectedAwayIds.filter((id) => id !== myValue);
                  const allowed = awayPlayerOptions.filter((p) => {
                    if (p.id === myValue) return true;
                    return !othersSelected.includes(p.id);
                  });

                  return (
                    <div
                      key={`away-slot-${slot}`}
                      style={{ border: '2px solid #e0e0e0', borderRadius: 12, padding: 12, background: 'rgba(248,249,250,0.95)' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label className="partido-lol-player-label">Jugador</label>
                        <select
                          className="partido-lol-player-select"
                          value={myValue}
                          disabled={isPartidoFinalizado}
                          onChange={(e) => {
                            if (isPartidoFinalizado) return;
                            const nextVal = e.target.value;
                            setSelectedAwayBySlot((prev) => ({
                              ...prev,
                              [String(slot)]: nextVal,
                            }));
                          }}
                        >
                          <option value="">—</option>
                          {allowed.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="partido-lol-stats-grid">
                        <div className="partido-lol-stat">
                          <label style={{ fontWeight: 800, color: '#737373' }}>Bajas</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            disabled={isPartidoFinalizado}
                            value={awayStatsBySlot[String(slot)]?.bajas ?? 0}
                            onChange={(e) => {
                              const value = Number(e.target.value);

                              setAwayStatsBySlot((prev) => ({
                                ...prev,
                                [String(slot)]: {
                                  ...(prev[String(slot)] ?? {}),
                                  bajas: value,
                                },
                              }));
                            }}
                          />                        </div>
                        <div className="partido-lol-stat">
                          <label style={{ fontWeight: 800, color: '#737373' }}>Muertes</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            disabled={isPartidoFinalizado}
                            value={awayStatsBySlot[String(slot)]?.muertes ?? 0}
                            onChange={(e) => {
                              const value = Number(e.target.value);

                              setAwayStatsBySlot((prev) => ({
                                ...prev,
                                [String(slot)]: {
                                  ...(prev[String(slot)] ?? {}),
                                  muertes: value,
                                },
                              }));
                            }}
                          />                        </div>
                        <div className="partido-lol-stat">
                          <label style={{ fontWeight: 800, color: '#737373' }}>Asistencias</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            disabled={isPartidoFinalizado}
                            value={awayStatsBySlot[String(slot)]?.asistencias ?? 0}
                            onChange={(e) => {
                              const value = Number(e.target.value);

                              setAwayStatsBySlot((prev) => ({
                                ...prev,
                                [String(slot)]: {
                                  ...(prev[String(slot)] ?? {}),
                                  asistencias: value,
                                },
                              }));
                            }}
                          />                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="partido-lol-victoria-row">
            {!isPartidoFinalizado && (
              <>
                <button
                  type="button"
                  className="partido-lol-victoria-btn partido-lol-victoria-btn-primary"
                  onClick={() => {
                    try {
                      const matchKey = `${String(torneoId ?? '')}::${String(round)}::${String(matchIndex)}`;
                      const matchStorageKey = `ListaEncuentros-${String(torneoId)}.json`;
                      const partidosRaw = localStorage.getItem(matchStorageKey);
                      const partidosStoreLocal = partidosRaw ? JSON.parse(partidosRaw) : {};
                      if (!partidosStoreLocal || typeof partidosStoreLocal !== 'object') {
                        throw new Error(`Formato inválido de ${matchStorageKey}`);
                      }


                      const localIds = [...selectedLocalIds];
                      const awayIds = [...selectedAwayIds];

                      const localStats = teamSlots.map(
                        (slot) =>
                          localStatsBySlot[String(slot)] ?? {
                            bajas: 0,
                            muertes: 0,
                            asistencias: 0,
                          }
                      );

                      const awayStats = teamSlots.map(
                        (slot) =>
                          awayStatsBySlot[String(slot)] ?? {
                            bajas: 0,
                            muertes: 0,
                            asistencias: 0,
                          }
                      );

                      const safeLocalStats = localStats.length ? localStats : Array(localIds.length).fill({ bajas: 0, muertes: 0, asistencias: 0 });
                      const safeAwayStats = awayStats.length ? awayStats : Array(awayIds.length).fill({ bajas: 0, muertes: 0, asistencias: 0 });

                      const playersRaw = localStorage.getItem('players.json');
                      const playersParsed = playersRaw ? JSON.parse(playersRaw) : [];
                      const players = Array.isArray(playersParsed) ? playersParsed : [];

                      // Normalizamos el playerId para evitar fallos por tipo (string/number)
                      // o porque el catálogo use `id`.
                      const applyToPlayerLol = (playerId, delta) => {
                        const targetId = String(playerId);
                        const idx = players.findIndex((p) => String(p?.id ?? p?._id) === targetId);
                        if (idx === -1) return;

                        const p = players[idx];
                        const currentStats = p.stats && typeof p.stats === 'object' ? p.stats : {};
                        const lolStats = currentStats.lol && typeof currentStats.lol === 'object' ? currentStats.lol : {};

                        lolStats.kills = Number(lolStats.kills ?? 0) + Number(delta.bajas ?? 0);
                        lolStats.deaths = Number(lolStats.deaths ?? 0) + Number(delta.muertes ?? 0);
                        lolStats.assists = Number(lolStats.assists ?? 0) + Number(delta.asistencias ?? 0);

                        currentStats.lol = lolStats;
                        p.stats = currentStats;
                        players[idx] = p;
                      };


                      localIds.forEach((pid, i) => {
                        applyToPlayerLol(pid, safeLocalStats[i] ?? { bajas: 0, muertes: 0, asistencias: 0 });
                      });
                      awayIds.forEach((pid, i) => {
                        applyToPlayerLol(pid, safeAwayStats[i] ?? { bajas: 0, muertes: 0, asistencias: 0 });
                      });

                      localStorage.setItem('players.json', JSON.stringify(players));

                      partidosStoreLocal[matchKey] = {
                        ...(partidosStoreLocal[matchKey] || {}),
                        localTeamId: localTeamId ?? null,
                        awayTeamId: awayTeamId ?? null,
                        homeTeamWinner: localTeamId ?? null,
                        winner: localTeamId ?? null,
                        localTeamPlayers: localIds,
                        awayTeamPlayers: awayIds,
                        marcadorLocal: 1,
                        marcadorAway: 0,
                        finalizado: true,
                        lolStats: {
                          local: localIds.map((pid, i) => ({ playerId: pid, ...(safeLocalStats[i] ?? { bajas: 0, muertes: 0, asistencias: 0 }) })),
                          away: awayIds.map((pid, i) => ({ playerId: pid, ...(safeAwayStats[i] ?? { bajas: 0, muertes: 0, asistencias: 0 }) })),
                        },
                      };

                      localStorage.setItem(matchStorageKey, JSON.stringify(partidosStoreLocal, null, 2));

                      Swal.fire({
                        icon: 'success',
                        title: 'Victoria Local',
                        text: 'Estadísticas guardadas correctamente.',
                        confirmButtonText: 'Ok',
                      });
                    } catch (err) {
                      Swal.fire({
                        icon: 'error',
                        title: 'No se pudo guardar',
                        text: String(err?.message ?? err),
                        confirmButtonText: 'Ok',
                      });
                    }
                  }}
                >
                  Victoria Local
                </button>

                <button
                  type="button"
                  className="partido-lol-victoria-btn partido-lol-victoria-btn-primary"
                  onClick={() => {
                    try {
                      const matchKey = `${String(torneoId ?? '')}::${String(round)}::${String(matchIndex)}`;
                      const matchStorageKey = `ListaEncuentros-${String(torneoId)}.json`;
                      const partidosRaw = localStorage.getItem(matchStorageKey);
                      const partidosStoreLocal = partidosRaw ? JSON.parse(partidosRaw) : {};
                      if (!partidosStoreLocal || typeof partidosStoreLocal !== 'object') {
                        throw new Error(`Formato inválido de ${matchStorageKey}`);
                      }

                      const localIds = [...selectedLocalIds];
                      const awayIds = [...selectedAwayIds];

                      const localStats = teamSlots.map(
                        (slot) =>
                          localStatsBySlot[String(slot)] ?? {
                            bajas: 0,
                            muertes: 0,
                            asistencias: 0,
                          }
                      );

                      const awayStats = teamSlots.map(
                        (slot) =>
                          awayStatsBySlot[String(slot)] ?? {
                            bajas: 0,
                            muertes: 0,
                            asistencias: 0,
                          }
                      );

                      const safeLocalStats = localStats.length ? localStats : Array(localIds.length).fill({ bajas: 0, muertes: 0, asistencias: 0 });
                      const safeAwayStats = awayStats.length ? awayStats : Array(awayIds.length).fill({ bajas: 0, muertes: 0, asistencias: 0 });

                      const playersRaw = localStorage.getItem('players.json');
                      const playersParsed = playersRaw ? JSON.parse(playersRaw) : [];
                      const players = Array.isArray(playersParsed) ? playersParsed : [];

                      const applyToPlayerLol = (playerId, delta) => {
                        const idx = players.findIndex((p) => String(p?.id ?? p?._id) === String(playerId));
                        if (idx === -1) return;
                        const p = players[idx];
                        const currentStats = p.stats && typeof p.stats === 'object' ? p.stats : {};
                        const lolStats = currentStats.lol && typeof currentStats.lol === 'object' ? currentStats.lol : {};

                        lolStats.kills = Number(lolStats.kills ?? 0) + Number(delta.bajas ?? 0);
                        lolStats.deaths = Number(lolStats.deaths ?? 0) + Number(delta.muertes ?? 0);
                        lolStats.assists = Number(lolStats.assists ?? 0) + Number(delta.asistencias ?? 0);

                        currentStats.lol = lolStats;
                        p.stats = currentStats;
                        players[idx] = p;
                      };

                      localIds.forEach((pid, i) => {
                        applyToPlayerLol(pid, safeLocalStats[i] ?? { bajas: 0, muertes: 0, asistencias: 0 });
                      });
                      awayIds.forEach((pid, i) => {
                        applyToPlayerLol(pid, safeAwayStats[i] ?? { bajas: 0, muertes: 0, asistencias: 0 });
                      });

                      localStorage.setItem('players.json', JSON.stringify(players));
                      setPlayersCatalog(players);

                      partidosStoreLocal[matchKey] = {
                        ...(partidosStoreLocal[matchKey] || {}),
                        localTeamId: localTeamId ?? null,
                        awayTeamId: awayTeamId ?? null,
                        homeTeamWinner: localTeamId ?? null,
                        winner: awayTeamId ?? null,
                        localTeamPlayers: localIds,
                        awayTeamPlayers: awayIds,
                        marcadorLocal: 0,
                        marcadorAway: 1,
                        finalizado: true,
                        lolStats: {
                          local: localIds.map((pid, i) => ({ playerId: pid, ...(safeLocalStats[i] ?? { bajas: 0, muertes: 0, asistencias: 0 }) })),
                          away: awayIds.map((pid, i) => ({ playerId: pid, ...(safeAwayStats[i] ?? { bajas: 0, muertes: 0, asistencias: 0 }) })),
                        },
                      };

                      localStorage.setItem(matchStorageKey, JSON.stringify(partidosStoreLocal, null, 2));

                      Swal.fire({
                        icon: 'success',
                        title: 'Victoria Visitante',
                        text: 'Estadísticas guardadas correctamente.',
                        confirmButtonText: 'Ok',
                      });
                    } catch (err) {
                      Swal.fire({
                        icon: 'error',
                        title: 'No se pudo guardar',
                        text: String(err?.message ?? err),
                        confirmButtonText: 'Ok',
                      });
                    }
                  }}
                >
                  Victoria Visitante
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'none' }}>
          {/* Estos contenedores se usan como rootSelector en el parse de inputs. */}
          <div className="partido-lol-victoria-container-local" />
          <div className="partido-lol-victoria-container-away" />
        </div>
      </div>
    </div>
  );
}

