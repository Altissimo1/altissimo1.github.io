// ==============================================
// rgby.js — Pokémon Red / Green / Blue / Yellow encounter table renderer
//
// Requires (in order):
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="../javascript/pokemon-core.js"></script>
//   <script src="../javascript/rgby.js"></script>
//
// Structure (mirrors frlg.js):
//   - Four games: "Red", "Green", "Blue", "Yellow"
//   - No conditions (no swarm / time-of-day) — Gen 1
//   - No rock smash — Gen 1
//   - Per-encounter-type game detection:
//       • multiple present → dropdown + per-game columns
//       • single present   → no dropdown, single game-coloured column
//   - Colour prefixes: red-{true|false}, green-{true|false}, blue-{true|false}, yellow-{true|false}
//   - Encounter types: walking, surfing, fishing
//   - Reads window.RGBY_DATA; location base via window.RGBY_LOCATION_BASE
//   - Mounts on .pokemon-rgby-{walking|surfing|fishing}-replace-me
//
// SUPER ROD (the funky case): RGB and Yellow use different rate systems, so a single
// row cannot hold all four games. The data stores the 2–4 RGB encounters first
// (games Red/Green/Blue) then the 4 Yellow encounters (game Yellow). In the Full
// combined view, empty game columns collapse into one "N/A" cell — so RGB rows show
// "N/A" under Yellow, and Yellow rows show a single "N/A" spanning Red+Green+Blue.
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[rgby] React/ReactDOM globals not found.'); return; }
    if (!window.PokemonCore) { console.warn('[rgby] pokemon-core.js must be loaded before rgby.js.'); return; }

    const React    = window.React;
    const ReactDOM = window.ReactDOM;
    const h        = React.createElement;

    const {
        formatLevels,
        byName, loadScript, inferLocationId, bucketRowsByName,
        Select,
        SPRITE_URL_CACHE, normalizedName, spriteCandidates,
    } = window.PokemonCore;

    // =========================================================
    // RGBY game constants
    // =========================================================
    const ALL_GAMES = ['Red', 'Green', 'Blue', 'Yellow'];
    const GAME_KEYS = new Set(ALL_GAMES);
    const GAME_BIT  = { Red: 0, Green: 1, Blue: 2, Yellow: 3 };

    const gamePrefix = g => g.toLowerCase();

    // =========================================================
    // CSS class helpers (mirrored from frlg.js / bdsp.js)
    // =========================================================
    function slotCls(prefix, slot) {
        const isTrue = (Number(slot) || 0) % 2 === 1;
        return `${prefix || 'light'}-${isTrue ? 'true' : 'false'}`;
    }

    function rowCls(prefix, idx) {
        return `${prefix || 'light'}-${idx % 2 === 1 ? 'true' : 'false'}`;
    }

    function hdrCls(g, basePrefix) {
        if (g) return `${gamePrefix(g)}-true`;
        return `${basePrefix || 'light'}-true`;
    }

    function baseOf(activeGames, gameFilter) {
        if (gameFilter && gameFilter !== 'All') return gamePrefix(gameFilter);
        if (activeGames.length === 1) return gamePrefix(activeGames[0]);
        return 'light';
    }

    // =========================================================
    // RBY (Western) view: same data, relabeled.
    //   Japan → West:  Red→Red, Green→Blue (renamed/recolored), Yellow→Yellow.
    //   Japanese Blue was never released internationally, so its data is dropped.
    // Because display "Blue" then maps to the blue colour and the Red<Blue<Yellow
    // column order, the rest of the renderer works unchanged.
    // =========================================================
    function remapGamesRBY(games) {
        const out = [];
        for (const g of (games || [])) {
            if (g === 'Blue') continue;              // JP Blue: unused internationally
            out.push(g === 'Green' ? 'Blue' : g);    // JP Green becomes Western Blue
        }
        return out;
    }
    function remapSlotsRBY(slots) {
        return (slots || [])
            .map(slot => ({
                ...slot,
                options: (slot.options || [])
                    .map(o => ({ ...o, games: remapGamesRBY(o.games) }))
                    .filter(o => o.games.length),
            }))
            .filter(slot => slot.options.length);
    }
    function remapLocationRBY(location) {
        if (!location || !location.encounters) return location;
        const enc = location.encounters;
        const ne  = {};
        if (enc.walking) ne.walking = remapSlotsRBY(enc.walking);
        if (enc.surfing) ne.surfing = remapSlotsRBY(enc.surfing);
        if (enc.fishing) {
            ne.fishing = {};
            for (const k of ['old', 'good', 'super']) {
                if (enc.fishing[k]) ne.fishing[k] = remapSlotsRBY(enc.fishing[k]);
            }
        }
        return { ...location, encounters: ne };
    }

    // =========================================================
    // Per-encounter-type game detection
    // =========================================================
    function detectActiveGames(slots) {
        const seen = new Set();
        for (const slot of (slots || [])) {
            for (const opt of (slot.options || [])) {
                for (const g of (opt.games || [])) {
                    if (GAME_KEYS.has(g)) seen.add(g);
                }
            }
        }
        return ALL_GAMES.filter(g => seen.has(g));
    }

    function gamesIdentical(slots, activeGames) {
        if (activeGames.length <= 1) return true;
        for (const slot of (slots || [])) {
            for (const opt of (slot.options || [])) {
                const gSet = new Set(opt.games || []);
                if (!activeGames.every(g => gSet.has(g))) return false;
            }
        }
        return true;
    }

    function walkingGamesIdentical(location, activeGames) {
        return gamesIdentical(location?.encounters?.walking || [], activeGames);
    }

    function slotEncounterGamesIdentical(slots, activeGames) {
        return gamesIdentical(slots, activeGames);
    }

    // =========================================================
    // Species ordering (generalised for dynamic activeGames)
    // =========================================================
    // Canonical ordering of game-combinations for the Compressed view:
    // more games first, then lexicographic in game order Red<Green<Blue<Yellow.
    // => RGBY, then RGB, RGY, RBY, GBY, then RG, RB, RY, GB, GY, BY, then singles.
    const COMBO_RANK = (() => {
        const members = m => { const a = []; for (let i = 0; i < ALL_GAMES.length; i++) if ((m >> i) & 1) a.push(i); return a; };
        const masks = [];
        for (let m = 1; m < (1 << ALL_GAMES.length); m++) masks.push(m);
        masks.sort((a, b) => {
            const ma = members(a), mb = members(b);
            if (ma.length !== mb.length) return mb.length - ma.length; // more games first
            for (let i = 0; i < ma.length; i++) if (ma[i] !== mb[i]) return ma[i] - mb[i]; // lexicographic
            return 0;
        });
        const rank = {};
        masks.forEach((m, i) => { rank[m] = i; });
        return rank;
    })();

    function buildCompressedOrderingMeta(rows, showGames) {
        const meta = new Map();
        meta.set('__total__', showGames.length);
        for (const r of rows) {
            let m = meta.get(r.name);
            if (!m) { m = { mask: 0, totalPct: 0, maxRate: 0 }; meta.set(r.name, m); }
            for (const g of showGames) {
                const cell    = r.perGame?.[g];
                const pct     = cell?.rate || 0;
                const hasData = pct > 0 || !!(cell && cell.levels && cell.levels.length);
                if (hasData) m.mask |= (1 << GAME_BIT[g]);
                m.totalPct += pct;
                if (pct > m.maxRate) m.maxRate = pct;
            }
        }
        for (const [k, info] of meta) {
            if (k === '__total__') continue;
            info.count = showGames.reduce((n, g) => n + ((info.mask >> GAME_BIT[g]) & 1), 0);
            info.rank  = showGames.findIndex(g => (info.mask >> GAME_BIT[g]) & 1);
            if (info.rank < 0) info.rank = showGames.length;
        }
        return meta;
    }

    function compressedSpeciesCompare(a, b, meta) {
        const A = meta.get(a.name) || { mask: 0, maxRate: 0, totalPct: 0 };
        const B = meta.get(b.name) || { mask: 0, maxRate: 0, totalPct: 0 };
        const ra = COMBO_RANK[A.mask] ?? Infinity;
        const rb = COMBO_RANK[B.mask] ?? Infinity;
        if (ra !== rb) return ra - rb;                                   // game-combination order
        if (A.maxRate !== B.maxRate) return B.maxRate - A.maxRate;       // then higher rate
        if (A.totalPct !== B.totalPct) return B.totalPct - A.totalPct;
        return a.name.localeCompare(b.name);                            // then name
    }

    // =========================================================
    // Walking row builders (no conditions)
    // =========================================================
    function buildFullRows(location, activeGames) {
        const map = new Map();
        for (const block of (location?.encounters?.walking || [])) {
            const { rate, slot, options: encounters } = block;
            const key = String(slot);
            if (!map.has(key)) {
                map.set(key, {
                    slot, rate,
                    perGame: Object.fromEntries(activeGames.map(g => [g, { name: null, levels: new Set() }])),
                });
            }
            const rec = map.get(key);
            for (const opt of (encounters || [])) {
                for (const g of (opt.games || [])) {
                    if (!rec.perGame[g]) continue;
                    const pg = rec.perGame[g];
                    if (pg.name && pg.name !== opt.name) pg.name = `${pg.name} / ${opt.name}`;
                    else if (!pg.name) pg.name = opt.name;
                    pg.levels.add(String(opt.level));
                }
            }
        }
        const out = [];
        for (const [, rec] of map) {
            rec.perGame = Object.fromEntries(
                activeGames.map(g => [g, { name: rec.perGame[g].name, levels: [...rec.perGame[g].levels].sort() }])
            );
            out.push(rec);
        }
        return out.sort((a, b) => a.slot - b.slot);
    }

    function buildCompressedRows(location, activeGames) {
        const order = [];
        const accum = new Map();
        for (const block of (location?.encounters?.walking || [])) {
            const { rate, options: encounters } = block;
            for (const opt of (encounters || [])) {
                const { name } = opt;
                if (!accum.has(name)) { accum.set(name, {}); order.push(name); }
                const pg = accum.get(name);
                for (const g of (opt.games || [])) {
                    if (!GAME_KEYS.has(g) || !activeGames.includes(g)) continue;
                    if (!pg[g]) pg[g] = { rate: 0, levels: new Set() };
                    pg[g].rate += (Number(rate) || 0);
                    pg[g].levels.add(String(opt.level));
                }
            }
        }
        const rows = order.map(name => ({
            name,
            perGame: Object.fromEntries(
                activeGames.filter(g => accum.get(name)[g]).map(g => {
                    const c = accum.get(name)[g];
                    return [g, { rate: c.rate, levels: [...c.levels].sort() }];
                })
            ),
        }));
        rows.sort((a, b) => byName(a.name, b.name));
        return rows;
    }

    // =========================================================
    // Sprite
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
    // ViewControls — walking table (no conditions)
    // =========================================================
    function ViewControls({ state, setState, activeGames }) {
        const set = p => setState(prev => Object.assign({}, prev, p));
        return h('div', { style: { margin: '8px 0 12px' } },
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 6 } },
                h(Select, {
                    label: 'View',
                    value: state.view,
                    onChange: v => set({ view: v }),
                    options: [
                        { value: 'full',       label: 'Full (slots)' },
                        { value: 'compressed', label: 'Compressed' },
                    ],
                }),
                activeGames.length > 1 && h(Select, {
                    label: 'Game',
                    value: state.game,
                    onChange: v => set({ game: v }),
                    options: [
                        { value: 'All',      label: 'All' },
                        { value: 'separate', label: 'Separate' },
                        ...activeGames.map(g => ({ value: g, label: g })),
                    ],
                }),
            )
        );
    }

    // =========================================================
    // GameTable — single-game walking wrapper (for Separate view)
    // =========================================================
    function GameTable({ game, baseState, location, activeGames, mount }) {
        const s = React.useMemo(() => ({ ...baseState, game }), [baseState, game]);
        const rows = React.useMemo(() => {
            if (!location) return [];
            return s.view === 'full'
                ? buildFullRows(location, activeGames)
                : buildCompressedRows(location, activeGames);
        }, [location, s.view, activeGames]);
        return h(Table, { rows, activeGames, gameFilter: game, mount, view: s.view, unified: false });
    }

    // =========================================================
    // Table — walking encounter table
    // =========================================================
    function Table(props) {
        const { rows, activeGames, gameFilter, mount, view } = props;
        const unified   = !!props.unified;
        const showGames = gameFilter === 'All' ? activeGames : [gameFilter];
        const base      = baseOf(activeGames, unified ? 'All' : gameFilter);

        const viewLabel  = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = (unified || activeGames.length === 1)
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        const isSingleColumn = unified || activeGames.length === 1 || (gameFilter !== 'All');
        const singleGame     = gameFilter !== 'All' ? gameFilter : activeGames[0];

        const renderRows = gameFilter && gameFilter !== 'All'
            ? rows.filter(r => {
                const cell = r.perGame?.[gameFilter];
                return view === 'full'
                    ? !!(cell && cell.name)
                    : !!(cell && ((cell.rate || 0) > 0 || (cell.levels && cell.levels.length)));
            })
            : rows;

        const sanitizedRows = (renderRows || []).filter(r => {
            if (!r) return false;
            if (view === 'full') return showGames.some(g => r.perGame?.[g]?.name);
            return typeof r.name === 'string' && r.name.trim().length > 0;
        });

        let renderList = sanitizedRows;
        if (view === 'compressed') {
            const buckets = bucketRowsByName(sanitizedRows);
            const names   = Array.from(buckets.keys());
            const orderedNames = (() => {
                if (gameFilter && gameFilter !== 'All') {
                    return names.sort((na, nb) => {
                        const rA = (buckets.get(na) || []).reduce((s, r) => s + (r.perGame?.[gameFilter]?.rate || 0), 0);
                        const rB = (buckets.get(nb) || []).reduce((s, r) => s + (r.perGame?.[gameFilter]?.rate || 0), 0);
                        if (rA !== rB) return rB - rA;
                        return na.localeCompare(nb);
                    });
                }
                const meta = buildCompressedOrderingMeta(Array.from(buckets.values()).flat(), showGames);
                return names.sort((na, nb) => compressedSpeciesCompare({ name: na }, { name: nb }, meta));
            })();
            renderList = orderedNames.flatMap(n => buckets.get(n));
        }

        const rowStripeTrue = new Map();
        let blockByStart    = null;

        if (view === 'compressed') {
            let i = 0, blockIdx = 0;
            const blocks = [];
            while (i < renderList.length) {
                const name = renderList[i].name;
                let j = i + 1;
                while (j < renderList.length && renderList[j].name === name) j++;
                const isTrue = (blockIdx % 2) === 1;
                for (let k = i; k < j; k++) rowStripeTrue.set(k, isTrue);
                blocks.push({ name, start: i, count: j - i });
                i = j; blockIdx++;
            }
            blockByStart = new Map(blocks.map(b => [b.start, b]));
        } else {
            const rowKey = r => { for (const g of showGames) { const nm = r.perGame?.[g]?.name; if (nm) return nm; } return '__none__'; };
            let i = 0, blockIdx = 0;
            while (i < renderList.length) {
                const key = rowKey(renderList[i]);
                let j = i + 1;
                while (j < renderList.length && rowKey(renderList[j]) === key) j++;
                const isTrue = (blockIdx % 2) === 1;
                for (let k = i; k < j; k++) rowStripeTrue.set(k, isTrue);
                i = j; blockIdx++;
            }
        }

        function zebraByBlock(prefix, rowIndex) {
            const isTrue = !!rowStripeTrue.get(rowIndex);
            return `${prefix || base}-${isTrue ? 'true' : 'false'}`;
        }

        function zebraBySlot(prefix, slot) {
            const isTrue = (Number(slot) || 0) % 2 === 1;
            return `${prefix || base}-${isTrue ? 'true' : 'false'}`;
        }

        let fullGroups = null;
        if (view === 'full') {
            fullGroups = new Map();
            for (const r of sanitizedRows) {
                const k = `${r.slot}|${r.rate}`;
                if (!fullGroups.has(k)) fullGroups.set(k, []);
                fullGroups.get(k).push(r);
            }
        }

        function FullHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { className: hdrCls(null, base) }, 'Slot'),
                    h('th', { className: hdrCls(null, base) }, 'Rate'),
                    isSingleColumn
                        ? [
                            h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                            h('th', { key: 'lv',   className:  hdrCls(null, base) }, 'Level'),
                          ]
                        : showGames.map(g => h('th', { key: g, colSpan: 3, className: hdrCls(g) }, g)),
                )
            );
        }

        function CompressedHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                    ...(isSingleColumn
                        ? [
                            h('th', { key: 'r', className: hdrCls(null, base) }, 'Rate'),
                            h('th', { key: 'l', className: hdrCls(null, base) }, 'Level'),
                          ]
                        : showGames.map(g => h('th', { key: g, colSpan: 2, className: hdrCls(g) }, g))
                    ),
                )
            );
        }

        return h('div', { style: { overflowX: 'auto' } },
            h('table', null,
                h('caption', null, tableLabel),
                view === 'compressed' ? CompressedHeader() : FullHeader(),
                h('tbody', null,
                    view === 'full'
                        ? (() => {
                            const out = [];
                            for (const [, group] of fullGroups) {
                                const rowspan = group.length;
                                group.forEach((r, iInGroup) => {
                                    out.push(h('tr', { key: `${r.slot}::${iInGroup}` },
                                        ...(iInGroup === 0 ? [
                                            h('td', { key: 's', rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, String(r.slot)),
                                            h('td', { key: '%', rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, `${r.rate}%`),
                                        ] : []),
                                        ...(isSingleColumn ? (() => {
                                            const cell = r.perGame?.[singleGame];
                                            const has  = !!(cell && cell.name);
                                            const lv   = has ? formatLevels(cell.levels) : '';
                                            return [
                                                h('td', { key: 'u:s', className: zebraBySlot(null, r.slot) }, has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'),
                                                h('td', { key: 'u:n', className: zebraBySlot(null, r.slot) }, has ? cell.name : '—'),
                                                h('td', { key: 'u:l', className: zebraBySlot(null, r.slot) }, has ? `lv. ${lv}` : '—'),
                                            ];
                                        })() : showGames.flatMap(g => {
                                            const gp   = gamePrefix(g);
                                            const cell = r.perGame?.[g];
                                            const has  = !!(cell && cell.name);
                                            const lv   = has ? formatLevels(cell.levels) : '';
                                            return [
                                                h('td', { key: g + ':s', className: zebraBySlot(has ? gp : null, r.slot) }, has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'),
                                                h('td', { key: g + ':n', className: zebraBySlot(has ? gp : null, r.slot) }, has ? cell.name : '—'),
                                                h('td', { key: g + ':l', className: zebraBySlot(has ? gp : null, r.slot) }, has ? `lv. ${lv}` : '—'),
                                            ];
                                        }))
                                    ));
                                });
                            }
                            return out;
                        })()
                        : renderList.map((r, rowIndex) => {
                            const block = blockByStart.get(rowIndex);
                            return h('tr', { key: `${r.name}::${rowIndex}` },
                                block ? h(React.Fragment, null,
                                    h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, h(Sprite, { name: r.name, mount })),
                                    h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, r.name),
                                ) : null,
                                ...(isSingleColumn ? (() => {
                                    const cell  = r.perGame?.[singleGame];
                                    const pct   = cell?.rate || 0;
                                    const lvStr = cell?.levels?.length ? formatLevels(cell.levels) : '';
                                    const has   = !!(pct || lvStr);
                                    return [
                                        h('td', {
                                            key: 'u:pct', colSpan: has ? 1 : 2,
                                            className: zebraByBlock(null, rowIndex),
                                        }, has ? (pct ? `${pct}%` : '—') : 'N/A'),
                                        has ? h('td', { key: 'u:lv', className: zebraByBlock(null, rowIndex) }, `lv. ${lvStr}`) : null,
                                    ];
                                })() : showGames.flatMap(g => {
                                    const gp    = gamePrefix(g);
                                    const cell  = r.perGame?.[g];
                                    const pct   = cell?.rate || 0;
                                    const lvStr = cell?.levels?.length ? formatLevels(cell.levels) : '';
                                    const has   = !!(pct || lvStr);
                                    return [
                                        h('td', {
                                            key: g + ':pct', colSpan: has ? 1 : 2,
                                            className: has ? zebraByBlock(gp, rowIndex) : zebraByBlock(null, rowIndex),
                                        }, has ? (pct ? `${pct}%` : '—') : 'N/A'),
                                        has ? h('td', { key: g + ':lv', className: zebraByBlock(gp, rowIndex) }, `lv. ${lvStr}`) : null,
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
        const base = window.RGBY_LOCATION_BASE || '../javascript/RGBY/';
        const p = loadScript(`${base}${locId}.js`).then(() => {
            if (!window.RGBY_DATA) throw new Error('RGBY_DATA not found after script load');
            const d = window.RGBY_DATA;
            delete window.RGBY_DATA;
            return d;
        });
        DATA_PROMISE_CACHE.set(locId, p);
        return p;
    }

    // =========================================================
    // App — walking table root component
    // =========================================================
    function App({ mount, mode }) {
        const { useState, useEffect, useMemo } = React;

        const [error,   setError]   = useState(null);
        const [loading, setLoading] = useState(true);
        const [data,    setData]    = useState(null);
        const [state,   setState]   = useState({ view: 'compressed', game: 'All' });
        const [, startTransition]   = React.useTransition();

        const locationId = inferLocationId(mount);

        useEffect(() => {
            let alive = true;
            getLocationData(locationId)
                .then(d => { if (alive) { setData(d); setLoading(false); } })
                .catch(e => { if (alive) { setError(String(e?.message || e)); setLoading(false); } });
            return () => { alive = false; };
        }, []);

        const loc = useMemo(() => !data ? null : (mode === 'rby' ? remapLocationRBY(data) : data), [data, mode]);

        const activeGames = useMemo(() => detectActiveGames(loc?.encounters?.walking || []), [loc]);
        const unified     = useMemo(() => loc ? walkingGamesIdentical(loc, activeGames) : false, [loc, activeGames]);
        const isSingle    = activeGames.length === 1;

        const rows = useMemo(() => {
            if (!loc) return [];
            return state.view === 'full'
                ? buildFullRows(loc, activeGames)
                : buildCompressedRows(loc, activeGames);
        }, [loc, state.view, activeGames]);

        const setStateDeferred = React.useCallback(
            updater => startTransition(() => setState(updater)),
            [startTransition]
        );

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return h('p', null, 'No data for ', h('code', null, String(locationId)), '.');

        const effectiveGame = isSingle ? 'All' : state.game;
        const effectiveUnified = isSingle || unified;

        return h('div', null,
            h(ViewControls, { state, setState: setStateDeferred, activeGames }),
            state.game === 'separate' && !isSingle
                ? h('div', null,
                    activeGames.map(g => h('div', { key: g, style: { marginTop: 12 } },
                        h(GameTable, { game: g, baseState: state, location: loc, activeGames, mount })
                    ))
                )
                : h(Table, {
                    rows, activeGames,
                    gameFilter: effectiveGame,
                    mount, view: state.view,
                    unified: effectiveUnified,
                })
        );
    }

    // =========================================================
    // Slot encounter utilities — Surfing / Fishing
    // =========================================================
    function buildSlotFullRows(slots, games) {
        return (slots || []).map(slot => {
            const perGame = {};
            for (const g of games) {
                const opt = (slot.options || []).find(o => (o.games || []).includes(g));
                if (opt) perGame[g] = { name: opt.name, level: opt.level };
            }
            return { slot: slot.slot, rate: slot.rate, perGame };
        });
    }

    function mergeRanges(levels) {
        const parsed = (levels || []).map(l => {
            const m = String(l).match(/^(\d+)-(\d+)$/);
            if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
            const n = parseInt(l, 10);
            if (!isNaN(n)) return [n, n];
            return null;
        }).filter(Boolean);
        if (!parsed.length) return (levels || []).join(', ');
        parsed.sort((a, b) => a[0] - b[0]);
        const merged = [parsed[0].slice()];
        for (let i = 1; i < parsed.length; i++) {
            const last = merged[merged.length - 1];
            const [lo, hi] = parsed[i];
            if (lo <= last[1] + 1) last[1] = Math.max(last[1], hi);
            else merged.push([lo, hi]);
        }
        return merged.map(([lo, hi]) => lo === hi ? String(lo) : `${lo}-${hi}`).join(', ');
    }

    function buildSlotCompressedRows(slots, games) {
        const order = [];
        const accum = new Map();
        for (const slot of (slots || [])) {
            for (const g of games) {
                const opt = (slot.options || []).find(o => (o.games || []).includes(g));
                if (!opt) continue;
                if (!accum.has(opt.name)) { accum.set(opt.name, {}); order.push(opt.name); }
                const pg = accum.get(opt.name);
                if (!pg[g]) pg[g] = { rate: 0, levels: [] };
                pg[g].rate += slot.rate;
                if (!pg[g].levels.includes(opt.level)) pg[g].levels.push(opt.level);
            }
        }
        return order.map(name => ({
            name,
            perGame: Object.fromEntries(
                games.filter(g => accum.get(name)[g]).map(g => [g, {
                    rate:  accum.get(name)[g].rate,
                    level: mergeRanges(accum.get(name)[g].levels),
                }])
            ),
        }));
    }

    // Full-view multi-game cell builder that collapses runs of empty game columns
    // into a single "N/A" cell (colSpan 3 per missing game). Used by surfing + fishing.
    function fullGameCells(row, showGames, mount, clsFn) {
        const cells = [];
        let i = 0;
        while (i < showGames.length) {
            const g = showGames[i];
            const c = row.perGame[g];
            if (c) {
                const gp = gamePrefix(g);
                cells.push(h('td', { key: g + '-s', className: clsFn(gp) }, h(Sprite, { name: c.name, mount })));
                cells.push(h('td', { key: g + '-n', className: clsFn(gp) }, c.name));
                cells.push(h('td', { key: g + '-l', className: clsFn(gp) }, `lv. ${c.level}`));
                i++;
            } else {
                let j = i;
                while (j < showGames.length && !row.perGame[showGames[j]]) j++;
                cells.push(h('td', { key: 'na-' + i, colSpan: (j - i) * 3, className: clsFn(null) }, 'N/A'));
                i = j;
            }
        }
        return cells;
    }

    // =========================================================
    // SlotViewControls
    // =========================================================
    function SlotViewControls({ state, setState, activeGames }) {
        const set = p => setState(prev => Object.assign({}, prev, p));
        return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '8px 0 12px' } },
            h(Select, {
                label: 'View', value: state.view,
                onChange: v => set({ view: v }),
                options: [
                    { value: 'full',       label: 'Full (slots)' },
                    { value: 'compressed', label: 'Compressed' },
                ],
            }),
            activeGames.length > 1 && h(Select, {
                label: 'Game', value: state.game,
                onChange: v => set({ game: v }),
                options: [
                    { value: 'All',      label: 'All' },
                    { value: 'separate', label: 'Separate' },
                    ...activeGames.map(g => ({ value: g, label: g })),
                ],
            }),
        );
    }

    // =========================================================
    // SlotSection — Surfing
    // =========================================================
    function SlotSection({ slots, activeGames, gameFilter, view, mount, unified }) {
        if (!slots || !slots.length) return null;
        const isSingle   = activeGames.length === 1;
        const showGames  = gameFilter === 'All' ? activeGames : [gameFilter];
        const base       = baseOf(activeGames, unified ? 'All' : gameFilter);
        const viewLabel  = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = (unified || isSingle)
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        const isSingleColumn = isSingle || unified || gameFilter !== 'All';
        const singleGame     = gameFilter !== 'All' ? gameFilter : activeGames[0];

        if (view === 'full') {
            const fullRows = buildSlotFullRows(slots, activeGames);
            const rows     = gameFilter !== 'All' ? fullRows.filter(r => r.perGame[gameFilter]) : fullRows;
            return h('div', { style: { overflowX: 'auto' } },
                h('table', null,
                    h('caption', null, tableLabel),
                    h('thead', null,
                        h('tr', null,
                            h('th', { className: hdrCls(null, base) }, 'Slot'),
                            h('th', { className: hdrCls(null, base) }, 'Rate'),
                            isSingleColumn
                                ? [
                                    h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                                    h('th', { key: 'l',    className:  hdrCls(null, base) }, 'Level'),
                                  ]
                                : showGames.map(g => h('th', { key: g, colSpan: 3, className: hdrCls(g) }, g)),
                        )
                    ),
                    h('tbody', null,
                        rows.map((row, i) =>
                            h('tr', { key: i },
                                h('td', { className: slotCls(base, row.slot) }, row.slot),
                                h('td', { className: slotCls(base, row.slot) }, `${row.rate}%`),
                                ...(isSingleColumn ? (() => {
                                    const c = row.perGame[singleGame];
                                    return [
                                        h('td', { key: 's', className: slotCls(base, row.slot) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                        h('td', { key: 'n', className: slotCls(base, row.slot) }, c ? c.name : '—'),
                                        h('td', { key: 'l', className: slotCls(base, row.slot) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })() : fullGameCells(row, showGames, mount, gp => slotCls(gp, row.slot)))
                            )
                        )
                    )
                )
            );
        }

        // Compressed
        const compRows = buildSlotCompressedRows(slots, activeGames);
        const rows = (() => {
            if (gameFilter !== 'All') {
                return compRows
                    .filter(r => r.perGame[gameFilter])
                    .sort((a, b) => (b.perGame[gameFilter]?.rate || 0) - (a.perGame[gameFilter]?.rate || 0));
            }
            const arr  = compRows.slice();
            const meta = buildCompressedOrderingMeta(arr, showGames);
            return arr.sort((a, b) => compressedSpeciesCompare(a, b, meta));
        })();

        return h('div', { style: { overflowX: 'auto' } },
            h('table', null,
                h('caption', null, tableLabel),
                h('thead', null,
                    h('tr', null,
                        h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                        isSingleColumn
                            ? [
                                h('th', { key: 'r', className: hdrCls(null, base) }, 'Rate'),
                                h('th', { key: 'l', className: hdrCls(null, base) }, 'Level'),
                              ]
                            : showGames.map(g => h('th', { key: g, colSpan: 2, className: hdrCls(g) }, g)),
                    )
                ),
                h('tbody', null,
                    rows.map((row, i) =>
                        h('tr', { key: row.name },
                            h('td', { className: rowCls(base, i) }, h(Sprite, { name: row.name, mount })),
                            h('td', { className: rowCls(base, i) }, row.name),
                            ...(isSingleColumn ? (() => {
                                const c = row.perGame[singleGame];
                                return [
                                    h('td', { key: 'r', className: rowCls(base, i) }, c ? `${c.rate}%` : '—'),
                                    h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${c.level}` : '—'),
                                ];
                            })() : showGames.flatMap(g => {
                                const gp = gamePrefix(g);
                                const c  = row.perGame[g];
                                if (!c) return [h('td', { key: g + '-na', colSpan: 2, className: rowCls(null, i) }, 'N/A')];
                                return [
                                    h('td', { key: g + '-r', className: rowCls(gp, i) }, `${c.rate}%`),
                                    h('td', { key: g + '-l', className: rowCls(gp, i) }, `lv. ${c.level}`),
                                ];
                            }))
                        )
                    )
                )
            )
        );
    }

    // =========================================================
    // FishTable — Old / Good / Super rod
    // Full view: Slot | Rate | Rod | <game columns>, empty game columns collapse to N/A.
    // =========================================================
    function FishTable({ fish, activeGames, gameFilter, view, mount, unified }) {
        const ROD_KEYS  = [
            { key: 'old',   label: 'Old'   },
            { key: 'good',  label: 'Good'  },
            { key: 'super', label: 'Super' },
        ];
        const isSingle   = activeGames.length === 1;
        const showGames  = gameFilter === 'All' ? activeGames : [gameFilter];
        const base       = baseOf(activeGames, unified ? 'All' : gameFilter);
        const viewLabel  = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = (unified || isSingle)
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        const isSingleColumn = isSingle || unified || gameFilter !== 'All';
        const singleGame     = gameFilter !== 'All' ? gameFilter : activeGames[0];

        if (view === 'full') {
            const allRows = [];
            for (const { key, label } of ROD_KEYS) {
                const rows     = buildSlotFullRows(fish[key] || [], activeGames);
                const filtered = gameFilter !== 'All' ? rows.filter(r => r.perGame[gameFilter]) : rows;
                for (const r of filtered) allRows.push({ rod: label, ...r });
            }
            return h('div', { style: { overflowX: 'auto' } },
                h('table', null,
                    h('caption', null, tableLabel),
                    h('thead', null,
                        h('tr', null,
                            h('th', { className: hdrCls(null, base) }, 'Slot'),
                            h('th', { className: hdrCls(null, base) }, 'Rate'),
                            h('th', { className: hdrCls(null, base) }, 'Rod'),
                            isSingleColumn
                                ? [
                                    h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                                    h('th', { key: 'l',    className:  hdrCls(null, base) }, 'Level'),
                                  ]
                                : showGames.map(g => h('th', { key: g, colSpan: 3, className: hdrCls(g) }, g)),
                        )
                    ),
                    h('tbody', null,
                        allRows.map((row, i) =>
                            h('tr', { key: i },
                                h('td', { className: rowCls(base, i) }, row.slot),
                                h('td', { className: rowCls(base, i) }, `${row.rate}%`),
                                h('td', { className: rowCls(base, i) }, row.rod),
                                ...(isSingleColumn ? (() => {
                                    const c = row.perGame[singleGame];
                                    return [
                                        h('td', { key: 's', className: rowCls(base, i) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                        h('td', { key: 'n', className: rowCls(base, i) }, c ? c.name : '—'),
                                        h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })() : fullGameCells(row, showGames, mount, gp => rowCls(gp, i)))
                            )
                        )
                    )
                )
            );
        }

        // Compressed — sequential index across all rod sections
        let globalIdx = 0;
        const allRows = ROD_KEYS.flatMap(({ key, label }) => {
            const compRows = buildSlotCompressedRows(fish[key] || [], activeGames);
            const filtered = (() => {
                if (gameFilter !== 'All') {
                    return compRows
                        .filter(r => r.perGame[gameFilter])
                        .sort((a, b) => (b.perGame[gameFilter]?.rate || 0) - (a.perGame[gameFilter]?.rate || 0));
                }
                const arr  = compRows.slice();
                const meta = buildCompressedOrderingMeta(arr, showGames);
                return arr.sort((a, b) => compressedSpeciesCompare(a, b, meta));
            })();
            return filtered.map(row => ({ rod: label, idx: globalIdx++, ...row }));
        });

        return h('div', { style: { overflowX: 'auto' } },
            h('table', null,
                h('caption', null, tableLabel),
                h('thead', null,
                    h('tr', null,
                        h('th', { className: hdrCls(null, base) }, 'Rod'),
                        h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                        isSingleColumn
                            ? [
                                h('th', { key: 'r', className: hdrCls(null, base) }, 'Rate'),
                                h('th', { key: 'l', className: hdrCls(null, base) }, 'Level'),
                              ]
                            : showGames.map(g => h('th', { key: g, colSpan: 2, className: hdrCls(g) }, g)),
                    )
                ),
                h('tbody', null,
                    allRows.map(row =>
                        h('tr', { key: `${row.rod}-${row.name}-${row.idx}` },
                            h('td', { className: rowCls(base, row.idx) }, row.rod),
                            h('td', { className: rowCls(base, row.idx) }, h(Sprite, { name: row.name, mount })),
                            h('td', { className: rowCls(base, row.idx) }, row.name),
                            ...(isSingleColumn ? (() => {
                                const c = row.perGame[singleGame];
                                return [
                                    h('td', { key: 'r', className: rowCls(base, row.idx) }, c ? `${c.rate}%` : '—'),
                                    h('td', { key: 'l', className: rowCls(base, row.idx) }, c ? `lv. ${c.level}` : '—'),
                                ];
                            })() : showGames.flatMap(g => {
                                const gp = gamePrefix(g);
                                const c  = row.perGame[g];
                                if (!c) return [h('td', { key: g + '-na', colSpan: 2, className: rowCls(null, row.idx) }, 'N/A')];
                                return [
                                    h('td', { key: g + '-r', className: rowCls(gp, row.idx) }, `${c.rate}%`),
                                    h('td', { key: g + '-l', className: rowCls(gp, row.idx) }, `lv. ${c.level}`),
                                ];
                            }))
                        )
                    )
                )
            )
        );
    }

    // =========================================================
    // SlotApp — Surfing / Fishing root component
    // =========================================================
    function SlotApp({ encounterType, mount, mode }) {
        const { useState, useEffect, useMemo } = React;
        const [error,   setError]   = useState(null);
        const [loading, setLoading] = useState(true);
        const [data,    setData]    = useState(null);
        const [state,   setState]   = useState({ view: 'compressed', game: 'All' });

        const locId = inferLocationId(mount);

        useEffect(() => {
            let alive = true;
            getLocationData(locId)
                .then(d => { if (alive) { setData(d); setLoading(false); } })
                .catch(e => { if (alive) { setError(String(e?.message || e)); setLoading(false); } });
            return () => { alive = false; };
        }, []);

        const loc = useMemo(() => !data ? null : (mode === 'rby' ? remapLocationRBY(data) : data), [data, mode]);

        const activeGames = useMemo(() => {
            if (!loc) return [];
            const enc = loc.encounters || {};
            if (encounterType === 'surfing') return detectActiveGames(enc.surfing || []);
            if (encounterType === 'fishing') {
                const fish = enc.fishing || {};
                const all  = [...(fish.old || []), ...(fish.good || []), ...(fish.super || [])];
                return detectActiveGames(all);
            }
            return [];
        }, [loc, encounterType]);

        const unified = useMemo(() => {
            if (!loc) return false;
            const enc = loc.encounters || {};
            if (encounterType === 'surfing') return slotEncounterGamesIdentical(enc.surfing || [], activeGames);
            if (encounterType === 'fishing') {
                const fish = enc.fishing || {};
                return ['old', 'good', 'super'].every(k => slotEncounterGamesIdentical(fish[k] || [], activeGames));
            }
            return false;
        }, [loc, encounterType, activeGames]);

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return null;

        const enc      = loc.encounters || {};
        const isSingle = activeGames.length === 1;
        const isSep    = state.game === 'separate' && !isSingle;

        const effectiveGame    = isSingle ? 'All' : state.game;
        const effectiveUnified = isSingle || unified;

        let content = null;

        if (encounterType === 'surfing') {
            const slots = enc.surfing || [];
            if (!slots.length) return null;
            content = isSep
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, activeGames, gameFilter: g, view: state.view, mount })
                    )
                ))
                : h(SlotSection, { slots, activeGames, gameFilter: effectiveGame, view: state.view, mount, unified: effectiveUnified });

        } else if (encounterType === 'fishing') {
            const fish   = enc.fishing || {};
            const hasAny = ['old', 'good', 'super'].some(k => (fish[k] || []).length > 0);
            if (!hasAny) return null;
            content = isSep
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(FishTable, { fish, activeGames, gameFilter: g, view: state.view, mount })
                    )
                ))
                : h(FishTable, { fish, activeGames, gameFilter: effectiveGame, view: state.view, mount, unified: effectiveUnified });

        } else {
            return h('p', null, 'Unknown encounter type: ', encounterType);
        }

        return h('div', null,
            h(SlotViewControls, { state, setState, activeGames }),
            content
        );
    }

    // =========================================================
    // Boot
    // =========================================================
    (function boot() {
        const MODES = [
            {
                mode: 'rgby',
                walk: '.pokemon-rgby-walking-replace-me',
                walkFlag: '__rgbyWalkMounted',
                slotFlag: '__rgbySlotMounted',
                slots: [
                    { selector: '.pokemon-rgby-surfing-replace-me', encounterType: 'surfing' },
                    { selector: '.pokemon-rgby-fishing-replace-me', encounterType: 'fishing' },
                ],
            },
            {
                mode: 'rby',
                walk: '.pokemon-rby-walking-replace-me',
                walkFlag: '__rbyWalkMounted',
                slotFlag: '__rbySlotMounted',
                slots: [
                    { selector: '.pokemon-rby-surfing-replace-me', encounterType: 'surfing' },
                    { selector: '.pokemon-rby-fishing-replace-me', encounterType: 'fishing' },
                ],
            },
        ];

        function cloneAttrs(from, to) {
            for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                const v = from.getAttribute(a);
                if (v != null) to.setAttribute(a, v);
            }
        }

        function mountWalk(mode, selector, flag) {
            document.querySelectorAll(selector).forEach(n => {
                if (n[flag]) return;
                n[flag] = true;
                const container = document.createElement('div');
                cloneAttrs(n, container);
                n.replaceWith(container);
                ReactDOM.createRoot(container).render(h(App, { mount: container, mode }));
            });
        }

        function mountSlot(mode, selector, encounterType, flag) {
            document.querySelectorAll(selector).forEach(n => {
                if (n[flag]) return;
                n[flag] = true;
                const container = document.createElement('div');
                cloneAttrs(n, container);
                n.replaceWith(container);
                ReactDOM.createRoot(container).render(h(SlotApp, { encounterType, mount: container, mode }));
            });
        }

        function mountAll() {
            for (const M of MODES) {
                mountWalk(M.mode, M.walk, M.walkFlag);
                for (const s of M.slots) mountSlot(M.mode, s.selector, s.encounterType, M.slotFlag);
            }
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') mountAll();
        else document.addEventListener('DOMContentLoaded', mountAll, { once: true });
        new MutationObserver(mountAll).observe(document.documentElement, { childList: true, subtree: true });
    })();

})();
