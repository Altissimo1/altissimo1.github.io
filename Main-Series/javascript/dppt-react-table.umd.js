// ==============================================
// Usage:
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="/assets/js/dppt-react-table.umd.js"></script>
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[dppt-react-table] React/ReactDOM globals not found.'); return; }
    const React = window.React; const ReactDOM = window.ReactDOM; const h = React.createElement;

    const GAMES = ["Diamond", "Pearl", "Platinum"]; const GAME_KEYS = new Set(GAMES);
    const TIME_FLAGS = new Set(["morning", "day", "night"]);
    const RADAR_FLAGS = new Set(["pokeradar", "no-pokeradar"]);
    const SWARM_FLAGS = new Set(["swarm", "no-swarm"]);
    const SLOT2_PREFIX = "slot-2-";

    // Class helpers
    const gamePrefix = g => g.toLowerCase();
    const headerClass = g => (g ? `${gamePrefix(g)}-true` : 'light-true');
    const zebra = (prefix, rowIndex) => prefix ? `${prefix}-${(rowIndex % 2 === 0) ? 'false' : 'true'}` : `light-${(rowIndex % 2 === 0) ? 'false' : 'true'}`;


    const TIME_ORDER = ["morning", "day", "night"];

    const toTimeOnly = (conds) => {
        const arr = Array.isArray(conds) ? conds : Array.from(conds || []);
        const uniq = Array.from(new Set(arr.filter(c => TIME_FLAGS.has(c))));
        return uniq.sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
    };


    function timeLabelList(timeConds) {
        if (!timeConds || timeConds.length === 0) return [];
        return timeConds.map(formatCondition);
    }


    function processConditions(conds) {
        const c = Array.from(conds || []);
        const times = c.filter(x => TIME_FLAGS.has(x));
        // If all three, drop them (no time restriction)
        const uniqTimes = Array.from(new Set(times));
        const keepTimes = (uniqTimes.length === TIME_FLAGS.size) ? [] : uniqTimes;

        const sortedTimes = keepTimes.sort(
            (a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b)
        );

        const others = c.filter(x => !TIME_FLAGS.has(x));
        return [...sortedTimes, ...others];
    }


    // Optional global overrides: window.DPPT_CONDITION_OVERRIDES = { 'no-swarm': 'No swarm' , ... }
    // Keys are the RAW condition tokens (e.g., "no-swarm", "pokeradar", "slot-2-emerald")
    const DEFAULT_CONDITION_OVERRIDES = {
        'pokeradar': 'Poké Radar',
        'no-pokeradar': 'No Poké Radar',
        'swarm': 'Swarm',
        'no-swarm': 'No swarm',
    };

    function humanizeWords(s) {
        // Replace dashes/underscores, then Capitalize Words
        return String(s)
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, m => m.toUpperCase());
    }

    function formatCondition(cond) {
        if (!cond) return '';
        // If already a composed label (e.g., "Slot2: Ruby, Sapphire"), leave as-is
        if (cond.includes(':')) return cond;

        const overrides = Object.assign({}, DEFAULT_CONDITION_OVERRIDES, (window.DPPT_CONDITION_OVERRIDES || {}));

        // Exact override wins
        if (overrides[cond]) return overrides[cond];

        if (cond.startsWith(SLOT2_PREFIX)) {
            const v = cond.slice(SLOT2_PREFIX.length);
            return `Slot 2: ${titleCaseSlot2(v)}`;
        }

        // Fallback: generic humanization
        return humanizeWords(cond);
    }



    function pickMountNode() { return document.querySelector('#pokemon-dppt-walking .table-collection.walking'); }
    function inferLocationId(mount) { const hinted = mount?.getAttribute('data-location-id'); if (hinted) return hinted; const fname = (location.pathname.split('/').pop() || '').toLowerCase(); const base = fname.replace(/\.html?$/, ''); const FLOOR_GUESSES = { "oreburgh-mine": "oreburgh-mine_1f" }; return FLOOR_GUESSES[base] || base; }
    const byName = (a, b) => a.localeCompare(b);
    function extractWalking(location) { return (location?.pokemon?.encounters || []).filter(b => b?.type === 'walking'); }
    function gamesForEncounter(enc) { return (enc?.games || []).filter(g => GAME_KEYS.has(g)); }
    function labelConditions(conds) {
        const list = (conds || []).map(formatCondition).filter(Boolean);
        return !list.length ? '—' : list.join(', ');
    }

    function normalizeTimeKey(conds) {
        const has = (conds || []).filter(c => TIME_FLAGS.has(c));
        if (has.length === 0) return 'anytime';

        // If all three time flags are present, treat as anytime
        const uniq = Array.from(new Set(has));
        if (uniq.length === TIME_FLAGS.size) return 'anytime';

        return uniq.sort().join('+');
    }

    const isSwarmActive = s => !!s.swarm; const isRadarActive = s => !!s.pokeradar; const slot2Tag = s => `slot-2-${s.slot2}`;
    function encounterOptionMatches(optionConds, s) {
        if (s.showAllConditions) return true;
        const cset = new Set(optionConds || []);
        if (cset.has('swarm') && !isSwarmActive(s)) return false;
        if (cset.has('no-swarm') && isSwarmActive(s)) return false;
        if (cset.has('pokeradar') && !isRadarActive(s)) return false;
        if (cset.has('no-pokeradar') && isRadarActive(s)) return false;
        const dual = [...cset].find(c => c.startsWith(SLOT2_PREFIX));
        if (dual && dual !== slot2Tag(s)) return false;
        return true;
    }
    function formatLevels(levels) {
        const uniq = Array.from(new Set(levels || []));
        // If any token isn't a plain integer (e.g., "20-40"), fall back to simple join
        if (uniq.some(v => !/^\d+$/.test(v))) {
            return uniq.sort((a, b) => a.localeCompare(b)).join(',');
        }
        const nums = uniq.map(v => parseInt(v, 10)).sort((a, b) => a - b);
        // Build consecutive ranges
        const ranges = [];
        let start = null, prev = null;
        for (const n of nums) {
            if (start === null) { start = prev = n; continue; }
            if (n === prev + 1) { prev = n; continue; }
            ranges.push(start === prev ? String(start) : `${start}-${prev}`);
            start = prev = n;
        }
        if (start !== null) {
            ranges.push(start === prev ? String(start) : `${start}-${prev}`);
        }
        return ranges.join(',');
    }


    function buildFullRows(location, s) {
        const map = new Map();

        for (const block of extractWalking(location)) {
            const { rate, slot, encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const conds = processConditions(opt.conditions || []);
                // Canonical grouping key: time (in fixed order) + other conds (alpha), but we already
                // fixed the time order in processConditions, so just join:
                const condKey = conds.join('|');
                const key = `${slot}|${condKey}`;

                if (!map.has(key)) {
                    map.set(key, {
                        key,
                        slot,
                        rate,
                        rawConditions: conds,
                        perGame: Object.fromEntries(GAMES.map(g => [g, { name: null, levels: new Set() }])),
                    });
                }

                const rec = map.get(key);
                for (const g of gamesForEncounter(opt)) {
                    const pg = rec.perGame[g];
                    if (pg.name && pg.name !== opt.name) {
                        pg.name = `${pg.name} / ${opt.name}`;
                    } else if (!pg.name) {
                        pg.name = opt.name;
                    }
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

        return out.sort((a, b) =>
            (a.slot - b.slot) || a.rawConditions.join(',').localeCompare(b.rawConditions.join(','))
        );
    }



    function titleCaseSlot2(v) {
        const map = {
            ruby: 'Ruby', sapphire: 'Sapphire', emerald: 'Emerald',
            firered: 'FireRed', leafgreen: 'LeafGreen', none: 'None'
        };
        return map[v] || (v ? (v[0].toUpperCase() + v.slice(1)) : v);
    }

    function buildCompressedRows(location, s) {
        const FLAGS_RADAR = new Set(['pokeradar', 'no-pokeradar']);
        const FLAGS_SWARM = new Set(['swarm', 'no-swarm']);

        function perGameSignature(perGame) {
            // stable string signature: Diamond:rate|levels;Pearl:...;Platinum:...
            const parts = [];
            for (const g of GAMES) {
                const r = perGame[g]?.rate || 0;
                const lv = (perGame[g]?.levels || []).slice().sort().join(',');
                parts.push(`${g}:${r}|${lv}`);
            }
            return parts.join(';');
        }

        function clonePerGame(perGame) {
            return Object.fromEntries(
                GAMES.map(g => [
                    g,
                    {
                        rate: perGame[g]?.rate || 0,
                        levels: (perGame[g]?.levels || []).slice()
                    }
                ])
            );
        }

        function addIntoPerGame(target, source) {
            for (const g of GAMES) {
                const t = target[g] || (target[g] = { rate: 0, levels: [] });
                const s = source[g] || { rate: 0, levels: [] };
                t.rate += (s.rate || 0);
                // union levels
                const set = new Set([...(t.levels || []), ...(s.levels || [])]);
                t.levels = [...set].sort();
            }
        }

        function arrayWithout(arr, toDropSet) {
            return (arr || []).filter(c => !toDropSet.has(c));
        }

        function noTimeConds(arr) {
            return (arr || []).filter(c => !TIME_FLAGS.has(c));
        }

        function onlyTimeConds(arr) {
            return (arr || []).filter(c => TIME_FLAGS.has(c));
        }

        // Expand "anytime" -> ['morning','day','night']
        function timesFor(row) {
            const t = toTimeOnly(row.nonSlot2Conds || []);
            return t.length ? t : ['morning', 'day', 'night'];
        }

        function perGameRateSignature(perGame) {
            // rates only (ignore levels)
            return GAMES.map(g => String(perGame[g]?.rate || 0)).join('|');
        }

        // ========= Pass 1: species + (non-slot2 conds incl. time) + slot2 variant =========
        const perVariant = new Map();

        for (const block of extractWalking(location)) {
            const { rate, encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const allConds = processConditions(opt.conditions || []); // times first (if any)
                const slot2 = (allConds.find(c => c.startsWith(SLOT2_PREFIX)) || null);
                const slot2Val = slot2 ? slot2.slice(SLOT2_PREFIX.length) : null;

                const nonSlot2Conds = allConds.filter(c => !c.startsWith(SLOT2_PREFIX));
                const nonSlot2Key = nonSlot2Conds.join('|');

                const key = `${opt.name}|${nonSlot2Key}|${slot2Val ?? '__no_slot2__'}`;

                if (!perVariant.has(key)) {
                    perVariant.set(key, {
                        name: opt.name,
                        nonSlot2Conds: new Set(nonSlot2Conds),
                        slot2Val, // may be null
                        perGame: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: new Set() }])),
                        slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                    });
                }

                const rec = perVariant.get(key);
                for (const g of gamesForEncounter(opt)) {
                    rec.perGame[g].rate += (Number(rate) || 0);
                    rec.perGame[g].levels.add(String(opt.level));
                    if (slot2Val) rec.slot2PerGame[g].add(slot2Val);
                }
            }
        }

        // ========= Pass 2: merge slot2 variants with identical per-game signatures =========
        const merged = new Map();
        for (const [, rec] of perVariant) {
            const sigParts = [];
            for (const g of GAMES) {
                const r = rec.perGame[g].rate;
                const lvls = [...rec.perGame[g].levels].sort().join(',');
                sigParts.push(`${g}:${r}|${lvls}`);
            }
            const sig = sigParts.join(';');
            const nonSlot2Key = [...rec.nonSlot2Conds].join('|');
            const groupKey = `${rec.name}|${nonSlot2Key}|${sig}`;

            if (!merged.has(groupKey)) {
                const perGameFinal = Object.fromEntries(
                    GAMES.map(g => [g, { rate: rec.perGame[g].rate, levels: [...rec.perGame[g].levels].sort() }])
                );
                const slot2PerGameFinal = Object.fromEntries(GAMES.map(g => [g, new Set()]));
                merged.set(groupKey, {
                    key: groupKey,
                    name: rec.name,
                    perGame: perGameFinal,
                    nonSlot2Conds: new Set(rec.nonSlot2Conds),
                    slot2PerGame: slot2PerGameFinal,
                });
            }

            const tgt = merged.get(groupKey);
            for (const g of GAMES) {
                for (const v of rec.slot2PerGame[g]) tgt.slot2PerGame[g].add(v);
            }
        }

        // ========= Materialize base rows =========
        let rows = [];
        for (const [, row] of merged) {
            const slot2All = new Set();
            for (const g of GAMES) for (const v of row.slot2PerGame[g]) slot2All.add(v);

            const baseConds = [...row.nonSlot2Conds]; // includes any time tokens if present
            rows.push({
                key: row.key,
                name: row.name,
                perGame: row.perGame,
                nonSlot2Conds: baseConds,
                slot2PerGame: row.slot2PerGame,
                slot2All,
                rawConditions: baseConds,          // used in "show all conditions" mode
                timeConds: toTimeOnly(baseConds),  // used in time-only mode
            });
        }
        // ========= Pass 3: Show-all collapse for Radar / Swarm into "no-flag" (Any) =========
        // If, for a given Pokémon + base conditions (time kept!), the Pokeradar-on and Pokeradar-off
        // outcomes have *identical appearance rates* (levels don't matter) for a game,
        // then fold those rates into the "no-flag" row for that game and drop the flagged rows.
        // Same for Swarm / No-swarm.
        if (s.showAllConditions) {
            function collapsePair(flagA, flagB) {
                const FLAG_SET = new Set([flagA, flagB]);

                // group by species + base (keep time & other conds; just remove the pair flags)
                const byGroup = new Map();
                for (const r of rows) {
                    const baseNoFlag = (r.nonSlot2Conds || []).filter(c => !FLAG_SET.has(c));
                    const key = `${r.name}|${baseNoFlag.join('|')}`;
                    if (!byGroup.has(key)) byGroup.set(key, { name: r.name, baseNoFlag, items: [] });
                    byGroup.get(key).items.push(r);
                }

                const rebuilt = [];

                // helpers (reuse existing ones)
                const makeEmptyPerGame = () =>
                    Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }]));

                const addOneGame = (targetPerGame, sourceRow, g) => {
                    const dst = targetPerGame[g] || (targetPerGame[g] = { rate: 0, levels: [] });
                    const src = (sourceRow?.perGame?.[g]) || { rate: 0, levels: [] };
                    dst.rate += (src.rate || 0);
                    const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
                    dst.levels = [...set].sort();
                };

                const sigRate = (pg, g) => String(pg[g]?.rate || 0);

                for (const [, grp] of byGroup) {
                    const { name, baseNoFlag, items } = grp;

                    // Accumulate rows by which flag they contain (A, B, or none)
                    const acc = {
                        [flagA]: [],
                        [flagB]: [],
                        none: []
                    };

                    for (const r of items) {
                        const flagsIn = (r.nonSlot2Conds || []).filter(c => FLAG_SET.has(c));
                        if (flagsIn.includes(flagA)) acc[flagA].push(r);
                        else if (flagsIn.includes(flagB)) acc[flagB].push(r);
                        else acc.none.push(r);
                    }

                    // Build aggregators per flag (sum rates, union levels/slot2)
                    function fold(rowsList) {
                        const out = {
                            perGame: makeEmptyPerGame(),
                            slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                            timeConds: new Set(),
                        };
                        for (const row of rowsList) {
                            for (const g of GAMES) addOneGame(out.perGame, row, g);
                            for (const t of (row.timeConds || [])) out.timeConds.add(t);
                            for (const g of GAMES) for (const v of (row.slot2PerGame?.[g] || [])) {
                                out.slot2PerGame[g].add(v);
                            }
                        }
                        return out;
                    }

                    const aggA = fold(acc[flagA]);
                    const aggB = fold(acc[flagB]);
                    const aggN = fold(acc.none);

                    // Prepare output candidates
                    const outNone = {
                        name,
                        nonSlot2Conds: baseNoFlag.slice(), // <-- no flag token
                        perGame: makeEmptyPerGame(),
                        slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                        timeConds: new Set(toTimeOnly(baseNoFlag))
                    };
                    const outA = {
                        name,
                        nonSlot2Conds: [...baseNoFlag, flagA],
                        perGame: makeEmptyPerGame(),
                        slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                        timeConds: new Set(toTimeOnly(baseNoFlag))
                    };
                    const outB = {
                        name,
                        nonSlot2Conds: [...baseNoFlag, flagB],
                        perGame: makeEmptyPerGame(),
                        slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                        timeConds: new Set(toTimeOnly(baseNoFlag))
                    };

                    // Per-game redistribution
                    for (const g of GAMES) {
                        const hasA = (aggA.perGame[g].rate || 0) > 0;
                        const hasB = (aggB.perGame[g].rate || 0) > 0;

                        // equal means identical *appearance rates*; levels intentionally ignored
                        const equalAB = hasA && hasB && (sigRate(aggA.perGame, g) === sigRate(aggB.perGame, g));

                        if (equalAB) {
                            // A and B are identical -> treat as "regardless of the toggle"
                            // Add NONE once + ONE COPY of the flag bucket (use A), but still union Slot2/levels from both.
                            addOneGame(outNone.perGame, { perGame: { [g]: aggN.perGame[g] } }, g);
                            addOneGame(outNone.perGame, { perGame: { [g]: aggA.perGame[g] } }, g); // <-- only A, not B

                            // union Slot2 sources from N, A, and B (levels are already unioned by addOneGame)
                            for (const v of aggN.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                            for (const v of aggA.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                            for (const v of aggB.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                        } else {

                            // keep whatever exists in their own rows; none stays in no-flag
                            addOneGame(outNone.perGame, { perGame: { [g]: aggN.perGame[g] } }, g);
                            for (const v of aggN.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);

                            if (hasA) {
                                addOneGame(outA.perGame, { perGame: { [g]: aggA.perGame[g] } }, g);
                                for (const v of aggA.slot2PerGame[g]) outA.slot2PerGame[g].add(v);
                            }
                            if (hasB) {
                                addOneGame(outB.perGame, { perGame: { [g]: aggB.perGame[g] } }, g);
                                for (const v of aggB.slot2PerGame[g]) outB.slot2PerGame[g].add(v);
                            }
                        }
                    }

                    // Emit rows that actually have any data
                    function pushIfAny(r) {
                        const total = GAMES.reduce((s, g) => s + (r.perGame[g]?.rate || 0), 0);
                        if (total > 0) {
                            rebuilt.push({
                                key: `${r.name}|${r.nonSlot2Conds.join('|')}|showall-collapse`,
                                name: r.name,
                                perGame: r.perGame,
                                nonSlot2Conds: r.nonSlot2Conds.slice(),
                                slot2PerGame: r.slot2PerGame,
                                slot2All: (function () {
                                    const u = new Set();
                                    for (const g of GAMES) for (const v of (r.slot2PerGame?.[g] || [])) u.add(v);
                                    return u;
                                })(),
                                rawConditions: r.nonSlot2Conds.slice(),
                                timeConds: [...r.timeConds].sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b)),
                            });
                        }
                    }

                    pushIfAny(outNone);
                    pushIfAny(outA);
                    pushIfAny(outB);
                }

                rows = rebuilt;
            }

            // Apply for both pairs
            collapsePair('pokeradar', 'no-pokeradar');
            collapsePair('swarm', 'no-swarm');
        }

        // ========= Pass 4: TIME harmonisation (Show-all) =========
        // Combine times when the encounter RATES match (levels may differ).
        // Works for both Combined ("All") and single-game views.
        {
            // Group rows by species + base conditions WITHOUT times (keep other conditions intact)
            const groups = new Map();
            for (const r of rows) {
                const baseNoTime = noTimeConds(r.nonSlot2Conds);
                const key = `${r.name}|${baseNoTime.join('|')}`;
                if (!groups.has(key)) groups.set(key, { baseNoTime, name: r.name, items: [] });
                groups.get(key).items.push(r);
            }

            const rebuilt = [];

            for (const [, grp] of groups) {
                const { baseNoTime, name, items } = grp;

                // quick check: if none of the items has an explicit time, keep as-is
                const hasExplicitTime = items.some(r => onlyTimeConds(r.nonSlot2Conds).length > 0);
                if (!hasExplicitTime) {
                    rebuilt.push(...items);
                    continue;
                }

                // Build per-time, distributing "anytime" to all three; union levels as we add.
                const perTime = {
                    morning: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                    day: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                    night: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                };

                for (const r of items) {
                    const times = toTimeOnly(r.nonSlot2Conds).length
                        ? toTimeOnly(r.nonSlot2Conds)
                        : ['morning', 'day', 'night'];
                    for (const t of times) addIntoPerGame(perTime[t], r.perGame);
                }

                // Choose signature rule: All -> all games' rates; single game -> that game's rate only.
                const makeSig = (t) => {
                    if (s.game === 'All') {
                        return perGameRateSignature(perTime[t]); // rates only
                    } else {
                        const g = s.game;
                        return String(perTime[t][g]?.rate || 0); // single-game rate only
                    }
                };

                // Group time bins by signature (rates only), then emit one row per group,
                // unioning the LEVELS we already accumulated in perTime.
                const sigToTimes = new Map(); // sig -> [times]
                for (const t of ['morning', 'day', 'night']) {
                    const sig = makeSig(t);
                    if (!sigToTimes.has(sig)) sigToTimes.set(sig, []);
                    sigToTimes.get(sig).push(t);
                }

                for (const [sig, times] of sigToTimes) {
                    // Rates are identical across these times by construction; take from the first
                    const first = times[0];

                    // Build perGame where rate = first bin's rate, levels = union across all bins in this group
                    const combinedPerGame = Object.fromEntries(
                        GAMES.map(g => {
                            const rate = perTime[first][g]?.rate || 0;
                            const lvlUnion = new Set();
                            for (const t of times) {
                                const lvls = perTime[t][g]?.levels || [];
                                for (const lv of lvls) lvlUnion.add(lv);
                            }
                            return [g, { rate, levels: [...lvlUnion].sort() }];
                        })
                    );

                    // Skip all-zero rows
                    const total = GAMES.reduce((acc, g) => acc + (combinedPerGame[g]?.rate || 0), 0);
                    if (total === 0) continue;

                    const timePart = times.slice().sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
                    const nonSlot2Conds = [...baseNoTime, ...timePart];

                    rebuilt.push({
                        key: `${name}|${nonSlot2Conds.join('|')}|${sig}|times`,
                        name,
                        perGame: combinedPerGame,
                        nonSlot2Conds,
                        rawConditions: nonSlot2Conds,
                        timeConds: timePart,
                        slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                        slot2All: new Set(),
                    });
                }


                // Slot2 union for each rebuilt row from contributing items (Combined behaviour)
                for (const row of rebuilt.slice(-sigToTimes.size)) {
                    for (const it of items) {
                        for (const g of GAMES) for (const v of (it.slot2PerGame?.[g] || [])) {
                            row.slot2PerGame[g].add(v);
                            row.slot2All.add(v);
                        }
                    }
                }
            }

            rows = rebuilt;
        }


        // ========= Finish: stable order by species then by conditions =========
        rows.sort((a, b) => {
            const n = byName(a.name, b.name);
            if (n !== 0) return n;
            return a.nonSlot2Conds.join('|').localeCompare(b.nonSlot2Conds.join('|'));
        });

        return rows;
    }

    function buildCompressedRowsFiltered(location, s) {
        // Build raw rows grouped by Pokémon + time-of-day only
        const map = new Map();

        for (const block of extractWalking(location)) {
            const { rate, encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const all = processConditions(opt.conditions || []);
                const times = toTimeOnly(all);
                const timeKey = times.join('+') || 'anytime';
                const key = `${opt.name}|${timeKey}`;

                if (!map.has(key)) {
                    map.set(key, {
                        name: opt.name,
                        timeConds: times.slice(),
                        perGame: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: new Set() }]))
                    });
                }

                const rec = map.get(key);
                for (const g of gamesForEncounter(opt)) {
                    rec.perGame[g].rate += (Number(rate) || 0);
                    rec.perGame[g].levels.add(String(opt.level));
                }
            }
        }

        // Materialize prelim rows with arrays for levels
        const prelim = [];
        for (const [, rec] of map) {
            prelim.push({
                name: rec.name,
                timeConds: rec.timeConds,
                perGame: Object.fromEntries(
                    GAMES.map(g => [g, {
                        rate: rec.perGame[g].rate,
                        levels: [...rec.perGame[g].levels].sort()
                    }])
                ),
            });
        }

        // ---- Time harmonisation & redundancy merge PER POKÉMON ----
        const byMon = new Map();
        for (const r of prelim) {
            if (!byMon.has(r.name)) byMon.set(r.name, []);
            byMon.get(r.name).push(r);
        }

        const addIntoPerGameUnionLevels = (target, source) => {
            for (const g of GAMES) {
                const t = target[g] || (target[g] = { rate: 0, levels: [] });
                const s = source[g] || { rate: 0, levels: [] };
                t.rate += (s.rate || 0);
                const set = new Set([...(t.levels || []), ...(s.levels || [])]);
                t.levels = [...set].sort();
            }
        };

        const rebuiltAll = [];

        for (const [, rows] of byMon) {
            // Build explicit M/D/N bins by distributing "anytime" over all 3
            const perTime = {
                morning: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                day: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                night: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
            };

            for (const r of rows) {
                const times = (r.timeConds && r.timeConds.length) ? r.timeConds : ['morning', 'day', 'night'];
                for (const t of times) addIntoPerGameUnionLevels(perTime[t], r.perGame);
            }

            // Keep time bins that have ANY data (any game non-zero rate or levels)
            const nonEmptyTimes = ['morning', 'day', 'night'].filter(t =>
                GAMES.some(g => (perTime[t][g]?.rate || 0) > 0 || (perTime[t][g]?.levels || []).length > 0)
            );

            // Signature helpers (ignore levels)
            const sigForGame = (pg, g) => String(pg[g]?.rate || 0);

            // For "All": merge time bins when their per-game RATE tuples match.
            // (No @time scoping here; if Morning and Night have the same rates across games,
            // they'll combine. Rows with all-zero rates are filtered out earlier.)
            const sigForAllByRates = (pg) =>
                GAMES.map(g => String(pg[g]?.rate || 0)).join('|');

            // Choose signature rule based on the View selector
            const signature = (pg /*, timeKey */) =>
                (s.game && s.game !== 'All')
                    ? sigForGame(pg, s.game)      // single game: unchanged
                    : sigForAllByRates(pg);       // All games: group purely by rates



            // Group times whose signatures match; union levels while merging
            const sigMap = new Map(); // sig -> { times: [], perGame }
            for (const t of nonEmptyTimes) {
                const sig = signature(perTime[t]);
                if (!sigMap.has(sig)) {
                    const clone = Object.fromEntries(GAMES.map(g => [
                        g, { rate: perTime[t][g].rate, levels: perTime[t][g].levels.slice() }
                    ]));
                    sigMap.set(sig, { times: [t], perGame: clone });
                } else {
                    const acc = sigMap.get(sig);
                    acc.times.push(t);
                    // keep same rates (signature-equal), union levels
                    const merged = Object.fromEntries(GAMES.map(g => [
                        g, {
                            rate: acc.perGame[g].rate,
                            levels: [...new Set([...acc.perGame[g].levels, ...perTime[t][g].levels])].sort()
                        }
                    ]));
                    acc.perGame = merged;
                }
            }

            // Emit rows (use "—" when all three times are covered)
            for (const { times, perGame } of sigMap.values()) {
                const timePart = times.slice().sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
                const isAllThree = timePart.length === 3;
                const timeTokensForRow = isAllThree ? [] : timePart;

                rebuiltAll.push({
                    name: rows[0].name,
                    timeConds: timeTokensForRow.slice(),
                    nonSlot2Conds: timeTokensForRow.slice(),
                    rawConditions: isAllThree ? [] : timePart.map(formatCondition),
                    perGame
                });
            }
        }

        // Sort final rows
        return rebuiltAll.sort((a, b) => {
            const n = byName(a.name, b.name);
            if (n !== 0) return n;
            return (a.timeConds.join(',')).localeCompare(b.timeConds.join(','));
        });
    }



    // selection present helpers
    const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 6px', background: '#fafafa', position: 'sticky', top: 0 };
    const td = { borderBottom: '1px solid #eee', padding: '8px 6px' };
    const tdMono = Object.assign({}, td, { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' });

    function Toggle(props) {
        return h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12, userSelect: 'none' } },
            h('input', { type: 'checkbox', checked: props.checked, onChange: e => props.onChange(e.target.checked) }), h('span', null, props.label));
    }
    function Select(props) {
        return h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12 } },
            h('span', null, props.label),
            h('select', { value: props.value, onChange: e => props.onChange(e.target.value) }, props.options.map(o => h('option', { key: o.value, value: o.value }, o.label))));
    }
    function HelpTag(props) { return h('span', { title: 'Mutually exclusive with other time-of-day variants', style: { fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 8, marginLeft: 6 } }, props.children); }
    function ConditionsCell(props) { return h('span', null, labelConditions(props.conds)); }

    // Order of generations to try when falling back.
    // Override via:
    //   - <div data-sprite-gens="gen-4,gen-3,gen-2,gen-1">
    //   - or window.POKEMON_SPRITE_GENS = ["gen-4","gen-3","gen-2","gen-1"];
    const DEFAULT_GEN_ORDER = ["gen-4", "gen-3", "gen-2", "gen-1"];

    // Cache the first successful URL per normalized name to avoid repeated 404s.
    const SPRITE_URL_CACHE = new Map(); // key: normalized name -> url string

    function normalizedName(name) {
        return String(name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Figure out the root(s) to try. We’ll build one base per generation.
    function spriteBaseDirs(mount) {
        const gensAttr = mount?.getAttribute('data-sprite-gens');
        const gens =
            (gensAttr ? gensAttr.split(',').map(s => s.trim()).filter(Boolean)
                : (window.POKEMON_SPRITE_GENS || DEFAULT_GEN_ORDER));

        // If a base was provided, try to detect whether it already ends with /gen-x/
        // and, if so, replace that segment for other gens.
        const explicit = mount?.getAttribute('data-sprite-base') || window.POKEMON_SPRITE_BASE || "../../Resources/images/home-renders/";
        const endsWithGen = /\/gen-\d+\/?$/.test(explicit);

        const ensureSlash = s => (s.endsWith('/') ? s : s + '/');

        if (endsWithGen) {
            const root = explicit.replace(/\/gen-\d+\/?$/, '/');
            return gens.map(g => ensureSlash(root) + g + '/');
        } else {
            const root = ensureSlash(explicit);
            return gens.map(g => root + g + '/');
        }
    }

    // name-f.png → name-m.png → name.png, across each gen in order.
    function spriteCandidates(name, mount) {
        const nm = normalizedName(name);
        const bases = spriteBaseDirs(mount);
        const files = [`${nm}-f.png`, `${nm}-m.png`, `${nm}.png`];
        const out = [];
        for (const base of bases) {
            for (const f of files) out.push(base + f);
        }
        return out;
    }

    function Sprite(props) {
        const ReactRef = React;
        const useState = ReactRef.useState, useMemo = ReactRef.useMemo, useEffect = ReactRef.useEffect;
        const nm = normalizedName(props.name);
        var hardcodedOverride = "";

        //hardcoded bleh
        const hardcodedListLookup = [
            { name: 'shellos', path: "../../Resources/images/home-renders/gen-4/shellos-east.png" },
            { name: 'gastrodon', path: "../../Resources/images/home-renders/gen-4/gastrodon-east.png" },
        ];
        if (hardcodedListLookup.some(e => e.name === nm)) {
            hardcodedOverride = hardcodedListLookup.find(e => e.name === nm).path;
        }
        if (hardcodedOverride !== "") {
            return h('img', {
                src: hardcodedOverride,
                alt: props.name,
                loading: 'lazy',
                className: 'flex-img'
            });
        }

        const candidates = useMemo(() => {
            // If we already know a working URL, put it first to avoid hopping.
            const list = spriteCandidates(props.name, props.mount);
            const cached = SPRITE_URL_CACHE.get(nm);
            if (cached) {
                const idx = list.indexOf(cached);
                if (idx > 0) {
                    // Move cached URL to the front.
                    const arr = [cached, ...list.slice(0, idx), ...list.slice(idx + 1)];
                    return arr;
                }
            }
            return list;
        }, [props.name, props.mount]);

        const [idx, setIdx] = useState(0);
        const src = candidates[idx] || '';

        // If props.name changes, reset to the first candidate.
        useEffect(() => { setIdx(0); }, [props.name]);

        return h('img', {
            src,
            alt: props.name,
            loading: 'lazy',
            className: 'flex-img',
            onLoad: () => {
                if (src) SPRITE_URL_CACHE.set(nm, src);
            },
            onError: () => {
                // Try the next candidate (if any). If none left, blank out src.
                setIdx(i => (i + 1 < candidates.length ? i + 1 : i));
                if (idx + 1 >= candidates.length) {
                    // Final fallback: no sprite found—let opacity drop via style.
                }
            }
        });
    }


    function ViewControls(props) {
        const state = props.state;
        const set = p => props.setState(prev => Object.assign({}, prev, p));

        return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '8px 0 12px' } },
            h(Select, {
                label: 'Game',
                value: state.game,
                onChange: v => set({ game: v }),
                options: [
                    { value: 'All', label: 'All' },
                    { value: 'separate', label: 'Separate' },
                    ...GAMES.map(g => ({ value: g, label: g }))
                ]
            }),
            h(Select, {
                label: 'View',
                value: state.view,
                onChange: v => set({ view: v }),
                options: [{ value: 'full', label: 'Full (slots)' }, { value: 'compressed', label: 'Compressed' }]
            }),
            h(Toggle, {
                label: 'Show all conditions',
                checked: state.showAllConditions,
                onChange: v => set({ showAllConditions: v })
            }),
            !state.showAllConditions && h(Toggle, {
                label: 'Swarm active',
                checked: state.swarm,
                onChange: v => set({ swarm: v })
            }),
            !state.showAllConditions && h(Toggle, {
                label: 'Poké Radar active',
                checked: state.pokeradar,
                onChange: v => set({ pokeradar: v })
            }),
            !state.showAllConditions && h(Select, {
                label: 'GBA dual-slot',
                value: state.slot2,
                onChange: v => set({ slot2: v }),
                options: [
                    { value: 'none', label: 'None' },
                    { value: 'ruby', label: 'Ruby' },
                    { value: 'sapphire', label: 'Sapphire' },
                    { value: 'emerald', label: 'Emerald' },
                    { value: 'firered', label: 'FireRed' },
                    { value: 'leafgreen', label: 'LeafGreen' }
                ]
            })
        );
    }


    // helper: load a JS file and wait for it
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load ' + src));
            document.head.appendChild(s);
        });
    }
    const ALL_SLOT2_VALS = ['none', 'ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'];

    function makeCondKey(name, baseConds, slot2Label) {
        return `${name}|${(baseConds || []).join('|')}|${slot2Label || ''}`;
    }

    function prettySlot2List(values) {
        return `Slot2: ${values.slice().sort((a, b) => a.localeCompare(b)).map(titleCaseSlot2).join(', ')}`;
    }

    function Table(props) {
        const onlyTimeMode = !!props.onlyTimeMode;

        const rows = props.rows;
        const gameFilter = props.gameFilter;
        const mount = props.mount;
        const view = props.view;
        const showGames = gameFilter === 'All' ? GAMES : [gameFilter];

        const viewLabel = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = (gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`;

        // Existing filter for single-game tables (keeps only rows with data for that game)
        const renderRows = (gameFilter && gameFilter !== 'All')
            ? rows.filter(r => {
                const g = gameFilter;
                const cell = r.perGame?.[g];
                return view === 'full'
                    ? !!(cell && cell.name)
                    : !!(cell && ((cell.rate || 0) > 0 || (cell.levels && cell.levels.length)));
            })
            : rows;

        // --- Single-game + COMPRESSED: collapse Slot2 variants correctly
        let processedRows = renderRows;
        if (view === 'compressed' && gameFilter && gameFilter !== 'All') {
            const g = gameFilter;

            // group1: by (name + base non-slot2 conditions)
            const group1 = new Map(); // baseKey -> Map(signature -> accumulator)

            for (const r of renderRows) {
                const cell = r.perGame?.[g];
                if (!cell) continue;

                const baseConds = (r.nonSlot2Conds || r.rawConditions || []).slice();
                const baseKey = `${r.name}|${baseConds.join('|')}`;

                // per-row slot2 variants for this game (from builder)
                const perGameSet = r.slot2PerGame?.[g] || new Set();
                const slot2Vals = Array.isArray(perGameSet) ? perGameSet : [...perGameSet];

                // signature = identical outcome for this game
                const sig = `${cell.rate}|${(cell.levels || []).slice().sort().join(',')}`;

                if (!group1.has(baseKey)) group1.set(baseKey, new Map());
                const bySig = group1.get(baseKey);
                if (!bySig.has(sig)) {
                    bySig.set(sig, {
                        name: r.name,
                        baseConds,
                        rate: cell.rate || 0,
                        levels: new Set(cell.levels || []),
                        slot2Union: new Set(),
                    });
                }
                const acc = bySig.get(sig);
                // (rate/levels are identical for this sig; do NOT add rate)
                for (const lv of (cell.levels || [])) acc.levels.add(lv);
                for (const v of slot2Vals) acc.slot2Union.add(v);
            }

            // materialize rows
            const out = [];
            for (const [, bySig] of group1) {
                for (const [, acc] of bySig) {
                    const union = [...acc.slot2Union].sort((a, b) => a.localeCompare(b));
                    const coversAll = ALL_SLOT2_VALS.every(v => acc.slot2Union.has(v));
                    const slot2Label = (union.length > 0 && !coversAll)
                        ? `Slot2: ${union.map(titleCaseSlot2).join(', ')}`
                        : '';

                    const lvArr = [...acc.levels].sort();
                    out.push({
                        key: `${acc.name}|${acc.baseConds.join('|')}|${acc.rate}|${lvArr.join(',')}|${slot2Label}`,
                        name: acc.name,
                        perGame: { [g]: { rate: acc.rate, levels: lvArr } },
                        rawConditions: slot2Label ? [...acc.baseConds, slot2Label] : acc.baseConds,
                        nonSlot2Conds: acc.baseConds,
                        timeConds: toTimeOnly(acc.baseConds)
                    });
                }
            }

            const merged = new Map(); // condKey -> accumulator
            for (const row of out) {
                const condKey = `${row.name}|${(row.rawConditions || []).join('|')}`;
                if (!merged.has(condKey)) {
                    merged.set(condKey, {
                        name: row.name,
                        rawConditions: row.rawConditions.slice(),
                        levels: new Set(row.perGame[g].levels || []),
                        rate: 0,
                    });
                }
                const acc = merged.get(condKey);
                acc.rate += row.perGame[g].rate || 0;
                for (const lv of (row.perGame[g].levels || [])) acc.levels.add(lv);
            }

            processedRows = Array.from(merged.values())
                .map(m => {
                    const levels = [...m.levels].sort();
                    const rawConds = m.rawConditions;
                    const baseOnly = (m.nonSlot2Conds && m.nonSlot2Conds.length)
                        ? m.nonSlot2Conds.slice()
                        : rawConds.filter(c => !/^Slot2:/.test(c));
                    return {
                        key: `${m.name}|${rawConds.join('|')}|${m.rate}|${levels.join(',')}`,
                        name: m.name,
                        perGame: { [g]: { rate: m.rate, levels } },
                        rawConditions: rawConds,
                        nonSlot2Conds: baseOnly,
                        // Prefer original tokens if present (from buildCompressedRowsFiltered),
                        // otherwise safely derive from baseOnly tokens.
                        timeConds: (m.timeConds && m.timeConds.length)
                            ? m.timeConds.slice()
                            : toTimeOnly(baseOnly),
                    };
                })
                .sort((a, b) => byName(a.name, b.name));
        }

        // ---- Stripe map by Pokémon block (works for both views)
        const rowStripeTrue = new Map();
        let blockByStart = null;

        if (view === 'compressed') {
            // contiguous blocks by r.name (already guaranteed in compressed)
            const blocks = [];
            let i = 0, blockIdx = 0;
            while (i < processedRows.length) {
                const name = processedRows[i].name;
                let j = i + 1;
                while (j < processedRows.length && processedRows[j].name === name) j++;
                const stripeTrue = (blockIdx % 2) === 1; // first block = false
                for (let k = i; k < j; k++) rowStripeTrue.set(k, stripeTrue);
                blocks.push({ name, start: i, count: j - i });
                i = j; blockIdx++;
            }
            blockByStart = new Map(blocks.map(b => [b.start, b]));
        } else {
            // FULL view: group contiguous rows by the first non-empty species name among the shown games
            const rowKeyFull = (r) => {
                for (const g of showGames) {
                    const nm = r.perGame?.[g]?.name;
                    if (nm) return nm;
                }
                return '__none__'; // NA-only row; still stripes consistently
            };
            let i = 0, blockIdx = 0;
            while (i < processedRows.length) {
                const key = rowKeyFull(processedRows[i]);
                let j = i + 1;
                while (j < processedRows.length && rowKeyFull(processedRows[j]) === key) j++;
                const stripeTrue = (blockIdx % 2) === 1;
                for (let k = i; k < j; k++) rowStripeTrue.set(k, stripeTrue);
                i = j; blockIdx++;
            }
        }

        // helper to get zebra class by Pokémon block parity
        function zebraByBlock(prefix, rowIndex) {
            const isTrue = !!rowStripeTrue.get(rowIndex);
            return prefix
                ? `${prefix}-${isTrue ? 'true' : 'false'}`
                : `light-${isTrue ? 'true' : 'false'}`;
        }

        function FullHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { className: headerClass(null) }, 'Slot'),
                    h('th', { className: headerClass(null) }, 'Rate'),
                    h('th', { className: headerClass(null) }, 'Conditions'),
                    ...showGames.map(g => h('th', { key: g, colSpan: 3, className: headerClass(g) }, g))
                )
            );
        }

        function CompressedHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { colSpan: 2, className: headerClass(null) }, 'Pokémon'),
                    ...showGames.map(g => h('th', { key: g, colSpan: 2, className: headerClass(g) }, g)),
                    h('th', { className: headerClass(null) }, 'Conditions')
                )
            );
        }

        return h('div', { style: { overflowX: 'auto' } },
            h('table', { className: `pokemon-table ${view === 'compressed' ? 'compressed' : 'full'} combined` },
                h('caption', { className: 'pokemon-table-caption' }, tableLabel),
                view === 'compressed' ? CompressedHeader() : FullHeader(),
                h('tbody', null,
                    processedRows.map((r, rowIndex) => h('tr', { key: r.key },
                        ...(view === 'full'
                            ? [
                                h('td', { className: zebraByBlock('light', rowIndex) }, String(r.slot)),
                                h('td', { className: zebraByBlock('light', rowIndex) }, `${r.rate}%`),
                                h('td', { className: zebraByBlock('light', rowIndex) }, [
                                    h(ConditionsCell, { conds: r.rawConditions })
                                ]),

                                ...showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const cell = r.perGame?.[g];
                                    const has = !!(cell && cell.name);
                                    const lv = has ? formatLevels(cell.levels) : '';
                                    return [
                                        h('td', { key: g + ':sprite', className: zebraByBlock(gp, rowIndex) },
                                            has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'
                                        ),
                                        h('td', { key: g + ':name', className: zebraByBlock(gp, rowIndex) },
                                            has ? cell.name : '—'
                                        ),
                                        h('td', { key: g + ':lv', className: zebraByBlock(gp, rowIndex) },
                                            has ? (`lv. ${lv}` || '—') : '—'
                                        ),
                                    ];
                                }),
                            ]
                            : [
                                // COMPRESSED
                                (function () {
                                    const block = blockByStart.get(rowIndex);
                                    return block
                                        ? h(React.Fragment, null,
                                            h('td', { rowSpan: block.count, className: zebraByBlock('light', rowIndex) },
                                                h(Sprite, { name: r.name, mount })
                                            ),
                                            h('td', { rowSpan: block.count, className: zebraByBlock('light', rowIndex) }, r.name)
                                        )
                                        : null;
                                })(),
                                ...showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const cell = r.perGame?.[g];
                                    const pct = cell?.rate || 0;
                                    const lvStr = (cell && cell.levels && cell.levels.length) ? formatLevels(cell.levels) : '';
                                    const hasData = !!pct || !!lvStr;
                                    return [
                                        h('td', {
                                            key: g + ':pct',
                                            colSpan: hasData ? 1 : 2,
                                            className: hasData ? zebraByBlock(gp, rowIndex) : zebraByBlock(null, rowIndex)
                                        }, hasData ? (pct ? `${pct}%` : '—') : 'N/A'),
                                        hasData
                                            ? h('td', { key: g + ':lv', className: zebraByBlock(gp, rowIndex) }, (`lv. ${lvStr}` || '—'))
                                            : null,
                                    ];
                                }),
                                h('td', { className: zebraByBlock('light', rowIndex) }, (function () {
                                    if (onlyTimeMode) {
                                        return h(ConditionsCell, { conds: r.timeConds || [] });
                                    }

                                    // For single-game processed rows, r.rawConditions is already correct.
                                    if (gameFilter && gameFilter !== 'All') {
                                        return h(ConditionsCell, { conds: r.rawConditions || [] });
                                    }

                                    // Combined/All: base + union of Slot2 across games
                                    const base = (r.nonSlot2Conds || []).slice();
                                    const parts = base.map(formatCondition);
                                    const slot2Set = r.slot2All;
                                    if (slot2Set && slot2Set.size > 0) {
                                        const slot2List = [...slot2Set]
                                            .sort((a, b) => a.localeCompare(b))
                                            .map(titleCaseSlot2)
                                            .join(', ');
                                        parts.push(`Slot2: ${slot2List}`);
                                    }
                                    return h(ConditionsCell, { conds: parts });
                                })()),
                            ]
                        )
                    ))
                )
            )
        );
    }





    function App(props) {
        const mount = props.mount;
        const useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo;

        const [error, setError] = useState(null);
        const [loading, setLoading] = useState(true);
        const [data, setData] = useState([]);
        const [state, setState] = useState({
            view: 'full',
            game: 'All',
            swarm: false,
            pokeradar: false,
            slot2: 'none',
            showAllConditions: true,
            collapsed: false,
        });

        // 1) Which location file to load
        const locationId = inferLocationId(mount);

        // 2) Pick active location from loaded data
        const activeLocation = useMemo(() => {
            return data.find(loc =>
                (loc && (loc.name || '').toLowerCase() === String(locationId).toLowerCase())
            ) || null;
        }, [data, locationId]);

        // 3) Build rows (after activeLocation exists)
        const rows = useMemo(() => {
            if (!activeLocation) return [];
            if (state.view === 'full') return buildFullRows(activeLocation, state);
            return state.showAllConditions
                ? buildCompressedRows(activeLocation, state)
                : buildCompressedRowsFiltered(activeLocation, state);
        }, [activeLocation, state]);

        // Load the location file
        useEffect(() => {
            let alive = true;
            (async () => {
                try {
                    const locId = inferLocationId(mount);
                    const LOC_BASE = window.DPPT_LOCATION_BASE || '../javascript/Sinnoh-Locations/';
                    await loadScript(`${LOC_BASE}${locId}.js`);
                    if (!window.DPPT_DATA) throw new Error('DPPT_DATA not found after script load');
                    if (alive) setData([window.DPPT_DATA]);
                    delete window.DPPT_DATA;
                } catch (e) {
                    console.error(e);
                    if (alive) setError(String((e && e.message) || e));
                } finally {
                    if (alive) setLoading(false);
                }
            })();
            return () => { alive = false; };
        }, []);

        return h('div', {},
            h('div', {},
                h(ViewControls, { state, setState }),
                loading ? h('p', null, 'Loading…')
                    : error ? h('p', { style: { color: 'red' } }, 'Error: ', error)
                        : !activeLocation ? h('p', null, 'No matching location for ', h('code', null, String(locationId)), '.')
                            : (
                                state.game === 'separate'
                                    ? h('div', {},
                                        GAMES.map(g =>
                                            h('div', { key: g, style: { marginTop: 12 } }, [
                                                h(Table, {
                                                    rows,
                                                    gameFilter: g,
                                                    mount,
                                                    view: state.view,
                                                    onlyTimeMode: !state.showAllConditions,
                                                })
                                            ])
                                        )
                                    )
                                    : h(Table, {
                                        rows,
                                        gameFilter: state.game,
                                        mount,
                                        view: state.view,
                                        onlyTimeMode: !state.showAllConditions
                                    })
                            )
            )
        );
    }


    (function boot() {
        // Support both the new class and (optionally) the old id for backwards compat
        const SELECTOR = '.pokemon-dppt-walking-replace-me';

        // Run once now (or on DOM ready), and again whenever new nodes are added
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            mountAll();
        } else {
            document.addEventListener('DOMContentLoaded', mountAll, { once: true });
        }

        const obs = new MutationObserver(() => mountAll());
        obs.observe(document.documentElement, { childList: true, subtree: true });

        function mountAll() {
            const nodes = document.querySelectorAll(SELECTOR);
            nodes.forEach(n => {
                // Skip nodes we already processed
                if (n.__dpptMounted) return;
                n.__dpptMounted = true;
                mountReact(n);
            });
        }

        function mountReact(originalNode) {
            // Create a brand-new container that will replace the original DIV
            const container = document.createElement('div');

            // Preserve per-table data- attributes your app reads
            const copyAttrs = ['data-location-id', 'data-sprite-base', 'data-sprite-gens'];
            for (const a of copyAttrs) {
                const v = originalNode.getAttribute(a);
                if (v != null) container.setAttribute(a, v);
            }

            // Fully replace the original node in the DOM
            originalNode.replaceWith(container);

            // Mount React into the new container; pass it as `mount`
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(App, { mount: container }));
        }
    })();
})();

