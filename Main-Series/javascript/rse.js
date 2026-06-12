// ==============================================
// rse.js — Pokémon Ruby / Sapphire / Emerald encounter table renderer
//
// Requires (in order):
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="../javascript/pokemon-core.js"></script>
//   <script src="../javascript/rse.js"></script>
//
// Differences from bdsp.js:
//   - Three games: "Ruby", "Sapphire", "Emerald"
//   - No conditions (no swarm / Poké Radar / time-of-day)
//   - Per-encounter-type game detection:
//       • All three present → full dropdown + 3 columns
//       • R/S only → dropdown shows only Ruby/Sapphire, 2 columns
//       • Emerald-only → no dropdown, single Emerald-coloured column
//   - Includes "rock_smash" encounter type (SlotSection, same as surfing)
//   - Reads window.RSE_DATA; location base via window.RSE_LOCATION_BASE
//   - Mounts on .pokemon-rse-{walking|surfing|fishing|rocksmash}-replace-me
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[rse] React/ReactDOM globals not found.'); return; }
    if (!window.PokemonCore) { console.warn('[rse] pokemon-core.js must be loaded before rse.js.'); return; }

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
    // RSE game constants
    // =========================================================
    const ALL_GAMES = ['Ruby', 'Sapphire', 'Emerald'];
    const GAME_KEYS = new Set(ALL_GAMES);
    const GAME_BIT  = { Ruby: 0, Sapphire: 1, Emerald: 2 };

    const gamePrefix = g => g.toLowerCase();

    // =========================================================
    // CSS class helpers (mirrored from bdsp.js)
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

    // Derive base stripe prefix from active display context
    function baseOf(activeGames, gameFilter) {
        if (gameFilter && gameFilter !== 'All') return gamePrefix(gameFilter);
        if (activeGames.length === 1) return gamePrefix(activeGames[0]);
        return 'light';
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

    // Returns true when every option in every slot lists all activeGames —
    // encounters are identical across the full active game set.
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
        const total = meta.get('__total__') || 0;
        const A = meta.get(a.name) || { count: 0, rank: total, maxRate: 0, totalPct: 0 };
        const B = meta.get(b.name) || { count: 0, rank: total, maxRate: 0, totalPct: 0 };
        if (A.count !== B.count) return B.count - A.count;
        if (A.count < total && A.rank !== B.rank) return A.rank - B.rank;
        if (A.maxRate !== B.maxRate) return B.maxRate - A.maxRate;
        if (A.totalPct !== B.totalPct) return B.totalPct - A.totalPct;
        return a.name.localeCompare(b.name);
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
    // Sprite (no form overrides needed for RSE)
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
    // activeGames.length === 1 → Emerald-only: hide game dropdown
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

        // For single-column rendering: unified, single active game, or specific game selected
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

        // ── Compressed species ordering ───────────────────────
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

        // ── Stripe maps ───────────────────────────────────────
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

        // ── Full-view slot groups ─────────────────────────────
        let fullGroups = null;
        if (view === 'full') {
            fullGroups = new Map();
            for (const r of sanitizedRows) {
                const k = `${r.slot}|${r.rate}`;
                if (!fullGroups.has(k)) fullGroups.set(k, []);
                fullGroups.get(k).push(r);
            }
        }

        // ── Headers ───────────────────────────────────────────
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

        // ── Body ──────────────────────────────────────────────
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
        const base = window.RSE_LOCATION_BASE || '../javascript/RSE/';
        const p = loadScript(`${base}${locId}.js`).then(() => {
            if (!window.RSE_DATA) throw new Error('RSE_DATA not found after script load');
            const d = window.RSE_DATA;
            delete window.RSE_DATA;
            return d;
        });
        DATA_PROMISE_CACHE.set(locId, p);
        return p;
    }

    // =========================================================
    // App — walking table root component
    // =========================================================
    function App({ mount }) {
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

        const activeGames = useMemo(() => detectActiveGames(data?.encounters?.walking || []), [data]);
        const unified     = useMemo(() => data ? walkingGamesIdentical(data, activeGames) : false, [data, activeGames]);
        const isSingle    = activeGames.length === 1;

        const rows = useMemo(() => {
            if (!data) return [];
            return state.view === 'full'
                ? buildFullRows(data, activeGames)
                : buildCompressedRows(data, activeGames);
        }, [data, state.view, activeGames]);

        const setStateDeferred = React.useCallback(
            updater => startTransition(() => setState(updater)),
            [startTransition]
        );

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return h('p', null, 'No data for ', h('code', null, String(locationId)), '.');

        // When single-game location: always treat as combined/unified
        const effectiveGame = isSingle ? 'All' : state.game;
        const effectiveUnified = isSingle || unified;

        return h('div', null,
            h(ViewControls, { state, setState: setStateDeferred, activeGames }),
            state.game === 'separate' && !isSingle
                ? h('div', null,
                    activeGames.map(g => h('div', { key: g, style: { marginTop: 12 } },
                        h(GameTable, { game: g, baseState: state, location: data, activeGames, mount })
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
    // Slot encounter utilities — Surfing / Fishing / Rock Smash
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
    // SlotSection — Surfing + Rock Smash
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
                                })() : showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const c  = row.perGame[g];
                                    return [
                                        h('td', { key: g + '-s', className: slotCls(gp, row.slot) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                        h('td', { key: g + '-n', className: slotCls(gp, row.slot) }, c ? c.name : '—'),
                                        h('td', { key: g + '-l', className: slotCls(gp, row.slot) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                }))
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
                            h('th', { className: hdrCls(null, base) }, 'Rod'),
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
                        allRows.map((row, i) =>
                            h('tr', { key: i },
                                h('td', { className: rowCls(base, i) }, row.rod),
                                h('td', { className: rowCls(base, i) }, row.slot),
                                h('td', { className: rowCls(base, i) }, `${row.rate}%`),
                                ...(isSingleColumn ? (() => {
                                    const c = row.perGame[singleGame];
                                    return [
                                        h('td', { key: 's', className: rowCls(base, i) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                        h('td', { key: 'n', className: rowCls(base, i) }, c ? c.name : '—'),
                                        h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })() : showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const c  = row.perGame[g];
                                    return [
                                        h('td', { key: g + '-s', className: rowCls(gp, i) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                        h('td', { key: g + '-n', className: rowCls(gp, i) }, c ? c.name : '—'),
                                        h('td', { key: g + '-l', className: rowCls(gp, i) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                }))
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
    // SlotApp — Surfing / Fishing / Rock Smash root component
    // =========================================================
    function SlotApp({ encounterType, mount }) {
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

        // Hooks must be called unconditionally (Rules of Hooks)
        const activeGames = useMemo(() => {
            if (!data) return [];
            const enc = data.encounters || {};
            if (encounterType === 'surfing')    return detectActiveGames(enc.surfing    || []);
            if (encounterType === 'rock_smash') return detectActiveGames(enc.rock_smash || []);
            if (encounterType === 'fishing') {
                const fish = enc.fishing || {};
                const all  = [...(fish.old || []), ...(fish.good || []), ...(fish.super || [])];
                return detectActiveGames(all);
            }
            return [];
        }, [data, encounterType]);

        const unified = useMemo(() => {
            if (!data) return false;
            const enc = data.encounters || {};
            if (encounterType === 'surfing')    return slotEncounterGamesIdentical(enc.surfing    || [], activeGames);
            if (encounterType === 'rock_smash') return slotEncounterGamesIdentical(enc.rock_smash || [], activeGames);
            if (encounterType === 'fishing') {
                const fish = enc.fishing || {};
                return ['old', 'good', 'super'].every(k => slotEncounterGamesIdentical(fish[k] || [], activeGames));
            }
            return false;
        }, [data, encounterType, activeGames]);

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return null;

        const enc      = data.encounters || {};
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

        } else if (encounterType === 'rock_smash') {
            const slots = enc.rock_smash || [];
            if (!slots.length) return null;
            content = isSep
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, activeGames, gameFilter: g, view: state.view, mount })
                    )
                ))
                : h(SlotSection, { slots, activeGames, gameFilter: effectiveGame, view: state.view, mount, unified: effectiveUnified });

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
        // Walking
        const WALK_SEL = '.pokemon-rse-walking-replace-me';

        function mountAll() {
            document.querySelectorAll(WALK_SEL).forEach(n => {
                if (n.__rseWalkMounted) return;
                n.__rseWalkMounted = true;
                const container = document.createElement('div');
                for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                    const v = n.getAttribute(a);
                    if (v != null) container.setAttribute(a, v);
                }
                n.replaceWith(container);
                ReactDOM.createRoot(container).render(h(App, { mount: container }));
            });
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') mountAll();
        else document.addEventListener('DOMContentLoaded', mountAll, { once: true });
        new MutationObserver(mountAll).observe(document.documentElement, { childList: true, subtree: true });

        // Surfing, Fishing, Rock Smash
        const SLOT_SELECTORS = [
            { selector: '.pokemon-rse-surfing-replace-me',   encounterType: 'surfing'    },
            { selector: '.pokemon-rse-fishing-replace-me',   encounterType: 'fishing'    },
            { selector: '.pokemon-rse-rocksmash-replace-me', encounterType: 'rock_smash' },
        ];

        for (const { selector, encounterType } of SLOT_SELECTORS) {
            const mountSlotAll = () => {
                document.querySelectorAll(selector).forEach(n => {
                    if (n.__rseSlotMounted) return;
                    n.__rseSlotMounted = true;
                    const container = document.createElement('div');
                    for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                        const v = n.getAttribute(a);
                        if (v != null) container.setAttribute(a, v);
                    }
                    n.replaceWith(container);
                    ReactDOM.createRoot(container).render(h(SlotApp, { encounterType, mount: container }));
                });
            };
            new MutationObserver(mountSlotAll).observe(document.documentElement, { childList: true, subtree: true });
            mountSlotAll();
        }
    })();

})();
