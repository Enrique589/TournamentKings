import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import './TorneoLiga.css';

const TORNEOS_STORAGE_KEY = 'torneos.json';
const TEAMS_STORAGE_KEY = 'teams.json';

const BYE_ID = '__BYE__';

const normalizeTorneoStyle = (torneo) => {
  const rawStyle = (torneo?.style ?? torneo?.estilo ?? '').toString().toLowerCase();
  return rawStyle === 'clasico' ? 'liga' : rawStyle;
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES');
};

const toTeamMap = (teams) => {
  const map = new Map();
  for (const t of teams || []) map.set(Number(t.id), t);
  return map;
};

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

// Liga: N-1 jornadas (una vuelta) + vuelta (ida/vuelta)
function generateRoundRobinSingleRound(teamIds) {
  const ids = [...teamIds];
  if (ids.length < 2) return [];

  const n = ids.length;
  const isOdd = n % 2 === 1;
  const size = isOdd ? n + 1 : n;

  if (isOdd) ids.push(BYE_ID);

  const rounds = size - 1;
  const half = size / 2;
  const circle = [...ids];

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

    // Rotación idéntica a CreateTournament
    const last = circle.pop();
    circle.splice(1, 0, last);
  }

  return result;
}

function generateLigaIdaVuelta(teamIds) {
  const single = generateRoundRobinSingleRound(teamIds);
  const secondLeg = single.map((rd) => ({
    round: rd.round + single.length,
    matches: rd.matches.map((m) => ({ home: m.away, away: m.home }))
  }));
  return [...single, ...secondLeg];
}

const getMatchKey = ({ torneoId, round, matchIndex }) => {
  return `${String(torneoId ?? '')}::${String(round)}::${String(matchIndex)}`;
};

function TorneoLiga() {
  const { torneoId } = useParams();

  const [torneo, setTorneo] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const listT = readJsonFromLocalStorage(TORNEOS_STORAGE_KEY, []);
    const safeT = Array.isArray(listT) ? listT : [];
    const found = safeT.find((t) => String(t?.id) === String(torneoId));
    setTorneo(found ?? null);

    const parsedTeams = readJsonFromLocalStorage(TEAMS_STORAGE_KEY, []);
    setTeams(Array.isArray(parsedTeams) ? parsedTeams : []);
  }, [torneoId]);

  const teamMap = useMemo(() => toTeamMap(teams), [teams]);

  const participantTeamIds = useMemo(() => {
    if (!torneo) return [];
    const ids = Array.isArray(torneo.selectedTeamIds) ? torneo.selectedTeamIds : [];
    return ids.map((x) => Number(x)).filter((x) => !Number.isNaN(x));
  }, [torneo]);

  const rounds = useMemo(() => {
    if (!torneo) return [];
    return generateLigaIdaVuelta(participantTeamIds);
  }, [torneo, participantTeamIds]);

  const partidosStorageKey = useMemo(() => {
    if (!torneo?.id) return null;
    return `ListaEncuentros-${String(torneo.id)}.json`;
  }, [torneo?.id]);


  const partidosByMatchKey = useMemo(() => {
    if (!partidosStorageKey) return {};
    return readJsonFromLocalStorage(partidosStorageKey, {});
  }, [partidosStorageKey]);

  // Puntuación simple: usa solo partidos finalizados en localStorage.
  // Mantiene el requisito del enunciado (mostrar puntuación) aunque no haya un modelo previo.
  const leaderboard = useMemo(() => {
    const scores = new Map();
    for (const id of participantTeamIds) scores.set(id, { pts: 0 });

    for (const r of rounds) {
      for (let idx = 0; idx < r.matches.length; idx++) {
        const m = r.matches[idx];
        const matchKey = getMatchKey({ torneoId: torneo?.id, round: r.round, matchIndex: idx });
        const existing = partidosByMatchKey?.[matchKey];
        if (!existing?.finalizado) continue;

        const homeId = Number(m.home);
        const awayId = Number(m.away);
        const marcadorLocal = Number(existing?.marcadorLocal ?? 0);
        const marcadorAway = Number(existing?.marcadorAway ?? 0);

        const isDraw = marcadorLocal === marcadorAway;
        const home = scores.get(homeId);
        const away = scores.get(awayId);
        if (!home || !away) continue;

        if (isDraw) {
          home.pts += 1;
          away.pts += 1;
        } else if (marcadorLocal > marcadorAway) {
          home.pts += 3;
        } else {
          away.pts += 3;
        }
      }
    }

    return participantTeamIds.map((id) => ({ teamId: id, pts: scores.get(id)?.pts ?? 0 }));
  }, [participantTeamIds, rounds, partidosByMatchKey, torneo?.id]);

  const championTeamId = useMemo(() => {
    if (!torneo?.id) return null;

    // Marcamos campeón SOLO cuando todos los encuentros de la liga estén finalizados.
    // Si algún partido no está finalizado, no mostramos campeón.
    for (const r of rounds) {
      for (let idx = 0; idx < r.matches.length; idx++) {
        const m = r.matches[idx];
        const matchKey = getMatchKey({ torneoId: torneo?.id, round: r.round, matchIndex: idx });
        const existing = partidosByMatchKey?.[matchKey];
        if (existing?.finalizado !== true) return null;
      }
    }

    if (!leaderboard.length) return null;

    // Si hay empate, resaltamos el primero en la lista ordenada por pts desc
    const sorted = [...leaderboard].sort((a, b) => b.pts - a.pts);
    const top = sorted[0];
    return top?.teamId ?? null;
  }, [leaderboard, rounds, partidosByMatchKey, torneo?.id]);


  if (!torneo) {
    return (
      <div className="torneo-liga-page">
        <Link to="/lista-torneos" className="torneo-liga-back">← Volver a torneos</Link>
        <div className="torneo-liga-card torneo-liga-empty">Torneo no encontrado.</div>
      </div>
    );
  }

  const style = normalizeTorneoStyle(torneo);


  return (
    <div className="torneo-liga-page">
      <Link to="/lista-torneos" className="torneo-liga-back">← Volver a torneos</Link>

      <div className="torneo-liga-header">
        <h1 className="torneo-liga-title">{torneo.name ?? 'Torneo'}</h1>
        <div className="torneo-liga-meta">
          <div className="torneo-liga-pill">Estilo: {style || '—'}</div>
          <div className="torneo-liga-pill">Disciplina: {torneo.discipline ?? torneo.disciplina ?? '—'}</div>
          <div className="torneo-liga-pill">Fecha: {formatDate(torneo.date ?? torneo.createdAt)}</div>
        </div>
      </div>

      <div className="torneo-liga-grid">
        <section className="torneo-liga-card">
          <h2 className="torneo-liga-section-title">Equipos participantes</h2>
          <ul className="torneo-liga-team-list">
            {participantTeamIds.map((id) => {
              const t = teamMap.get(id);
              const score = leaderboard.find((x) => x.teamId === id);
              const isChampionTeam = championTeamId != null && Number(championTeamId) === Number(id);
              return (
                <li
                  key={id}
                  className="torneo-liga-team-item"
                  style={
                    isChampionTeam
                      ? {
                          borderColor: '#d4af37',
                          background: 'rgba(212,175,55,0.14)',
                        }
                      : undefined
                  }
                >
                  <span
                    className="torneo-liga-team-name"
                    style={isChampionTeam ? { color: '#d4af37', fontWeight: 950 } : undefined}
                  >
                    {t?.name ?? `Equipo #${id}`}
                    {isChampionTeam ? ' (Campeón)' : ''}
                  </span>
                  <span className="torneo-liga-team-pts">{score?.pts ?? 0} pts</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="torneo-liga-card">
          <h2 className="torneo-liga-section-title">Encuentros previstos</h2>
          <div className="torneo-liga-rounds">
            {rounds.map((r) => (
              <div key={r.round} className="torneo-liga-round">
                <div className="torneo-liga-round-title">Ronda {r.round}</div>
                <div className="torneo-liga-matches">
                  {r.matches.map((m, idx) => {
                    const homeId = Number(m.home);
                    const awayId = Number(m.away);
                    const home = teamMap.get(homeId);
                    const away = teamMap.get(awayId);

                    const matchKey = getMatchKey({ torneoId: torneo?.id, round: r.round, matchIndex: idx });
                    const existing = partidosByMatchKey?.[matchKey];
                    const isFinalizado = existing?.finalizado === true;

                    // Resaltar ganador (si hay marcador)
                    const ganadorLocal = isFinalizado && Number(existing?.marcadorLocal ?? NaN) > Number(existing?.marcadorAway ?? NaN);
                    const ganadorVisitante = isFinalizado && Number(existing?.marcadorAway ?? NaN) > Number(existing?.marcadorLocal ?? NaN);


                    const discipline = (torneo?.discipline ?? torneo?.disciplina ?? '').toString().toLowerCase();
                    const isLol = discipline.includes('league of legends') || discipline.includes('lol');

                    const to = isLol
                      ? `/partido-lol/${encodeURIComponent(String(torneo?.id))}/${encodeURIComponent(String(r.round))}/${encodeURIComponent(String(idx))}`
                      : `/partido-futbol/${encodeURIComponent(String(torneo?.id))}/${encodeURIComponent(String(r.round))}/${encodeURIComponent(String(idx))}`;

                    return (
                    <Link
                        key={idx}
                        to={to}
                        className={`torneo-liga-match ${isFinalizado ? 'torneo-liga-match-finalizado' : ''}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <div
                          className="torneo-liga-match-team"
                          style={ganadorLocal ? { color: '#d4af37', fontWeight: 950 } : undefined}
                        >
                          {home?.name ?? `Equipo #${homeId}`}
                        </div>
                        <div className="torneo-liga-match-vs">vs</div>
                        <div
                          className="torneo-liga-match-team torneo-liga-match-away"
                          style={ganadorVisitante ? { color: '#d4af37', fontWeight: 950 } : undefined}
                        >
                          {away?.name ?? `Equipo #${awayId}`}
                        </div>
                      </Link>

                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TorneoLiga;

