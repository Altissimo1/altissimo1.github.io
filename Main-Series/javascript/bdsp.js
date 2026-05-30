// ==============================================
// bdsp.js — Pokémon Brilliant Diamond / Shining Pearl encounter table renderer
//
// Requires (in order):
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="../javascript/pokemon-core.js"></script>
//   <script src="../javascript/bdsp.js"></script>
//
// Differences from dppt.js:
//   - Two games: "Brilliant Diamond" and "Shining Pearl"
//   - No Slot-2 conditions (Swarm, Poké Radar, and time-of-day still apply)
//   - Reads window.BDSP_DATA; location base via window.BDSP_LOCATION_BASE
//   - Mounts on .pokemon-bdsp-{walking|surfing|fishing}-replace-me
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[bdsp] React/ReactDOM globals not found.'); return; }
    if (!window.PokemonCore) { console.warn('[bdsp] pokemon-core.js must be loaded before bdsp.js.'); return; }

    const React    = window.React;
    const ReactDOM = window.ReactDOM;
    const h        = React.createElement;

    const {
        TIME_FLAGS, TIME_ORDER,
        toTimeOnly, processConditions, hasAny,
        humanizeWords, formatLevels,
        byName, loadScript, inferLocationId, bucketRowsByName,
        Toggle, Select,
        SPRITE_URL_CACHE, normalizedName, spriteBaseDirs, spriteCandidates,
    } = window.PokemonCore;

    // =========================================================
    // BDSP game constants
    // =========================================================
    const GAMES      = ['Brilliant Diamond', 'Shining Pearl'];
    const GAME_KEYS  = new Set(GAMES);
    const RADAR_FLAGS = new Set(['pokeradar', 'no-pokeradar']);
    const SWARM_FLAGS = new Set(['swarm', 'no-swarm']);
    let SHELLOS = '';

    const GAME_BIT = { 'Brilliant Diamond': 0, 'Shining Pearl': 1 };

    // =========================================================
    // Condition formatting
    // =========================================================
    const COND_LABELS = {
        'pokeradar':    'Poké Radar',
        'no-pokeradar': 'No Poké Radar',
        'swarm':        'Swarm',
        'no-swarm':     'No swarm',
    };

    function formatCondition(cond) {
        if (!cond) return '';
        if (COND_LABELS[cond]) return COND_LABELS[cond];
        return humanizeWords(cond);
    }

    function labelConditions(conds) {
        const list = (conds || []).map(formatCondition).filter(Boolean);
        return list.length ? list.join(', ') : 'Anytime';
    }

    function ConditionsCell({ conds }) {
        return h('span', null, labelConditions(conds));
    }

    // =========================================================
    // CSS class / stripe helpers
    // =========================================================
    const gamePrefix  = g => g.toLowerCase().replace(/\s+/g, '');
    const headerClass = g => g ? `${gamePrefix(g)}-true` : 'light-true';

    function zebra(prefix, rowIndex) {
        const isTrue = (rowIndex % 2) === 1;
        const p = prefix || 'light';
        return `${p}-${isTrue ? 'true' : 'false'}`;
    }

    // =========================================================
    // Data extraction
    // =========================================================
    function extractWalking(location) { return location?.encounters?.walking || []; }
    function gamesForEncounter(enc) { return (enc?.games || []).filter(g => GAME_KEYS.has(g)); }

    function computeAvailableConditionFilters(location) {
        const out = { hasSwarm: false, hasRadar: false };
        if (!location) return out;
        for (const block of extractWalking(location)) {
            for (const opt of (block.options || [])) {
                const conds = opt.conditions || [];
                if (conds.includes('swarm') || conds.includes('no-swarm')) out.hasSwarm = true;
                if (conds.includes('pokeradar') || conds.includes('no-pokeradar')) out.hasRadar = true;
            }
        }
        return out;
    }

    // =========================================================
    // Unified-games detection
    // Returns true when every option in every slot lists all games,
    // meaning encounters are identical across the full game set.
    // =========================================================
    function walkingGamesIdentical(location) {
        for (const block of (location?.encounters?.walking || [])) {
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
    // Encounter option matching (applies active filter state)
    // =========================================================
    function encounterOptionMatches(conds, s) {
        if (s.showAllConditions) return true;
        const cset = new Set(conds || []);
        if (cset.has('swarm') && !s.swarm) return false;
        if (cset.has('no-swarm') && s.swarm) return false;
        if (cset.has('pokeradar') && !s.pokeradar) return false;
        if (cset.has('no-pokeradar') && s.pokeradar) return false;
        return true;
    }

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
            // BD-only = 0, SP-only = 1 (rank within single-game entries)
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

    function orderSpeciesNames(buckets, showGames) {
        const rows = Array.from(buckets.values()).flat();
        const meta = buildCompressedOrderingMeta(rows, showGames);
        return Array.from(buckets.keys()).sort((na, nb) =>
            compressedSpeciesCompare({ name: na }, { name: nb }, meta)
        );
    }

    // =========================================================
    // Row sort utilities
    // =========================================================
    function timeRankForRow(r) {
        const times = toTimeOnly(r?.nonSlot2Conds || []);
        if (!times.length) return -1;
        return Math.min(...times.map(t => TIME_ORDER.indexOf(t)));
    }

    function compressedRowSortTuple(r) {
        const base    = r?.nonSlot2Conds || [];
        const nonTime = base.filter(c => !TIME_FLAGS.has(c));
        const onlyTime = nonTime.length === 0;

        let macro;
        if (onlyTime)                       macro = 0;
        else if (hasAny(nonTime, SWARM_FLAGS)) macro = 1;
        else if (hasAny(nonTime, RADAR_FLAGS)) macro = 2;
        else                                macro = 3;

        let subA = 0;
        if (macro === 0) subA = timeRankForRow(r);
        else if (macro === 1) subA = base.includes('swarm') ? 0 : base.includes('no-swarm') ? 1 : 2;
        else if (macro === 2) subA = base.includes('pokeradar') ? 0 : base.includes('no-pokeradar') ? 1 : 2;

        return [macro, subA, (r.rawConditions || r.nonSlot2Conds || []).join('|')];
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
        const conds  = rec.rawConditions || [];
        const swarmW = conds.includes('swarm') ? 0 : conds.includes('no-swarm') ? 1 : 2;
        const radarW = conds.includes('pokeradar') ? 0 : conds.includes('no-pokeradar') ? 1 : 2;
        return [swarmW, radarW, conds.join('|')];
    }

    // =========================================================
    // Row builders
    // =========================================================

    function buildFullRows(location, s) {
        const map = new Map();

        for (const block of extractWalking(location)) {
            const { rate, slot, options: encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const conds  = processConditions(opt.conditions || []);
                const key    = `${slot}|${conds.join('|')}`;

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
            rec.timeConds = toTimeOnly(rec.rawConditions || []);
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

    // buildCompressedRows — no Slot 2, three logical passes:
    //   1. Accumulate per (name, all-conditions) → per-game rates+levels
    //   2. Collapse flag pairs (swarm/no-swarm, pokeradar/no-pokeradar) when rates match
    //   3. Time harmonisation — merge time variants with identical rates
    function buildCompressedRows(location, s) {
        const noTimeConds   = arr => (arr || []).filter(c => !TIME_FLAGS.has(c));
        const onlyTimeConds = arr => (arr || []).filter(c =>  TIME_FLAGS.has(c));
        const makeEmpty     = () => Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }]));

        function mergePerGame(target, source) {
            for (const g of GAMES) {
                const t   = target[g] || (target[g] = { rate: 0, levels: [] });
                const src = source[g]  || { rate: 0, levels: [] };
                t.rate += (src.rate || 0);
                const set = new Set([...(t.levels || []), ...(src.levels || [])]);
                t.levels = [...set].sort();
            }
        }

        // ── Pass 1 ───────────────────────────────────────────
        const perVariant = new Map();
        for (const block of extractWalking(location)) {
            const { rate, options: encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;
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
                nonSlot2Conds: rec.conds.slice(),
                rawConditions: rec.conds.slice(),
                timeConds: toTimeOnly(rec.conds),
            });
        }

        // ── Pass 2: collapse flag pairs ───────────────────────
        if (s.showAllConditions) {
            for (const [flagA, flagB] of [['swarm', 'no-swarm'], ['pokeradar', 'no-pokeradar']]) {
                const FLAG_SET = new Set([flagA, flagB]);
                const byGroup  = new Map();

                for (const r of rows) {
                    const baseNoFlag = (r.nonSlot2Conds || []).filter(c => !FLAG_SET.has(c));
                    const key = `${r.name}|${baseNoFlag.join('|')}`;
                    if (!byGroup.has(key)) byGroup.set(key, { name: r.name, baseNoFlag, items: [] });
                    byGroup.get(key).items.push(r);
                }

                const rebuilt = [];
                for (const [, { name, baseNoFlag, items }] of byGroup) {
                    const withA   = items.filter(r => (r.nonSlot2Conds || []).includes(flagA));
                    const withB   = items.filter(r => (r.nonSlot2Conds || []).includes(flagB));
                    const neutral = items.filter(r => !(r.nonSlot2Conds || []).some(c => FLAG_SET.has(c)));

                    const fold = list => {
                        const pg = makeEmpty();
                        for (const r of list) mergePerGame(pg, r.perGame);
                        return pg;
                    };

                    const pgA = fold(withA);
                    const pgB = fold(withB);

                    const equalAB = withA.length > 0 && withB.length > 0 &&
                        GAMES.every(g => String(pgA[g]?.rate || 0) === String(pgB[g]?.rate || 0));

                    if (equalAB) {
                        const merged = makeEmpty();
                        mergePerGame(merged, fold(neutral));
                        mergePerGame(merged, pgA);
                        const total = GAMES.reduce((acc, g) => acc + (merged[g]?.rate || 0), 0);
                        if (total > 0) {
                            rebuilt.push({
                                key: `${name}|${baseNoFlag.join('|')}|pair-collapse`,
                                name, perGame: merged,
                                nonSlot2Conds: baseNoFlag.slice(),
                                rawConditions:  baseNoFlag.slice(),
                                timeConds: toTimeOnly(baseNoFlag),
                            });
                        }
                    } else {
                        rebuilt.push(...items);
                    }
                }
                rows = rebuilt;
            }
        }

        // ── Pass 3: time harmonisation ────────────────────────
        {
            const groups = new Map();
            for (const r of rows) {
                const baseNoTime = noTimeConds(r.nonSlot2Conds);
                const key = `${r.name}|${baseNoTime.join('|')}`;
                if (!groups.has(key)) groups.set(key, { baseNoTime, name: r.name, items: [] });
                groups.get(key).items.push(r);
            }

            const rebuilt = [];
            for (const [, { baseNoTime, name, items }] of groups) {
                const hasExplicitTime = items.some(r => onlyTimeConds(r.nonSlot2Conds).length > 0);
                if (!hasExplicitTime) { rebuilt.push(...items); continue; }

                const perTime = {
                    morning: makeEmpty(), day: makeEmpty(), night: makeEmpty(),
                };
                for (const r of items) {
                    const times = toTimeOnly(r.nonSlot2Conds).length
                        ? toTimeOnly(r.nonSlot2Conds)
                        : ['morning', 'day', 'night'];
                    for (const t of times) mergePerGame(perTime[t], r.perGame);
                }

                const sigFor = pg => GAMES.map(g => String(pg[g]?.rate || 0)).join('|');
                const sigMap = new Map();
                for (const t of ['morning', 'day', 'night']) {
                    const sig = sigFor(perTime[t]);
                    if (!sigMap.has(sig)) {
                        sigMap.set(sig, { times: [t], perGame: perTime[t] });
                    } else {
                        const acc = sigMap.get(sig);
                        acc.times.push(t);
                        for (const g of GAMES) {
                            const lvUnion = new Set([...(acc.perGame[g].levels || []), ...(perTime[t][g].levels || [])]);
                            acc.perGame[g].levels = [...lvUnion].sort();
                        }
                    }
                }

                for (const { times, perGame } of sigMap.values()) {
                    const total = GAMES.reduce((acc, g) => acc + (perGame[g]?.rate || 0), 0);
                    if (!total) continue;
                    const timePart = times.slice().sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
                    const isAllThree = timePart.length === 3;
                    const timeTokens = isAllThree ? [] : timePart;
                    const conds = [...baseNoTime, ...timeTokens];
                    rebuilt.push({
                        key: `${name}|${conds.join('|')}|time-harm`,
                        name, perGame,
                        nonSlot2Conds: conds.slice(),
                        rawConditions:  isAllThree ? [] : timePart.map(formatCondition),
                        timeConds: timeTokens.slice(),
                    });
                }
            }
            rows = rebuilt;
        }

        rows = rows.filter(r => r && typeof r.name === 'string' && r.name.trim().length);
        rows.sort((a, b) => {
            const n = byName(a.name, b.name);
            if (n !== 0) return n;
            return (a.nonSlot2Conds || []).join('|').localeCompare((b.nonSlot2Conds || []).join('|'));
        });
        return rows;
    }

    // buildCompressedRowsFiltered — single-condition filter active (no Show All)
    // Groups by (name, time) only — all other conditions are already pinned by the filter state.
    function buildCompressedRowsFiltered(location, s) {
        const map = new Map();

        for (const block of extractWalking(location)) {
            const { rate, options: encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;
                const all    = processConditions(opt.conditions || []);
                const times  = toTimeOnly(all);
                const key    = `${opt.name}|${(times.join('+') || 'anytime')}`;
                if (!map.has(key)) {
                    map.set(key, {
                        name: opt.name, timeConds: times,
                        perGame: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: new Set() }])),
                    });
                }
                const rec = map.get(key);
                for (const g of gamesForEncounter(opt)) {
                    rec.perGame[g].rate += (Number(rate) || 0);
                    rec.perGame[g].levels.add(String(opt.level));
                }
            }
        }

        const prelim = [];
        for (const [, rec] of map) {
            prelim.push({
                name: rec.name, timeConds: rec.timeConds,
                perGame: Object.fromEntries(
                    GAMES.map(g => [g, { rate: rec.perGame[g].rate, levels: [...rec.perGame[g].levels].sort() }])
                ),
            });
        }

        // Time harmonisation (same-rate times → merged)
        const byMon = new Map();
        for (const r of prelim) {
            if (!byMon.has(r.name)) byMon.set(r.name, []);
            byMon.get(r.name).push(r);
        }

        function addInto(target, source) {
            for (const g of GAMES) {
                const t   = target[g] || (target[g] = { rate: 0, levels: [] });
                const src = source[g]  || { rate: 0, levels: [] };
                t.rate += (src.rate || 0);
                const set = new Set([...(t.levels || []), ...(src.levels || [])]);
                t.levels = [...set].sort();
            }
        }

        const rebuilt = [];
        for (const [, rows] of byMon) {
            const perTime = {
                morning: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                day:     Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                night:   Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
            };
            for (const r of rows) {
                const times = r.timeConds.length ? r.timeConds : ['morning', 'day', 'night'];
                for (const t of times) addInto(perTime[t], r.perGame);
            }

            const sigFor = (pg, g) => String(pg[g]?.rate || 0);
            const sig = (pg) => s.game && s.game !== 'All'
                ? sigFor(pg, s.game)
                : GAMES.map(g => sigFor(pg, g)).join('|');

            const sigMap = new Map();
            for (const t of ['morning', 'day', 'night']) {
                const k = sig(perTime[t]);
                if (!sigMap.has(k)) {
                    sigMap.set(k, { times: [t], perGame: Object.fromEntries(
                        GAMES.map(g => [g, { rate: perTime[t][g].rate, levels: perTime[t][g].levels.slice() }])
                    )});
                } else {
                    const acc = sigMap.get(k);
                    acc.times.push(t);
                    for (const g of GAMES) {
                        const lvUnion = new Set([...(acc.perGame[g].levels || []), ...(perTime[t][g].levels || [])]);
                        acc.perGame[g].levels = [...lvUnion].sort();
                    }
                }
            }

            for (const { times, perGame } of sigMap.values()) {
                // Skip time-slots where every game has zero rate (Pokémon not
                // available at that time of day). Mirrors the same guard in
                // buildCompressedRows Pass 3.
                const total = GAMES.reduce((acc, g) => acc + (perGame[g]?.rate || 0), 0);
                if (!total) continue;
                const timePart   = times.slice().sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
                const isAllThree = timePart.length === 3;
                const timeTokens = isAllThree ? [] : timePart;
                rebuilt.push({
                    name: rows[0].name,
                    timeConds:     timeTokens,
                    nonSlot2Conds: timeTokens,
                    rawConditions: isAllThree ? [] : timePart.map(formatCondition),
                    perGame,
                });
            }
        }

        return rebuilt
            .filter(r => r && typeof r.name === 'string' && r.name.trim().length)
            .sort((a, b) => {
                const n = byName(a.name, b.name);
                if (n !== 0) return n;
                return (a.timeConds.join(',')).localeCompare(b.timeConds.join(','));
            });
    }

    // =========================================================
    // Sprite (same hardcoded form overrides as dppt.js)
    // =========================================================
    function Sprite(props) {
        const { useState, useMemo, useEffect } = React;
        const nm = normalizedName(props.name);

        const hardcoded = [
            { key: 'east', name: 'shellos',   path: '../../Resources/images/home-renders/gen-4/shellos-east.png' },
            { key: 'east', name: 'gastrodon', path: '../../Resources/images/home-renders/gen-4/gastrodon-east.png' },
            { key: 'west', name: 'shellos',   path: '../../Resources/images/home-renders/gen-4/shellos-west.png' },
            { key: 'west', name: 'gastrodon', path: '../../Resources/images/home-renders/gen-4/gastrodon-west.png' },
            { key: '', name: 'nidoran♀', path: '../../Resources/images/home-renders/gen-1/nidoran-f.png' },
            { key: '', name: 'nidoran♂', path: '../../Resources/images/home-renders/gen-1/nidoran-m.png' },
            { key: '', name: 'unown',    path: '../../Resources/images/home-renders/gen-2/unown-a.png' },
        ];

        let overridePath = '';
        const match = hardcoded.find(e => e.name === nm);
        if (match) {
            if (nm === 'shellos' || nm === 'gastrodon') {
                const formMatch = hardcoded.find(e => e.name === nm && e.key === SHELLOS);
                if (formMatch) overridePath = formMatch.path;
            } else {
                overridePath = match.path;
            }
        }

        if (overridePath) {
            let altName = props.name;
            if ((nm === 'shellos' || nm === 'gastrodon') && SHELLOS) {
                altName = `${props.name} (${SHELLOS.charAt(0).toUpperCase()}${SHELLOS.slice(1)})`;
            }
            return h('img', { src: overridePath, alt: altName, loading: 'lazy', className: 'flex-img' });
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
    // ViewControls — no Slot 2 picker
    // =========================================================
    function ViewControls({ state, setState, hasSwarm, hasRadar, hideShowAllToggle, unified }) {
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
                !hideShowAllToggle && h(Toggle, {
                    label: 'Show all conditions',
                    checked: state.showAllConditions,
                    onChange: v => set({ showAllConditions: v }),
                }),
            ),
            !hideShowAllToggle && h('div', {
                style: {
                    display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
                    opacity: state.showAllConditions ? 0.4 : 1,
                    pointerEvents: state.showAllConditions ? 'none' : 'auto',
                },
            },
                hasSwarm && h(Toggle, {
                    label: 'Swarm active',
                    checked: state.swarm,
                    onChange: v => set({ swarm: v }),
                }),
                hasRadar && h(Toggle, {
                    label: 'Poké Radar active',
                    checked: state.pokeradar,
                    onChange: v => set({ pokeradar: v }),
                }),
            ),
        );
    }

    // =========================================================
    // GameTable — single-game wrapper
    // =========================================================
    function GameTable({ game, baseState, location, mount, noConditions }) {
        const s = React.useMemo(() => ({ ...baseState, game }), [baseState, game]);

        const rows = React.useMemo(() => {
            if (!location) return [];
            if (s.view === 'full') return buildFullRows(location, s);
            const built = s.showAllConditions
                ? buildCompressedRows(location, s)
                : buildCompressedRowsFiltered(location, s);
            return built.filter(r => r && typeof r.name === 'string' && r.name.trim().length);
        }, [location, s.view, s.showAllConditions, s.swarm, s.pokeradar, s.game]);

        return h(Table, {
            rows, games: GAMES, gameFilter: game, mount,
            view: s.view, onlyTimeMode: !s.showAllConditions,
            prebuiltForGame: game, noConditions,
        });
    }

    // =========================================================
    // Table — main render component
    // =========================================================
    function Table(props) {
        const { rows, gameFilter, mount, view, noConditions } = props;
        const onlyTimeMode = !!props.onlyTimeMode;
        const unified      = !!props.unified;
        const showGames    = gameFilter === 'All' ? GAMES : [gameFilter];
        const viewLabel    = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel   = unified
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        const basePrefix  = () => gameFilter && gameFilter !== 'All' ? gamePrefix(gameFilter) : 'light';
        const hdrCls      = g => g ? `${gamePrefix(g)}-true` : `${basePrefix()}-true`;

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
            // Full-view rows (from buildFullRows) have no top-level r.name — names
            // live in r.perGame[g].name.  Compressed-view rows do have r.name.
            if (view === 'full') return showGames.some(g => r.perGame?.[g]?.name);
            return typeof r.name === 'string' && r.name.trim().length > 0;
        });

        // ── Compressed species order ──────────────────────────
        let renderList = sanitizedRows;
        if (view === 'compressed') {
            const buckets = bucketRowsByName(sanitizedRows);
            const orderedNames = orderSpeciesNames(buckets, showGames);
            renderList = [];
            for (const name of orderedNames) {
                const arr = buckets.get(name).slice();
                arr.sort(compressedRowComparator);
                renderList.push(...arr);
            }
        }

        // ── Stripe maps ──────────────────────────────────────
        // Must be computed from renderList (the final display order), not sanitizedRows.
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
            const isTrue = !!rowStripeTrue.get(rowIndex);
            const p = prefix || basePrefix();
            return `${p}-${isTrue ? 'true' : 'false'}`;
        }

        function zebraBySlot(prefix, slot) {
            const isTrue = (Number(slot) || 0) % 2 === 1;
            const p = prefix || basePrefix();
            return `${p}-${isTrue ? 'true' : 'false'}`;
        }

        // ── Condition column visibility ───────────────────────
        function rowHasNonAnytimeConditions(r) {
            if (Array.isArray(r.timeConds) && r.timeConds.length) return true;
            if (view === 'full') return (r.rawConditions || []).length > 0;
            const nonTime = (r.nonSlot2Conds || []).filter(c => !TIME_FLAGS.has(c));
            return nonTime.length > 0;
        }

        const hideConditionsColumn = noConditions ||
            (sanitizedRows.length > 0 && sanitizedRows.every(r => !rowHasNonAnytimeConditions(r)));

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
                                            const nm   = has ? (
                                                cell.name === 'Shellos' ? `Shellos (${SHELLOS.charAt(0).toUpperCase()}${SHELLOS.slice(1)})` :
                                                cell.name === 'Gastrodon' ? `Gastrodon (${SHELLOS.charAt(0).toUpperCase()}${SHELLOS.slice(1)})` :
                                                cell.name
                                            ) : '—';
                                            return [
                                                h('td', { key: 'u:s', className: zebraBySlot(null, r.slot) }, has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'),
                                                h('td', { key: 'u:n', className: zebraBySlot(null, r.slot) }, nm),
                                                h('td', { key: 'u:l', className: zebraBySlot(null, r.slot) }, has ? `lv. ${lv}` : '—'),
                                            ];
                                        })() : showGames.flatMap(g => {
                                            const gp   = gamePrefix(g);
                                            const cell = r.perGame?.[g];
                                            const has  = !!(cell && cell.name);
                                            const lv   = has ? formatLevels(cell.levels) : '';
                                            const nm   = has ? (
                                                cell.name === 'Shellos' ? `Shellos (${SHELLOS.charAt(0).toUpperCase()}${SHELLOS.slice(1)})` :
                                                cell.name === 'Gastrodon' ? `Gastrodon (${SHELLOS.charAt(0).toUpperCase()}${SHELLOS.slice(1)})` :
                                                cell.name
                                            ) : '—';
                                            return [
                                                h('td', { key: g + ':s', className: zebraBySlot(gp, r.slot) }, has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'),
                                                h('td', { key: g + ':n', className: zebraBySlot(gp, r.slot) }, nm),
                                                h('td', { key: g + ':l', className: zebraBySlot(gp, r.slot) }, has ? `lv. ${lv}` : '—'),
                                            ];
                                        })),
                                    ));
                                });
                            }
                            return out;
                        })()
                        : renderList.map((r, rowIndex) => {
                            const block   = blockByStart.get(rowIndex);
                            const monName = r.name === 'Shellos'   ? `Shellos (${SHELLOS.charAt(0).toUpperCase()}${SHELLOS.slice(1)})` :
                                            r.name === 'Gastrodon' ? `Gastrodon (${SHELLOS.charAt(0).toUpperCase()}${SHELLOS.slice(1)})` :
                                            r.name;
                            return h('tr', {
                                key: `${r.key || r.name}::${rowIndex}`,
                                className: gameFilter !== 'All' ? zebraByBlock(gamePrefix(gameFilter), rowIndex) : undefined,
                            },
                                block ? h(React.Fragment, null,
                                    h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, h(Sprite, { name: r.name, mount })),
                                    h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, monName),
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
                                        has ? h('td', { key: 'u:lv', className: zebraByBlock(null, rowIndex) }, `lv. ${lvStr}` || '—') : null,
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
                                        has ? h('td', { key: g + ':lv', className: zebraByBlock(gp, rowIndex) }, `lv. ${lvStr}` || '—') : null,
                                    ];
                                })),
                                !hideConditionsColumn && h('td', { className: zebraByBlock(null, rowIndex) },
                                    onlyTimeMode
                                        ? h(ConditionsCell, { conds: r.timeConds || [] })
                                        : h(ConditionsCell, { conds: r.nonSlot2Conds || [] })
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
        const base = window.BDSP_LOCATION_BASE || '../javascript/BDSP/';
        const p = loadScript(`${base}${locId}.js`).then(() => {
            if (!window.BDSP_DATA) throw new Error('BDSP_DATA not found after script load');
            const d = window.BDSP_DATA;
            delete window.BDSP_DATA;
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
        const [state,   setState]   = useState({
            view: 'compressed',
            game: 'All',
            swarm: false,
            pokeradar: false,
            showAllConditions: true,
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

        if (data?.shellos) SHELLOS = data.shellos;

        const filterAvailability = useMemo(() => computeAvailableConditionFilters(data), [data]);
        const hideShowAllToggle  = !(filterAvailability.hasSwarm || filterAvailability.hasRadar);
        const noConditions       = hideShowAllToggle;

        const unified = useMemo(() => data ? walkingGamesIdentical(data) : false, [data]);

        const rows = useMemo(() => {
            if (!data) return [];
            if (state.view === 'full') return buildFullRows(data, state);
            return state.showAllConditions
                ? buildCompressedRows(data, state)
                : buildCompressedRowsFiltered(data, state);
        }, [data, state]);

        const setStateDeferred = React.useCallback(
            updater => startTransition(() => setState(updater)),
            [startTransition]
        );

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return h('p', null, 'No data for ', h('code', null, String(locationId)), '.');

        return h('div', null,
            h(ViewControls, {
                state, setState: setStateDeferred,
                hasSwarm: filterAvailability.hasSwarm,
                hasRadar: filterAvailability.hasRadar,
                hideShowAllToggle,
                unified,
            }),
            state.game === 'separate' && !unified
                ? h('div', null,
                    GAMES.map(g => h('div', { key: g, style: { marginTop: 12 } },
                        h(GameTable, { game: g, baseState: state, location: data, mount, noConditions })
                    ))
                )
                : h(Table, {
                    rows, games: GAMES, gameFilter: unified ? 'All' : state.game, mount,
                    view: state.view, onlyTimeMode: !state.showAllConditions, noConditions,
                    unified,
                })
        );
    }

    // =========================================================
    // Slot encounter utilities — Surfing / Fishing
    // (identical logic to dppt.js; game-agnostic)
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

    function SlotSection({ slots, games, gameFilter, view, mount, unified }) {
        if (!slots || !slots.length) return null;
        const isSingle = GAMES.includes(gameFilter);
        const showGames = isSingle ? [gameFilter] : games;
        const base = (isSingle || unified) ? (unified ? 'light' : gamePrefix(gameFilter)) : 'light';
        const viewLabel = view === 'compressed' ? 'Compressed' : 'Full';
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
                                h('td', { className: slotCls(base, row.slot) }, row.rate + '%'),
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

        const compRows = buildSlotCompressedRows(slots, games);
        const rows = isSingle ? compRows.filter(r => r.perGame[gameFilter]) : compRows;
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
                                        h('td', { key: 'r', className: rowCls(base, i) }, c ? c.rate + '%' : '—'),
                                        h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })()
                                : showGames.flatMap(g => {
                                    const c = row.perGame[g];
                                    return [
                                        h('td', { key: g + '-r', className: rowCls(gamePrefix(g), i) }, c ? c.rate + '%' : '—'),
                                        h('td', { key: g + '-l', className: rowCls(gamePrefix(g), i) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })
                            )
                        )
                    )
                )
            )
        );
    }

    function FishTable({ fish, games, gameFilter, view, mount, unified }) {
        const ROD_KEYS = [
            { key: 'old',   label: 'Old' },
            { key: 'good',  label: 'Good' },
            { key: 'super', label: 'Super' },
        ];
        const isSingle  = GAMES.includes(gameFilter);
        const showGames = isSingle ? [gameFilter] : games;
        const base      = (isSingle || unified) ? (unified ? 'light' : gamePrefix(gameFilter)) : 'light';
        const viewLabel = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = unified
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        if (view === 'full') {
            const allRows = [];
            for (const { key, label } of ROD_KEYS) {
                const rows     = buildSlotFullRows(fish[key] || [], games);
                const filtered = isSingle ? rows.filter(r => r.perGame[gameFilter]) : rows;
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
                            (isSingle || unified)
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
                                h('td', { className: rowCls(base, i) }, row.rate + '%'),
                                ...((isSingle || unified)
                                    ? (() => {
                                        const c = row.perGame[unified ? GAMES[0] : gameFilter];
                                        return [
                                            h('td', { key: 's', className: rowCls(base, i) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                            h('td', { key: 'n', className: rowCls(base, i) }, c ? c.name : '—'),
                                            h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${c.level}` : '—'),
                                        ];
                                    })()
                                    : showGames.flatMap(g => {
                                        const gp = gamePrefix(g);
                                        const c  = row.perGame[g];
                                        return [
                                            h('td', { key: g + '-s', className: rowCls(gp, i) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                            h('td', { key: g + '-n', className: rowCls(gp, i) }, c ? c.name : '—'),
                                            h('td', { key: g + '-l', className: rowCls(gp, i) }, c ? `lv. ${c.level}` : '—'),
                                        ];
                                    })
                                )
                            )
                        )
                    )
                )
            );
        }

        // Compressed — global sequential index across all rod sections
        let globalIdx = 0;
        const allRows = ROD_KEYS.flatMap(({ key, label }) => {
            const compRows = buildSlotCompressedRows(fish[key] || [], games);
            const filtered = isSingle ? compRows.filter(r => r.perGame[gameFilter]) : compRows;
            return filtered.map(row => ({ rod: label, idx: globalIdx++, ...row }));
        });

        return h('div', { style: { overflowX: 'auto' } },
            h('table', null,
                h('caption', null, tableLabel),
                h('thead', null,
                    h('tr', null,
                        h('th', { className: hdrCls(null, base) }, 'Rod'),
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
                    allRows.map(row =>
                        h('tr', { key: `${row.rod}-${row.name}` },
                            h('td', { className: rowCls(base, row.idx) }, row.rod),
                            h('td', { className: rowCls(base, row.idx) }, h(Sprite, { name: row.name, mount })),
                            h('td', { className: rowCls(base, row.idx) }, row.name),
                            ...((isSingle || unified)
                                ? (() => {
                                    const c = row.perGame[unified ? GAMES[0] : gameFilter];
                                    return [
                                        h('td', { key: 'r', className: rowCls(base, row.idx) }, c ? c.rate + '%' : '—'),
                                        h('td', { key: 'l', className: rowCls(base, row.idx) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })()
                                : showGames.flatMap(g => {
                                    const c = row.perGame[g];
                                    return [
                                        h('td', { key: g + '-r', className: rowCls(gamePrefix(g), row.idx) }, c ? c.rate + '%' : '—'),
                                        h('td', { key: g + '-l', className: rowCls(gamePrefix(g), row.idx) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })
                            )
                        )
                    )
                )
            )
        );
    }

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

        // Must be called unconditionally before any early returns (Rules of Hooks).
        const unified = useMemo(() => {
            if (!data) return false;
            const enc = data.encounters || {};
            if (encounterType === 'surfing') return slotEncounterGamesIdentical(enc.surfing || []);
            if (encounterType === 'fishing') {
                const fish = enc.fishing || {};
                return ['old', 'good', 'super'].every(k => slotEncounterGamesIdentical(fish[k] || []));
            }
            return false;
        }, [data, encounterType]);

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return null;

        const encounters = data.encounters || {};
        const isSeparate = state.game === 'separate';

        let content;
        if (encounterType === 'surfing') {
            const slots = encounters.surfing || [];
            if (!slots.length) return null;
            content = (isSeparate && !unified)
                ? h('div', null, GAMES.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, games: GAMES, gameFilter: g, view: state.view, mount })
                    )
                ))
                : h(SlotSection, { slots, games: GAMES, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified });
        } else if (encounterType === 'fishing') {
            const fish   = encounters.fishing || {};
            const hasAny = ['old', 'good', 'super'].some(k => (fish[k] || []).length > 0);
            if (!hasAny) return null;
            content = (isSeparate && !unified)
                ? h('div', null, GAMES.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(FishTable, { fish, games: GAMES, gameFilter: g, view: state.view, mount })
                    )
                ))
                : h(FishTable, { fish, games: GAMES, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified });
        } else {
            return h('p', null, 'Unknown encounter type: ', encounterType);
        }

        return h('div', null,
            h(SlotViewControls, { state, setState, unified }),
            content
        );
    }

    // =========================================================
    // Boot
    // =========================================================
    (function boot() {
        // Walking
        const WALK_SEL = '.pokemon-bdsp-walking-replace-me';

        function mountAll() {
            document.querySelectorAll(WALK_SEL).forEach(n => {
                if (n.__bdspWalkMounted) return;
                n.__bdspWalkMounted = true;
                const container = document.createElement('div');
                for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                    const v = n.getAttribute(a);
                    if (v != null) container.setAttribute(a, v);
                }
                n.replaceWith(container);
                ReactDOM.createRoot(container).render(React.createElement(App, { mount: container }));
            });
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') mountAll();
        else document.addEventListener('DOMContentLoaded', mountAll, { once: true });
        new MutationObserver(mountAll).observe(document.documentElement, { childList: true, subtree: true });

        // Surfing + Fishing
        const SLOT_SELECTORS = [
            { selector: '.pokemon-bdsp-surfing-replace-me', encounterType: 'surfing' },
            { selector: '.pokemon-bdsp-fishing-replace-me', encounterType: 'fishing' },
        ];

        for (const { selector, encounterType } of SLOT_SELECTORS) {
            const mountSlotAll = (sel, type) => {
                document.querySelectorAll(sel).forEach(n => {
                    if (n.__bdspSlotMounted) return;
                    n.__bdspSlotMounted = true;
                    const container = document.createElement('div');
                    for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                        const v = n.getAttribute(a);
                        if (v != null) container.setAttribute(a, v);
                    }
                    n.replaceWith(container);
                    ReactDOM.createRoot(container).render(React.createElement(SlotApp, { encounterType: type, mount: container }));
                });
            };
            new MutationObserver(() => mountSlotAll(selector, encounterType)).observe(document.documentElement, { childList: true, subtree: true });
            mountSlotAll(selector, encounterType);
        }
    })();

})();
