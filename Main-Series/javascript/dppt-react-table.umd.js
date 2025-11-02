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
    SHELLOS = "";

    const SLOT2_ORDER = [
        'slot-2-ruby',
        'slot-2-sapphire',
        'slot-2-emerald',
        'slot-2-firered',
        'slot-2-leafgreen',
        'slot-2-none'
    ];
    const SLOT2_RANK = Object.fromEntries(SLOT2_ORDER.map((k, i) => [k, i]));

    // Bare-value order for display (no prefix)
    const SLOT2_ORDER_RAW = ['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen', 'none'];
    const SLOT2_RANK_RAW = Object.fromEntries(SLOT2_ORDER_RAW.map((k, i) => [k, i]));

    // Normalize and sort any slot2 value list to the display order above
    function sortSlot2ValuesForDisplay(values) {
        const norm = (v) => String(v).toLowerCase().replace(/^slot-2-/, '');
        return [...new Set(values.map(norm))]
            .sort((a, b) => (SLOT2_RANK_RAW[a] ?? 999) - (SLOT2_RANK_RAW[b] ?? 999));
    }



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

    // Map games → bit positions for availability mask
    const GAME_BIT = { Diamond: 0, Pearl: 1, Platinum: 2 };

    function bitCount3(mask) {
        return ((mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1));
    }

    function bucketRowsByName(rows) {
        const m = new Map();
        for (const r of rows) {
            if (!m.has(r.name)) m.set(r.name, []);
            m.get(r.name).push(r);
        }
        return m;
    }

    // Order species keys using the same comparator
    function orderSpeciesNames(buckets, showGames) {
        const rows = Array.from(buckets.values()).flat();
        const meta = buildCompressedOrderingMeta(rows, showGames);

        // Sort species by the comparator that uses meta
        return Array.from(buckets.keys()).sort((na, nb) => {
            return compressedSpeciesCompare({ name: na }, { name: nb }, meta);
        });
    }

    // Rank within same-size availability groups:
    //  - For 2-game: DP (rank 0) < DPl (1) < PPl (2)
    //  - For 1-game: D (0) < P (1) < Pl (2)
    function availabilityComboRank(mask) {
        switch (mask) {
            case 0b011: return 0; // Diamond + Pearl
            case 0b101: return 1; // Diamond + Platinum
            case 0b110: return 2; // Pearl + Platinum
            case 0b001: return 0; // Diamond only
            case 0b010: return 1; // Pearl only
            case 0b100: return 2; // Platinum only
            default: return 3;
        }
    }

    // Build species-level ordering metadata from the rows that will be rendered
    function buildCompressedOrderingMeta(rows, showGames) {
        const meta = new Map();

        for (const r of rows) {
            const name = r.name;
            let m = meta.get(name);
            if (!m) { m = { mask: 0, totalPct: 0 }; meta.set(name, m); }

            for (const g of showGames) {
                const cell = r.perGame?.[g];
                const pct = cell?.rate || 0;
                const hasLevels = !!(cell && cell.levels && cell.levels.length);
                const hasData = (pct > 0) || hasLevels;

                if (hasData) m.mask |= (1 << GAME_BIT[g]);
                m.totalPct += pct;
            }
        }

        // finalize derived fields
        for (const info of meta.values()) {
            info.count = bitCount3(info.mask);
            info.rank = availabilityComboRank(info.mask);
        }
        return meta;
    }

    // Comparator using the meta
    function compressedSpeciesCompare(a, b, meta) {
        const A = meta.get(a.name) || { count: 0, rank: 3, totalPct: 0 };
        const B = meta.get(b.name) || { count: 0, rank: 3, totalPct: 0 };

        // 1) More games available first
        if (A.count !== B.count) return B.count - A.count;

        // 2–3) Within same-size groups, prefer DP over D+Pl over P+Pl (for 2),
        //      and D > P > Pl (for 1)
        if (A.count === 2 || A.count === 1) {
            if (A.rank !== B.rank) return A.rank - B.rank;
        }

        // 4) Higher combined % next
        if (A.totalPct !== B.totalPct) return B.totalPct - A.totalPct;

        // default: alphabetical by name
        return a.name.localeCompare(b.name);
    }

    function fullRowSortTuple(rec) {
        const conds = rec.rawConditions || [];

        // Slot-2 rank (lower is earlier); rows without Slot-2 go to the end of the slot group
        const s2 = conds.find(c => c.startsWith(SLOT2_PREFIX));
        const s2rank = (s2 && (SLOT2_RANK[s2] ?? 999)) ?? 999;

        // Keep your requested priorities: Swarm first, then No Swarm, then none
        const swarmW = conds.includes('swarm') ? 0 : (conds.includes('no-swarm') ? 1 : 2);

        // Poké Radar first, then No Poké Radar, then none
        const radarW = conds.includes('pokeradar') ? 0 : (conds.includes('no-pokeradar') ? 1 : 2);

        // Fallback tiebreaker to keep things stable
        const tail = conds.join('|');

        return [s2rank, swarmW, radarW, tail];
    }

    function stripFullTimeTriplet(conds) {
        const arr = Array.isArray(conds) ? conds.slice() : [];
        const isTime = (t) => {
            const v = String(t).trim().toLowerCase();
            return v === 'morning' || v === 'day' || v === 'night';
        };
        let hasM = false, hasD = false, hasN = false;
        for (const t of arr) {
            const v = String(t).trim().toLowerCase();
            if (v === 'morning') hasM = true;
            else if (v === 'day') hasD = true;
            else if (v === 'night') hasN = true;
        }
        if (hasM && hasD && hasN) {
            // Remove the three time tokens; if nothing remains, caller will display "Anytime".
            return arr.filter(t => !isTime(t));
        }
        return arr;
    }
    function hasAny(arr, set) {
        return (arr || []).some(c => set.has(c));
    }

    function rowHasSlot2Evidence(r) {
        // strongest signals first
        if (r && r.kind === 'slot2') return true;

        // after merges we carry per-game sets and a union set
        if (r && r.slot2All && typeof r.slot2All.size === 'number' && r.slot2All.size > 0) return true;
        for (const g of GAMES) {
            const s = r?.slot2PerGame?.[g];
            if (s && (Array.isArray(s) ? s.length : s.size > 0)) return true;
        }

        // some rows still keep a display token
        const raw = r?.rawConditions || [];
        if (raw.some(c => String(c).startsWith('Slot2:') || String(c).startsWith(SLOT2_PREFIX))) return true;

        // f nonSlot2Conds accidentally kept a raw slot2 token
        const base = r?.nonSlot2Conds || [];
        if (base.some(c => String(c).startsWith(SLOT2_PREFIX))) return true;

        return false;
    }

    function timeRankForRow(r) {
        const times = toTimeOnly(r?.nonSlot2Conds || []);
        if (!times.length) return -1; // Anytime first
        return Math.min(...times.map(t => TIME_ORDER.indexOf(t)));
    }

    // lower = earlier
    function compressedRowSortTuple(r) {
        const base = r?.nonSlot2Conds || [];
        const nonTime = base.filter(c => !TIME_FLAGS.has(c));
        const onlyTime = nonTime.length === 0;
        const hasS2 = rowHasSlot2Evidence(r);

        // 0: time-of-day rows (incl. "Anytime")
        // 1: swarm
        // 2: pokeradar
        // 3: other
        // 4: slot2
        let macro;

        if (hasS2) {
            macro = 4; // force slot2 to the end
        } else if (onlyTime) {
            macro = 0;
        } else if (hasAny(nonTime, SWARM_FLAGS)) {
            macro = 1;
        } else if (hasAny(nonTime, RADAR_FLAGS)) {
            macro = 2;
        } else {
            macro = 3;
        }

        // Sub-ranks
        let subA = 0;
        if (macro === 0) {
            // time rows: Anytime (-1) < Morning (0) < Day (1) < Night (2)
            subA = timeRankForRow(r);
        } else if (macro === 1) {
            subA = base.includes('swarm') ? 0 : base.includes('no-swarm') ? 1 : 2;
        } else if (macro === 2) {
            subA = base.includes('pokeradar') ? 0 : base.includes('no-pokeradar') ? 1 : 2;
        } else if (macro === 4) {
            // stable Slot-2 order when tokens available
            const s2tok = (r.rawConditions || []).find(c => String(c).startsWith(SLOT2_PREFIX));
            subA = (s2tok && (SLOT2_RANK[s2tok] ?? 999)) ?? 999;
        }

        const tail = (r.rawConditions || r.nonSlot2Conds || []).join('|');
        return [macro, subA, tail];
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



    function pickMountNode() { return document.querySelector('#pokemon-dppt-walking .table-collection.walking'); }
    function inferLocationId(mount) { const hinted = mount?.getAttribute('data-location-id'); if (hinted) return hinted; const fname = (location.pathname.split('/').pop() || '').toLowerCase(); const base = fname.replace(/\.html?$/, ''); const FLOOR_GUESSES = { "oreburgh-mine": "oreburgh-mine_1f" }; return FLOOR_GUESSES[base] || base; }
    const byName = (a, b) => a.localeCompare(b);
    function extractWalking(location) { return (location?.pokemon?.encounters || []).filter(b => b?.type === 'walking'); }
    function gamesForEncounter(enc) { return (enc?.games || []).filter(g => GAME_KEYS.has(g)); }
    function labelConditions(conds) {
        const cleaned = stripFullTimeTriplet(conds);

        const list = (cleaned || []).map(formatCondition).filter(Boolean);
        // If nothing left after stripping, it's effectively Anytime.
        return !list.length ? 'Anytime' : list.join(', ');
    }
    function detectAvailableFilters(location) {
        const seen = new Set();
        for (const block of extractWalking(location)) {
            for (const opt of (block.encounters || [])) {
                for (const c of (opt.conditions || [])) {
                    seen.add(String(c));
                }
            }
        }
        const hasSwarm = seen.has('swarm') || seen.has('no-swarm');
        const hasRadar = seen.has('pokeradar') || seen.has('no-pokeradar');
        const hasSlot2 = [...seen].some(c => String(c).startsWith(SLOT2_PREFIX));
        return { hasSwarm, hasRadar, hasSlot2 };
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

    function computeAvailableConditionFilters(location) {
        const out = { hasSwarm: false, hasRadar: false, hasSlot2: false };
        if (!location) return out;

        for (const block of extractWalking(location)) {
            for (const opt of (block.encounters || [])) {
                const conds = opt.conditions || [];
                if (conds.includes('swarm') || conds.includes('no-swarm')) out.hasSwarm = true;
                if (conds.includes('pokeradar') || conds.includes('no-pokeradar')) out.hasRadar = true;
                if (conds.some(c => String(c).startsWith(SLOT2_PREFIX))) out.hasSlot2 = true;
            }
        }
        return out;
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

        return out.sort((a, b) => {
            // primary: slot number
            if (a.slot !== b.slot) return a.slot - b.slot;

            // secondary: Slot-2 order, then swarm/pokeradar priorities, then stable fallback
            const ta = fullRowSortTuple(a);
            const tb = fullRowSortTuple(b);

            for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
                const va = ta[i], vb = tb[i];
                if (va === vb) continue;
                // numeric compare when both are numbers; otherwise string compare
                if (typeof va === 'number' && typeof vb === 'number') return va - vb;
                return String(va).localeCompare(String(vb));
            }
            return 0;
        });


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

        function addIntoPerGameMax(target, source) {
            for (const g of GAMES) {
                const t = target[g] || (target[g] = { rate: 0, levels: [] });
                const s = source[g] || { rate: 0, levels: [] };

                t.rate = Math.max(t.rate || 0, s.rate || 0);

                // union levels (keep all)
                const set = new Set([...(t.levels || []), ...(s.levels || [])]);
                t.levels = [...set].sort();
            }
        }

        // Merge whole perGame maps: SUM vs MAX (keeps levels as UNION)
        function mergePerGameInto(target, source, useMax) {
            for (const g of GAMES) {
                const dst = target[g] || (target[g] = { rate: 0, levels: [] });
                const src = (source[g] || { rate: 0, levels: [] });
                dst.rate = useMax
                    ? Math.max(dst.rate || 0, src.rate || 0)
                    : (dst.rate || 0) + (src.rate || 0);
                const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
                dst.levels = [...set].sort();
            }
        }

        // Merge a single game's bucket: SUM vs MAX (keeps levels as UNION)
        function mergeOneGameInto(targetPerGame, g, sourcePerGame, useMax) {
            const dst = targetPerGame[g] || (targetPerGame[g] = { rate: 0, levels: [] });
            const src = (sourcePerGame[g] || { rate: 0, levels: [] });
            dst.rate = useMax
                ? Math.max(dst.rate || 0, src.rate || 0)
                : (dst.rate || 0) + (src.rate || 0);
            const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
            dst.levels = [...set].sort();
        }

        function normalizeSlot2Val(v) {
            return v === 'firered' ? 'firered' : 'non-firered';
        }

        // Build a per-game slot2 signature string using the normalizer.
        function slot2NormalizedSignature(row) {
            return GAMES.map(g => {
                const sset = row.slot2PerGame?.[g] || new Set();
                const arr = Array.isArray(sset) ? sset : [...sset];
                if (!arr.length) return `${g}:-`;
                const norm = [...new Set(arr.map(normalizeSlot2Val))].sort().join(',');
                return `${g}:${norm}`;
            }).join(';');
        }



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

            // IMPORTANT: In Compressed + All games + Show all conditions
            // do NOT merge different Slot-2 variants here.
            // Keep each slot2Val in its own bucket so we can recombine later by signature.
            const keepVariantsSeparate = s.showAllConditions && s.game === 'All';
            const slot2TagPart = keepVariantsSeparate ? `|slot2:${rec.slot2Val ?? '__no_slot2__'}` : '';

            const groupKey = `${rec.name}|${nonSlot2Key}|${sig}${slot2TagPart}`;


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

            const hasSlot2 = slot2All.size > 0;

            rows.push({
                key: row.key,
                name: row.name,
                perGame: row.perGame,
                nonSlot2Conds: baseConds,
                slot2PerGame: row.slot2PerGame,
                slot2All,
                rawConditions: baseConds,
                timeConds: toTimeOnly(baseConds),
                kind: hasSlot2 ? 'slot2' : 'base',
            });

        }

        // ========= Pass 2.5: Demote slot-2–invariant games into base ("any") rows =========
        // Do this early so later passes (swarm/radar/time) see the already-folded data.
        if (s.showAllConditions) {
            // group only slot2 rows by (species + full nonSlot2Conds incl. time)
            const groups = new Map(); // key -> rows[]
            const passthrough = [];

            for (const r of rows) {
                if (r.kind !== 'slot2') { passthrough.push(r); continue; }
                const key = `${r.name}|${(r.nonSlot2Conds || []).join('|')}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(r);
            }

            // accumulates per-game values to add into the corresponding base row
            const baseAgg = new Map(); // key -> perGame

            function getAgg(key) {
                if (!baseAgg.has(key)) {
                    baseAgg.set(key, Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])));
                }
                return baseAgg.get(key);
            }

            function mergeOneGameSum(dstPerGame, g, srcPerGame) {
                const dst = dstPerGame[g] || (dstPerGame[g] = { rate: 0, levels: [] });
                const src = (srcPerGame[g] || { rate: 0, levels: [] });
                dst.rate = (dst.rate || 0) + (src.rate || 0);
                const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
                dst.levels = [...set].sort();
            }

            // helper: MAX rate + union levels into a single game's cell
            function mergeOneGameMax(dstPerGame, g, srcPerGame) {
                const dst = dstPerGame[g] || (dstPerGame[g] = { rate: 0, levels: [] });
                const src = (srcPerGame[g] || { rate: 0, levels: [] });
                dst.rate = Math.max(dst.rate || 0, src.rate || 0);
                const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
                dst.levels = [...set].sort();
            }

            // For each (species + base conditions incl. time) group…
            for (const [key, list] of groups) {
                // For each game, check if slot2 is "pointless" (covers all options with identical outcome)
                for (const g of GAMES) {
                    // rows in this group that actually have data for game g
                    const withData = list.filter(r =>
                        (r.perGame?.[g]?.rate || 0) > 0 || (r.perGame?.[g]?.levels || []).length > 0
                    );
                    if (withData.length === 0) continue;

                    // union of slot2 values observed for this game across the group
                    const union = new Set();
                    for (const r of withData) {
                        const sset = r.slot2PerGame?.[g] || new Set();
                        const arr = Array.isArray(sset) ? sset : [...sset];
                        for (const v of arr) union.add(v);
                    }
                    const coversAll = ALL_SLOT2_VALS.every(v => union.has(v));

                    // identical signature check (rate + sorted levels)
                    const sigs = new Set(withData.map(r => {
                        const cell = r.perGame[g] || { rate: 0, levels: [] };
                        const lv = (cell.levels || []).slice().sort().join(',');
                        return `${cell.rate || 0}|${lv}`;
                    }));

                    if (coversAll && sigs.size === 1) {
                        // Move this game's contribution into the base row
                        const acc = getAgg(key);
                        mergeOneGameMax(acc, g, withData[0].perGame);

                        // Blank out this game in each slot2 row (so those rows show N/A for g)
                        for (const r of withData) r.perGame[g] = { rate: 0, levels: [] };
                    }
                }
            }

            // Drop slot2 rows that became completely empty
            const keptSlot2 = [];
            for (const r of rows) {
                if (r.kind !== 'slot2') continue;
                const hasAny = GAMES.some(g =>
                    (r.perGame?.[g]?.rate || 0) > 0 || (r.perGame?.[g]?.levels || []).length > 0
                );
                if (hasAny) keptSlot2.push(r);
            }

            // Materialize/merge the base ("any") rows for each affected group
            for (const [key, perGame] of baseAgg) {
                const [name, ...condParts] = key.split('|');
                const nonSlot2Conds = condParts.filter(Boolean);

                // find existing base row for this (species + same base conditions incl. time)
                let baseRow = passthrough.find(r =>
                    r.kind === 'base' &&
                    r.name === name &&
                    (r.nonSlot2Conds || []).join('|') === nonSlot2Conds.join('|')
                );

                if (!baseRow) {
                    baseRow = {
                        key: `${key}|slot2-invariant-any`,
                        name,
                        perGame: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                        nonSlot2Conds: nonSlot2Conds.slice(),
                        rawConditions: nonSlot2Conds.slice(),
                        timeConds: toTimeOnly(nonSlot2Conds),
                        slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                        slot2All: new Set(),
                        kind: 'base',
                    };
                    passthrough.push(baseRow);
                }

                // merge by MAX (mutually exclusive) + union levels
                for (const g of GAMES) mergeOneGameSum(baseRow.perGame, g, perGame);
            }

            // Rebuild rows for next passes
            rows = [...passthrough, ...keptSlot2];
        }


        // ========= Pass 3: Show-all collapse for Radar / Swarm into "no-flag" (Any) =========
        // If, for a given Pokémon + base conditions (time kept!), the Pokeradar-on and Pokeradar-off
        // outcomes have *identical appearance rates* (levels don't matter) for a game,
        // then fold those rates into the "no-flag" row for that game and drop the flagged rows.
        // Same for Swarm / No-swarm.
        if (s.showAllConditions) {
            function collapsePair(flagA, flagB) {
                function slot2SignatureForRow(rr) {
                    if ((rr.kind || 'base') !== 'slot2') return '';
                    return GAMES.map(g => {
                        const sset = rr.slot2PerGame?.[g] || new Set();
                        const arr = Array.isArray(sset) ? sset : [...sset];
                        return `${g}:${arr.slice().sort().join(',')}`;
                    }).join(';');
                }


                const FLAG_SET = new Set([flagA, flagB]);

                // group by species + base (keep time & other conds; just remove the pair flags)
                const byGroup = new Map();
                for (const r of rows) {
                    const baseNoFlag = (r.nonSlot2Conds || []).filter(c => !FLAG_SET.has(c));
                    const key = `${r.name}|${baseNoFlag.join('|')}|${r.kind || 'base'}|${slot2SignatureForRow(r)}`;

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

                    function fold(rowsList) {
                        // If ANY row in this bucket is a Slot2 row, we must not sum mutually-exclusive variants.
                        const useMax = rowsList.some(r => (r.kind === 'slot2'));

                        const out = {
                            perGame: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                            slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                            timeConds: new Set(),
                            useMax, // keep an aggregated note
                        };

                        for (const row of rowsList) {
                            // rates: SUM or MAX depending on useMax
                            mergePerGameInto(out.perGame, row.perGame, useMax);

                            // keep times & slot2 provenance
                            for (const t of (row.timeConds || [])) out.timeConds.add(t);
                            for (const g of GAMES) {
                                const sset = row.slot2PerGame?.[g] || new Set();
                                const arr = Array.isArray(sset) ? sset : [...sset];
                                for (const v of arr) out.slot2PerGame[g].add(v);
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
                        nonSlot2Conds: baseNoFlag.slice(),
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

                    const sharedKind = (items[0]?.kind) || 'base';
                    outNone.kind = sharedKind;
                    outA.kind = sharedKind;
                    outB.kind = sharedKind;

                    // Per-game redistribution
                    for (const g of GAMES) {
                        const hasA = (aggA.perGame[g].rate || 0) > 0;
                        const hasB = (aggB.perGame[g].rate || 0) > 0;

                        // equal means identical appearance rates (levels ignored)
                        const equalAB = hasA && hasB &&
                            (String(aggA.perGame[g].rate || 0) === String(aggB.perGame[g].rate || 0));

                        if (equalAB) {
                            // NONE + exactly one copy of (A or B). Use MAX for slot2 groups, SUM otherwise.
                            mergeOneGameInto(outNone.perGame, g, aggN.perGame, aggN.useMax);
                            mergeOneGameInto(outNone.perGame, g, aggA.perGame, (aggA.useMax || aggN.useMax));

                            for (const v of aggN.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                            for (const v of aggA.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                            for (const v of aggB.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                        } else {
                            // keep separate; NONE stays in outNone
                            mergeOneGameInto(outNone.perGame, g, aggN.perGame, aggN.useMax);
                            for (const v of aggN.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);

                            if (hasA) {
                                mergeOneGameInto(outA.perGame, g, aggA.perGame, aggA.useMax);
                                for (const v of aggA.slot2PerGame[g]) outA.slot2PerGame[g].add(v);
                            }
                            if (hasB) {
                                mergeOneGameInto(outB.perGame, g, aggB.perGame, aggB.useMax);
                                for (const v of aggB.slot2PerGame[g]) outB.slot2PerGame[g].add(v);
                            }
                        }
                    }


                    // Emit rows that actually have any data
                    function pushIfAny(r) {
                        const total = GAMES.reduce((s, g) => s + (r.perGame[g]?.rate || 0), 0);
                        if (total > 0) {
                            rebuilt.push({
                                key: `${r.name}|${r.nonSlot2Conds.join('|')}|showall-collapse|${r.kind || 'base'}`,
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
                                kind: r.kind || 'base',
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
            function slot2Signature(r) {
                if (r.kind !== 'slot2') return '';
                return GAMES.map(g => {
                    const set = r.slot2PerGame?.[g] || new Set();
                    const arr = Array.isArray(set) ? set : [...set];
                    return `${g}:${arr.slice().sort().join(',')}`;
                }).join(';');
            }

            // Group rows by species + base conditions WITHOUT times (keep other conditions intact)
            const groups = new Map();
            for (const r of rows) {
                const baseNoTime = noTimeConds(r.nonSlot2Conds);
                const s2sig = slot2Signature(r);
                const key = `${r.name}|${baseNoTime.join('|')}|${r.kind || 'base'}|${s2sig}`;

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
                        key: `${name}|${nonSlot2Conds.join('|')}|${sig}|times|${items[0]?.kind || 'base'}`,
                        name,
                        perGame: combinedPerGame,
                        nonSlot2Conds,
                        rawConditions: nonSlot2Conds,
                        timeConds: timePart,
                        slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                        slot2All: new Set(),
                        kind: items[0]?.kind || 'base',
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

        // ========= Pass 5: Slot-2–aware recombine by per-game rate signature (Compressed · All · Show-all) =========
        if (s.showAllConditions && s.game === 'All') {
            // Group rows by (species + full nonSlot2Conds including time tokens).
            // Only slot2-kind rows participate; base-kind rows pass through.
            const passthrough = [];
            const groups = new Map(); // key -> rows[]

            for (const r of rows) {
                if (r.kind !== 'slot2') {
                    passthrough.push(r);
                    continue;
                }
                const key = `${r.name}|${(r.nonSlot2Conds || []).join('|')}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(r);
            }

            const rebuilt5 = [];
            const anyAgg = new Map(); // key -> { name, nonSlot2Conds, timeConds, perGame }

            // helper: get/create the ANY aggregator for a (species + base conds)
            function getAnyAgg(key, name, nonSlot2Conds, timeConds) {
                if (!anyAgg.has(key)) {
                    anyAgg.set(key, {
                        name,
                        nonSlot2Conds: (nonSlot2Conds || []).slice(),
                        timeConds: (timeConds || []).slice(),
                        perGame: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }]))
                    });
                }
                return anyAgg.get(key);
            }

            // Merge a single game's bucket into another, using MAX for rate and union for levels.
            function mergeOneGameMax(dstPerGame, g, srcPerGame) {
                const dst = dstPerGame[g] || (dstPerGame[g] = { rate: 0, levels: [] });
                const src = (srcPerGame[g] || { rate: 0, levels: [] });
                dst.rate = Math.max(dst.rate || 0, src.rate || 0);
                const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
                dst.levels = [...set].sort();
            }

            for (const [key, items] of groups) {
                // Re-bucket by per-game RATE signature — identical rate tuples -> one row
                const bySig = new Map(); // sig -> { rows:[], perGame, nonSlot2Conds, timeConds, slot2PerGame }

                const rateSig = (pg) => GAMES.map(g => String(pg[g]?.rate || 0)).join('|');

                for (const r of items) {
                    const sig = rateSig(r.perGame);
                    if (!bySig.has(sig)) {
                        bySig.set(sig, {
                            rows: [],
                            perGame: Object.fromEntries(GAMES.map(g => [
                                g,
                                { rate: r.perGame[g]?.rate || 0, levels: (r.perGame[g]?.levels || []).slice() }
                            ])),
                            nonSlot2Conds: (r.nonSlot2Conds || []).slice(),
                            timeConds: (r.timeConds || []).slice(),
                            slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()]))
                        });
                    }
                    const acc = bySig.get(sig);
                    acc.rows.push(r);

                    // Union per-game slot2 sets
                    for (const g of GAMES) {
                        const sset = r.slot2PerGame?.[g] || new Set();
                        const arr = Array.isArray(sset) ? sset : [...sset];
                        for (const v of arr) acc.slot2PerGame[g].add(v);
                    }

                    // Union levels for safety (rates are identical by signature)
                    for (const g of GAMES) {
                        const lvUnion = new Set([...(acc.perGame[g].levels || []), ...((r.perGame[g]?.levels) || [])]);
                        acc.perGame[g].levels = [...lvUnion].sort();
                    }
                }

                // Materialize rows, with slot2-invariant folding into ANY row per game
                for (const [, acc] of bySig) {
                    const anyKey = `${acc.rows[0].name}|${acc.nonSlot2Conds.join('|')}`;
                    const anyRow = getAnyAgg(anyKey, acc.rows[0].name, acc.nonSlot2Conds, acc.timeConds);

                    // Determine, per game, whether slot2 covers ALL options (invariant)
                    const slot2CoversAll = Object.fromEntries(GAMES.map(g => {
                        const set = acc.slot2PerGame[g] || new Set();
                        const arr = Array.isArray(set) ? set : [...set];
                        const covers = ALL_SLOT2_VALS.every(v => arr.includes(v));
                        return [g, covers];
                    }));

                    // Build a copy for the slot2 row where we blank invariant games
                    const slot2PerGameOut = Object.fromEntries(GAMES.map(g => {
                        const cell = acc.perGame[g] || { rate: 0, levels: [] };
                        const invariant = slot2CoversAll[g] && (cell.rate || 0) > 0;
                        // If invariant, blank here (so it renders N/A) and push into ANY row
                        if (invariant) {
                            mergeOneGameMax(anyRow.perGame, g, acc.perGame); // fold into ANY using MAX
                            return [g, { rate: 0, levels: [] }];
                        }
                        return [g, { rate: cell.rate || 0, levels: (cell.levels || []).slice() }];
                    }));

                    // Only emit the slot2 row if it still has any non-zero game
                    const stillHasData = GAMES.some(g => (slot2PerGameOut[g]?.rate || 0) > 0 || (slot2PerGameOut[g]?.levels || []).length > 0);
                    if (stillHasData) {
                        const slot2All = new Set();
                        for (const g of GAMES) for (const v of acc.slot2PerGame[g]) slot2All.add(v);

                        rebuilt5.push({
                            key: `${anyKey}|sig:${rateSig(slot2PerGameOut)}|slot2-recombine`,
                            name: acc.rows[0].name,
                            perGame: slot2PerGameOut,
                            nonSlot2Conds: acc.nonSlot2Conds.slice(),
                            rawConditions: acc.nonSlot2Conds.slice(),
                            timeConds: acc.timeConds.slice(),
                            slot2PerGame: acc.slot2PerGame,
                            slot2All,
                            kind: 'slot2',
                        });
                    }
                }
            }

            // Materialize ANY rows that actually have data
            const anyRows = [];
            for (const [, a] of anyAgg) {
                const total = GAMES.reduce((s, g) => s + (a.perGame[g]?.rate || 0), 0);
                if (total > 0) {
                    anyRows.push({
                        key: `${a.name}|${a.nonSlot2Conds.join('|')}|slot2-any-fold`,
                        name: a.name,
                        perGame: a.perGame,
                        nonSlot2Conds: a.nonSlot2Conds.slice(),
                        rawConditions: a.nonSlot2Conds.slice(),
                        timeConds: a.timeConds.slice(),
                        slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                        slot2All: new Set(),
                        kind: 'base'
                    });
                }
            }

            rows = [...passthrough, ...rebuilt5, ...anyRows];
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

            // Emit rows (use "Anytime" when all three times are covered)
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
		if (name.indexOf("Nidoran") > -1)
			return String(name).toLowerCase();
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
            { key: "east", name: 'shellos', path: "../../Resources/images/home-renders/gen-4/shellos-east.png" },
            { key: "east", name: 'gastrodon', path: "../../Resources/images/home-renders/gen-4/gastrodon-east.png" },
            { key: "west", name: 'shellos', path: "../../Resources/images/home-renders/gen-4/shellos-west.png" },
            { key: "", name: 'nidoran♀', path: "../../Resources/images/home-renders/gen-1/nidoran-f.png" },
            { key: "", name: 'nidoran♂', path: "../../Resources/images/home-renders/gen-1/nidoran-m.png" },
        ];
        if (hardcodedListLookup.some(e => e.name === nm)) {
			if (nm.indexOf("nidoran") > -1) {
				hardcodedOverride = hardcodedListLookup.find(e => e.name === nm).path;				
			}
			else {
				hardcodedOverride = hardcodedListLookup.find(e => e.name === nm && e.key == SHELLOS).path;
			}
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
                options: [
                    { value: 'full', label: 'Full (slots)' },
                    { value: 'compressed', label: 'Compressed' }
                ]
            }),
            // Hide this toggle entirely if there are no meaningful conditions in this table
            !props.hideShowAllToggle && h(Toggle, {
                label: 'Show all conditions',
                checked: state.showAllConditions,
                onChange: v => set({ showAllConditions: v })
            }),
            // The per-filter controls only appear when NOT showing-all and only if the data actually contains that filter.
            (!state.showAllConditions && props.hasSwarm) && h(Toggle, {
                label: 'Swarm active',
                checked: state.swarm,
                onChange: v => set({ swarm: v })
            }),
            (!state.showAllConditions && props.hasRadar) && h(Toggle, {
                label: 'Poké Radar active',
                checked: state.pokeradar,
                onChange: v => set({ pokeradar: v })
            }),
            (!state.showAllConditions && props.hasSlot2) && h(Select, {
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
        const ordered = sortSlot2ValuesForDisplay(values);
        return `Slot2: ${ordered.map(titleCaseSlot2).join(', ')}`;
    }

    function slot2IntersectionForRow(row) {
        // build an intersection of slot2 sets across games that have data in this row
        const sets = [];
        for (const g of GAMES) {
            const cell = row.perGame?.[g];
            const hasData = !!(cell && ((cell.rate || 0) > 0 || (cell.levels || []).length));
            if (!hasData) continue;

            const s = row.slot2PerGame?.[g] || new Set();
            const a = Array.isArray(s) ? s : [...s];
            sets.push(new Set(a));
        }
        if (sets.length === 0) return new Set();

        let acc = new Set(sets[0]);
        for (let i = 1; i < sets.length; i++) {
            acc = new Set([...acc].filter(v => sets[i].has(v)));
        }
        return acc;
    }

    function GameTable({ game, baseState, location, mount, noConditions }) {
        // Force the game, keep all other toggles from parent
        const s = React.useMemo(() => ({ ...baseState, game }), [baseState, game]);

        const rows = React.useMemo(() => {
            if (!location) return [];
            if (s.view === 'full') return buildFullRows(location, s);
            return s.showAllConditions
                ? buildCompressedRows(location, s)
                : buildCompressedRowsFiltered(location, s);
        }, [location, s.view, s.showAllConditions, s.swarm, s.pokeradar, s.slot2, s.game]);

        return React.createElement(Table, {
            rows,
            gameFilter: game,
            mount,
            view: s.view,
            onlyTimeMode: !s.showAllConditions,
            // Flag so Table knows these rows are already per-game
            prebuiltForGame: game,
            noConditions,
        });
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


        function getBaseStripePrefix() {
            return (props.noConditions && gameFilter && gameFilter !== 'All')
                ? gamePrefix(gameFilter)
                : 'light';
        }

        // Local header class that uses the dynamic base for non-game headers
        const headerClassLocal = g => (g ? `${gamePrefix(g)}-true` : `${getBaseStripePrefix()}-true`);


        function isAnytimeCondsList(conds) {
            return !conds || conds.length === 0;
        }


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
        const isPrebuiltSingle = props.prebuiltForGame && props.prebuiltForGame === gameFilter;
        if (!isPrebuiltSingle && view === 'compressed' && gameFilter && gameFilter !== 'All') {
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
                    const slot2Vals = union;
                    out.push({
                        key: `${acc.name}|${acc.baseConds.join('|')}|${acc.rate}|${lvArr.join(',')}|${slot2Label}`,
                        name: acc.name,
                        perGame: { [g]: { rate: acc.rate, levels: lvArr } },
                        rawConditions: slot2Label ? [...acc.baseConds, slot2Label] : acc.baseConds,
                        nonSlot2Conds: acc.baseConds,
                        timeConds: toTimeOnly(acc.baseConds),
                        slot2PerGame: { [g]: new Set(slot2Vals) },
                        __slot2Vals: slot2Vals,
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
                        slot2Union: new Set(),
                    });
                }
                const acc = merged.get(condKey);
                acc.rate += row.perGame[g].rate || 0;
                for (const lv of (row.perGame[g].levels || [])) acc.levels.add(lv);
                for (const v of (row.__slot2Vals || [])) acc.slot2Union.add(v);
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
                        timeConds: (m.timeConds && m.timeConds.length)
                            ? m.timeConds.slice()
                            : toTimeOnly(baseOnly),
                        slot2PerGame: { [g]: new Set([...m.slot2Union]) },
                    };
                })
                .sort((a, b) => byName(a.name, b.name));
        }
        // Decide which list we actually render
        let renderList = processedRows;

        if (view === 'compressed') {
            // Order species per your rules (1–4) for ANY compressed table
            const buckets = bucketRowsByName(processedRows);
            const orderedNames = orderSpeciesNames(buckets, showGames);

            // Flatten in that species order, preserving each species’ internal row order
            renderList = [];
            for (const name of orderedNames) {
                const arr = buckets.get(name).slice();
                arr.sort(compressedRowComparator);
                renderList.push(...arr);
            }
        }

        // Decide if a compressed row would show anything other than "Anytime"
        function rowHasNonAnytimeConditionsCompressed(r) {
            if (onlyTimeMode) {
                // In time-only mode, any explicit time tokens mean "not anytime"
                return Array.isArray(r.timeConds) && r.timeConds.length > 0;
            }

            // Single-game compressed table
            if (gameFilter && gameFilter !== 'All') {
                const base = (r.nonSlot2Conds || []).slice();
                const baseNonTime = base.filter(c => !TIME_FLAGS.has(c));
                if (baseNonTime.length > 0) return true;

                // Derive per-game Slot-2 list for this table
                const sset = r.slot2PerGame?.[gameFilter] || new Set();
                let slot2Arr = Array.isArray(sset) ? sset : [...sset];

                // Fallback: parse composed "Slot2: ..." token if present
                if (!slot2Arr.length && Array.isArray(r.rawConditions)) {
                    const slot2Tok = r.rawConditions.find(x => /^Slot2:\s*/i.test(String(x)));
                    if (slot2Tok) {
                        slot2Arr = slot2Tok
                            .replace(/^Slot2:\s*/i, '')
                            .split(',')
                            .map(s => s.trim().toLowerCase());
                    }
                }

                // If there are Slot-2 values and they don't cover all 6, it's a condition
                if (slot2Arr.length) {
                    const coversAll = ALL_SLOT2_VALS.every(v => slot2Arr.includes(v));
                    if (!coversAll) return true;
                }
                return false;
            }

            // Combined compressed table
            {
                const base = (r.nonSlot2Conds || []).slice();
                const baseNonTime = base.filter(c => !TIME_FLAGS.has(c));
                if (baseNonTime.length > 0) return true;

                // For combined + slot2 rows we show the intersection if any => it's a condition
                if (r.kind === 'slot2') {
                    const inter = slot2IntersectionForRow(r);
                    if (inter.size > 0) return true;
                }
                return false;
            }
        }

        // Hide the whole Conditions column if every row would be "Anytime"
        const hideConditionsColumn = renderList.length > 0
            ? renderList.every(r => !rowHasNonAnytimeConditionsCompressed(r))
            : true; // no rows → hide




        // ---- Stripe map by Pokémon block (works for both views)
        const rowStripeTrue = new Map();
        let blockByStart = null;

        if (view === 'compressed') {
            // contiguous blocks by r.name using the *ordered* list
            const blocks = [];
            let i = 0, blockIdx = 0;
            while (i < renderList.length) {
                const name = renderList[i].name;
                let j = i + 1;
                while (j < renderList.length && renderList[j].name === name) j++;
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

        // Build full view slot logic groups
        let fullGroups = null;
        if (view === 'full') {
            fullGroups = new Map();
            for (const r of processedRows) {
                const k = `${r.slot}|${r.rate}`;
                if (!fullGroups.has(k)) fullGroups.set(k, []);
                fullGroups.get(k).push(r);
            }
            // Slot-2 + Swarm + Radar priority inside each (slot|rate) group
            function compareFullRows(a, b) {
                const ta = fullRowSortTuple(a);
                const tb = fullRowSortTuple(b);
                for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
                    const va = ta[i], vb = tb[i];
                    if (va === vb) continue;
                    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
                    return String(va).localeCompare(String(vb));
                }
                return 0;
            }

            for (const [, arr] of fullGroups) {
                arr.sort(compareFullRows);
            }

        }

        if (view === 'full') {
            // The games/columns shown in this FULL table:
            const SHOWN_GAMES = (gameFilter === 'All') ? GAMES : [gameFilter];

            // Strip only the given tokens from a condition array, keep everything else
            function withoutTokens(arr, tokensSet) {
                return (arr || []).filter(x => !tokensSet.has(x));
            }

            // Compare per-game outputs for SHOWN_GAMES: identical names AND identical level sets
            function sameOutputsForShownGames(rowA, rowB) {
                for (const g of SHOWN_GAMES) {
                    const a = rowA.perGame?.[g] || {};
                    const b = rowB.perGame?.[g] || {};
                    const nameEqual = String(a.name || '') === String(b.name || '');
                    const la = (a.levels || []).map(String).sort().join(',');
                    const lb = (b.levels || []).map(String).sort().join(',');
                    if (!nameEqual || la !== lb) return false;
                }
                return true;
            }

            // Emit a shallow clone of a row with rawConditions replaced
            function withRawConds(row, rawConds) {
                return Object.assign({}, row, {
                    rawConditions: rawConds.slice(),
                });
            }

            // Collapse pairs (e.g., swarm/no-swarm or pokeradar/no-pokeradar)
            // If, for the same mon+time within this slot group, A and B produce identical outputs
            // in the SHOWN_GAMES, replace them with a single "no-flag" row.
            function collapseFlagPairInGroup(groupRows, flagA, flagB) {
                const PAIR = new Set([flagA, flagB]);
                const buckets = new Map();
                for (const r of groupRows) {
                    const baseNoPair = withoutTokens(r.rawConditions || [], PAIR);
                    const name = (function getFirstName(row) {
                        for (const g of SHOWN_GAMES) {
                            const nm = row.perGame?.[g]?.name;
                            if (nm) return nm;
                        }
                        return ''; // NA-only rows still get grouped
                    })(r);
                    const key = `${name}|${baseNoPair.join('|')}`;
                    if (!buckets.has(key)) buckets.set(key, { baseNoPair, items: [] });
                    buckets.get(key).items.push(r);
                }

                const out = [];
                for (const { baseNoPair, items } of buckets.values()) {
                    const withA = items.filter(r => (r.rawConditions || []).includes(flagA));
                    const withB = items.filter(r => (r.rawConditions || []).includes(flagB));
                    const withNone = items.filter(r => !((r.rawConditions || []).some(x => x === flagA || x === flagB)));

                    // Build map by time signature so we don't mix times here.
                    const byTime = new Map();
                    function timeSig(row) {
                        const t = toTimeOnly(row.rawConditions || []);
                        return (t.length ? t : ['morning', 'day', 'night']).join('+');
                    }
                    for (const r of items) {
                        const k = timeSig(r);
                        if (!byTime.has(k)) byTime.set(k, []);
                        byTime.get(k).push(r);
                    }

                    for (const [tkey, rowsAtTime] of byTime) {
                        const A = rowsAtTime.filter(r => (r.rawConditions || []).includes(flagA));
                        const B = rowsAtTime.filter(r => (r.rawConditions || []).includes(flagB));
                        const N = rowsAtTime.filter(r => !((r.rawConditions || []).some(x => x === flagA || x === flagB)));

                        // If both A and B exist and ANY pair (A_i,B_j) matches outputs, we can collapse
                        let canCollapse = false;
                        outer: for (const ra of A) for (const rb of B) {
                            if (sameOutputsForShownGames(ra, rb)) { canCollapse = true; break outer; }
                        }

                        if (canCollapse) {
                            // Keep the "none" rows as-is (they already represent 'Any'), and
                            // **add exactly one** synthetic "none" row for this time derived from A (or B).
                            // Choose one representative (prefer an existing none; else A[0] or B[0]).
                            const seed = N[0] || A[0] || B[0];
                            const collapsed = withRawConds(seed, baseNoPair);
                            out.push(collapsed);
                            // plus any existing "none" rows at this same time
                            for (const rNone of N) out.push(rNone);
                        } else {
                            // No collapse possible, keep all rows at this time
                            out.push(...rowsAtTime);
                        }
                    }
                }
                return out;
            }

            // Collapse Slot-2 when ALL 6 variants exist and outputs match for the SHOWN_GAMES
            function collapseSlot2InvariantInGroup(groupRows) {
                // Group by species + non-slot2 conditions (keep time and other flags)
                const S2SET = new Set(ALL_SLOT2_VALS.map(v => `${SLOT2_PREFIX}${v}`));
                const byKey = new Map();
                for (const r of groupRows) {
                    const baseNoS2 = withoutTokens(r.rawConditions || [], S2SET);
                    const name = (function getFirstName(row) {
                        for (const g of SHOWN_GAMES) {
                            const nm = row.perGame?.[g]?.name;
                            if (nm) return nm;
                        }
                        return '';
                    })(r);
                    const key = `${name}|${baseNoS2.join('|')}`;
                    if (!byKey.has(key)) byKey.set(key, { baseNoS2, items: [] });
                    byKey.get(key).items.push(r);
                }

                const out = [];
                for (const { baseNoS2, items } of byKey.values()) {
                    // Partition by time (don't cross times)
                    const byTime = new Map();
                    function timeSig(row) {
                        const t = toTimeOnly(row.rawConditions || []);
                        return (t.length ? t : ['morning', 'day', 'night']).join('+');
                    }
                    for (const r of items) {
                        const k = timeSig(r);
                        if (!byTime.has(k)) byTime.set(k, []);
                        byTime.get(k).push(r);
                    }

                    for (const [tkey, rowsAtTime] of byTime) {
                        // Collect per Slot-2 token rows for this time
                        const byS2 = new Map(); // s2token (like 'slot-2-emerald' or '' if none), rows[]
                        for (const r of rowsAtTime) {
                            const s2tok = (r.rawConditions || []).find(x => String(x).startsWith(SLOT2_PREFIX)) || '';
                            if (!byS2.has(s2tok)) byS2.set(s2tok, []);
                            byS2.get(s2tok).push(r);
                        }

                        // If we have ALL 6 explicit tokens present (not counting ''), and they all match outputs,
                        // we can collapse to a single "no-slot2" row for this time.
                        const s2TokensPresent = [...byS2.keys()].filter(k => k && k.startsWith(SLOT2_PREFIX));
                        const hasAllSix = ALL_SLOT2_VALS.every(v => byS2.has(`${SLOT2_PREFIX}${v}`));

                        let canCollapse = false;
                        if (hasAllSix) {
                            // Pick one representative row per slot2 token (same time bucket by construction)
                            const reps = s2TokensPresent.map(tok => byS2.get(tok)[0]);
                            canCollapse = reps.every(r => sameOutputsForShownGames(r, reps[0]));
                        }

                        if (canCollapse) {
                            // Create a single row with slot2 removed from conditions for this time
                            const seed = byS2.get(`${SLOT2_PREFIX}${ALL_SLOT2_VALS[0]}`)[0];
                            const collapsed = withRawConds(seed, baseNoS2);
                            // Also keep any already-no-slot2 rows (if any) at this time
                            const noneRows = byS2.get('') || [];
                            out.push(collapsed, ...noneRows);
                        } else {
                            // No collapse, keep everything
                            out.push(...rowsAtTime);
                        }
                    }
                }
                return out;
            }


            // Build a stable base-no-time key for a row's conditions
            const baseNoTimeKey = (r) => (r.rawConditions || [])
                .filter(c => !TIME_FLAGS.has(c))
                .join('|');

            // For a list of rows that share base-no-time conditions inside the same slot group,
            // compute per-time aggregated per-game outputs (names + levels union).
            function aggregatePerTime(items) {
                // perTime[time][game] = { names:Set, levels:Set }
                const perTime = {
                    morning: Object.fromEntries(GAMES.map(g => [g, { names: new Set(), levels: new Set() }])),
                    day: Object.fromEntries(GAMES.map(g => [g, { names: new Set(), levels: new Set() }])),
                    night: Object.fromEntries(GAMES.map(g => [g, { names: new Set(), levels: new Set() }])),
                };

                for (const r of items) {
                    const tks = toTimeOnly(r.rawConditions || []);
                    const times = tks.length ? tks : ['morning', 'day', 'night'];
                    for (const t of times) {
                        for (const g of GAMES) {
                            const cell = r.perGame?.[g];
                            if (!cell) continue;
                            const nm = cell.name;
                            if (nm) {
                                // split multi-name "A / B" into parts to keep uniqueness
                                nm.split('/').map(s => s.trim()).filter(Boolean).forEach(p => perTime[t][g].names.add(p));
                            }
                            (cell.levels || []).forEach(lv => perTime[t][g].levels.add(String(lv)));
                        }
                    }
                }

                // materialize combined per-game objects with sorted names and levels
                const combined = {};
                for (const t of ['morning', 'day', 'night']) {
                    combined[t] = Object.fromEntries(GAMES.map(g => {
                        const names = [...perTime[t][g].names].sort((a, b) => a.localeCompare(b));
                        const levels = [...perTime[t][g].levels].sort((a, b) => a.localeCompare(b));
                        const nameStr = names.length ? names.join(' / ') : null;
                        return [g, { name: nameStr, levels }];
                    }));
                }
                return combined;
            }

            // Signature string for a per-time per-game map (so equal signatures → merge times)
            function signatureForPerGame(pg) {
                return SHOWN_GAMES.map(g => {
                    const name = pg[g]?.name || '';
                    const lvls = (pg[g]?.levels || []).join(',');
                    return `${g}:${name}|${lvls}`;
                }).join(';');
            }

            // Rebuild each (slot|rate) group
            for (const [groupKey, groupRows] of fullGroups) {
                // 0) Start from the current group rows
                let rowsG = groupRows.slice();

                // 1) Collapse swarm/no-swarm where identical for SHOWN_GAMES
                rowsG = collapseFlagPairInGroup(rowsG, 'swarm', 'no-swarm');

                // 2) Collapse pokeradar/no-pokeradar where identical for SHOWN_GAMES
                rowsG = collapseFlagPairInGroup(rowsG, 'pokeradar', 'no-pokeradar');

                // 3) Collapse Slot-2 invariants when ALL 6 variants produce identical outputs
                rowsG = collapseSlot2InvariantInGroup(rowsG);

                // 1) Bucket by base-no-time conditions so swarm/radar/slot2 are not crossed
                const byBase = new Map();
                for (const r of rowsG) {
                    const key = baseNoTimeKey(r);
                    if (!byBase.has(key)) byBase.set(key, []);
                    byBase.get(key).push(r);
                }

                const rebuiltForGroup = [];

                for (const [baseKey, items] of byBase) {
                    // 2) Aggregate per-time names+levels (expand "anytime" rows to M/D/N)
                    const perTimePG = aggregatePerTime(items);

                    // 3) Make signatures and group times whose per-game outputs are identical
                    const sigToTimes = new Map(); // sig -> times[]
                    for (const t of ['morning', 'day', 'night']) {
                        const sig = signatureForPerGame(perTimePG[t]);
                        if (!sigToTimes.has(sig)) sigToTimes.set(sig, []);
                        sigToTimes.get(sig).push(t);
                    }

                    // We'll need the non-time tokens back to build rawConditions for the display row
                    const baseTokens = baseKey ? baseKey.split('|').filter(Boolean) : [];

                    // 4) Emit rows per signature group; if all 3 times present → "Anytime" (empty time tokens)
                    for (const [sig, times] of sigToTimes) {
                        // Skip groups with no actual data across all games
                        const anyData = times.some(t =>
                            GAMES.some(g => (perTimePG[t][g]?.name) || (perTimePG[t][g]?.levels?.length))
                        );
                        if (!anyData) continue;

                        // Choose representative time to copy rates (names are the same by signature).
                        const firstT = times[0];

                        // Build perGame with union of levels across the grouped times (names are identical)
                        const perGame = Object.fromEntries(GAMES.map(g => {
                            const name = perTimePG[firstT][g]?.name || null; // identical across times by sig
                            const lvlUnion = new Set();
                            for (const t of times) (perTimePG[t][g]?.levels || []).forEach(lv => lvlUnion.add(String(lv)));
                            return [g, { name, levels: [...lvlUnion].sort((a, b) => a.localeCompare(b)) }];
                        }));

                        // Time tokens for the Conditions cell (empty array ⇒ "Anytime" via labelConditions)
                        const timeTokens = (times.length === 3) ? [] : times.slice().sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));

                        // Use slot/rate from any item (same within this (slot|rate) group)
                        const ref = items[0];

                        rebuiltForGroup.push({
                            key: `${ref.slot}|${ref.rate}|${baseKey}|${timeTokens.join('+')}|recombined`,
                            slot: ref.slot,
                            rate: ref.rate,
                            rawConditions: [...baseTokens, ...timeTokens], // what we display
                            perGame,
                        });
                    }
                }

                // 5) Order inside group: by earliest time in the row (Anytime first), then condition priorities
                rebuiltForGroup.sort((a, b) => {
                    const aTimes = toTimeOnly(a.rawConditions);
                    const bTimes = toTimeOnly(b.rawConditions);
                    const aRank = aTimes.length ? TIME_ORDER.indexOf(aTimes[0]) : -1; // Anytime first
                    const bRank = bTimes.length ? TIME_ORDER.indexOf(bTimes[0]) : -1;
                    if (aRank !== bRank) return aRank - bRank;

                    // Maintain your swarm/radar/slot2 ordering preferences
                    const ta = fullRowSortTuple(a);
                    const tb = fullRowSortTuple(b);
                    for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
                        const va = ta[i], vb = tb[i];
                        if (va === vb) continue;
                        if (typeof va === 'number' && typeof vb === 'number') return va - vb;
                        return String(va).localeCompare(String(vb));
                    }
                    return 0;
                });

                // Replace the original group with the rebuilt time-aware rows
                fullGroups.set(groupKey, rebuiltForGroup);
            }
        }

        function zebraByBlock(prefix, rowIndex) {
            const isTrue = !!rowStripeTrue.get(rowIndex);
            const p = prefix || getBaseStripePrefix();
            return `${p}-${isTrue ? 'true' : 'false'}`;
        }

        function zebraBySlot(prefix, slot) {
            const s = Number(slot) || 0;
            const isTrue = (s % 2) === 1;
            const p = prefix || getBaseStripePrefix();
            return `${p}-${isTrue ? 'true' : 'false'}`;
        }



        function FullHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { className: headerClassLocal(null) }, 'Slot'),
                    h('th', { className: headerClassLocal(null) }, 'Rate'),
                    !hideConditionsColumn && h('th', { className: headerClassLocal(null) }, 'Conditions'),
                    ...showGames.map(g => h('th', { key: g, colSpan: 3, className: headerClassLocal(g) }, g))
                )
            );
        }

        function CompressedHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { colSpan: 2, className: headerClassLocal(null) }, 'Pokémon'),
                    ...showGames.map(g => h('th', { key: g, colSpan: 2, className: headerClassLocal(g) }, g)),
                    !hideConditionsColumn && h('th', { className: headerClassLocal(null) }, 'Conditions')
                )
            );
        }


        return h('div', { style: { overflowX: 'auto' } },
            h('table',
                h('caption', tableLabel),
                view === 'compressed' ? CompressedHeader() : FullHeader(),
                h('tbody', null,
                    view === 'full'
                        ? ( // FULL (uses fullGroups)
                            (() => {
                                const rowsOut = [];
                                for (const [, group] of fullGroups) {
                                    const rowspan = group.length;
                                    group.forEach((r, iInGroup) => {
                                        rowsOut.push(
                                            h('tr', { key: r.key },
                                                // Shared Slot & Rate only on first row of the group
                                                ...(iInGroup === 0
                                                    ? [
                                                        h('td', { rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, String(r.slot)),
                                                        h('td', { rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, `${r.rate}%`),
                                                    ]
                                                    : []
                                                ),
                                                // Conditions
                                                !hideConditionsColumn && h('td', { className: zebraBySlot(null, r.slot) },
                                                    h(ConditionsCell, { conds: r.rawConditions })
                                                ),
                                                // game cells (3 per game)
                                                ...showGames.flatMap(g => {
                                                    const gp = gamePrefix(g);
                                                    const cell = r.perGame?.[g];
                                                    const has = !!(cell && cell.name);
                                                    const lv = has ? formatLevels(cell.levels) : '';
                                                    return [
                                                        h('td', { key: g + ':sprite:' + r.key, className: zebraBySlot(gp, r.slot) },
                                                            has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'
                                                        ),
                                                        h('td', { key: g + ':name:' + r.key, className: zebraBySlot(gp, r.slot) },
                                                            has ? cell.name : '—'
                                                        ),
                                                        h('td', { key: g + ':lv:' + r.key, className: zebraBySlot(gp, r.slot) },
                                                            has ? (`lv. ${lv}` || '—') : '—'
                                                        ),
                                                    ];
                                                })
                                            )
                                        );
                                    });
                                }
                                return rowsOut;
                            })()
                        )
                        :
                        (renderList.map((r, rowIndex) => h('tr', { key: r.key },
                            (function () {
                                const block = blockByStart.get(rowIndex);
                                return block
                                    ? h(React.Fragment, null,
                                        h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) },
                                            h(Sprite, { name: r.name, mount })
                                        ),
                                        h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, r.name)
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
                            !hideConditionsColumn && h('td', { className: zebraByBlock(null, rowIndex) }, (function () {
                                if (onlyTimeMode) {
                                    return h(ConditionsCell, { conds: r.timeConds || [] });
                                }

                                if (gameFilter && gameFilter !== 'All') {
                                    const raw = (r.nonSlot2Conds || []).slice();

                                    // derive per-game Slot2 values for this table
                                    const sset = r.slot2PerGame?.[gameFilter] || new Set();
                                    let slot2Arr = Array.isArray(sset) ? sset : [...sset];

                                    // fallback: if builder didn't carry slot2PerGame but we have a composed "Slot2: ..." in rawConditions
                                    if (!slot2Arr.length && Array.isArray(r.rawConditions)) {
                                        const slot2Tok = r.rawConditions.find(x => /^Slot2:\s*/i.test(String(x)));
                                        if (slot2Tok) {
                                            slot2Arr = slot2Tok
                                                .replace(/^Slot2:\s*/i, '')
                                                .split(',')
                                                .map(s => s.trim().toLowerCase());
                                        }
                                    }

                                    if (slot2Arr.length) {
                                        const coversAll = ALL_SLOT2_VALS.every(v => slot2Arr.includes(v));
                                        if (!coversAll) {
                                            raw.push(prettySlot2List(slot2Arr)); // keeps canonical order ruby..none
                                        }
                                    }

                                    return h(ConditionsCell, { conds: raw });
                                }

                                const raw = (r.nonSlot2Conds || []).slice();

                                if (r.kind === 'slot2') {
                                    const inter = slot2IntersectionForRow(r);
                                    if (inter.size > 0) {
                                        raw.push(prettySlot2List([...inter])); // canonical order
                                    }
                                }

                                return h(ConditionsCell, { conds: raw });
                            })())
                        )))

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
            view: 'compressed',
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
        const filterFlags = useMemo(() => {
            return activeLocation ? detectAvailableFilters(activeLocation) : { hasSwarm: false, hasRadar: false, hasSlot2: false };
        }, [activeLocation]);

        const filterAvailability = React.useMemo(() => {
            return computeAvailableConditionFilters(activeLocation);
        }, [activeLocation]);

        const hideShowAllToggle = !(filterAvailability.hasSwarm || filterAvailability.hasRadar || filterAvailability.hasSlot2);

        const noConditions = hideShowAllToggle;


        //SHELLOS = activeLocation.shellos;
        if (activeLocation != null && activeLocation.shellos) SHELLOS = activeLocation.shellos;

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
                h(ViewControls, {
                    state,
                    setState,
                    hasSwarm: filterAvailability.hasSwarm,
                    hasRadar: filterAvailability.hasRadar,
                    hasSlot2: filterAvailability.hasSlot2,
                    hideShowAllToggle,
                }),
                loading ? h('p', null, 'Loading…')
                    : error ? h('p', { style: { color: 'red' } }, 'Error: ', error)
                        : !activeLocation ? h('p', null, 'No matching location for ', h('code', null, String(locationId)), '.')
                            : (
                                state.game === 'separate'
                                    ? h('div', {},
                                        GAMES.map(g =>
                                            h('div', { key: g, style: { marginTop: 12 } },
                                                h(GameTable, {
                                                    game: g,
                                                    baseState: state,
                                                    location: activeLocation,
                                                    mount,
                                                    noConditions,
                                                })
                                            )
                                        )
                                    )
                                    : h(Table, {
                                        rows,
                                        gameFilter: state.game,
                                        mount,
                                        view: state.view,
                                        onlyTimeMode: !state.showAllConditions,
                                        noConditions,
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

