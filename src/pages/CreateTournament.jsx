import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CreateTournament.css';

function CreateTournament() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    style: 'liga',
    numTeams: 2,
    selectedTeamIds: []
  });


  const TEAMS_STORAGE_KEY = 'teams.json';
  const TORNEOS_STORAGE_KEY = 'torneos.json';

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (!raw) {
        setTeams([]);
        setFormData((prev) => ({ ...prev, selectedTeamIds: [] }));
        return;
      }
      const parsed = JSON.parse(raw);
      setTeams(Array.isArray(parsed) ? parsed : []);
    } catch {
      setTeams([]);
    }
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'numTeams' ? Number(value) : value
    }));
  };

  const handleTeamsSelectChange = (index, value) => {
    const teamId = Number(value);
    setFormData((prev) => {
      const next = [...prev.selectedTeamIds];
      next[index] = teamId;
      return { ...prev, selectedTeamIds: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedTeamIds = (formData.selectedTeamIds || []).filter((id) => id != null && id !== '');

    const newTournament = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: formData.name,
      date: formData.date || new Date().toISOString().slice(0, 10),
      style: formData.style || 'liga',

      discipline: formData.discipline || 'Futbol',
      createdAt: new Date().toISOString(),
      selectedTeamIds,

      // para que ListaTorneos pueda mostrar "Participantes"
      numTeams: selectedTeamIds.length,
      participantsCount: selectedTeamIds.length
    };

    // Guardar torneo
    try {
      const raw = localStorage.getItem(TORNEOS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const next = [newTournament, ...list];
      localStorage.setItem(TORNEOS_STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Error guardando torneo:', err);
    }

    // Actualizar estadísticas persistidas en equipos.json:
    // Guardar el número de torneos en los que ha participado cada equipo.
    try {
      const teamsRaw = localStorage.getItem(TEAMS_STORAGE_KEY);
      const parsedTeams = teamsRaw ? JSON.parse(teamsRaw) : [];
      const teamsList = Array.isArray(parsedTeams) ? parsedTeams : [];

      const selectedTeamIdsStr = (selectedTeamIds || []).map((id) => String(id));

      const updatedTeams = teamsList.map((t) => {
        const isParticipant = selectedTeamIdsStr.includes(String(t?.id));
        if (!isParticipant) return t;

        const current = Number(t?.torneos ?? 0);
        return {
          ...t,
          torneos: Number.isFinite(current) ? current + 1 : 1
        };
      });

      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(updatedTeams, null, 2));
    } catch (err) {
      console.error('Error actualizando torneos en equipos:', err);
    }


    // Crear también el JSON de "encuentros" (partidos) por torneo.
    // Guardamos el catálogo de partidos en localStorage con la misma convención que el resto del sistema.
    // Luego, MarcadorFutbol usará el mismo storage para saber qué partidos existen y su estado finalizado.
    try {
      const torneoIdStr = String(newTournament.id);
      const partidosStorageKey = `ListaEncuentros-${torneoIdStr}.json`;


      // Generar encuentros esperados con el mismo algoritmo que en Torneo.jsx.
      // Importamos funciones inline mínimas: liga ida/vuelta o eliminatorias.
      const selectedIds = Array.isArray(newTournament.selectedTeamIds)
        ? newTournament.selectedTeamIds.map((x) => Number(x)).filter((x) => !Number.isNaN(x))
        : [];

      const style = (newTournament.style ?? '').toString().toLowerCase();
      const styleNormalized = style === 'clasico' ? 'liga' : style;

      const generateRoundRobinSingleRound = (teamIds) => {
        const ids = [...teamIds];
        if (ids.length < 2) return [];

        const isOdd = ids.length % 2 === 1;
        const size = isOdd ? ids.length + 1 : ids.length;
        const byeId = '__BYE__';
        if (isOdd) ids.push(byeId);

        const rounds = size - 1;
        const half = size / 2;
        const circle = [...ids];

        const result = [];
        for (let r = 0; r < rounds; r++) {
          const matches = [];
          for (let i = 0; i < half; i++) {
            const a = circle[i];
            const b = circle[size - 1 - i];
            if (a !== byeId && b !== byeId) matches.push({ home: a, away: b });
          }
          result.push({ round: r + 1, matches });
          const last = circle.pop();
          circle.splice(1, 0, last);
        }
        return result;
      };

      const generateLigaIdaVuelta = (teamIds) => {
        const single = generateRoundRobinSingleRound(teamIds);
        const secondLeg = single.map((rd) => ({
          round: rd.round + single.length,
          matches: rd.matches.map((m) => ({ home: m.away, away: m.home }))
        }));
        return [...single, ...secondLeg];
      };

      const nextPowerOfTwo = (n) => {
        let p = 1;
        while (p < n) p <<= 1;
        return p;
      };

      const generateEliminationBracket = (teamIds) => {
        const ids = [...teamIds];
        if (ids.length < 2) return [];

        const bracketSize = nextPowerOfTwo(ids.length);
        const roundsCount = Math.log2(bracketSize);
        const byeId = '__BYE__';

        while (ids.length < bracketSize) ids.push(byeId);

        let currentTeams = ids;
        const rounds = [];

        for (let r = 0; r < roundsCount; r++) {
          const matchesCount = bracketSize / Math.pow(2, r + 1);
          const matches = [];

          for (let i = 0; i < matchesCount; i++) {
            const homeId = currentTeams[i * 2];
            const awayId = currentTeams[i * 2 + 1];
            const isByeMatch = homeId === byeId || awayId === byeId;
            matches.push({ homeId, awayId, isByeMatch });
          }

          rounds.push({ round: r + 1, matches });

          const winners = [];
          for (const m of matches) {
            if (m.homeId === byeId && m.awayId === byeId) winners.push(byeId);
            else if (m.homeId === byeId) winners.push(m.awayId);
            else if (m.awayId === byeId) winners.push(m.homeId);
            else winners.push(`WIN_R${r + 1}_M${winners.length}`);
          }
          currentTeams = winners;
        }

        return rounds;
      };

      const visibleTeamIds = new Set(selectedIds);
      const store = {};

      const rounds = styleNormalized === 'eliminatorias'
        ? generateEliminationBracket(selectedIds)
            .map((r) => {
              // En eliminatorias queremos que el catálogo de "ListaEncuentros" tenga SOLO matches reales.
              // Si un match contiene BYE, el torneo debe tener descanso (no hay encuentro contra BYE).
              const matches = (r.matches || []).filter((m) => {
                if (!m) return false;
                if (m.homeId === byeId || m.awayId === byeId) return false;
                return visibleTeamIds.has(Number(m.homeId)) && visibleTeamIds.has(Number(m.awayId));
              });
              return { ...r, matches };
            })
            .filter((r) => (r.matches || []).length > 0)
        : generateLigaIdaVuelta(selectedIds)
            .map((r) => {
              const matches = (r.matches || []).filter((m) => {
                if (!m) return false;
                return visibleTeamIds.has(Number(m.home)) && visibleTeamIds.has(Number(m.away));
              });
              return { ...r, matches };
            })
            .filter((r) => (r.matches || []).length > 0);


      for (const r of rounds) {
        for (let matchIndex = 0; matchIndex < (r.matches || []).length; matchIndex++) {
          const matchKey = `${torneoIdStr}::${String(r.round)}::${String(matchIndex)}`;
          // Inicializamos con finalizado: false (o inexistente). MarcadorFutbol creará/actualizará cuando se juegue.
          store[matchKey] = {
            finalizado: false
          };
        }
      }

      localStorage.setItem(partidosStorageKey, JSON.stringify(store, null, 2));
    } catch (err) {
      console.error('Error creando encuentros por torneo:', err);
    }

    const Swal = (await import('sweetalert2')).default;
    Swal.fire({
      icon: 'success',
      title: 'Torneo creado',
      text: `Torneo "${formData.name}" creado exitosamente!`,
      confirmButtonText: 'OK'
    }).then(() => {
      navigate('/lista-torneos');
    });
  };



  return (
    <div className="create-tournament-page">
      <Link to="/" className="back-link">
        ← Volver al inicio
      </Link>

      <h1>Crear Nuevo Torneo</h1>

      <div className="create-tournament-card">
        <div className="create-tournament-layout">


          <section className="create-tournament-right">
            <form onSubmit={handleSubmit} className="create-tournament-form">
              <div className="form-group">
                <label>Selecciona el estilo</label>
                <select
                  className="create-tournament-select"
                  value={formData.style || 'liga'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, style: e.target.value }))
                  }
                >

                  <option value="liga">Liga</option>
                  <option value="eliminatorias">Eliminatorias</option>
                </select>
              </div>

              <div className="form-group">

                <label>Nombre del Torneo</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Torneo Verano 2024"
                  required
                />
              </div>

              <div className="form-group">
                <label>Disciplina</label>
                <select
                  className="create-tournament-select"
                  name="discipline"
                  value={formData.discipline || 'Futbol'}
                  onChange={handleChange}
                  required
                >
                  <option value="Futbol">Futbol</option>
                  <option value="League of Legends">League of Legends</option>
                </select>
              </div>


              <div className="form-group">
                <label>Número de equipos</label>

                <div className="teams-stepper">
                  <button
                    type="button"
                    className="teams-stepper-btn"
                    aria-label="Disminuir"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        numTeams: Math.max(2, Number(prev.numTeams) - 1)
                      }))
                    }
                  >
                    ◀
                  </button>

                  <input
                    type="number"
                    name="numTeams"
                    className="teams-stepper-input"
                    value={formData.numTeams}
                    onChange={handleChange}
                    min={2}
                    max={64}
                    step={1}
                    required
                  />

                  <button
                    type="button"
                    className="teams-stepper-btn"
                    aria-label="Aumentar"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        numTeams: Math.min(64, Number(prev.numTeams) + 1)
                      }))
                    }
                  >
                    ▶
                  </button>
                </div>

                {teams.length > 0 ? (
                  <div className="create-tournament-teams-grid">
                    {Array.from({ length: Number(formData.numTeams) || 0 }).map((_, idx) => (
                      <label key={idx}>
                        Equipo {idx + 1}
                        <select
                          name={`team_${idx}`}
                          className="create-tournament-select"
                          value={formData.selectedTeamIds[idx] ?? ''}
                          onChange={(e) => handleTeamsSelectChange(idx, e.target.value)}
                          required
                        >
                          <option value="" disabled>
                            Selecciona un equipo
                          </option>
                          {teams
                            .filter((team) => {
                              const selectedIds = formData.selectedTeamIds;
                              if (selectedIds[idx] === team.id) return true;
                              return !selectedIds.includes(team.id);
                            })
                            .map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: '#737373', fontWeight: 700 }}>
                    No hay equipos guardados. Crea equipos en la sección “Equipos”.
                  </div>
                )}
              </div>







              <div className="create-tournament-actions">
                <button type="button" className="cancel-btn" onClick={() => (window.location.href = '/')}
                >
                  Cancelar
                </button>

                <button type="submit" className="submit-btn">
                  Crear Torneo
                </button>
              </div>

            </form>
          </section>
        </div>
      </div>
    </div>
  );

}

export default CreateTournament;


