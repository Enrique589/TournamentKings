import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import './partidoFutbol.css';

const TORNEOS_STORAGE_KEY = 'torneos.json';
const TEAMS_STORAGE_KEY = 'teams.json';
const PARTIDOS_STORAGE_PREFIX = 'ListaEncuentros-';
const JUGADORES_STORAGE_KEY = 'players.json';

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

const getMatchKey = ({ torneoId, round, matchIndex }) => {
  return `${String(torneoId ?? '')}::${String(round)}::${String(matchIndex)}`;
};

const BYE_ID = '__BYE__';

// Genera calendario (ida/vuelta) tipo round-robin para mostrar home/away.
function generateRoundRobinSingleRound(teamIds) {
  const ids = [...teamIds];
  if (ids.length < 2) return [];

  const n = ids.length;
  const isOdd = n % 2 === 1;
  const size = isOdd ? n + 1 : n;

  const list = [...ids];
  if (isOdd) list.push(BYE_ID);

  const rounds = size - 1;
  const half = size / 2;
  const circle = [...list];

  const result = [];
  for (let r = 0; r < rounds; r++) {
    const matches = [];
    for (let i = 0; i < half; i++) {
      const home = circle[i];
      const away = circle[size - 1 - i];
      if (home !== BYE_ID && away !== BYE_ID) {
        matches.push({ home, away });
      }
    }

    result.push({ round: r + 1, matches });

    const last = circle.pop();
    circle.splice(1, 0, last);
  }

  return result;
}

function generateLigaIdaVuelta(teamIds) {
  const single = generateRoundRobinSingleRound(teamIds);
  const secondLeg = single.map((rd) => ({
    round: rd.round + single.length,
    matches: rd.matches.map((m) => ({ home: m.away, away: m.home })),
  }));
  return [...single, ...secondLeg];
}

export default function PartidoFutbol() {
  const { torneoId, round, matchIndex } = useParams();

  const [torneo, setTorneo] = useState(null);
  const [teams, setTeams] = useState([]);
  const [store, setStore] = useState({});
  const [goles, setGoles] = useState([]);
  const [jugadores, setJugadores] = useState([]);

  const teamMap = useMemo(() => {
    const map = new Map();
    for (const t of teams || []) map.set(Number(t.id), t);
    return map;
  }, [teams]);

  useEffect(() => {
    const listT = readJsonFromLocalStorage(TORNEOS_STORAGE_KEY, []);
    const safeT = Array.isArray(listT) ? listT : [];
    const found = safeT.find((t) => String(t?.id) === String(torneoId));
    setTorneo(found ?? null);

    const parsedTeams = readJsonFromLocalStorage(TEAMS_STORAGE_KEY, []);
    setTeams(Array.isArray(parsedTeams) ? parsedTeams : []);

    const storageKey = `ListaEncuentros-${String(torneoId)}.json`;
    setStore(readJsonFromLocalStorage(storageKey, {}));
  }, [torneoId]);

  useEffect(() => {
    const parsedJugadores = readJsonFromLocalStorage(JUGADORES_STORAGE_KEY, []);
    setJugadores(Array.isArray(parsedJugadores) ? parsedJugadores : []);
  }, []);

  const participantTeamIds = useMemo(() => {
    if (!torneo) return [];
    const ids = Array.isArray(torneo.selectedTeamIds) ? torneo.selectedTeamIds : [];
    return ids.map((x) => Number(x)).filter((x) => !Number.isNaN(x));
  }, [torneo]);

  const rounds = useMemo(() => {
    if (!torneo) return [];
    return generateLigaIdaVuelta(participantTeamIds);
  }, [torneo, participantTeamIds]);

  const currentMatch = useMemo(() => {
    const rNum = Number(round);
    const idxNum = Number(matchIndex);
    const roundObj = rounds.find((r) => Number(r.round) === rNum);
    const match = roundObj?.matches?.[idxNum];
    if (!match) return null;
    return { homeId: Number(match.home), awayId: Number(match.away) };
  }, [round, matchIndex, rounds]);

  const matchKey = useMemo(() => {
    return getMatchKey({ torneoId, round, matchIndex });
  }, [torneoId, round, matchIndex]);

  const existing = store?.[matchKey] ?? {};

  // marcador desde store
  const marcadorLocal = Number(existing?.marcadorLocal ?? 0);
  const marcadorAway = Number(existing?.marcadorAway ?? 0);
  const finalizado = existing?.finalizado === true;

  useEffect(() => {
    setGoles(Array.isArray(existing?.goles) ? existing?.goles : []);
  }, [matchKey]);

  const [jugadorGoleadorIdLocal, setJugadorGoleadorIdLocal] = useState('');
  const [jugadorAsistenteIdLocal, setJugadorAsistenteIdLocal] = useState('');
  const [jugadorGoleadorIdAway, setJugadorGoleadorIdAway] = useState('');
  const [jugadorAsistenteIdAway, setJugadorAsistenteIdAway] = useState('');

  // Borrador local de pases para asegurar persistencia del histórico.
  // Clave: playerId (string) => pases (number)
  const [passesDraftByPlayerId, setPassesDraftByPlayerId] = useState({});

  // Rehidratar borrador desde el storage cuando cambie el match
  useEffect(() => {
    const next = { ...(existing?.passesByPlayerId ?? {}) };
    setPassesDraftByPlayerId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchKey]);



  // Para el selector de goleadores/asistentes, filtramos por equipo.
  const localId = existing?.localTeamId ?? currentMatch?.homeId ?? null;
  const awayId = existing?.awayTeamId ?? currentMatch?.awayId ?? null;

  const teamPlayersIdsByTeamId = useMemo(() => {
    const map = new Map();
    for (const t of teams || []) {
      const teamIdNum = t?.id != null ? Number(t.id) : null;
      if (teamIdNum == null || Number.isNaN(teamIdNum)) continue;

      const ids = Array.isArray(t?.jugadores) ? t.jugadores : [];
      const normalized = ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
      map.set(teamIdNum, normalized);
    }
    return map;
  }, [teams]);

  const jugadoresLocales = useMemo(() => {
    if (localId == null) return [];
    const allowedIds = teamPlayersIdsByTeamId.get(Number(localId)) ?? [];
    const allowedSet = new Set(allowedIds.map((x) => String(x)));
    return jugadores.filter((j) => allowedSet.has(String(j?.id ?? j?._id)));
  }, [jugadores, localId, teamPlayersIdsByTeamId]);

  const jugadoresVisitantes = useMemo(() => {
    if (awayId == null) return [];
    const allowedIds = teamPlayersIdsByTeamId.get(Number(awayId)) ?? [];
    const allowedSet = new Set(allowedIds.map((x) => String(x)));
    return jugadores.filter((j) => allowedSet.has(String(j?.id ?? j?._id)));
  }, [jugadores, awayId, teamPlayersIdsByTeamId]);

  // Si el usuario aún no ha seleccionado home/away en el store, lo guardamos cuando renderiza.
  useEffect(() => {
    const needsLocal = localId != null && existing?.localTeamId == null;
    const needsAway = awayId != null && existing?.awayTeamId == null;
    if (!needsLocal && !needsAway) return;

    const nextForMatch = { ...(existing ?? {}) };
    if (needsLocal) nextForMatch.localTeamId = localId;
    if (needsAway) nextForMatch.awayTeamId = awayId;

                      const storageKey = `ListaEncuentros-${String(torneoId)}.json`;
                      const next = { ...(store ?? {}), [matchKey]: nextForMatch };
    localStorage.setItem(storageKey, JSON.stringify(next, null, 2));
    setStore(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchKey, localId, awayId]);

  return (
    <div className="partido-futbol-page">
      <Link
        to={(() => {
          // Si el torneo es de estilo "liga", volvemos a TorneoLiga. En caso contrario, a TorneoEli.
          // Nota: "clasico" normaliza a "liga".
          try {
            const listT = readJsonFromLocalStorage(TORNEOS_STORAGE_KEY, []);
            const safeT = Array.isArray(listT) ? listT : [];
            const found = safeT.find((t) => String(t?.id) === String(torneoId));
            const rawStyle = (found?.style ?? found?.estilo ?? found?.estilo ?? '').toString().toLowerCase();
            const normalized = rawStyle === 'clasico' ? 'liga' : rawStyle;
            const isLiga = normalized === 'liga';
            return isLiga
              ? `/torneo-liga/${encodeURIComponent(String(torneoId))}`
              : `/torneo-eli/${encodeURIComponent(String(torneoId))}`;
          } catch {
            // fallback conservador
            return `/torneo-liga/${encodeURIComponent(String(torneoId))}`;
          }
        })()}
        className="partido-futbol-back"
      >
        ← Volver
      </Link>


      <div className="partido-futbol-shell">
        <div className="partido-futbol-scorebar" style={{ paddingTop: 6, paddingBottom: 6 }}>
          <div className="partido-futbol-pill">Torneo: {torneo?.name ?? '—'}</div>
          <div className="partido-futbol-pill">Ronda: {round} • Partido: {matchIndex}</div>
        </div>

        {/* Marcador simétrico */}
        <div
          style={{
            display: 'grid',
            marginBottom: 14,
            gridTemplateColumns: '1fr 140px 1fr',
            gap: 14,
            alignItems: 'center',
            marginTop: 10,
            padding: 6,
            flexWrap: 'wrap',
          }}
        >
          <div className="partido-futbol-team" style={{ textAlign: 'left' }}>
            <div className="partido-futbol-team-name">
              Local • {localId != null ? (teamMap.get(Number(localId))?.name ?? `Equipo #${localId}`) : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div
              className="partido-futbol-team-score"
              style={{ minWidth: 40, textAlign: 'right', fontSize: 54, fontWeight: 950, lineHeight: 1.0 }}
            >
              {marcadorLocal}
            </div>
            <div style={{ fontWeight: 950, color: '#737373', fontSize: 38, lineHeight: 1.0, marginTop: 4 }}>-</div>
            <div
              className="partido-futbol-team-score"
              style={{ minWidth: 40, textAlign: 'left', fontSize: 54, fontWeight: 950, lineHeight: 1.0 }}
            >
              {marcadorAway}
            </div>
          </div>

          <div className="partido-futbol-team" style={{ textAlign: 'right' }}>
            <div className="partido-futbol-team-name">
              Visitante • {awayId != null ? (teamMap.get(Number(awayId))?.name ?? `Equipo #${awayId}`) : '—'}
            </div>
          </div>
        </div>


        <div>
          {!finalizado && (
            <div>
              <div className="partido-futbol-section-title" style={{ marginBottom: 10 }}>
                Añadir goles
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Local */}
                <div style={{ border: '2px solid #e0e0e0', borderRadius: 12, padding: 12, background: 'rgba(248,249,250,0.95)' }}>
                  <div style={{ fontWeight: 950, color: '#737373', marginBottom: 10 }}>Local</div>

                  <form
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!jugadorGoleadorIdLocal) return;

                      const goleadorIdNum = Number(jugadorGoleadorIdLocal);
                      const asistenteIdNum = Number(jugadorAsistenteIdLocal);
                      if (!Number.isFinite(goleadorIdNum)) return;
                      if (!Number.isFinite(asistenteIdNum)) return;

                      const nowIso = new Date().toISOString();
                      const nextGoles = [
                        ...goles,
                        {
                          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                          equipo: 'local',
                          goleadorId: goleadorIdNum,
                          asistenteId: asistenteIdNum,
                          createdAt: nowIso,
                        },
                      ];

                      const nextForMatch = {
                        ...existing,
                        marcadorLocal: marcadorLocal + 1,
                        goles: nextGoles,
                        localTeamId: localId,
                        awayTeamId: awayId,
                      };

                      if (localId != null) nextForMatch.localTeamId = localId;
                      if (awayId != null) nextForMatch.awayTeamId = awayId;

                      const storageKey = `ListaEncuentros-${String(torneoId)}.json`;
                      const next = { ...(store ?? {}), [matchKey]: nextForMatch };
                      localStorage.setItem(storageKey, JSON.stringify(next, null, 2));
                      setStore(next);
                      setGoles(nextGoles);

                      setJugadorGoleadorIdLocal('');
                      setJugadorAsistenteIdLocal('');
                    }}
                  >
                    <div className="partido-futbol-field">
                      <label>Goleador</label>
                      <select value={jugadorGoleadorIdLocal} onChange={(e) => setJugadorGoleadorIdLocal(e.target.value)}>
                        <option value="">(Selecciona)</option>
                        {jugadoresLocales.map((j) => {
                          const id = j.id ?? j._id;
                          return (
                            <option key={j.id ?? j._id ?? j.nick ?? j.name} value={id}>
                              {j?.name ?? j?.nick ?? `Jugador #${j?.id}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="partido-futbol-field">
                      <label>Asistente</label>
                      <select value={jugadorAsistenteIdLocal} onChange={(e) => setJugadorAsistenteIdLocal(e.target.value)}>
                        <option value="">(Selecciona)</option>
                        {jugadoresLocales.map((j) => (
                          <option key={j.id ?? j._id ?? j.nick ?? j.name} value={j.id ?? j._id}>
                            {j.name ?? j.nick ?? `Jugador #${j.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="partido-futbol-actions" style={{ gridColumn: '1 / -1' }}>
                      <button
                        className="partido-futbol-btn partido-futbol-btn-primary"
                        type="submit"
                        disabled={!jugadorGoleadorIdLocal}
                        style={{ opacity: jugadorGoleadorIdLocal ? 1 : 0.6, cursor: jugadorGoleadorIdLocal ? 'pointer' : 'not-allowed' }}
                      >
                        + Gol
                      </button>
                    </div>
                  </form>
                </div>

                {/* Visitante */}
                <div style={{ border: '2px solid #e0e0e0', borderRadius: 12, padding: 12, background: 'rgba(248,249,250,0.95)' }}>
                  <div style={{ fontWeight: 950, color: '#737373', marginBottom: 10 }}>Visitante</div>

                  <form
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!jugadorGoleadorIdAway) return;

                      const goleadorIdNum = Number(jugadorGoleadorIdAway);
                      const asistenteIdNum = Number(jugadorAsistenteIdAway);
                      if (!Number.isFinite(goleadorIdNum)) return;
                      if (!Number.isFinite(asistenteIdNum)) return;

                      const nowIso = new Date().toISOString();
                      const nextGoles = [
                        ...goles,
                        {
                          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                          equipo: 'away',
                          goleadorId: goleadorIdNum,
                          asistenteId: asistenteIdNum,
                          createdAt: nowIso,
                        },
                      ];

                      const nextForMatch = {
                        ...existing,
                        marcadorAway: marcadorAway + 1,
                        goles: nextGoles,
                        localTeamId: localId,
                        awayTeamId: awayId,
                      };

                      if (localId != null) nextForMatch.localTeamId = localId;
                      if (awayId != null) nextForMatch.awayTeamId = awayId;

                      const storageKey = `${PARTIDOS_STORAGE_PREFIX}${String(torneoId)}.json`;
                      const next = { ...(store ?? {}), [matchKey]: nextForMatch };
                      localStorage.setItem(storageKey, JSON.stringify(next, null, 2));
                      setStore(next);
                      setGoles(nextGoles);

                      setJugadorGoleadorIdAway('');
                      setJugadorAsistenteIdAway('');
                    }}
                  >
                    <div className="partido-futbol-field">
                      <label>Goleador</label>
                      <select value={jugadorGoleadorIdAway} onChange={(e) => setJugadorGoleadorIdAway(e.target.value)}>
                        <option value="">(Selecciona)</option>
                        {jugadoresVisitantes.map((j) => {
                          const id = j.id ?? j._id;
                          return (
                            <option key={j.id ?? j._id ?? j.nick ?? j.name} value={id}>
                              {j?.name ?? j?.nick ?? `Jugador #${j?.id}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="partido-futbol-field">
                      <label>Asistente</label>
                      <select value={jugadorAsistenteIdAway} onChange={(e) => setJugadorAsistenteIdAway(e.target.value)}>
                        <option value="">(Selecciona)</option>
                        {jugadoresVisitantes.map((j) => (
                          <option key={j.id ?? j._id ?? j.nick ?? j.name} value={j.id ?? j._id}>
                            {j.name ?? j.nick ?? `Jugador #${j.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="partido-futbol-actions" style={{ gridColumn: '1 / -1' }}>
                      <button
                        className="partido-futbol-btn partido-futbol-btn-primary"
                        type="submit"
                        disabled={!jugadorGoleadorIdAway}
                        style={{ opacity: jugadorGoleadorIdAway ? 1 : 0.6, cursor: jugadorGoleadorIdAway ? 'pointer' : 'not-allowed' }}
                      >
                        + Gol
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
          {/* Pases */}
          <div style={{ marginTop: 14 }}>
            <div className="partido-futbol-section-title" style={{ marginBottom: 10 }}>
              Pases
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Local */}
              <div style={{ border: '2px solid #e0e0e0', borderRadius: 12, padding: 12, background: 'rgba(248,249,250,0.95)' }}>
                <div style={{ fontWeight: 950, color: '#737373', marginBottom: 10 }}>Local</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jugadoresLocales.length === 0 ? (
                    <div style={{ color: '#737373', fontWeight: 800 }}>(No hay jugadores)</div>
                  ) : (
                    jugadoresLocales.map((j) => {
                      const pid = j.id ?? j._id;
                      return (
                        <div key={pid} style={{ margin: 0 }}>
                          <div className="partido-futbol-pases-row">
                            <div style={{ fontWeight: 850, color: '#737373' }}>{j?.name ?? j?.nick ?? `Jugador #${j?.id}`}</div>
                            <input
                              className="partido-futbol-pases-input"
                              data-player-id={String(j?.id ?? j?._id)}
                              type="number"
                              step={1}
                              min={0}
                              value={Number(passesDraftByPlayerId?.[String(j?.id ?? j?._id)] ?? existing?.passesByPlayerId?.[String(j?.id ?? j?._id)] ?? 0)}
                              disabled={finalizado}
                              onChange={(e) => {
                                const pid = String(j?.id ?? j?._id);
                                const v = Number(e.target.value);
                                setPassesDraftByPlayerId((prev) => ({
                                  ...prev,
                                  [pid]: Number.isFinite(v) ? v : 0,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Visitante */}
              <div style={{ border: '2px solid #e0e0e0', borderRadius: 12, padding: 12, background: 'rgba(248,249,250,0.95)' }}>
                <div style={{ fontWeight: 950, color: '#737373', marginBottom: 10 }}>Visitante</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jugadoresVisitantes.length === 0 ? (
                    <div style={{ color: '#737373', fontWeight: 800 }}>(No hay jugadores)</div>
                  ) : (
                    jugadoresVisitantes.map((j) => {
                      const pid = j.id ?? j._id;
                      return (
                        <div key={pid} style={{ margin: 0 }}>
                          <div className="partido-futbol-pases-row">
                            <div style={{ fontWeight: 850, color: '#737373' }}>{j?.name ?? j?.nick ?? `Jugador #${j?.id}`}</div>
                            <input
                              className="partido-futbol-pases-input"
                              data-player-id={String(j?.id ?? j?._id)}
                              type="number"
                              step={1}
                              min={0}
                              value={Number(passesDraftByPlayerId?.[String(j?.id ?? j?._id)] ?? existing?.passesByPlayerId?.[String(j?.id ?? j?._id)] ?? 0)}
                              disabled={finalizado}
                              onChange={(e) => {
                                const pid = String(j?.id ?? j?._id);
                                const v = Number(e.target.value);
                                setPassesDraftByPlayerId((prev) => ({
                                  ...prev,
                                  [pid]: Number.isFinite(v) ? v : 0,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>


        {/* Finalizar Partido (visible siempre) */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="partido-futbol-btn partido-futbol-btn-primary"
            onClick={() => {
              const storageKey = `ListaEncuentros-${String(torneoId)}.json`;
              const nextForMatch = {
                ...(store?.[matchKey] ?? {}),
                finalizado: true,
                localTeamId: localId,
                awayTeamId: awayId,
                goles,
                marcadorLocal,
                marcadorAway,
              };

              const next = { ...(store ?? {}), [matchKey]: nextForMatch };
              localStorage.setItem(storageKey, JSON.stringify(next, null, 2));
              setStore(next);

              // Actualizar stats de jugadores en players.json
              const playersRaw = localStorage.getItem(JUGADORES_STORAGE_KEY);
              const playersParsed = playersRaw ? JSON.parse(playersRaw) : [];
              const currentPlayers = Array.isArray(playersParsed) ? playersParsed : [];

              const incByPlayerId = {};
              const passesByPlayerId = {};

              // Pases desde el borrador controlado (no del DOM) para que el histórico sea consistente.
              for (const [pid, rawPasses] of Object.entries(passesDraftByPlayerId ?? {})) {
                const safePasses = Number.isFinite(Number(rawPasses)) ? Number(rawPasses) : 0;

                // Acumulación en players.json (histórico)
                incByPlayerId[String(pid)] = incByPlayerId[String(pid)] ?? { goals: 0, assists: 0, passes: 0 };
                incByPlayerId[String(pid)].passes += safePasses;

                // Persistencia exacta en ListaEncuentros para re-entrar luego
                passesByPlayerId[String(pid)] = safePasses;
              }

              // Guardar también en el match (ListaEncuentros) el valor exacto por jugador
              nextForMatch.passesByPlayerId = passesByPlayerId;

              // Estructuras de compatibilidad / lectura en otras pantallas:
              // - pasesLog: array [{ playerId, passes }]
              // - passesLog: alias con el mismo contenido (si alguna pantalla lo usa)
              nextForMatch.pasesLog = Object.entries(passesByPlayerId).map(([playerId, passes]) => ({
                playerId,
                passes: Number.isFinite(passes) ? passes : 0,
              }));
              nextForMatch.passesLog = nextForMatch.pasesLog;





              // Goles/Asistencias
              for (const g of goles) {
                const goleadorId = g?.goleadorId;
                const asistenteId = g?.asistenteId;

                if (goleadorId != null) {
                  incByPlayerId[String(goleadorId)] = incByPlayerId[String(goleadorId)] ?? { goals: 0, assists: 0, passes: 0 };
                  incByPlayerId[String(goleadorId)].goals += 1;
                }
                if (asistenteId != null) {
                  incByPlayerId[String(asistenteId)] = incByPlayerId[String(asistenteId)] ?? { goals: 0, assists: 0, passes: 0 };
                  incByPlayerId[String(asistenteId)].assists += 1;
                }
              }

              const updatedPlayers = currentPlayers.map((p) => {
                const pid = String(p?.id ?? p?._id ?? '');
                if (!pid) return p;
                const inc = incByPlayerId[pid];
                if (!inc) return p;

                const prevStats = p?.stats && typeof p.stats === 'object' ? p.stats : {};
                return {
                  ...p,
                  stats: {
                    ...prevStats,
                    goals: Number(prevStats.goals ?? 0) + inc.goals,
                    assists: Number(prevStats.assists ?? 0) + inc.assists,
                    passes: Number(prevStats.passes ?? 0) + inc.passes,
                  },
                };
              });

              localStorage.setItem(JUGADORES_STORAGE_KEY, JSON.stringify(updatedPlayers, null, 2));
            }}
            disabled={finalizado}
            style={finalizado ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            {finalizado ? 'Partido finalizado' : 'Finalizar Partido'}
          </button>
        </div>
      </div>
    </div>
  );
}

