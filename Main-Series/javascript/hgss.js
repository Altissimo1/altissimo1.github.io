// ==============================================
// hgss.js — Pokémon HeartGold / SoulSilver encounter table renderer
//
// Requires (in order):
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="../javascript/pokemon-core.js"></script>
//   <script src="../javascript/hgss.js"></script>
//
// Games:       HeartGold, SoulSilver
// Conditions:  morning / day / night  +  swarm / no-swarm  +  hoenn-sound / sinnoh-sound
//              (radio-off is the default state and is never stored as a condition)
// Encounter types:
//   walking, surfing, fishing (old_rod / good_rod / super_rod),
//   rock_smash, headbutt_a, headbutt_b, headbutt_special, bug_catching_contest
// Data global: window.HGSS_DATA
// Location base: window.HGSS_LOCATION_BASE
// Selectors:
//   .pokemon-hgss-walking-replace-me
//   .pokemon-hgss-surfing-replace-me
//   .pokemon-hgss-fishing-replace-me
//   .pokemon-hgss-headbutt-a-replace-me
//   .pokemon-hgss-headbutt-b-replace-me
//   .pokemon-hgss-headbutt-special-replace-me
//   .pokemon-hgss-rocksmash-replace-me
//   .pokemon-hgss-bugcontest-replace-me
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[hgss] React/ReactDOM globals not found.'); return; }
    if (!window.PokemonCore) { console.warn('[hgss] pokemon-core.js must be loaded before hgss.js.'); return; }

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
    // HGSS game constants
    // =========================================================
    const GAMES      = ['HeartGold', 'SoulSilver'];
    const GAME_KEYS  = new Set(GAMES);
    const SWARM_FLAGS = new Set(['swarm', 'no-swarm']);
    const RADIO_FLAGS = new Set(['hoenn-sound', 'sinnoh-sound']);

    const GAME_BIT = { HeartGold: 0, SoulSilver: 1 };

    // =========================================================
    // Condition formatting
    // =========================================================
    const COND_LABELS = {
        'swarm':        'Swarm',
        'no-swarm':     'No swarm',
        'morning':      'Morning',
        'day':          'Day',
        'night':        'Night',
        'hoenn-sound':  'Radio: Hoenn Sound',
        'sinnoh-sound': 'Radio: Sinnoh Sound',
        'radio-off':    'Radio: Off',
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
    // CSS class helpers
    // =========================================================
    const gamePrefix  = g => g.toLowerCase().replace(/\s+/g, '');
    const headerClass = g => g ? `${gamePrefix(g)}-true` : 'light-true';

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
        if (activeGames && activeGames.length === 1) return gamePrefix(activeGames[0]);
        return 'light';
    }

    // =========================================================
    // Active game detection (which games have data for this area)
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
        return GAMES.filter(g => seen.has(g));
    }

    function detectActiveGamesFromWalking(location) {
        return detectActiveGames(location?.encounters?.walking || []);
    }

    // =========================================================
    // Unified-games detection
    // =========================================================
    function gamesIdentical(slots, activeGames) {
        for (const block of (slots || [])) {
            for (const opt of (block.options || [])) {
                const optGames = (opt.games || []).filter(g => activeGames.includes(g));
                if (optGames.length !== activeGames.length) return false;
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
    // Data extraction
    // =========================================================
    function extractWalking(location) { return location?.encounters?.walking || []; }
    function gamesForEncounter(enc, activeGames) {
        return (enc?.games || []).filter(g => (activeGames || GAMES).includes(g));
    }

    function computeAvailableConditionFilters(location) {
        const out = { hasSwarm: false, hasRadio: false };
        if (!location) return out;
        for (const block of extractWalking(location)) {
            for (const opt of (block.options || [])) {
                const conds = opt.conditions || [];
                if (conds.includes('swarm') || conds.includes('no-swarm')) out.hasSwarm = true;
                if (conds.includes('hoenn-sound') || conds.includes('sinnoh-sound')) out.hasRadio = true;
            }
        }
        return out;
    }

    // =========================================================
    // Encounter option matching
    // =========================================================
    function encounterOptionMatches(conds, s) {
        if (s.showAllConditions) return true;
        const cset = new Set(conds || []);
        if (cset.has('swarm') && !s.swarm) return false;
        if (cset.has('no-swarm') && s.swarm) return false;
        if (cset.has('hoenn-sound') && s.radio !== 'hoenn-sound') return false;
        if (cset.has('sinnoh-sound') && s.radio !== 'sinnoh-sound') return false;
        // radio-off encounters only occur while no radio sound is playing (s.radio === '')
        if (cset.has('radio-off') && s.radio) return false;
        return true;
    }

    // Filter a slot list by a condition state (used by the slot/fishing views when
    // "Show all conditions" is off — keeps only options matching the swarm toggle,
    // dropping slots left with no options).
    // In "Show all conditions" mode, collapse a slot's swarm + no-swarm options into a
    // single "Anytime" option when they're otherwise identical (same species, level,
    // games, other conditions) — the encounter is the same whether or not a swarm is
    // active, so it shouldn't be split into two rows.
    function collapseSwarmPairs(slots) {
        const SW = new Set(['swarm', 'no-swarm']);
        return (slots || []).map(slot => {
            const groups = new Map();
            const order = [];
            for (const o of (slot.options || [])) {
                const rest = (o.conditions || []).filter(c => !SW.has(c));
                const key = `${o.name} ${o.level} ${(o.games || []).join(',')} ${rest.slice().sort().join(',')}`;
                if (!groups.has(key)) { groups.set(key, { first: o, rest, flags: new Set(), opts: [] }); order.push(key); }
                const gr = groups.get(key);
                gr.opts.push(o);
                for (const c of (o.conditions || [])) if (SW.has(c)) gr.flags.add(c);
            }
            const options = [];
            for (const key of order) {
                const gr = groups.get(key);
                if (gr.flags.has('swarm') && gr.flags.has('no-swarm')) {
                    options.push(Object.assign({}, gr.first, { conditions: gr.rest.slice() }));
                } else {
                    for (const o of gr.opts) options.push(o);
                }
            }
            return Object.assign({}, slot, { options });
        });
    }

    function filterSlotsByCond(slots, cond) {
        // Show-all mode: collapse identical swarm/no-swarm pairs to a single "Anytime" row.
        if (!cond || cond.showAllConditions) return collapseSwarmPairs(slots || []);
        return (slots || [])
            .map(sl => Object.assign({}, sl, {
                options: (sl.options || [])
                    .filter(o => encounterOptionMatches(o.conditions || [], cond))
                    // The swarm state is now fixed by the toggle, so drop swarm/no-swarm
                    // tags: the encounters read "Anytime" and rows that differed only by
                    // swarm state (e.g. a "No swarm" row and an "Anytime" row) collapse into one.
                    .map(o => Object.assign({}, o, {
                        conditions: (o.conditions || []).filter(c => c !== 'swarm' && c !== 'no-swarm'),
                    })),
            }))
            .filter(sl => (sl.options || []).length > 0);
    }

    // True if any option in a slot list carries a swarm / no-swarm condition.
    function slotsHaveSwarm(slots) {
        return (slots || []).some(sl => (sl.options || [])
            .some(o => (o.conditions || []).some(c => c === 'swarm' || c === 'no-swarm')));
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
            // rank within single-game entries: HG=0, SS=1
            info.rank = info.mask === 0b10 ? 1 : 0;
        }
        return meta;
    }

    function compressedSpeciesCompare(a, b, meta) {
        const A = meta.get(a.name) || { count: 0, rank: 0, maxRate: 0, totalPct: 0 };
        const B = meta.get(b.name) || { count: 0, rank: 0, maxRate: 0, totalPct: 0 };
        if (A.count !== B.count) return B.count - A.count;
        if (A.count === 1 && A.rank !== B.rank) return A.rank - B.rank;
        if (A.maxRate !== B.maxRate) return B.maxRate - A.maxRate;
        if (A.totalPct !== B.totalPct) return B.totalPct - A.totalPct;
        return a.name.localeCompare(b.name);
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
        if (onlyTime)                          macro = 0;
        else if (hasAny(nonTime, SWARM_FLAGS)) macro = 1;
        else if (hasAny(nonTime, RADIO_FLAGS)) macro = 2;
        else                                   macro = 3;

        let subA = 0;
        if (macro === 0) subA = timeRankForRow(r);
        else if (macro === 1) subA = base.includes('swarm') ? 0 : base.includes('no-swarm') ? 1 : 2;
        else if (macro === 2) subA = base.includes('hoenn-sound') ? 0 : base.includes('sinnoh-sound') ? 1 : 2;

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
        const radioW = conds.includes('hoenn-sound') ? 0 : conds.includes('sinnoh-sound') ? 1 : 2;
        return [swarmW, radioW, conds.join('|')];
    }

    // =========================================================
    // Walking row builders
    // =========================================================
    function buildFullRows(location, s, activeGames) {
        const ag = activeGames || GAMES;
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
                        perGame: Object.fromEntries(ag.map(g => [g, { name: null, levels: new Set() }])),
                    });
                }

                const rec = map.get(key);
                for (const g of gamesForEncounter(opt, ag)) {
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
                ag.map(g => [g, { name: rec.perGame[g].name, levels: [...rec.perGame[g].levels].sort() }])
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

    // Full-view time recombination (mirrors dppt.js). The raw rows key each game's
    // encounter by that game's own merged time-condition, so when HeartGold and
    // SoulSilver differ by time in the same slot the rows misalign and fill with
    // dashes. Here we expand every option into the individual times it applies to
    // (an option with no time tag = all three), then merge back the times whose
    // per-game output is identical — yielding one row per genuinely-distinct time.
    function recombineFullRowsByTime(rows, shownGames, allGames) {
        const games = allGames || GAMES;
        const shown = (shownGames && shownGames.length) ? shownGames : games;
        const bySlotRate = new Map();
        for (const r of rows) {
            const gk = `${r.slot}|${r.rate}`;
            if (!bySlotRate.has(gk)) bySlotRate.set(gk, []);
            bySlotRate.get(gk).push(r);
        }
        const out = [];
        for (const [, groupRows] of bySlotRate) {
            // sub-group by the non-time base conditions (radio-off / swarm / hoenn / …)
            const byBase = new Map();
            for (const r of groupRows) {
                const base = (r.rawConditions || []).filter(c => !TIME_FLAGS.has(c));
                const bk = base.join('|');
                if (!byBase.has(bk)) byBase.set(bk, { base, items: [] });
                byBase.get(bk).items.push(r);
            }
            for (const [, { base, items }] of byBase) {
                const perTime = {};
                for (const t of TIME_ORDER) {
                    perTime[t] = Object.fromEntries(games.map(g => [g, { names: new Set(), levels: new Set() }]));
                }
                for (const r of items) {
                    const tks = toTimeOnly(r.rawConditions || []);
                    const times = tks.length ? tks : TIME_ORDER;
                    for (const t of times) {
                        for (const g of games) {
                            const cell = r.perGame?.[g];
                            if (!cell || !cell.name) continue;
                            String(cell.name).split('/').map(x => x.trim()).filter(Boolean)
                                .forEach(p => perTime[t][g].names.add(p));
                            (cell.levels || []).forEach(lv => perTime[t][g].levels.add(String(lv)));
                        }
                    }
                }
                const combined = {};
                for (const t of TIME_ORDER) {
                    combined[t] = Object.fromEntries(games.map(g => {
                        const names = [...perTime[t][g].names].sort((a, b) => a.localeCompare(b));
                        return [g, { name: names.length ? names.join(' / ') : null, levels: [...perTime[t][g].levels] }];
                    }));
                }
                const sigOf = pg => shown.map(g =>
                    `${g}:${pg[g]?.name || ''}|${(pg[g]?.levels || []).slice().sort().join(',')}`).join(';');
                const sigToTimes = new Map();
                for (const t of TIME_ORDER) {
                    const sig = sigOf(combined[t]);
                    if (!sigToTimes.has(sig)) sigToTimes.set(sig, []);
                    sigToTimes.get(sig).push(t);
                }
                for (const [, times] of sigToTimes) {
                    const anyData = times.some(t => games.some(g => combined[t][g]?.name || (combined[t][g]?.levels || []).length));
                    if (!anyData) continue;
                    const firstT = times[0];
                    const perGame = Object.fromEntries(games.map(g => {
                        const name = combined[firstT][g]?.name || null;
                        const lvlUnion = new Set();
                        for (const t of times) (combined[t][g]?.levels || []).forEach(lv => lvlUnion.add(String(lv)));
                        return [g, { name, levels: [...lvlUnion] }];
                    }));
                    const timeTokens = (times.length === TIME_ORDER.length) ? [] :
                        times.slice().sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
                    const ref = items[0];
                    out.push({
                        key: `${ref.slot}|${ref.rate}|${base.join('|')}|${timeTokens.join('+')}|recomb`,
                        slot: ref.slot,
                        rate: ref.rate,
                        rawConditions: [...timeTokens, ...base],
                        timeConds: timeTokens.slice(),
                        perGame,
                    });
                }
            }
        }
        return out;
    }

    function buildCompressedRows(location, s, activeGames) {
        const ag = activeGames || GAMES;
        const noTimeConds   = arr => (arr || []).filter(c => !TIME_FLAGS.has(c));
        const onlyTimeConds = arr => (arr || []).filter(c =>  TIME_FLAGS.has(c));
        const makeEmpty     = () => Object.fromEntries(ag.map(g => [g, { rate: 0, levels: [] }]));

        function mergePerGame(target, source) {
            for (const g of ag) {
                const t   = target[g] || (target[g] = { rate: 0, levels: [] });
                const src = source[g]  || { rate: 0, levels: [] };
                t.rate += (src.rate || 0);
                const set = new Set([...(t.levels || []), ...(src.levels || [])]);
                t.levels = [...set].sort();
            }
        }

        // Pass 1: accumulate per (name, all-conditions)
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
                        perGame: Object.fromEntries(ag.map(g => [g, { rate: 0, levels: new Set() }])),
                    });
                }
                const rec = perVariant.get(key);
                for (const g of gamesForEncounter(opt, ag)) {
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
                    ag.map(g => [g, { rate: rec.perGame[g].rate, levels: [...rec.perGame[g].levels].sort() }])
                ),
                nonSlot2Conds: rec.conds.slice(),
                rawConditions: rec.conds.slice(),
                timeConds: toTimeOnly(rec.conds),
            });
        }

        // Pass 2: collapse swarm flag pairs when rates match
        if (s.showAllConditions) {
            const FLAG_SET = new Set(['swarm', 'no-swarm']);
            const byGroup  = new Map();
            for (const r of rows) {
                const baseNoFlag = (r.nonSlot2Conds || []).filter(c => !FLAG_SET.has(c));
                const key = `${r.name}|${baseNoFlag.join('|')}`;
                if (!byGroup.has(key)) byGroup.set(key, { name: r.name, baseNoFlag, items: [] });
                byGroup.get(key).items.push(r);
            }
            const rebuilt = [];
            for (const [, { name, baseNoFlag, items }] of byGroup) {
                const withSwarm   = items.filter(r => (r.nonSlot2Conds || []).includes('swarm'));
                const withNoSwarm = items.filter(r => (r.nonSlot2Conds || []).includes('no-swarm'));
                const neutral     = items.filter(r => !(r.nonSlot2Conds || []).some(c => FLAG_SET.has(c)));

                const fold = list => {
                    const pg = makeEmpty();
                    for (const r of list) mergePerGame(pg, r.perGame);
                    return pg;
                };

                const pgA = fold(withSwarm);
                const pgB = fold(withNoSwarm);
                const equalAB = withSwarm.length > 0 && withNoSwarm.length > 0 &&
                    ag.every(g => String(pgA[g]?.rate || 0) === String(pgB[g]?.rate || 0));

                if (equalAB) {
                    const merged = makeEmpty();
                    mergePerGame(merged, fold(neutral));
                    mergePerGame(merged, pgA);
                    const total = ag.reduce((acc, g) => acc + (merged[g]?.rate || 0), 0);
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

        // Pass 3: time harmonisation
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

                const perTime = { morning: makeEmpty(), day: makeEmpty(), night: makeEmpty() };
                for (const r of items) {
                    const times = toTimeOnly(r.nonSlot2Conds).length
                        ? toTimeOnly(r.nonSlot2Conds) : ['morning', 'day', 'night'];
                    for (const t of times) mergePerGame(perTime[t], r.perGame);
                }

                // Merge two times only when BOTH rate AND levels match per game —
                // otherwise e.g. Sentret at 30% lv 2,3 (Morning) and 30% lv 2-4 (Day)
                // would wrongly collapse into one "Morning, Day" row.
                const sigFor = pg => ag.map(g => `${pg[g]?.rate || 0}#${(pg[g]?.levels || []).join(',')}`).join('|');
                const sigMap = new Map();
                for (const t of ['morning', 'day', 'night']) {
                    const sig = sigFor(perTime[t]);
                    if (!sigMap.has(sig)) {
                        sigMap.set(sig, { times: [t], perGame: perTime[t] });
                    } else {
                        const acc = sigMap.get(sig);
                        acc.times.push(t);
                        for (const g of ag) {
                            const lvUnion = new Set([...(acc.perGame[g].levels || []), ...(perTime[t][g].levels || [])]);
                            acc.perGame[g].levels = [...lvUnion].sort();
                        }
                    }
                }

                for (const { times, perGame } of sigMap.values()) {
                    const total = ag.reduce((acc, g) => acc + (perGame[g]?.rate || 0), 0);
                    if (!total) continue;
                    const timePart   = times.slice().sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
                    const isAllThree = timePart.length === 3;
                    const timeTokens = isAllThree ? [] : timePart;
                    // Order time-of-day first, then the non-time base (e.g. radio-off),
                    // so labels read "Night, Radio: Off" rather than "Radio: Off, Night".
                    const conds = [...timeTokens, ...baseNoTime];
                    rebuilt.push({
                        key: `${name}|${conds.join('|')}|time-harm`,
                        name, perGame,
                        nonSlot2Conds: conds.slice(),
                        rawConditions:  conds.map(formatCondition),
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

    function buildCompressedRowsFiltered(location, s, activeGames) {
        const ag = activeGames || GAMES;
        const map = new Map();

        for (const block of extractWalking(location)) {
            const { rate, options: encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;
                const all   = processConditions(opt.conditions || []);
                const times = toTimeOnly(all);
                const key   = `${opt.name}|${(times.join('+') || 'anytime')}`;
                if (!map.has(key)) {
                    map.set(key, {
                        name: opt.name, timeConds: times,
                        perGame: Object.fromEntries(ag.map(g => [g, { rate: 0, levels: new Set() }])),
                    });
                }
                const rec = map.get(key);
                for (const g of gamesForEncounter(opt, ag)) {
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
                    ag.map(g => [g, { rate: rec.perGame[g].rate, levels: [...rec.perGame[g].levels].sort() }])
                ),
            });
        }

        // Time harmonisation
        const byMon = new Map();
        for (const r of prelim) {
            if (!byMon.has(r.name)) byMon.set(r.name, []);
            byMon.get(r.name).push(r);
        }

        function addInto(target, source) {
            for (const g of ag) {
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
                morning: Object.fromEntries(ag.map(g => [g, { rate: 0, levels: [] }])),
                day:     Object.fromEntries(ag.map(g => [g, { rate: 0, levels: [] }])),
                night:   Object.fromEntries(ag.map(g => [g, { rate: 0, levels: [] }])),
            };
            for (const r of rows) {
                const times = r.timeConds.length ? r.timeConds : ['morning', 'day', 'night'];
                for (const t of times) addInto(perTime[t], r.perGame);
            }

            const sigFor = (pg, g) => `${pg[g]?.rate || 0}#${(pg[g]?.levels || []).join(',')}`;
            const sig = pg => s.game && s.game !== 'All'
                ? sigFor(pg, s.game)
                : ag.map(g => sigFor(pg, g)).join('|');

            const sigMap = new Map();
            for (const t of ['morning', 'day', 'night']) {
                const k = sig(perTime[t]);
                if (!sigMap.has(k)) {
                    sigMap.set(k, { times: [t], perGame: Object.fromEntries(
                        ag.map(g => [g, { rate: perTime[t][g].rate, levels: perTime[t][g].levels.slice() }])
                    )});
                } else {
                    const acc = sigMap.get(k);
                    acc.times.push(t);
                    for (const g of ag) {
                        const lvUnion = new Set([...(acc.perGame[g].levels || []), ...(perTime[t][g].levels || [])]);
                        acc.perGame[g].levels = [...lvUnion].sort();
                    }
                }
            }

            for (const { times, perGame } of sigMap.values()) {
                const total = ag.reduce((acc, g) => acc + (perGame[g]?.rate || 0), 0);
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
    // Sprite (gen-4)
    // =========================================================
    function Sprite(props) {
        const { useState, useMemo, useEffect } = React;
        const nm = normalizedName(props.name);

        const hardcoded = [
            { name: 'nidoran♀',  path: '../../Resources/images/home-renders/gen-1/nidoran-f.png' },
            { name: 'nidoran♂',  path: '../../Resources/images/home-renders/gen-1/nidoran-m.png' },
            { name: 'mr-mime',   path: '../../Resources/images/home-renders/gen-1/mr-mime.png' },
            { name: 'farfetchd', path: '../../Resources/images/home-renders/gen-1/farfetchd.png' },
            { name: 'unown',     path: '../../Resources/images/home-renders/gen-2/unown-a.png' },
            { name: 'ho-oh',     path: '../../Resources/images/home-renders/gen-2/ho-oh.png' },
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
    // ViewControls — walking table
    // =========================================================
    function ViewControls({ state, setState, hasSwarm, hasRadio, hideShowAllToggle, unified, activeGames }) {
        const set = p => setState(prev => Object.assign({}, prev, p));
        const ag  = activeGames || GAMES;
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
                !unified && ag.length > 1 && h(Select, {
                    label: 'Game',
                    value: state.game,
                    onChange: v => set({ game: v }),
                    options: [
                        { value: 'All',      label: 'All' },
                        { value: 'separate', label: 'Separate' },
                        ...ag.map(g => ({ value: g, label: g })),
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
                hasRadio && h(Select, {
                    label: 'Radio',
                    value: state.radio,
                    onChange: v => set({ radio: v }),
                    options: [
                        { value: '',             label: 'Off' },
                        { value: 'hoenn-sound',  label: 'Hoenn Sound' },
                        { value: 'sinnoh-sound', label: 'Sinnoh Sound' },
                    ],
                }),
            ),
        );
    }

    // =========================================================
    // GameTable — single-game walking wrapper
    // =========================================================
    function GameTable({ game, baseState, location, mount, noConditions, activeGames }) {
        const s = React.useMemo(() => ({ ...baseState, game }), [baseState, game]);
        const ag = activeGames || GAMES;

        const rows = React.useMemo(() => {
            if (!location) return [];
            if (s.view === 'full') return buildFullRows(location, s, ag);
            const built = s.showAllConditions
                ? buildCompressedRows(location, s, ag)
                : buildCompressedRowsFiltered(location, s, ag);
            return built.filter(r => r && typeof r.name === 'string' && r.name.trim().length);
        }, [location, s.view, s.showAllConditions, s.swarm, s.radio, s.game]);

        return h(Table, {
            rows, activeGames: ag, gameFilter: game, mount,
            view: s.view, onlyTimeMode: !s.showAllConditions,
            prebuiltForGame: game, noConditions,
        });
    }

    // =========================================================
    // Table — walking encounter table
    // =========================================================
    function Table(props) {
        const { rows, gameFilter, mount, view, noConditions } = props;
        const onlyTimeMode = !!props.onlyTimeMode;
        const unified      = !!props.unified;
        const activeGames  = props.activeGames || GAMES;
        const showGames    = (gameFilter === 'All' || !gameFilter) ? activeGames : [gameFilter];
        const viewLabel    = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel   = unified
            ? viewLabel
            : ((gameFilter === 'All' || !gameFilter ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        const basePfx = () => gameFilter && gameFilter !== 'All' ? gamePrefix(gameFilter) : 'light';
        const tHdrCls = g => g ? `${gamePrefix(g)}-true` : `${basePfx()}-true`;

        const renderRows = gameFilter && gameFilter !== 'All'
            ? rows.filter(r => {
                const cell = r.perGame?.[gameFilter];
                return view === 'full'
                    ? !!(cell && cell.name)
                    : !!(cell && ((cell.rate || 0) > 0 || (cell.levels && cell.levels.length)));
            })
            : rows;

        let sanitizedRows = (renderRows || []).filter(r => {
            if (!r) return false;
            if (view === 'full') return showGames.some(g => r.perGame?.[g]?.name);
            return typeof r.name === 'string' && r.name.trim().length > 0;
        });

        // Full view: realign per-time so HG/SS time differences share unified rows.
        if (view === 'full') {
            sanitizedRows = recombineFullRowsByTime(sanitizedRows, showGames, activeGames)
                .filter(r => showGames.some(g => r.perGame?.[g]?.name));
        }

        // Compressed species order
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
                const _meta = buildCompressedOrderingMeta(Array.from(buckets.values()).flat(), activeGames);
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

        // Stripe maps
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
            const p = prefix || basePfx();
            return `${p}-${isTrue ? 'true' : 'false'}`;
        }

        function zebraBySlot(prefix, slot) {
            const isTrue = (Number(slot) || 0) % 2 === 1;
            const p = prefix || basePfx();
            return `${p}-${isTrue ? 'true' : 'false'}`;
        }

        function rowHasNonAnytimeConditions(r) {
            if (Array.isArray(r.timeConds) && r.timeConds.length) return true;
            if (view === 'full') return (r.rawConditions || []).length > 0;
            const nonTime = (r.nonSlot2Conds || []).filter(c => !TIME_FLAGS.has(c));
            return nonTime.length > 0;
        }

        const hideConditionsColumn = sanitizedRows.length > 0
            ? sanitizedRows.every(r => !rowHasNonAnytimeConditions(r))
            : true;

        // Full-view slot groups
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
                    if (ta[0] !== tb[0]) return ta[0] - tb[0];   // swarm bucket
                    if (ta[1] !== tb[1]) return ta[1] - tb[1];   // radio bucket
                    // within the same bucket, order by time-of-day (Morning→Day→Night)
                    const aT = toTimeOnly(a.rawConditions || []);
                    const bT = toTimeOnly(b.rawConditions || []);
                    const aRank = aT.length ? TIME_ORDER.indexOf(aT[0]) : -1;
                    const bRank = bT.length ? TIME_ORDER.indexOf(bT[0]) : -1;
                    if (aRank !== bRank) return aRank - bRank;
                    return String(ta[2]).localeCompare(String(tb[2]));
                });
            }
        }

        function FullHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { className: tHdrCls(null) }, 'Slot'),
                    h('th', { className: tHdrCls(null) }, 'Rate'),
                    !hideConditionsColumn && h('th', { className: tHdrCls(null) }, 'Conditions'),
                    (unified || (gameFilter && gameFilter !== 'All'))
                        ? [
                            h('th', { key: 'pkmn', colSpan: 2, className: tHdrCls(null) }, 'Pokémon'),
                            h('th', { key: 'lv',   className:  tHdrCls(null) }, 'Level'),
                          ]
                        : showGames.map(g => h('th', { key: g, colSpan: 3, className: tHdrCls(g) }, g)),
                )
            );
        }

        function CompressedHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { colSpan: 2, className: tHdrCls(null) }, 'Pokémon'),
                    ...(unified || (gameFilter && gameFilter !== 'All')
                        ? [
                            h('th', { key: 'r', className: tHdrCls(null) }, 'Rate'),
                            h('th', { key: 'l', className: tHdrCls(null) }, 'Level'),
                          ]
                        : showGames.map(g => h('th', { key: g, colSpan: 2, className: tHdrCls(g) }, g))
                    ),
                    !hideConditionsColumn && h('th', { className: tHdrCls(null) }, 'Conditions'),
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
                                    out.push(h('tr', {
                                        key: `${r.key}::${iInGroup}`,
                                        className: (gameFilter && gameFilter !== 'All') ? zebraBySlot(gamePrefix(gameFilter), r.slot) : undefined,
                                    },
                                        ...(iInGroup === 0 ? [
                                            h('td', { rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, String(r.slot)),
                                            h('td', { rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, `${r.rate}%`),
                                        ] : []),
                                        !hideConditionsColumn && h('td', { className: zebraBySlot(null, r.slot) },
                                            h(ConditionsCell, { conds: r.rawConditions })
                                        ),
                                        ...((unified || (gameFilter && gameFilter !== 'All')) ? (() => {
                                            const g    = gameFilter !== 'All' ? gameFilter : showGames[0];
                                            const cell = r.perGame?.[g];
                                            const has  = !!(cell && cell.name);
                                            return [
                                                h('td', { key: 'u:s', className: zebraBySlot(null, r.slot) }, has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'),
                                                h('td', { key: 'u:n', className: zebraBySlot(null, r.slot) }, has ? cell.name : '—'),
                                                h('td', { key: 'u:l', className: zebraBySlot(null, r.slot) }, has ? `lv. ${formatLevels(cell.levels)}` : '—'),
                                            ];
                                        })() : showGames.flatMap(g => {
                                            const gp   = gamePrefix(g);
                                            const cell = r.perGame?.[g];
                                            const has  = !!(cell && cell.name);
                                            return [
                                                h('td', { key: g + ':s', className: zebraBySlot(gp, r.slot) }, has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'),
                                                h('td', { key: g + ':n', className: zebraBySlot(gp, r.slot) }, has ? cell.name : '—'),
                                                h('td', { key: g + ':l', className: zebraBySlot(gp, r.slot) }, has ? `lv. ${formatLevels(cell.levels)}` : '—'),
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
                                className: (gameFilter && gameFilter !== 'All') ? zebraByBlock(gamePrefix(gameFilter), rowIndex) : undefined,
                            },
                                block ? h(React.Fragment, null,
                                    h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, h(Sprite, { name: r.name, mount })),
                                    h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, r.name),
                                ) : null,
                                ...((unified || (gameFilter && gameFilter !== 'All')) ? (() => {
                                    const g     = gameFilter !== 'All' ? gameFilter : showGames[0];
                                    const cell  = r.perGame?.[g];
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
        const base = window.HGSS_LOCATION_BASE || '../javascript/HGSS/';
        const p = loadScript(`${base}${locId}.js`).then(() => {
            if (!window.HGSS_DATA) throw new Error('HGSS_DATA not found after script load');
            const d = window.HGSS_DATA;
            delete window.HGSS_DATA;
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
            radio: '',
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

        const activeGames = useMemo(() => data ? detectActiveGamesFromWalking(data) : GAMES, [data]);
        const filterAvailability = useMemo(() => computeAvailableConditionFilters(data), [data]);
        const hideShowAllToggle  = !(filterAvailability.hasSwarm || filterAvailability.hasRadio);
        const noConditions       = hideShowAllToggle;
        const unified = useMemo(() => data ? walkingGamesIdentical(data, activeGames) : false, [data, activeGames]);

        const rows = useMemo(() => {
            if (!data) return [];
            if (state.view === 'full') return buildFullRows(data, state, activeGames);
            return state.showAllConditions
                ? buildCompressedRows(data, state, activeGames)
                : buildCompressedRowsFiltered(data, state, activeGames);
        }, [data, state, activeGames]);

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
                hasRadio: filterAvailability.hasRadio,
                hideShowAllToggle,
                unified,
                activeGames,
            }),
            state.game === 'separate' && !unified
                ? h('div', null,
                    activeGames.map(g => h('div', { key: g, style: { marginTop: 12 } },
                        h(GameTable, { game: g, baseState: state, location: data, mount, noConditions, activeGames })
                    ))
                )
                : h(Table, {
                    rows, activeGames, gameFilter: unified ? 'All' : state.game, mount,
                    view: state.view, onlyTimeMode: !state.showAllConditions, noConditions,
                    unified,
                })
        );
    }

    // =========================================================
    // Slot encounter utilities — Surfing / Fishing / Headbutt / etc.
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
        return merged.map(([lo, hi]) => {
            if (lo === hi) return String(lo);
            if (hi - lo === 1) return `${lo}, ${hi}`;   // two consecutive levels → comma, not a range
            return `${lo}-${hi}`;                        // 3+ consecutive → hyphenated range
        }).join(', ');
    }

    // formatLevelStr — reformat a single raw level token ("N" or "N-M") for display:
    // a two-level span becomes "N, M" (comma); only spans of 3+ stay hyphenated.
    // Used by the Full views, which show each option's raw level (mergeRanges handles Compressed).
    function formatLevelStr(level) {
        const m = String(level).match(/^(\d+)-(\d+)$/);
        if (!m) return String(level);
        const lo = parseInt(m[1], 10), hi = parseInt(m[2], 10);
        if (lo === hi) return String(lo);
        if (hi - lo === 1) return `${lo}, ${hi}`;
        return `${lo}-${hi}`;
    }

    // buildSlotFullRows — condition-aware: each (slot × conditionKey) is its own row
    function buildSlotFullRows(slots, games) {
        const out = [];
        for (const slot of (slots || [])) {
            const condMap = new Map();
            for (const opt of (slot.options || [])) {
                const condKey = (opt.conditions || []).slice().sort().join(',');
                if (!condMap.has(condKey)) condMap.set(condKey, { conditions: opt.conditions || [], perGame: {} });
                const cg = condMap.get(condKey);
                for (const g of (opt.games || [])) {
                    if (games.includes(g)) cg.perGame[g] = { name: opt.name, level: opt.level };
                }
            }
            for (const [, cg] of condMap) {
                out.push({ slot: slot.slot, rate: slot.rate, conditions: cg.conditions, perGame: cg.perGame });
            }
        }
        return out;
    }

    // buildSlotCompressedRows — aggregates by (name × conditionKey)
    function buildSlotCompressedRows(slots, games) {
        const order = [];
        const accum = new Map();
        for (const slot of (slots || [])) {
            for (const opt of (slot.options || [])) {
                const condKey = (opt.conditions || []).slice().sort().join(',');
                const key = `${opt.name}|${condKey}`;
                if (!accum.has(key)) {
                    accum.set(key, { conditions: opt.conditions || [] });
                    order.push(key);
                }
                const pg = accum.get(key);
                for (const g of (opt.games || [])) {
                    if (!games.includes(g)) continue;
                    if (!pg[g]) pg[g] = { rate: 0, levels: [] };
                    pg[g].rate += slot.rate;
                    if (!pg[g].levels.includes(opt.level)) pg[g].levels.push(opt.level);
                }
            }
        }
        return order.map(key => {
            const entry = accum.get(key);
            const name  = key.split('|')[0];
            const perGame = Object.fromEntries(
                games.filter(g => entry[g]).map(g => [g, {
                    rate:  entry[g].rate,
                    level: mergeRanges(entry[g].levels),
                }])
            );
            return { name, conditions: entry.conditions, perGame };
        });
    }

    function SlotViewControls({ state, setState, unified, activeGames, hasSwarm }) {
        const set = p => setState(prev => Object.assign({}, prev, p));
        const ag  = activeGames || GAMES;
        const showAll = state.showAllConditions !== false;
        return h('div', { style: { margin: '8px 0 12px' } },
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: hasSwarm ? 6 : 0 } },
                h(Select, {
                    label: 'View', value: state.view,
                    onChange: v => set({ view: v }),
                    options: [
                        { value: 'full',       label: 'Full (slots)' },
                        { value: 'compressed', label: 'Compressed' },
                    ],
                }),
                !unified && ag.length > 1 && h(Select, {
                    label: 'Game', value: state.game,
                    onChange: v => set({ game: v }),
                    options: [
                        { value: 'All',      label: 'All' },
                        { value: 'separate', label: 'Separate' },
                        ...ag.map(g => ({ value: g, label: g })),
                    ],
                }),
                hasSwarm && h(Toggle, {
                    label: 'Show all conditions',
                    checked: showAll,
                    onChange: v => set({ showAllConditions: v }),
                }),
            ),
            hasSwarm && h('div', {
                style: {
                    display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
                    opacity: showAll ? 0.4 : 1,
                    pointerEvents: showAll ? 'none' : 'auto',
                },
            },
                h(Toggle, {
                    label: 'Swarm active',
                    checked: !!state.swarm,
                    onChange: v => set({ swarm: v }),
                }),
            ),
        );
    }

    // SlotSection — surfing, headbutt_a/b/special, rock_smash, bug_catching_contest
    function SlotSection({ slots: slotsRaw, games, gameFilter, view, mount, unified, label, cond }) {
        const slots = filterSlotsByCond(slotsRaw, cond);
        if (!slots || !slots.length) return null;
        const isSingle  = games.includes(gameFilter) && gameFilter !== 'All';
        const showGames = isSingle ? [gameFilter] : games;
        const base      = baseOf(games, isSingle ? gameFilter : (unified ? null : null));
        const viewLabel = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = label
            ? (unified ? label : `${label} — ${(gameFilter === 'All' ? 'Combined' : gameFilter)} (${viewLabel})`)
            : (unified ? viewLabel : `${(gameFilter === 'All' ? 'Combined' : gameFilter)} (${viewLabel})`);

        // Show the conditions column whenever the raw data carries conditions; in
        // "Set conditions" mode the swarm tag is stripped so every row reads "Anytime".
        const hasConditions = (slotsRaw || []).some(s => (s.options || []).some(o => (o.conditions || []).length > 0));

        if (view === 'full') {
            const fullRows = buildSlotFullRows(slots, games);
            const rows = isSingle ? fullRows.filter(r => r.perGame[gameFilter]) : fullRows;
            // Group consecutive rows sharing a slot so Slot/Rate span their condition rows.
            const slotGroups = [];
            for (const row of rows) {
                const last = slotGroups[slotGroups.length - 1];
                if (last && last.slot === row.slot && last.rate === row.rate) last.rows.push(row);
                else slotGroups.push({ slot: row.slot, rate: row.rate, rows: [row] });
            }
            return h('div', { style: { overflowX: 'auto' } },
                h('table', null,
                    h('caption', null, tableLabel),
                    h('thead', null,
                        h('tr', null,
                            h('th', { className: hdrCls(null, base) }, 'Slot'),
                            h('th', { className: hdrCls(null, base) }, 'Rate'),
                            hasConditions && h('th', { className: hdrCls(null, base) }, 'Conditions'),
                            (isSingle || unified)
                                ? [
                                    h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                                    h('th', { key: 'l',    className:  hdrCls(null, base) }, 'Level'),
                                  ]
                                : showGames.map(g => h('th', { key: g, colSpan: 3, className: hdrCls(g) }, g)),
                        )
                    ),
                    h('tbody', null,
                        slotGroups.flatMap(group =>
                            group.rows.map((row, iInGroup) =>
                                h('tr', { key: `${group.slot}-${iInGroup}` },
                                    iInGroup === 0 ? h(React.Fragment, null,
                                        h('td', { key: 'slot', rowSpan: group.rows.length, className: slotCls(base, group.slot) }, group.slot),
                                        h('td', { key: 'rate', rowSpan: group.rows.length, className: slotCls(base, group.slot) }, group.rate + '%'),
                                    ) : null,
                                    hasConditions && h('td', { className: slotCls(base, row.slot) },
                                        h(ConditionsCell, { conds: row.conditions })
                                    ),
                                    ...((isSingle || unified)
                                        ? (() => {
                                            const c = row.perGame[isSingle ? gameFilter : games[0]];
                                            return [
                                                h('td', { key: 's', className: slotCls(base, row.slot) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                                h('td', { key: 'n', className: slotCls(base, row.slot) }, c ? c.name : '—'),
                                                h('td', { key: 'l', className: slotCls(base, row.slot) }, c ? `lv. ${formatLevelStr(c.level)}` : '—'),
                                            ];
                                          })()
                                        : showGames.flatMap(g => {
                                            const gp = gamePrefix(g);
                                            const c  = row.perGame[g];
                                            return [
                                                h('td', { key: g + '-s', className: slotCls(gp, row.slot) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                                h('td', { key: g + '-n', className: slotCls(gp, row.slot) }, c ? c.name : '—'),
                                                h('td', { key: g + '-l', className: slotCls(gp, row.slot) }, c ? `lv. ${formatLevelStr(c.level)}` : '—'),
                                            ];
                                          })
                                    )
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

        const hasConditionsComp = rows.some(r => (r.conditions || []).length > 0);

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
                        hasConditionsComp && h('th', { key: 'c', className: hdrCls(null, base) }, 'Conditions'),
                    )
                ),
                h('tbody', null,
                    rows.map((row, i) =>
                        h('tr', { key: `${row.name}-${i}` },
                            h('td', { className: rowCls(base, i) }, h(Sprite, { name: row.name, mount })),
                            h('td', { className: rowCls(base, i) }, row.name),
                            ...((isSingle || unified)
                                ? (() => {
                                    const c = row.perGame[isSingle ? gameFilter : games[0]];
                                    return [
                                        h('td', { key: 'r', className: rowCls(base, i) }, c ? c.rate + '%' : '—'),
                                        h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${formatLevelStr(c.level)}` : '—'),
                                    ];
                                  })()
                                : showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const c  = row.perGame[g];
                                    if (!c) return [h('td', { key: g + '-na', colSpan: 2, className: rowCls(null, i) }, 'N/A')];
                                    return [
                                        h('td', { key: g + '-r', className: rowCls(gp, i) }, c.rate + '%'),
                                        h('td', { key: g + '-l', className: rowCls(gp, i) }, `lv. ${formatLevelStr(c.level)}`),
                                    ];
                                  })
                            ),
                            hasConditionsComp && h('td', { className: rowCls(base, i) },
                                h(ConditionsCell, { conds: row.conditions })
                            ),
                        )
                    )
                )
            )
        );
    }

    // FishTable — fishing with old_rod / good_rod / super_rod
    function FishTable({ fish: fishRaw, games, gameFilter, view, mount, unified, cond }) {
        const ROD_KEYS = [
            { key: 'old_rod',   label: 'Old' },
            { key: 'good_rod',  label: 'Good' },
            { key: 'super_rod', label: 'Super' },
        ];
        // Apply the swarm / show-conditions filter to each rod.
        const fish = {
            old_rod:   filterSlotsByCond(fishRaw.old_rod   || [], cond),
            good_rod:  filterSlotsByCond(fishRaw.good_rod  || [], cond),
            super_rod: filterSlotsByCond(fishRaw.super_rod || [], cond),
        };
        const isSingle   = games.includes(gameFilter) && gameFilter !== 'All';
        const showGames  = isSingle ? [gameFilter] : games;
        const base       = baseOf(games, isSingle ? gameFilter : null);
        const viewLabel  = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = unified
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        const allSlots = ROD_KEYS.flatMap(({ key }) => fish[key] || []);
        // Show the conditions column whenever the raw data carries conditions; in
        // "Set conditions" mode the swarm tag is stripped so every row reads "Anytime".
        const hasConditions = ROD_KEYS.some(({ key }) =>
            (fishRaw[key] || []).some(s => (s.options || []).some(o => (o.conditions || []).length > 0)));

        if (view === 'full') {
            const allRows = [];
            for (const { key, label } of ROD_KEYS) {
                const fullRows = buildSlotFullRows(fish[key] || [], games);
                const filtered = isSingle ? fullRows.filter(r => r.perGame[gameFilter]) : fullRows;
                for (const r of filtered) allRows.push({ rod: label, ...r });
            }
            // Group consecutive rows sharing (rod, slot) so Rod/Slot/Rate span condition rows.
            const fishFullBlocks = [];
            for (const row of allRows) {
                const last = fishFullBlocks[fishFullBlocks.length - 1];
                if (last && last.rod === row.rod && last.slot === row.slot && last.rate === row.rate) last.rows.push(row);
                else fishFullBlocks.push({ rod: row.rod, slot: row.slot, rate: row.rate, rows: [row] });
            }
            return h('div', { style: { overflowX: 'auto' } },
                h('table', null,
                    h('caption', null, tableLabel),
                    h('thead', null,
                        h('tr', null,
                            h('th', { className: hdrCls(null, base) }, 'Rod'),
                            h('th', { className: hdrCls(null, base) }, 'Slot'),
                            h('th', { className: hdrCls(null, base) }, 'Rate'),
                            hasConditions && h('th', { className: hdrCls(null, base) }, 'Conditions'),
                            (isSingle || unified)
                                ? [
                                    h('th', { key: 'pkmn', colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                                    h('th', { key: 'l',    className:  hdrCls(null, base) }, 'Level'),
                                  ]
                                : showGames.map(g => h('th', { key: g, colSpan: 3, className: hdrCls(g) }, g)),
                        )
                    ),
                    h('tbody', null,
                        fishFullBlocks.flatMap((group, blockIdx) =>
                            group.rows.map((row, iInGroup) =>
                                h('tr', { key: `${group.rod}-${group.slot}-${blockIdx}-${iInGroup}` },
                                    iInGroup === 0 ? h(React.Fragment, null,
                                        h('td', { key: 'rod',  rowSpan: group.rows.length, className: rowCls(base, blockIdx) }, group.rod),
                                        h('td', { key: 'slot', rowSpan: group.rows.length, className: rowCls(base, blockIdx) }, group.slot),
                                        h('td', { key: 'rate', rowSpan: group.rows.length, className: rowCls(base, blockIdx) }, group.rate + '%'),
                                    ) : null,
                                    hasConditions && h('td', { className: rowCls(base, blockIdx) },
                                        h(ConditionsCell, { conds: row.conditions })
                                    ),
                                    ...((isSingle || unified)
                                        ? (() => {
                                            const c = row.perGame[isSingle ? gameFilter : games[0]];
                                            return [
                                                h('td', { key: 's', className: rowCls(base, blockIdx) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                                h('td', { key: 'n', className: rowCls(base, blockIdx) }, c ? c.name : '—'),
                                                h('td', { key: 'l', className: rowCls(base, blockIdx) }, c ? `lv. ${formatLevelStr(c.level)}` : '—'),
                                            ];
                                          })()
                                        : showGames.flatMap(g => {
                                            const gp = gamePrefix(g);
                                            const c  = row.perGame[g];
                                            return [
                                                h('td', { key: g + '-s', className: rowCls(gp, blockIdx) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                                h('td', { key: g + '-n', className: rowCls(gp, blockIdx) }, c ? c.name : '—'),
                                                h('td', { key: g + '-l', className: rowCls(gp, blockIdx) }, c ? `lv. ${formatLevelStr(c.level)}` : '—'),
                                            ];
                                          })
                                    )
                                )
                            )
                        )
                    )
                )
            );
        }

        // Compressed — rows ordered per rod, then grouped by (rod × species) so a
        // species appearing multiple times in one rod (different conditions) shares
        // one Rod/sprite/name cell (rowSpan) with a row per condition.
        const allRows = ROD_KEYS.flatMap(({ key, label }) => {
            const compRows = buildSlotCompressedRows(fish[key] || [], games);
            const filtered = (() => {
                if (isSingle) {
                    return compRows
                        .filter(r => r.perGame[gameFilter])
                        .sort((a, b) => (b.perGame[gameFilter]?.rate || 0) - (a.perGame[gameFilter]?.rate || 0));
                }
                const arr  = compRows.slice();
                const meta = buildCompressedOrderingMeta(arr, games);
                return arr.sort((a, b) => compressedSpeciesCompare(a, b, meta));
            })();
            return filtered.map(row => ({ rod: label, ...row }));
        });

        // Collapse into blocks keyed by (rod, species), preserving first-seen order.
        const fishBlocks = [];
        const fishBlockIdxByKey = new Map();
        for (const row of allRows) {
            const bkey = `${row.rod} ${row.name}`;
            let bi = fishBlockIdxByKey.get(bkey);
            if (bi === undefined) {
                bi = fishBlocks.length;
                fishBlockIdxByKey.set(bkey, bi);
                fishBlocks.push({ rod: row.rod, name: row.name, rows: [] });
            }
            fishBlocks[bi].rows.push(row);
        }

        const hasConditionsComp = hasConditions;

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
                        hasConditionsComp && h('th', { key: 'c', className: hdrCls(null, base) }, 'Conditions'),
                    )
                ),
                h('tbody', null,
                    fishBlocks.flatMap((block, blockIdx) =>
                        block.rows.map((row, rowInBlock) =>
                            h('tr', { key: `${block.rod}-${block.name}-${blockIdx}-${rowInBlock}` },
                                rowInBlock === 0 ? h(React.Fragment, null,
                                    h('td', { key: 'rod', rowSpan: block.rows.length, className: rowCls(base, blockIdx) }, block.rod),
                                    h('td', { key: 's',   rowSpan: block.rows.length, className: rowCls(base, blockIdx) }, h(Sprite, { name: block.name, mount })),
                                    h('td', { key: 'n',   rowSpan: block.rows.length, className: rowCls(base, blockIdx) }, block.name),
                                ) : null,
                                ...((isSingle || unified)
                                    ? (() => {
                                        const c = row.perGame[isSingle ? gameFilter : games[0]];
                                        return [
                                            h('td', { key: 'r', className: rowCls(base, blockIdx) }, c ? c.rate + '%' : '—'),
                                            h('td', { key: 'l', className: rowCls(base, blockIdx) }, c ? `lv. ${formatLevelStr(c.level)}` : '—'),
                                        ];
                                      })()
                                    : showGames.flatMap(g => {
                                        const gp = gamePrefix(g);
                                        const c  = row.perGame[g];
                                        if (!c) return [h('td', { key: g + '-na', colSpan: 2, className: rowCls(null, blockIdx) }, 'N/A')];
                                        return [
                                            h('td', { key: g + '-r', className: rowCls(gp, blockIdx) }, c.rate + '%'),
                                            h('td', { key: g + '-l', className: rowCls(gp, blockIdx) }, `lv. ${formatLevelStr(c.level)}`),
                                        ];
                                      })
                                ),
                                hasConditionsComp && h('td', { className: rowCls(base, blockIdx) },
                                    h(ConditionsCell, { conds: row.conditions })
                                ),
                            )
                        )
                    )
                )
            )
        );
    }

    // =========================================================
    // SlotApp — root for all slot-based encounter types
    // =========================================================
    function SlotApp({ encounterType, mount }) {
        const { useState, useEffect, useMemo } = React;
        const [error,   setError]   = useState(null);
        const [loading, setLoading] = useState(true);
        const [data,    setData]    = useState(null);
        const [state,   setState]   = useState({ view: 'compressed', game: 'All', showAllConditions: true, swarm: false });

        const locId = inferLocationId(mount);

        useEffect(() => {
            let alive = true;
            getLocationData(locId)
                .then(d => { if (alive) { setData(d); setLoading(false); } })
                .catch(e => { if (alive) { setError(String(e?.message || e)); setLoading(false); } });
            return () => { alive = false; };
        }, []);

        const activeGames = useMemo(() => {
            if (!data) return GAMES;
            const enc = data.encounters || {};
            if (encounterType === 'surfing')              return detectActiveGames(enc.surfing || []);
            if (encounterType === 'headbutt_a')           return detectActiveGames(enc.headbutt_a || []);
            if (encounterType === 'headbutt_b')           return detectActiveGames(enc.headbutt_b || []);
            if (encounterType === 'headbutt_special')     return detectActiveGames(enc.headbutt_special || []);
            if (encounterType === 'rock_smash')           return detectActiveGames(enc.rock_smash || []);
            if (encounterType === 'bug_catching_contest') return detectActiveGames(enc.bug_catching_contest || []);
            if (encounterType === 'fishing') {
                const fish = enc.fishing || {};
                const allSlots = [
                    ...(fish.old_rod || []),
                    ...(fish.good_rod || []),
                    ...(fish.super_rod || []),
                ];
                return detectActiveGames(allSlots);
            }
            return GAMES;
        }, [data, encounterType]);

        const unified = useMemo(() => {
            if (!data) return false;
            const enc = data.encounters || {};
            if (encounterType === 'surfing')          return slotEncounterGamesIdentical(enc.surfing || [], activeGames);
            if (encounterType === 'headbutt_a')       return slotEncounterGamesIdentical(enc.headbutt_a || [], activeGames);
            if (encounterType === 'headbutt_b')       return slotEncounterGamesIdentical(enc.headbutt_b || [], activeGames);
            if (encounterType === 'headbutt_special') return slotEncounterGamesIdentical(enc.headbutt_special || [], activeGames);
            if (encounterType === 'rock_smash')       return slotEncounterGamesIdentical(enc.rock_smash || [], activeGames);
            if (encounterType === 'bug_catching_contest') return true; // always identical across games
            if (encounterType === 'fishing') {
                const fish = enc.fishing || {};
                return ['old_rod', 'good_rod', 'super_rod'].every(k =>
                    slotEncounterGamesIdentical(fish[k] || [], activeGames)
                );
            }
            return false;
        }, [data, encounterType, activeGames]);

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return null;

        const enc = data.encounters || {};
        const isSeparate = state.game === 'separate';

        // Detect swarm conditions for the current encounter type; drives the
        // "Show all conditions" + "Swarm active" toggles and the option filter.
        const encSlots = encounterType === 'fishing'
            ? ['old_rod', 'good_rod', 'super_rod'].flatMap(k => (enc.fishing || {})[k] || [])
            : (enc[encounterType] || []);
        const hasSwarm = slotsHaveSwarm(encSlots);
        const cond = { showAllConditions: state.showAllConditions !== false, swarm: !!state.swarm };

        let content;

        if (encounterType === 'surfing') {
            const slots = enc.surfing || [];
            if (!slots.length) return null;
            content = (isSeparate && !unified)
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, games: activeGames, gameFilter: g, view: state.view, mount, cond })
                    )
                  ))
                : h(SlotSection, { slots, games: activeGames, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified, cond });

        } else if (encounterType === 'headbutt_a') {
            const slots = enc.headbutt_a || [];
            if (!slots.length) return null;
            content = (isSeparate && !unified)
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, games: activeGames, gameFilter: g, view: state.view, mount, cond })
                    )
                  ))
                : h(SlotSection, { slots, games: activeGames, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified, cond });

        } else if (encounterType === 'headbutt_b') {
            const slots = enc.headbutt_b || [];
            if (!slots.length) return null;
            content = (isSeparate && !unified)
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, games: activeGames, gameFilter: g, view: state.view, mount, cond })
                    )
                  ))
                : h(SlotSection, { slots, games: activeGames, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified, cond });

        } else if (encounterType === 'headbutt_special') {
            const slots = enc.headbutt_special || [];
            if (!slots.length) return null;
            content = (isSeparate && !unified)
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, games: activeGames, gameFilter: g, view: state.view, mount, cond })
                    )
                  ))
                : h(SlotSection, { slots, games: activeGames, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified, cond });

        } else if (encounterType === 'rock_smash') {
            const slots = enc.rock_smash || [];
            if (!slots.length) return null;
            content = (isSeparate && !unified)
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, games: activeGames, gameFilter: g, view: state.view, mount, cond })
                    )
                  ))
                : h(SlotSection, { slots, games: activeGames, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified, cond });

        } else if (encounterType === 'bug_catching_contest') {
            const slots = enc.bug_catching_contest || [];
            if (!slots.length) return null;
            // Bug Catching Contest is identical across games — always show unified, no view controls
            content = h(SlotSection, { slots, games: GAMES, gameFilter: 'All', view: state.view, mount, unified: true });

        } else if (encounterType === 'fishing') {
            const fish   = enc.fishing || {};
            const hasAny = ['old_rod', 'good_rod', 'super_rod'].some(k => (fish[k] || []).length > 0);
            if (!hasAny) return null;
            content = (isSeparate && !unified)
                ? h('div', null, activeGames.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(FishTable, { fish, games: activeGames, gameFilter: g, view: state.view, mount, cond })
                    )
                  ))
                : h(FishTable, { fish, games: activeGames, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified, cond });

        } else {
            return h('p', null, 'Unknown encounter type: ', encounterType);
        }

        return h('div', null,
            encounterType !== 'bug_catching_contest' && h(SlotViewControls, { state, setState, unified, activeGames, hasSwarm }),
            content
        );
    }

    // =========================================================
    // Boot
    // =========================================================
    (function boot() {
        const WALK_SEL = '.pokemon-hgss-walking-replace-me';

        function mountAll() {
            document.querySelectorAll(WALK_SEL).forEach(n => {
                if (n.__hgssWalkMounted) return;
                n.__hgssWalkMounted = true;
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

        const SLOT_SELECTORS = [
            { selector: '.pokemon-hgss-surfing-replace-me',          encounterType: 'surfing'              },
            { selector: '.pokemon-hgss-fishing-replace-me',          encounterType: 'fishing'              },
            { selector: '.pokemon-hgss-headbutt-a-replace-me',       encounterType: 'headbutt_a'           },
            { selector: '.pokemon-hgss-headbutt-b-replace-me',       encounterType: 'headbutt_b'           },
            { selector: '.pokemon-hgss-headbutt-special-replace-me', encounterType: 'headbutt_special'     },
            { selector: '.pokemon-hgss-rocksmash-replace-me',        encounterType: 'rock_smash'           },
            { selector: '.pokemon-hgss-bugcontest-replace-me',       encounterType: 'bug_catching_contest' },
        ];

        for (const { selector, encounterType } of SLOT_SELECTORS) {
            const mountSlotAll = (sel, type) => {
                document.querySelectorAll(sel).forEach(n => {
                    if (n.__hgssSlotMounted) return;
                    n.__hgssSlotMounted = true;
                    const container = document.createElement('div');
                    for (const a of ['data-location-id', 'data-sprite-base', 'data-sprite-gens']) {
                        const v = n.getAttribute(a);
                        if (v != null) container.setAttribute(a, v);
                    }
                    n.replaceWith(container);
                    ReactDOM.createRoot(container).render(h(SlotApp, { encounterType: type, mount: container }));
                });
            };
            new MutationObserver(() => mountSlotAll(selector, encounterType)).observe(document.documentElement, { childList: true, subtree: true });
            mountSlotAll(selector, encounterType);
        }
    })();

})();
