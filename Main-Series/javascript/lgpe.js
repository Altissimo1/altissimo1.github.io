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
//   - LGPE has no slot system — each encounter type (Normal/Sky/Water) defines
//     one level range for the whole area plus a flat list of species, each
//     with its own distinct rate. Encounter counts vary per location, so
//     window.LGPE_DATA stores flat rate-tagged arrays, not slots.
//   - Because of that flat shape there is nothing for a Full/Compressed toggle
//     to distinguish, and rate is already a single number per entry (species
//     with different rates per game are pre-split into separate entries during
//     synthesis) — so there's no dropdown, no per-game columns. Every table is
//     just: Pokémon | Rate | Level(s).
//   - Version-exclusivity is conveyed the same way the rest of the site
//     conveys game identity: colour. Rows for species available in both games
//     use the neutral "light" stripe; rows exclusive to one game use that
//     game's colour class (lgp-true/false for Let's Go, Pikachu!, lge-true/false
//     for Let's Go, Eevee! — add these to common.css if they don't exist yet,
//     alongside the other per-game colour classes).
//   - Encounter types: normal, sky, water
//   - Reads window.LGPE_DATA; location base via window.LGPE_LOCATION_BASE
//   - Mounts on .pokemon-lgpe-{normal|sky|water}-replace-me
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
    const GAME_PREFIXES = { Pikachu: 'lgp', Eevee: 'lge' };
    const gamePrefix = g => GAME_PREFIXES[g] || g.toLowerCase();

    const TYPE_LABELS = { normal: 'Normal', sky: 'Sky', water: 'Water' };
    const TYPE_KEYS   = ['normal', 'sky', 'water'];

    // =========================================================
    // CSS class helper — alternating stripe, coloured by game when
    // an entry is exclusive to one game, neutral ("light") otherwise.
    // =========================================================
    function rowCls(prefix, idx) {
        const isTrue = idx % 2 === 1;
        return `${prefix || 'light'}-${isTrue ? 'true' : 'false'}`;
    }

    function entryPrefix(games) {
        return (games && games.length === 1) ? gamePrefix(games[0]) : null;
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
    // Row ordering — group by species (a species can have two rows when
    // Pikachu/Eevee rates differ), order groups by highest rate first,
    // then within a group by rate descending.
    // =========================================================
    function buildRows(list) {
        const buckets = new Map();
        const order   = [];
        for (const e of (list || [])) {
            if (!buckets.has(e.name)) { buckets.set(e.name, []); order.push(e.name); }
            buckets.get(e.name).push(e);
        }
        const maxRate = name => Math.max(...buckets.get(name).map(e => e.rate || 0));
        const orderedNames = order.slice().sort((a, b) => {
            const ra = maxRate(a), rb = maxRate(b);
            if (ra !== rb) return rb - ra;
            return a.localeCompare(b);
        });
        return orderedNames.flatMap(name =>
            buckets.get(name).slice().sort((a, b) => (b.rate || 0) - (a.rate || 0))
        );
    }

    // =========================================================
    // EncounterTable — Pokémon | Rate, one per encounter type
    // =========================================================
    function EncounterTable({ typeKey, list, mount }) {
        if (!list || !list.length) return null;

        const rows  = buildRows(list);
        const label = TYPE_LABELS[typeKey] || typeKey;

        return h('div', { style: { overflowX: 'auto', marginBottom: 16 } },
            h('table', null,
                h('caption', null, label),
                h('thead', null,
                    h('tr', null,
                        h('th', { colSpan: 2 }, 'Pokémon'),
                        h('th', null, 'Rate'),
                        h('th', null, 'Level(s)'),
                    )
                ),
                h('tbody', null,
                    rows.map((r, i) => {
                        const cls = rowCls(entryPrefix(r.games), i);
                        return h('tr', { key: `${r.name}::${i}` },
                            h('td', { className: cls }, h(Sprite, { name: r.name, mount })),
                            h('td', { className: cls }, r.name),
                            h('td', { className: cls }, `${r.rate}%`),
                            h('td', { className: cls }, r.level ? `lv. ${r.level}` : '—'),
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
    function App({ encounterType, mount }) {
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

        const list = data.encounters && data.encounters[encounterType];
        if (!list || !list.length) return null;

        return h(EncounterTable, { typeKey: encounterType, list, mount });
    }

    // =========================================================
    // Boot
    // =========================================================
    (function boot() {
        const SELECTORS = TYPE_KEYS.map(t => ({
            selector: `.pokemon-lgpe-${t}-replace-me`,
            encounterType: t,
        }));

        for (const { selector, encounterType } of SELECTORS) {
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
                    ReactDOM.createRoot(container).render(h(App, { encounterType, mount: container }));
                });
            };
            if (document.readyState === 'complete' || document.readyState === 'interactive') mountAll();
            else document.addEventListener('DOMContentLoaded', mountAll, { once: true });
            new MutationObserver(mountAll).observe(document.documentElement, { childList: true, subtree: true });
        }
    })();

})();
