import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './ListaTorneos.css';


const TORNEOS_STORAGE_KEY = 'torneos.json';

/** @deprecated normalizeTorneoStyle (was unused) */
const normalizeTorneoStyle = (torneo) => {
  const rawStyle = (torneo?.style ?? torneo?.estilo ?? '').toString().toLowerCase();
  return rawStyle === 'clasico' ? 'liga' : rawStyle;
};


function ListaTorneos() {
  const [torneos, setTorneos] = useState([]);
  const [finalizadosByTorneoId, setFinalizadosByTorneoId] = useState({});


  useEffect(() => {
    try {
      const raw = localStorage.getItem(TORNEOS_STORAGE_KEY);
      if (!raw) {
        setTorneos([]);
        setFinalizadosByTorneoId({});
        return;
      }
      const parsed = JSON.parse(raw);
      const torneosValidos = Array.isArray(parsed) ? parsed : [];

      const normalizados = torneosValidos.map((t) => {
        if (!t || typeof t !== 'object') return t;
        const style = t.style ?? t.estilo;
        if (style === 'clasico') {
          return {
            ...t,
            style: 'liga',
            estilo: undefined
          };
        }
        return t;
      });

      // Precalcular si el torneo NO tiene encuentros editables
      // Regla (según confirmación): un torneo tiene encuentros editables si existe
      // al menos un partido cuyo store[matchKey].finalizado NO sea true.
      const nextFinalizados = {};
      for (const t of normalizados) {
        const torneoId = t?.id;
        if (torneoId == null) continue;

const storageKey = `ListaEncuentros-${String(torneoId)}.json`;
        try {
          const rawPartidos = localStorage.getItem(storageKey);
          const parsedPartidos = rawPartidos ? JSON.parse(rawPartidos) : {};
          const store = parsedPartidos && typeof parsedPartidos === 'object' ? parsedPartidos : {};

          const matchKeys = Object.keys(store);

          // Si faltan “suficientes” partidas en el storage, NO lo marcamos como completo.
          // En ausencia de un catálogo de partidos esperados, usamos una heurística conservadora:
          // - Solo consideramos completo si existen al menos 2 partidos guardados.
          // - (Así evitamos marcar torneos con JSON incompleto.)
          if (matchKeys.length < 2) {
            nextFinalizados[torneoId] = false;
            continue;
          }

          // Un encuentro “editable” existe si hay algún partido con finalizado !== true.
          // Entonces “sin editables” => todos los partidos existentes tienen finalizado === true.
          const hasEditable = matchKeys.some((k) => store?.[k] && store?.[k]?.finalizado !== true);
          nextFinalizados[torneoId] = !hasEditable;
        } catch {
          nextFinalizados[torneoId] = false;
        }
      }


      setTorneos(normalizados);
      setFinalizadosByTorneoId(nextFinalizados);
    } catch {
      setTorneos([]);
      setFinalizadosByTorneoId({});
    }
  }, []);


  const sortedTorneos = useMemo(() => {
    return [...torneos].sort((a, b) => {
      const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
  }, [torneos]);

  return (
    <div className="lista-torneos-page">
      <a href="/" className="back-link">← Volver al inicio</a>

      <h1>Torneos</h1>

      <div className="lista-torneos-layout">
        <div className="lista-torneos-card">
          {sortedTorneos.length === 0 ? (
            <div className="lista-torneos-empty">No hay torneos creados todavía.</div>
          ) : (
            <div className="lista-torneos-table">
              <div className="lista-torneos-row lista-torneos-row-header">
                <div>Nombre</div>
                <div>Estilo</div>
                <div>Disciplina</div>
                <div>Participantes</div>
              </div>


              {sortedTorneos.map((t) => {
                const rawStyle = (t.style ?? t.estilo ?? '').toString().toLowerCase();
                const style = rawStyle === 'clasico' ? 'liga' : rawStyle;

                const iconSrc = style === 'eliminatorias'
                  ? '/images/Eliminatoria.png'
                  : '/images/Liga.png';

                const labelStyle = t.style ?? t.estilo ?? '—';

                const torneoKey = t.id ?? t.name;
                const to = t.id
                  ? (style === 'eliminatorias' ? `/torneo-eli/${encodeURIComponent(String(t.id))}` : `/torneo-liga/${encodeURIComponent(String(t.id))}`)
                  : '#';


                const isResolved = Boolean(finalizadosByTorneoId?.[t.id]);

                return (
                  <Link
                    key={torneoKey}
                    to={to}
                    className={`lista-torneos-row lista-torneos-row-link ${isResolved ? 'lista-torneos-row-finalizado' : ''}`}
                  >
                    <div className="lista-torneos-row-name">{t.name ?? '—'}</div>

                    <div className="lista-torneos-style">
                      {labelStyle}
                    </div>

                    <div className="lista-torneos-discipline">{t.discipline ?? t.disciplina ?? '—'}</div>

                    <div className="lista-torneos-participants">
                      {t.participantsCount ?? t.numParticipants ?? t.numTeams ?? '—'}
                    </div>
                  </Link>
                );

              })}


            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListaTorneos;


