import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import './TorneoLiga.css';

const readJsonFromLocalStorageCached = (key, fallback) => {
  try {
    return readJsonFromLocalStorage(key, fallback);
  } catch {
    return fallback;
  }
};


const TORNEOS_STORAGE_KEY = 'torneos.json';
const TEAMS_STORAGE_KEY = 'teams.json';
const PARTIDOS_STORAGE_PREFIX = 'ListaEncuentros-';


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

const BYE_ID = '__BYE__';

const getMatchKey = ({ torneoId, round, matchIndex }) => {
  return `${String(torneoId ?? '')}::${String(round)}::${String(matchIndex)}`;
};

function generateEliminationBracket(teamIds) {
  const ids = [...teamIds];
  if (ids.length < 2) return [];

  // Bracket estándar a potencia de 2 con BYE
  const bracketSize = 1 << Math.ceil(Math.log2(ids.length));
  const full = [...ids];
  while (full.length < bracketSize) full.push(BYE_ID);

  const roundsCount = Math.log2(bracketSize);
  const rounds = [];

  // Representamos el bracket por “promesas” del ganador para que
  // las rondas siguientes solo aparezcan si hay partidos reales.
  let currentSlots = [];
  for (let i = 0; i < full.length; i += 2) {
    currentSlots.push({ home: full[i], away: full[i + 1] });
  }

  for (let r = 0; r < roundsCount; r++) {
    const matchCount = currentSlots.length;
    const matches = [];

    for (let i = 0; i < matchCount; i++) {
      const s = currentSlots[i];
      const homeId = s.home;
      const awayId = s.away;

      const isByeMatch = homeId === BYE_ID && awayId === BYE_ID;
      const hasRealTeam = homeId !== BYE_ID || awayId !== BYE_ID;

      if (!hasRealTeam || isByeMatch) continue;
      if (homeId === BYE_ID || awayId === BYE_ID) continue;

      matches.push({ homeId, awayId, isByeMatch: false });
    }

    rounds.push({ round: r + 1, matches });

    if (r === roundsCount - 1) break;

    const winners = [];
    for (let i = 0; i < matchCount; i++) {
      const s = currentSlots[i];
      const homeId = s.home;
      const awayId = s.away;

      if (homeId === BYE_ID && awayId === BYE_ID) {
        winners.push(BYE_ID);
      } else if (homeId === BYE_ID) {
        winners.push(awayId);
      } else if (awayId === BYE_ID) {
        winners.push(homeId);
      } else {
        winners.push(`WIN_R${r + 1}_M${i}`);
      }
    }

    currentSlots = [];
    const nextMatchCount = matchCount / 2;
    for (let i = 0; i < nextMatchCount; i++) {
      currentSlots.push({ home: winners[i * 2], away: winners[i * 2 + 1] });
    }
  }

  return rounds.filter((r) => (r.matches || []).length > 0);
}

// Nota: ya no se usa la lógica de “sin derrotas”




function normalizeTorneoStyle(torneo) {
  const rawStyle = (torneo?.style ?? torneo?.estilo ?? '').toString().toLowerCase();
  return rawStyle;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES');
}

const toTeamMap = (teams) => {
  const map = new Map();
  for (const t of teams || []) map.set(Number(t.id), t);
  return map;
};

export default function TorneoEli() {
  const { torneoId } = useParams();

  const [torneo, setTorneo] = useState(null);
  const [teams, setTeams] = useState([]);
  const [bracketRounds, setBracketRounds] = useState([]);
  const [partidosByMatchKey, setPartidosByMatchKey] = useState({});

  useEffect(() => {
    const listT = readJsonFromLocalStorage(TORNEOS_STORAGE_KEY, []);
    const safeT = Array.isArray(listT) ? listT : [];
    const found = safeT.find((t) => String(t?.id) === String(torneoId));
    setTorneo(found ?? null);

    const parsedTeams = readJsonFromLocalStorage(TEAMS_STORAGE_KEY, []);
    setTeams(Array.isArray(parsedTeams) ? parsedTeams : []);
  }, [torneoId]);

  const teamMap = useMemo(() => toTeamMap(teams), [teams]);

  const champion = useMemo(() => {
  return getChampion(
    bracketRounds,
    partidosByMatchKey,
    torneo?.id,
    teamMap
  );
}, [bracketRounds, partidosByMatchKey, torneo?.id, teamMap]);

  const participantTeamIds = useMemo(() => {
    if (!torneo) return [];
    const ids = Array.isArray(torneo.selectedTeamIds) ? torneo.selectedTeamIds : [];
    return ids.map((x) => Number(x)).filter((x) => !Number.isNaN(x));
  }, [torneo]);

  useEffect(() => {
    const resolved = structuredClone(generateEliminationBracket(participantTeamIds));

    for (let r = 1; r < resolved.length; r++) {
      const round = resolved[r];

      round.matches = round.matches.map((match) => {
        let homeId = match.homeId;
        let awayId = match.awayId;

        if (typeof homeId === 'string' && homeId.startsWith('WIN_')) {
          const parts = homeId.match(/WIN_R(\d+)_M(\d+)/);
          if (parts) {
            const prevRound = Number(parts[1]);
            const prevMatch = Number(parts[2]);

            const key = getMatchKey({
              torneoId: torneo?.id,
              round: prevRound,
              matchIndex: prevMatch,
            });

            const winner = getWinnerFromMatch(partidosByMatchKey[key]);
            if (winner != null) homeId = winner;
          }
        }

        if (typeof awayId === 'string' && awayId.startsWith('WIN_')) {
          const parts = awayId.match(/WIN_R(\d+)_M(\d+)/);
          if (parts) {
            const prevRound = Number(parts[1]);
            const prevMatch = Number(parts[2]);

            const key = getMatchKey({
              torneoId: torneo?.id,
              round: prevRound,
              matchIndex: prevMatch,
            });

            const winner = getWinnerFromMatch(partidosByMatchKey[key]);
            if (winner != null) awayId = winner;
          }
        }

        return { ...match, homeId, awayId };
      });
    }

    setBracketRounds(resolved);
  }, [participantTeamIds, partidosByMatchKey, torneo?.id]);





  useEffect(() => {

    if (!torneo?.id) return;

    const storageKey = `${PARTIDOS_STORAGE_PREFIX}${String(torneo.id)}.json`;
    // Torneos de este sistema guardan los encuentros bajo el mismo prefijo que TorneoLiga/partidos de futbol.
    // Usamos el lector existente para mantener compatibilidad.
    setPartidosByMatchKey(readJsonFromLocalStorageCached(storageKey, {}));
  }, [torneo?.id]);

  function getWinnerFromMatch(existing) {
    if (!existing?.finalizado) return null;

    const local = Number(existing?.marcadorLocal ?? 0);
    const away = Number(existing?.marcadorAway ?? 0);

    if (local > away) return Number(existing.localTeamId);
    if (away > local) return Number(existing.awayTeamId);

    return null;
  }



  function getChampion(bracketRounds, partidosByMatchKey, torneoId, teamMap) {
  if (!bracketRounds.length) return null;

  // En esta vista marcamos como campeón SOLO cuando el torneo esté resuelto.
  // Consideramos “resuelto” cuando la FINAL está finalizada.

  const lastRound = bracketRounds[bracketRounds.length - 1];
  if (!lastRound?.matches?.length) return null;

  // Último partido de la última ronda = FINAL
  const finalMatchIndex = lastRound.matches.length - 1;

  const finalKey = getMatchKey({
    torneoId,
    round: lastRound.round,
    matchIndex: finalMatchIndex,
  });

  const finalData = partidosByMatchKey?.[finalKey];

  const isFinalResolved = finalData?.finalizado === true;
  if (!isFinalResolved) return null;

  const winnerId = getWinnerFromMatch(finalData);
  if (winnerId == null) return null;

  return teamMap.get(Number(winnerId)) ?? null;
}



  const style = normalizeTorneoStyle(torneo);

  return (
    <div className="torneo-liga-page">
      <Link to="/lista-torneos" className="torneo-liga-back">
        ← Volver
      </Link>

      <div className="torneo-liga-header">
        <h1 className="torneo-liga-title">{torneo?.name ?? 'Torneo'}</h1>
        <div className="torneo-liga-meta">
          <div className="torneo-liga-pill">Estilo: {style || '—'}</div>
          <div className="torneo-liga-pill">Disciplina: {torneo?.discipline ?? torneo?.disciplina ?? '—'}</div>
          <div className="torneo-liga-pill">Fecha: {formatDate(torneo?.date ?? torneo?.createdAt)}</div>

        </div>
      </div>

      <div className="torneo-liga-grid">
        <section className="torneo-liga-card">
          <h2 className="torneo-liga-section-title">Equipos participantes</h2>
          <ul className="torneo-liga-team-list">
            {participantTeamIds.map((id) => {
              const t = teamMap.get(id);
              const isChampionTeam = champion?.id != null && Number(champion.id) === Number(id);

              return (
                <li
                  key={id}
                  className="torneo-liga-team-item"
                  style={
                    isChampionTeam
                      ? {
                          border: '2px solid #d4af37',
                          background: '#f7f0d6',
                          borderRadius: '12px',
                          padding: '10px 12px',
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
                </li>
              );
            })}
          </ul>
        </section>

        <section className="torneo-liga-card">
          <h2 className="torneo-liga-section-title">Encuentros previstos</h2>
          <div className="torneo-liga-rounds">
            {bracketRounds.map((r) => (
              <div key={r.round} className="torneo-liga-round">
                <div className="torneo-liga-round-title">Ronda {r.round}</div>
                <div className="torneo-liga-matches">
                  {r.matches.map((m, idx) => {
                    const homeId = m?.homeId != null && m.homeId !== '__BYE__' ? Number(m.homeId) : null;
                    const awayId = m?.awayId != null && m.awayId !== '__BYE__' ? Number(m.awayId) : null;


                    const matchKey = getMatchKey({ torneoId: torneo?.id, round: r.round, matchIndex: idx });
                    const existing = partidosByMatchKey?.[matchKey];
                    const isByeMatch = m?.homeId === '__BYE__' || m?.awayId === '__BYE__';
                    const isFinalizado = isByeMatch || existing?.finalizado === true;


                    const ganadorLocal = isFinalizado && Number(existing?.marcadorLocal ?? NaN) > Number(existing?.marcadorAway ?? NaN);
                    const ganadorVisitante = isFinalizado && Number(existing?.marcadorAway ?? NaN) > Number(existing?.marcadorLocal ?? NaN);


                    const discipline = (torneo?.discipline ?? torneo?.disciplina ?? '').toString().toLowerCase();
                    const isLol = discipline.includes('league of legends') || discipline.includes('lol');

                    const to = isLol
                      ? `/partido-lol/${encodeURIComponent(String(torneo?.id))}/${encodeURIComponent(String(r.round))}/${encodeURIComponent(String(idx))}`
                      : `/partido-futbol/${encodeURIComponent(String(torneo?.id))}/${encodeURIComponent(String(r.round))}/${encodeURIComponent(String(idx))}`;



                    const isBye = m?.isByeMatch === true || isByeMatch;

                    // No generar/mostrar encuentros contra BYE (descanso)
                    if (isBye) {
                      return null;
                    }

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
                          {teamMap.get(homeId)?.name ?? (homeId != null ? `Equipo #${homeId}` : '—')}

                        </div>
                        <div className="torneo-liga-match-vs">vs</div>
                        <div
                          className="torneo-liga-match-team torneo-liga-match-away"
                          style={ganadorVisitante ? { color: '#d4af37', fontWeight: 950 } : undefined}
                        >
                          {teamMap.get(awayId)?.name ?? `Equipo #${awayId}`}
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

