// ==============================================
// b2w2.js — Pokémon Black 2 / White 2 encounter table renderer
//
// Requires (in order):
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="../javascript/pokemon-core.js"></script>
//   <script src="../javascript/b2w2.js"></script>
//
// Reads window.B2W2_DATA; location base via window.B2W2_LOCATION_BASE
//
// Encounter types:
//   Walk-style (seasons, compressed view): walking, darkgrass, shaking, surfing, shakingsurf
//   Slot-style (no conditions):            fishing, shakingfish
//
// Mount selectors: .pokemon-b2w2-{walking|darkgrass|shaking|surfing|shakingsurf|fishing|shakingfish}-replace-me
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[b2w2] React/ReactDOM globals not found.'); return; }
    if (!window.PokemonCore) { console.warn('[b2w2] pokemon-core.js must be loaded before b2w2.js.'); return; }

    const React    = window.React;
    const ReactDOM = window.ReactDOM;
    const h        = React.createElement;

    const {
        processConditions,
        humanizeWords, formatLevels,
        byName, loadScript, inferLocationId, bucketRowsByName,
        Toggle, Select,
        SPRITE_URL_CACHE, normalizedName, spriteCandidates,
    } = window.PokemonCore;

    // =========================================================
    // BW game constants
    // =========================================================
    const GAMES     = ['Black 2', 'White 2'];
    const GAME_KEYS = new Set(GAMES);
    const GAME_BIT  = { 'Black 2': 0, 'White 2': 1 };

    // Seasons replace time-of-day
    const SEASON_FLAGS = new Set(['spring', 'summer', 'autumn', 'winter']);
    const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

    function toSeasonOnly(arr) {
        return (arr || []).filter(c => SEASON_FLAGS.has(c));
    }

    // =========================================================
    // Condition formatting
    // =========================================================
    const COND_LABELS = {
        spring: 'Spring',
        summer: 'Summer',
        autumn: 'Autumn',
        winter: 'Winter',
    };

    function formatCondition(cond) {
        if (!cond) return '';
        return COND_LABELS[cond] || humanizeWords(cond);
    }

    function labelConditions(conds) {
        const list = (conds || []).map(formatCondition).filter(Boolean);
        return list.length ? list.join(', ') : 'Anytime';
    }

    function ConditionsCell({ conds }) {
        return h('span', null, labelConditions(conds));
    }

    // =========================================================
    // CSS helpers
    // =========================================================
    const gamePrefix = g => g.toLowerCase().replace(/\s+/g, '');

    // =========================================================
    // Data extraction
    // =========================================================
    function extractEncounters(location, encType) {
        return location?.encounters?.[encType] || [];
    }

    function gamesForEncounter(enc) {
        return (enc?.games || []).filter(g => GAME_KEYS.has(g));
    }

    // =========================================================
    // Unified-games detection
    // =========================================================
    function encounterGamesIdentical(location, encType) {
        for (const block of extractEncounters(location, encType)) {
            for (const opt of (block.options || [])) {
                if ((opt.games || []).length !== GAMES.length) return false;
            }
        }
        return true;
    }

    function slotEncounterGamesIdentical(slots) {
        for (const slot of (slots || [])) {
            for (const opt of (slot.options || [])) {
                if ((opt.games || []).length !== GAMES.length) return false;
            }
        }
        return true;
    }

    // =========================================================
    // Encounter option matching
    // BW has no swarm/radar — all options always match.
    // =========================================================
    function encounterOptionMatches() { return true; }

    // =========================================================
    // Species ordering (2-game bit-mask)
    // =========================================================
    function buildCompressedOrderingMeta(rows, showGames) {
        const meta = new Map();
        for (const r of rows) {
            let m = meta.get(r.name);
            if (!m) { m = { mask: 0, totalPct: 0, maxRate: 0 }; meta.set(r.name, m); }
            for (const g of showGames) {
                const cell = r.perGame?.[g];
                const pct  = cell?.rate || 0;
                const hasData = pct > 0 || !!(cell && cell.levels && cell.levels.length);
                if (hasData) m.mask |= (1 << GAME_BIT[g]);
                m.totalPct += pct;
                if (pct > m.maxRate) m.maxRate = pct;
            }
        }
        for (const info of meta.values()) {
            info.count = (info.mask & 1) + ((info.mask >> 1) & 1);
            // Black 2-only = rank 0, White 2-only = rank 1
            info.rank = info.mask === 0b10 ? 1 : 0;
        }
        return meta;
    }

    function compressedSpeciesCompare(a, b, meta) {
        const A = meta.get(a.name) || { count: 0, rank: 1, maxRate: 0, totalPct: 0 };
        const B = meta.get(b.name) || { count: 0, rank: 1, maxRate: 0, totalPct: 0 };
        if (A.count !== B.count) return B.count - A.count;
        if (A.count === 1 && A.rank !== B.rank) return A.rank - B.rank;
        if (A.maxRate !== B.maxRate) return B.maxRate - A.maxRate;
        if (A.totalPct !== B.totalPct) return B.totalPct - A.totalPct;
        return a.name.localeCompare(b.name);
    }

    // =========================================================
    // Row sort utilities
    // =========================================================
    function seasonRankForRow(r) {
        const seasons = toSeasonOnly(r?.condTokens || []);
        if (!seasons.length) return -1;
        return Math.min(...seasons.map(s => SEASON_ORDER.indexOf(s)));
    }

    function compressedRowSortTuple(r) {
        const conds   = r?.condTokens || [];
        const seasons = toSeasonOnly(conds);
        // macro 0 = has season conditions, macro 1 = no conditions (anytime)
        const macro = seasons.length > 0 ? 0 : 1;
        const subA  = macro === 0 ? seasonRankForRow(r) : 0;
        return [macro, subA, (r.rawConditions || r.condTokens || []).join('|')];
    }

    function compressedRowComparator(a, b) {
        const ta = compressedRowSortTuple(a);
        const tb = compressedRowSortTuple(b);
        for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
            const va = ta[i], vb = tb[i];
            if (va === vb) continue;
            if (typeof va === 'number' && typeof vb === 'number') return va - vb;
            return String(va).localeCompare(String(vb));
        }
        return 0;
    }

    function fullRowSortTuple(rec) {
        const conds = rec.rawConditions || [];
        const firstSeason = SEASON_ORDER.findIndex(s => conds.includes(s));
        return [firstSeason === -1 ? 99 : firstSeason, conds.join('|')];
    }

    // =========================================================
    // Row builders — walk-style
    // (walking, darkgrass, shaking, surfing, shakingsurf)
    // =========================================================

    function buildFullRows(location, s, encType) {
        const map = new Map();

        for (const block of extractEncounters(location, encType)) {
            const { rate, slot, options: encounters } = block;
            for (const opt of (encounters || [])) {
                const conds = processConditions(opt.conditions || []);
                const key   = `${slot}|${conds.join('|')}`;

                if (!map.has(key)) {
                    map.set(key, {
                        key, slot, rate,
                        rawConditions: conds,
                        perGame: Object.fromEntries(GAMES.map(g => [g, { name: null, levels: new Set() }])),
                    });
                }

                const rec = map.get(key);
                for (const g of gamesForEncounter(opt)) {
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
                GAMES.map(g => [g, { name: rec.perGame[g].name, levels: [...rec.perGame[g].levels].sort() }])
            );
            rec.seasonConds = toSeasonOnly(rec.rawConditions || []);
            out.push(rec);
        }

        return out.sort((a, b) => {
            if (a.slot !== b.slot) return a.slot - b.slot;
            const ta = fullRowSortTuple(a), tb = fullRowSortTuple(b);
            for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
                const va = ta[i], vb = tb[i];
                if (va === vb) continue;
                if (typeof va === 'number' && typeof vb === 'number') return va - vb;
                return String(va).localeCompare(String(vb));
            }
            return 0;
        });
    }

    // Canonicalize a level list that may mix bare levels with ranges (e.g. a
    // species reachable at "45-60" plus a redundant/rarer "60" or "50-60" on
    // top of that): merge overlapping/adjacent ranges into their true combined
    // span. Left untouched when every entry is a bare integer, so formatLevels'
    // "exactly two consecutive levels → 'a, b'" convention still applies to
    // ordinary level lists.
    function canonicalizeLevels(levels) {
        const arr = levels || [];
        if (!arr.some(l => /^\d+-\d+$/.test(String(l)))) return arr;
        return mergeRanges(arr).split(', ').filter(Boolean);
    }

    // buildCompressedRows — two logical passes:
    //   Pass 1: Accumulate per (name, all-conditions) → per-game rates + levels
    //   Pass 2: Season harmonisation — merge season variants with identical
    //           rates AND identical (canonicalized) level ranges
    function buildCompressedRows(location, s, encType) {
        const noSeasonConds = arr => (arr || []).filter(c => !SEASON_FLAGS.has(c));
        const makeEmpty     = () => Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }]));

        function mergePerGame(target, source) {
            for (const g of GAMES) {
                const t   = target[g] || (target[g] = { rate: 0, levels: [] });
                const src = source[g] || { rate: 0, levels: [] };
                t.rate += (src.rate || 0);
                const set = new Set([...(t.levels || []), ...(src.levels || [])]);
                t.levels = [...set].sort();
            }
        }

        // ── Pass 1 ───────────────────────────────────────────
        const perVariant = new Map();
        for (const block of extractEncounters(location, encType)) {
            const { rate, options: encounters } = block;
            for (const opt of (encounters || [])) {
                const allConds = processConditions(opt.conditions || []);
                const key = `${opt.name}|${allConds.join('|')}`;
                if (!perVariant.has(key)) {
                    perVariant.set(key, {
                        name: opt.name, conds: allConds,
                        perGame: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: new Set() }])),
                    });
                }
                const rec = perVariant.get(key);
                for (const g of gamesForEncounter(opt)) {
                    rec.perGame[g].rate += (Number(rate) || 0);
                    rec.perGame[g].levels.add(String(opt.level));
                }
            }
        }

        let rows = [];
        for (const [, rec] of perVariant) {
            rows.push({
                key: `${rec.name}|${rec.conds.join('|')}`,
                name: rec.name,
                perGame: Object.fromEntries(
                    GAMES.map(g => [g, { rate: rec.perGame[g].rate, levels: [...rec.perGame[g].levels].sort() }])
                ),
                condTokens:    rec.conds.slice(),
                rawConditions: rec.conds.slice(),
                seasonConds:   toSeasonOnly(rec.conds),
            });
        }

        // ── Pass 2: Season harmonisation ─────────────────────
        {
            const groups = new Map();
            for (const r of rows) {
                const baseNoSeason = noSeasonConds(r.condTokens);
                const key = `${r.name}|${baseNoSeason.join('|')}`;
                if (!groups.has(key)) groups.set(key, { baseNoSeason, name: r.name, items: [] });
                groups.get(key).items.push(r);
            }

            const rebuilt = [];
            for (const [, { baseNoSeason, name, items }] of groups) {
                const hasExplicitSeason = items.some(r => toSeasonOnly(r.condTokens).length > 0);
                if (!hasExplicitSeason) { rebuilt.push(...items); continue; }

                const perSeason = Object.fromEntries(SEASON_ORDER.map(s => [s, makeEmpty()]));

                for (const r of items) {
                    const seasons = toSeasonOnly(r.condTokens).length
                        ? toSeasonOnly(r.condTokens)
                        : SEASON_ORDER;
                    for (const season of seasons) mergePerGame(perSeason[season], r.perGame);
                }

                const sigFor = pg => GAMES.map(g =>
                    `${pg[g]?.rate || 0}#${canonicalizeLevels(pg[g]?.levels).join(',')}`
                ).join('|');
                const sigMap = new Map();
                for (const season of SEASON_ORDER) {
                    const sig = sigFor(perSeason[season]);
                    if (!sigMap.has(sig)) {
                        sigMap.set(sig, { seasons: [season], perGame: perSeason[season] });
                    } else {
                        const acc = sigMap.get(sig);
                        acc.seasons.push(season);
                        for (const g of GAMES) {
                            const lvUnion = new Set([...(acc.perGame[g].levels || []), ...(perSeason[season][g].levels || [])]);
                            acc.perGame[g].levels = [...lvUnion].sort();
                        }
                    }
                }

                for (const { seasons, perGame } of sigMap.values()) {
                    const total = GAMES.reduce((acc, g) => acc + (perGame[g]?.rate || 0), 0);
                    if (!total) continue;
                    const seasonPart  = seasons.slice().sort((a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b));
                    const isAllFour   = seasonPart.length === 4;
                    const seasonToks  = isAllFour ? [] : seasonPart;
                    const conds       = [...baseNoSeason, ...seasonToks];
                    rebuilt.push({
                        key: `${name}|${conds.join('|')}|season-harm`,
                        name, perGame,
                        condTokens:    conds.slice(),
                        rawConditions: isAllFour ? [] : seasonPart.map(formatCondition),
                        seasonConds:   seasonToks.slice(),
                    });
                }
            }
            rows = rebuilt;
        }

        // Merge overlapping/adjacent level ranges contributed by different
        // slots or seasons (e.g. "45-60" absorbing a redundant "60"/"50-60")
        // so the Level column reflects the true combined range.
        rows = rows.map(r => ({
            ...r,
            perGame: Object.fromEntries(GAMES.map(g => [g, {
                rate: r.perGame[g]?.rate || 0,
                levels: canonicalizeLevels(r.perGame[g]?.levels),
            }])),
        }));

        rows = rows.filter(r => r && typeof r.name === 'string' && r.name.trim().length);
        rows.sort((a, b) => {
            const n = byName(a.name, b.name);
            if (n !== 0) return n;
            return (a.condTokens || []).join('|').localeCompare((b.condTokens || []).join('|'));
        });
        return rows;
    }

    // =========================================================
    // Sprite
    // =========================================================
    function Sprite(props) {
        const { useState, useMemo, useEffect } = React;
        const nm = normalizedName(props.name);

        const hardcoded = [
            { name: 'nidoran♀', path: '../../Resources/images/home-renders/gen-1/nidoran-f.png' },
            { name: 'nidoran♂', path: '../../Resources/images/home-renders/gen-1/nidoran-m.png' },
            { name: 'deerling', path: '../../Resources/images/home-renders/gen-5/deerling-spring.png' },
            { name: 'sawsbuck', path: '../../Resources/images/home-renders/gen-5/sawsbuck-spring.png' },
        ];

        const match = hardcoded.find(e => e.name === nm);
        if (match) {
            return h('img', { src: match.path, alt: props.name, loading: 'lazy', className: 'flex-img' });
        }

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
    // ViewControls — seasons work like time-of-day: always shown in the
    // conditions column, never gated behind a filter toggle.
    // =========================================================
    function ViewControls({ state, setState, unified }) {
        const set = p => setState(prev => Object.assign({}, prev, p));
        return h('div', { style: { margin: '8px 0 12px' } },
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' } },
                h(Select, {
                    label: 'View',
                    value: state.view,
                    onChange: v => set({ view: v }),
                    options: [
                        { value: 'full',       label: 'Full (slots)' },
                        { value: 'compressed', label: 'Compressed' },
                    ],
                }),
                !unified && h(Select, {
                    label: 'Game',
                    value: state.game,
                    onChange: v => set({ game: v }),
                    options: [
                        { value: 'All',      label: 'All' },
                        { value: 'separate', label: 'Separate' },
                        ...GAMES.map(g => ({ value: g, label: g })),
                    ],
                }),
            ),
        );
    }

    // =========================================================
    // GameTable — single-game wrapper for walk-style tables
    // =========================================================
    function GameTable({ game, baseState, location, mount, encType }) {
        const s = React.useMemo(() => ({ ...baseState, game }), [baseState, game]);

        const rows = React.useMemo(() => {
            if (!location) return [];
            if (s.view === 'full') return buildFullRows(location, s, encType);
            const built = buildCompressedRows(location, s, encType);
            return built.filter(r => r && typeof r.name === 'string' && r.name.trim().length);
        }, [location, s.view, s.game, encType]);

        return h(Table, {
            rows, games: GAMES, gameFilter: game, mount,
            view: s.view, encType,
        });
    }

    // =========================================================
    // Table — walk-style render component
    // =========================================================
    function Table(props) {
        const { rows, gameFilter, mount, view, encType } = props;
        const unified        = !!props.unified;
        const showGames      = gameFilter === 'All' ? GAMES : [gameFilter];
        const viewLabel      = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel     = unified
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        const basePrefix = () => gameFilter && gameFilter !== 'All' ? gamePrefix(gameFilter) : 'light';
        const hdrCls     = g => g ? `${gamePrefix(g)}-true` : `${basePrefix()}-true`;

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

        // ── Compressed species order ──────────────────────────
        let renderList = sanitizedRows;
        if (view === 'compressed') {
            const buckets = bucketRowsByName(sanitizedRows);
            const orderedNames = (() => {
                const names = Array.from(buckets.keys());
                if (gameFilter && gameFilter !== 'All') {
                    return names.sort((na, nb) => {
                        const rA = (buckets.get(na) || []).reduce((s, r) => s + (r.perGame?.[gameFilter]?.rate || 0), 0);
                        const rB = (buckets.get(nb) || []).reduce((s, r) => s + (r.perGame?.[gameFilter]?.rate || 0), 0);
                        if (rA !== rB) return rB - rA;
                        return na.localeCompare(nb);
                    });
                }
                const _meta = buildCompressedOrderingMeta(Array.from(buckets.values()).flat(), GAMES);
                return names.sort((na, nb) =>
                    compressedSpeciesCompare({ name: na }, { name: nb }, _meta)
                );
            })();
            renderList = [];
            for (const name of orderedNames) {
                const arr = buckets.get(name).slice();
                arr.sort(compressedRowComparator);
                renderList.push(...arr);
            }
        }

        // ── Stripe maps ──────────────────────────────────────
        const rowStripeTrue = new Map();
        let   blockByStart  = null;

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
            const p = prefix || basePrefix();
            return `${p}-${rowStripeTrue.get(rowIndex) ? 'true' : 'false'}`;
        }

        function zebraBySlot(prefix, slot) {
            const p = prefix || basePrefix();
            return `${p}-${(Number(slot) || 0) % 2 === 1 ? 'true' : 'false'}`;
        }

        // ── Condition column visibility ───────────────────────
        function rowHasConditions(r) {
            if (view === 'full') return (r.rawConditions || []).length > 0;
            return (r.seasonConds || []).length > 0;
        }

        const hideConditionsColumn =
            sanitizedRows.length > 0 && sanitizedRows.every(r => !rowHasConditions(r));

        // ── Full-view slot groups ─────────────────────────────
        let fullGroups = null;
        if (view === 'full') {
            fullGroups = new Map();
            for (const r of sanitizedRows) {
                const k = `${r.slot}|${r.rate}`;
                if (!fullGroups.has(k)) fullGroups.set(k, []);
                fullGroups.get(k).push(r);
            }
            for (const [, arr] of fullGroups) {
                arr.sort((a, b) => {
                    const ta = fullRowSortTuple(a), tb = fullRowSortTuple(b);
                    for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
                        if (ta[i] === tb[i]) continue;
                        if (typeof ta[i] === 'number') return ta[i] - tb[i];
                        return String(ta[i]).localeCompare(String(tb[i]));
                    }
                    return 0;
                });
            }
        }

        // ── Headers ───────────────────────────────────────────
        function FullHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { className: hdrCls(null) }, 'Slot'),
                    h('th', { className: hdrCls(null) }, 'Rate'),
                    !hideConditionsColumn && h('th', { className: hdrCls(null) }, 'Conditions'),
                    (unified || gameFilter !== 'All')
                        ? [
                            h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null) }, 'Pokémon'),
                            h('th', { key: 'lv',   className:  hdrCls(null) }, 'Level'),
                          ]
                        : showGames.map(g => h('th', { key: g, colSpan: 3, className: hdrCls(g) }, g)),
                )
            );
        }

        function CompressedHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { colSpan: 2, className: hdrCls(null) }, 'Pokémon'),
                    ...(unified || gameFilter !== 'All'
                        ? [
                            h('th', { key: 'r', className: hdrCls(null) }, 'Rate'),
                            h('th', { key: 'l', className: hdrCls(null) }, 'Level'),
                        ]
                        : showGames.map(g => h('th', { key: g, colSpan: 2, className: hdrCls(g) }, g))
                    ),
                    !hideConditionsColumn && h('th', { className: hdrCls(null) }, 'Conditions'),
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
                                    out.push(h('tr', {
                                        key: `${r.key}::${iInGroup}`,
                                        className: gameFilter !== 'All' ? zebraBySlot(gamePrefix(gameFilter), r.slot) : undefined,
                                    },
                                        ...(iInGroup === 0 ? [
                                            h('td', { rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, String(r.slot)),
                                            h('td', { rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, `${r.rate}%`),
                                        ] : []),
                                        !hideConditionsColumn && h('td', { className: zebraBySlot(null, r.slot) },
                                            h(ConditionsCell, { conds: r.rawConditions })
                                        ),
                                        ...(unified ? (() => {
                                            const g    = GAMES[0];
                                            const cell = r.perGame?.[g];
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
                                                h('td', { key: g + ':s', className: zebraBySlot(gp, r.slot) }, has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'),
                                                h('td', { key: g + ':n', className: zebraBySlot(gp, r.slot) }, has ? cell.name : '—'),
                                                h('td', { key: g + ':l', className: zebraBySlot(gp, r.slot) }, has ? `lv. ${lv}` : '—'),
                                            ];
                                        })),
                                    ));
                                });
                            }
                            return out;
                        })()
                        : renderList.map((r, rowIndex) => {
                            const block = blockByStart.get(rowIndex);
                            return h('tr', {
                                key: `${r.key || r.name}::${rowIndex}`,
                                className: gameFilter !== 'All' ? zebraByBlock(gamePrefix(gameFilter), rowIndex) : undefined,
                            },
                                block ? h(React.Fragment, null,
                                    h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, h(Sprite, { name: r.name, mount })),
                                    h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, r.name),
                                ) : null,
                                ...(unified ? (() => {
                                    const cell  = r.perGame?.[GAMES[0]];
                                    const pct   = cell?.rate || 0;
                                    const lvStr = cell?.levels?.length ? formatLevels(cell.levels) : '';
                                    const has   = !!(pct || lvStr);
                                    return [
                                        h('td', {
                                            key: 'u:pct',
                                            colSpan: has ? 1 : 2,
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
                                            key: g + ':pct',
                                            colSpan: has ? 1 : 2,
                                            className: has ? zebraByBlock(gp, rowIndex) : zebraByBlock(null, rowIndex),
                                        }, has ? (pct ? `${pct}%` : '—') : 'N/A'),
                                        has ? h('td', { key: g + ':lv', className: zebraByBlock(gp, rowIndex) }, `lv. ${lvStr}`) : null,
                                    ];
                                })),
                                !hideConditionsColumn && h('td', { className: zebraByBlock(null, rowIndex) },
                                    h(ConditionsCell, { conds: r.condTokens || [] })
                                ),
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
        const base = window.B2W2_LOCATION_BASE || '../javascript/B2W2/';
        const p = loadScript(`${base}${locId}.js`).then(() => {
            if (!window.B2W2_DATA) throw new Error('B2W2_DATA not found after script load');
            const d = window.B2W2_DATA;
            delete window.B2W2_DATA;
            return d;
        });
        DATA_PROMISE_CACHE.set(locId, p);
        return p;
    }

    // =========================================================
    // WalkApp — root for walk-style encounter types
    // (walking, darkgrass, shaking, surfing, shakingsurf)
    // =========================================================
    function WalkApp({ encType, mount }) {
        const { useState, useEffect, useMemo } = React;

        const [error,   setError]   = useState(null);
        const [loading, setLoading] = useState(true);
        const [data,    setData]    = useState(null);
        const [state,   setState]   = useState({
            view: 'compressed',
            game: 'All',
        });
        const [, startTransition] = React.useTransition();

        const locationId = inferLocationId(mount);

        useEffect(() => {
            let alive = true;
            getLocationData(locationId)
                .then(d => { if (alive) { setData(d); setLoading(false); } })
                .catch(e => { if (alive) { setError(String(e?.message || e)); setLoading(false); } });
            return () => { alive = false; };
        }, []);

        const unified = useMemo(() => data ? encounterGamesIdentical(data, encType) : false, [data, encType]);

        const rows = useMemo(() => {
            if (!data) return [];
            if (state.view === 'full') return buildFullRows(data, state, encType);
            return buildCompressedRows(data, state, encType);
        }, [data, state, encType]);

        const setStateDeferred = React.useCallback(
            updater => startTransition(() => setState(updater)),
            [startTransition]
        );

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return h('p', null, 'No data for ', h('code', null, String(locationId)), '.');

        if (!extractEncounters(data, encType).length) return null;

        return h('div', null,
            h(ViewControls, { state, setState: setStateDeferred, unified }),
            state.game === 'separate' && !unified
                ? h('div', null,
                    GAMES.map(g => h('div', { key: g, style: { marginTop: 12 } },
                        h(GameTable, { game: g, baseState: state, location: data, mount, encType })
                    ))
                )
                : h(Table, {
                    rows, games: GAMES, gameFilter: unified ? 'All' : state.game, mount,
                    view: state.view, unified, encType,
                })
        );
    }

    // =========================================================
    // Slot utilities — fishing / shakingfish (no conditions, no rod)
    // =========================================================
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

    function slotCls(prefix, slot) {
        return `${prefix || 'light'}-${(Number(slot) || 0) % 2 === 1 ? 'true' : 'false'}`;
    }

    function rowCls(prefix, idx) {
        return `${prefix || 'light'}-${idx % 2 === 1 ? 'true' : 'false'}`;
    }

    function hdrCls(g, basePrefix) {
        if (g) return `${gamePrefix(g)}-true`;
        return `${basePrefix || 'light'}-true`;
    }

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

    function SlotViewControls({ state, setState, unified }) {
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
            !unified && h(Select, {
                label: 'Game', value: state.game,
                onChange: v => set({ game: v }),
                options: [
                    { value: 'All',      label: 'All' },
                    { value: 'separate', label: 'Separate' },
                    ...GAMES.map(g => ({ value: g, label: g })),
                ],
            }),
        );
    }

    function SimpleSlotSection({ slots, games, gameFilter, view, mount, unified }) {
        if (!slots || !slots.length) return null;
        const isSingle   = GAMES.includes(gameFilter);
        const showGames  = isSingle ? [gameFilter] : games;
        const base       = (isSingle || unified) ? (unified ? 'light' : gamePrefix(gameFilter)) : 'light';
        const viewLabel  = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = unified
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        if (view === 'full') {
            const fullRows = buildSlotFullRows(slots, games);
            const rows = isSingle ? fullRows.filter(r => r.perGame[gameFilter]) : fullRows;
            return h('div', { style: { overflowX: 'auto' } },
                h('table', null,
                    h('caption', null, tableLabel),
                    h('thead', null,
                        h('tr', null,
                            h('th', { className: hdrCls(null, base) }, 'Slot'),
                            h('th', { className: hdrCls(null, base) }, 'Rate'),
                            (isSingle || unified)
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
                                ...((isSingle || unified)
                                    ? (() => {
                                        const c = row.perGame[unified ? GAMES[0] : gameFilter];
                                        return [
                                            h('td', { key: 's', className: slotCls(base, row.slot) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                            h('td', { key: 'n', className: slotCls(base, row.slot) }, c ? c.name : '—'),
                                            h('td', { key: 'l', className: slotCls(base, row.slot) }, c ? `lv. ${c.level}` : '—'),
                                        ];
                                    })()
                                    : showGames.flatMap(g => {
                                        const gp = gamePrefix(g);
                                        const c  = row.perGame[g];
                                        return [
                                            h('td', { key: g + '-s', className: slotCls(gp, row.slot) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                            h('td', { key: g + '-n', className: slotCls(gp, row.slot) }, c ? c.name : '—'),
                                            h('td', { key: g + '-l', className: slotCls(gp, row.slot) }, c ? `lv. ${c.level}` : '—'),
                                        ];
                                    })
                                )
                            )
                        )
                    )
                )
            );
        }

        // Compressed
        const compRows = buildSlotCompressedRows(slots, games);
        const rows = (() => {
            if (isSingle) {
                return compRows
                    .filter(r => r.perGame[gameFilter])
                    .sort((a, b) => (b.perGame[gameFilter]?.rate || 0) - (a.perGame[gameFilter]?.rate || 0));
            }
            const arr  = compRows.slice();
            const meta = buildCompressedOrderingMeta(arr, games);
            return arr.sort((a, b) => compressedSpeciesCompare(a, b, meta));
        })();

        return h('div', { style: { overflowX: 'auto' } },
            h('table', null,
                h('caption', null, tableLabel),
                h('thead', null,
                    h('tr', null,
                        h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                        (isSingle || unified)
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
                            ...((isSingle || unified)
                                ? (() => {
                                    const c = row.perGame[unified ? GAMES[0] : gameFilter];
                                    return [
                                        h('td', { key: 'r', className: rowCls(base, i) }, c ? `${c.rate}%` : '—'),
                                        h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })()
                                : showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const c  = row.perGame[g];
                                    if (!c) return [h('td', { key: g + '-na', colSpan: 2, className: rowCls(null, i) }, 'N/A')];
                                    return [
                                        h('td', { key: g + '-r', className: rowCls(gp, i) }, `${c.rate}%`),
                                        h('td', { key: g + '-l', className: rowCls(gp, i) }, `lv. ${c.level}`),
                                    ];
                                })
                            )
                        )
                    )
                )
            )
        );
    }

    // =========================================================
    // SlotApp — root for slot-style encounter types (fishing, shakingfish)
    // =========================================================
    function SlotApp({ encType, mount }) {
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

        const unified = useMemo(() => {
            if (!data) return false;
            return slotEncounterGamesIdentical(data.encounters?.[encType] || []);
        }, [data, encType]);

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return null;

        const slots = data.encounters?.[encType] || [];
        if (!slots.length) return null;

        const isSeparate = state.game === 'separate';
        const content = isSeparate && !unified
            ? h('div', null, GAMES.map(g =>
                h('div', { key: g, style: { marginBottom: 16 } },
                    h(SimpleSlotSection, { slots, games: GAMES, gameFilter: g, view: state.view, mount })
                )
            ))
            : h(SimpleSlotSection, { slots, games: GAMES, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified });

        return h('div', null,
            h(SlotViewControls, { state, setState, unified }),
            content
        );
    }

    // =========================================================
    // Boot
    // =========================================================
    (function boot() {
        const WALK_SELECTORS = [
            { selector: '.pokemon-b2w2-walking-replace-me',     encType: 'walking' },
            { selector: '.pokemon-b2w2-darkgrass-replace-me',   encType: 'darkgrass' },
            { selector: '.pokemon-b2w2-shaking-replace-me',     encType: 'shaking' },
            { selector: '.pokemon-b2w2-surfing-replace-me',     encType: 'surfing' },
            { selector: '.pokemon-b2w2-shakingsurf-replace-me', encType: 'shakingsurf' },
        ];
        const SLOT_SELECTORS = [
            { selector: '.pokemon-b2w2-fishing-replace-me',     encType: 'fishing' },
            { selector: '.pokemon-b2w2-shakingfish-replace-me', encType: 'shakingfish' },
        ];

        function mountWalk(n, encType) {
            if (n.__b2w2WalkMounted) return;
            n.__b2w2WalkMounted = true;
            const container = document.createElement('div');
            for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                const v = n.getAttribute(a);
                if (v != null) container.setAttribute(a, v);
            }
            n.replaceWith(container);
            ReactDOM.createRoot(container).render(React.createElement(WalkApp, { encType, mount: container }));
        }

        function mountSlot(n, encType) {
            if (n.__b2w2SlotMounted) return;
            n.__b2w2SlotMounted = true;
            const container = document.createElement('div');
            for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                const v = n.getAttribute(a);
                if (v != null) container.setAttribute(a, v);
            }
            n.replaceWith(container);
            ReactDOM.createRoot(container).render(React.createElement(SlotApp, { encType, mount: container }));
        }

        function mountAll() {
            for (const { selector, encType } of WALK_SELECTORS) {
                document.querySelectorAll(selector).forEach(n => mountWalk(n, encType));
            }
            for (const { selector, encType } of SLOT_SELECTORS) {
                document.querySelectorAll(selector).forEach(n => mountSlot(n, encType));
            }
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') mountAll();
        else document.addEventListener('DOMContentLoaded', mountAll, { once: true });
        new MutationObserver(mountAll).observe(document.documentElement, { childList: true, subtree: true });
    })();

})();