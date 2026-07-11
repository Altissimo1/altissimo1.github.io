// ==============================================
// lgpe.js — Pokémon Let's Go, Pikachu! / Let's Go, Eevee! encounter table renderer
//
// Requires (in order):
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="../javascript/pokemon-core.js"></script>
//   <script src="../javascript/lgpe.js"></script>
//
// Structure (deliberately simpler than dppt.js/bdsp.js/frlg.js/rgby.js):
//   - Two games: "Pikachu", "Eevee"
//   - LGPE has no slot system — each encounter type (Walking/Flying/Sea Skim)
//     defines one level range for the whole area plus a flat list of species,
//     each with its own distinct rate. Encounter counts vary per location, so
//     window.LGPE_DATA stores flat rate-tagged arrays, not slots. (The data
//     keys are still normal/sky/water internally — see TYPE_CONFIG below for
//     the mapping to the walking/flying/sea-skim mount + caption names.)
//   - No Full/Compressed toggle, no Game dropdown — there's only one view.
//     Each table auto-detects whether the two games are identical for every
//     species ("unified"):
//       • Unified            → single Pokémon | Rate | Level(s) columns.
//       • Differs in any way → Pokémon | Let's Go Pikachu (Rate, Level) |
//         Let's Go Eevee (Rate, Level), with "N/A" where a species is
//         missing from one game — mirrors the compressed-view column split
//         used by dppt.js/bdsp.js/frlg.js when their games aren't unified.
//   - Colour prefixes: lgp-{true|false} for Let's Go, Pikachu!, lge-{true|false}
//     for Let's Go, Eevee!, light-{true|false} neutral (add lgp-/lge- to
//     common.css if they don't exist yet, alongside the other per-game
//     colour classes). Header cells always use the "-true" variant.
//   - Reads window.LGPE_DATA; location base via window.LGPE_LOCATION_BASE
//   - Mounts on .pokemon-lgpe-{walking|flying|sea-skim}-replace-me
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[lgpe] React/ReactDOM globals not found.'); return; }
    if (!window.PokemonCore) { console.warn('[lgpe] pokemon-core.js must be loaded before lgpe.js.'); return; }

    const React    = window.React;
    const ReactDOM = window.ReactDOM;
    const h        = React.createElement;

    const {
        loadScript, inferLocationId,
        SPRITE_URL_CACHE, normalizedName, spriteCandidates,
    } = window.PokemonCore;

    // =========================================================
    // LGPE game constants
    // =========================================================
    const ALL_GAMES     = ['Pikachu', 'Eevee'];
    const GAME_PREFIXES = { Pikachu: 'lgp', Eevee: 'lge' };
    const GAME_LABELS   = { Pikachu: "Let's Go Pikachu", Eevee: "Let's Go Eevee" };
    const gamePrefix    = g => GAME_PREFIXES[g] || g.toLowerCase();

    // Maps the data key used in window.LGPE_DATA.encounters to the mount
    // selector suffix and table caption the site should show.
    const TYPE_CONFIG = [
        { dataKey: 'normal', mountSuffix: 'walking',  label: 'Walking'  },
        { dataKey: 'sky',    mountSuffix: 'flying',   label: 'Flying'   },
        { dataKey: 'water',  mountSuffix: 'sea-skim', label: 'Sea Skim' },
    ];

    // =========================================================
    // CSS class helpers
    // =========================================================
    function rowCls(prefix, idx) {
        const isTrue = idx % 2 === 1;
        return `${prefix || 'light'}-${isTrue ? 'true' : 'false'}`;
    }

    function hdrCls(g) {
        return g ? `${gamePrefix(g)}-true` : 'light-true';
    }

    // Two adjacent levels (e.g. "3-4") read better as "3, 4"; wider ranges
    // and single levels are left as-is.
    function formatLevel(level) {
        if (!level) return level;
        const m = String(level).match(/^(\d+)-(\d+)$/);
        if (m) {
            const lo = parseInt(m[1], 10), hi = parseInt(m[2], 10);
            if (hi - lo === 1) return `${lo}, ${hi}`;
        }
        return level;
    }

    // =========================================================
    // Sprite (mirrors frlg.js — no form overrides needed for LGPE)
    // =========================================================
    function Sprite(props) {
        const { useState, useMemo, useEffect } = React;
        const nm = normalizedName(props.name);

        const candidates = useMemo(() => {
            const list   = spriteCandidates(props.name, props.mount);
            const cached = SPRITE_URL_CACHE.get(nm);
            if (cached) {
                const idx = list.indexOf(cached);
                if (idx > 0) return [cached, ...list.slice(0, idx), ...list.slice(idx + 1)];
            }
            return list;
        }, [props.name, props.mount]);

        const [idx, setIdx] = useState(0);
        const src = candidates[idx] || '';
        useEffect(() => { setIdx(0); }, [props.name]);

        return h('img', {
            src, alt: props.name, loading: 'lazy', className: 'flex-img',
            onLoad:  () => { if (src) SPRITE_URL_CACHE.set(nm, src); },
            onError: () => React.startTransition(() => setIdx(i => i + 1 < candidates.length ? i + 1 : i)),
        });
    }

    // =========================================================
    // Row building — one row per species, with per-game rate/level cells.
    // A species missing a game's cell entirely means it's version-exclusive.
    //
    // Ordering: shared species (present in both games) first, ordered by
    // rate descending; then Pikachu-exclusives, ordered by rate descending;
    // then Eevee-exclusives, ordered by rate descending. Exclusives always
    // sort to the bottom regardless of rate, Pikachu-exclusives above
    // Eevee-exclusives.
    // =========================================================
    function buildPerGameRows(list) {
        const order = [];
        const map   = new Map();
        for (const e of (list || [])) {
            if (!map.has(e.name)) { map.set(e.name, {}); order.push(e.name); }
            const pg = map.get(e.name);
            for (const g of (e.games || [])) {
                pg[g] = { rate: e.rate, level: e.level };
            }
        }
        const rows = order.map(name => ({ name, perGame: map.get(name) }));

        function tier(r) {
            const hasPikachu = !!r.perGame.Pikachu;
            const hasEevee   = !!r.perGame.Eevee;
            if (hasPikachu && hasEevee) return 0; // shared
            if (hasPikachu) return 1;             // Pikachu-exclusive
            return 2;                             // Eevee-exclusive
        }

        rows.sort((a, b) => {
            const tierA = tier(a), tierB = tier(b);
            if (tierA !== tierB) return tierA - tierB;
            const maxA = Math.max(0, ...ALL_GAMES.map(g => a.perGame[g]?.rate || 0));
            const maxB = Math.max(0, ...ALL_GAMES.map(g => b.perGame[g]?.rate || 0));
            if (maxA !== maxB) return maxB - maxA;
            return a.name.localeCompare(b.name);
        });
        return rows;
    }

    // Unified = every species appears in both games with the same rate
    // (and, since level is constant per section, the same level too).
    function isUnified(rows) {
        return rows.every(r => {
            const p = r.perGame.Pikachu, e = r.perGame.Eevee;
            return !!p && !!e && p.rate === e.rate && p.level === e.level;
        });
    }

    // =========================================================
    // EncounterTable — one per encounter type
    // =========================================================
    function EncounterTable({ label, list, mount }) {
        if (!list || !list.length) return null;

        const rows    = buildPerGameRows(list);
        const unified = isUnified(rows);

        return h('div', { style: { overflowX: 'auto', marginBottom: 16 } },
            h('table', null,
                h('caption', null, label),
                h('thead', null,
                    h('tr', null,
                        h('th', { colSpan: 2, className: hdrCls(null) }, 'Pokémon'),
                        unified
                            ? [
                                h('th', { key: 'r', className: hdrCls(null) }, 'Rate'),
                                h('th', { key: 'l', className: hdrCls(null) }, 'Levels'),
                              ]
                            : ALL_GAMES.map(g => h('th', { key: g, colSpan: 2, className: hdrCls(g) }, GAME_LABELS[g])),
                    )
                ),
                h('tbody', null,
                    rows.map((r, i) => {
                        const base = rowCls(null, i);
                        return h('tr', { key: r.name },
                            h('td', { className: base }, h(Sprite, { name: r.name, mount })),
                            h('td', { className: base }, r.name),
                            ...(unified ? (() => {
                                const cell = r.perGame.Pikachu || r.perGame.Eevee;
                                return [
                                    h('td', { key: 'r', className: base }, `${cell.rate}%`),
                                    h('td', { key: 'l', className: base }, cell.level ? `lv. ${formatLevel(cell.level)}` : '—'),
                                ];
                            })() : ALL_GAMES.flatMap(g => {
                                const gp   = gamePrefix(g);
                                const cell = r.perGame[g];
                                const has  = !!cell;
                                return [
                                    h('td', {
                                        key: g + ':r', colSpan: has ? 1 : 2,
                                        className: has ? rowCls(gp, i) : rowCls(null, i),
                                    }, has ? `${cell.rate}%` : 'N/A'),
                                    has ? h('td', { key: g + ':l', className: rowCls(gp, i) }, cell.level ? `lv. ${formatLevel(cell.level)}` : '—') : null,
                                ];
                            }))
                        );
                    })
                )
            )
        );
    }

    // =========================================================
    // Data cache
    // =========================================================
    const DATA_PROMISE_CACHE = new Map();

    function getLocationData(locId) {
        if (DATA_PROMISE_CACHE.has(locId)) return DATA_PROMISE_CACHE.get(locId);
        const base = window.LGPE_LOCATION_BASE || '../javascript/LGPE/';
        const p = loadScript(`${base}${locId}.js`).then(() => {
            if (!window.LGPE_DATA) throw new Error('LGPE_DATA not found after script load');
            const d = window.LGPE_DATA;
            delete window.LGPE_DATA;
            return d;
        });
        DATA_PROMISE_CACHE.set(locId, p);
        return p;
    }

    // =========================================================
    // App — root component for a single encounter-type mount
    // =========================================================
    function App({ dataKey, label, mount }) {
        const { useState, useEffect } = React;

        const [error,   setError]   = useState(null);
        const [loading, setLoading] = useState(true);
        const [data,    setData]    = useState(null);

        const locationId = inferLocationId(mount);

        useEffect(() => {
            let alive = true;
            getLocationData(locationId)
                .then(d => { if (alive) { setData(d); setLoading(false); } })
                .catch(e => { if (alive) { setError(String(e?.message || e)); setLoading(false); } });
            return () => { alive = false; };
        }, []);

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return h('p', null, 'No data for ', h('code', null, String(locationId)), '.');

        const list = data.encounters && data.encounters[dataKey];
        if (!list || !list.length) return null;

        return h(EncounterTable, { label, list, mount });
    }

    // =========================================================
    // Boot
    // =========================================================
    (function boot() {
        for (const { dataKey, mountSuffix, label } of TYPE_CONFIG) {
            const selector = `.pokemon-lgpe-${mountSuffix}-replace-me`;
            const mountAll = () => {
                document.querySelectorAll(selector).forEach(n => {
                    if (n.__lgpeMounted) return;
                    n.__lgpeMounted = true;
                    const container = document.createElement('div');
                    for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                        const v = n.getAttribute(a);
                        if (v != null) container.setAttribute(a, v);
                    }
                    n.replaceWith(container);
                    ReactDOM.createRoot(container).render(h(App, { dataKey, label, mount: container }));
                });
            };
            if (document.readyState === 'complete' || document.readyState === 'interactive') mountAll();
            else document.addEventListener('DOMContentLoaded', mountAll, { once: true });
            new MutationObserver(mountAll).observe(document.documentElement, { childList: true, subtree: true });
        }
    })();

})();
