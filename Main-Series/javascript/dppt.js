// ==============================================
// dppt.js — Pokémon Diamond / Pearl / Platinum encounter table renderer
//
// Requires (in order):
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="/assets/js/pokemon-core.js"></script>
//   <script src="/assets/js/dppt.js"></script>
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[dppt] React/ReactDOM globals not found.'); return; }
    if (!window.PokemonCore) { console.warn('[dppt] pokemon-core.js must be loaded before dppt.js.'); return; }

    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const h = React.createElement;

    const {
        TIME_FLAGS, TIME_ORDER,
        toTimeOnly, processConditions, normalizeTimeKey, stripFullTimeTriplet, hasAny,
        humanizeWords, formatLevels,
        byName, loadScript, inferLocationId, bucketRowsByName,
        th, td, tdMono,
        Toggle, Select, HelpTag,
        SPRITE_URL_CACHE, normalizedName, spriteBaseDirs, spriteCandidates,
    } = window.PokemonCore;

    // =========================================================
    // DPPt game constants
    // =========================================================
    const GAMES = ["Diamond", "Pearl", "Platinum"];
    const GAME_KEYS = new Set(GAMES);
    const RADAR_FLAGS = new Set(["pokeradar", "no-pokeradar"]);
    const SWARM_FLAGS = new Set(["swarm", "no-swarm"]);
    const SLOT2_PREFIX = "slot-2-";
    let SHELLOS = "";

    // Map games → bit positions for availability mask
    const GAME_BIT = { Diamond: 0, Pearl: 1, Platinum: 2 };

    // =========================================================
    // Slot 2 constants
    // =========================================================
    const SLOT2_ORDER = [
        'slot-2-ruby', 'slot-2-sapphire', 'slot-2-emerald',
        'slot-2-firered', 'slot-2-leafgreen', 'slot-2-none'
    ];
    const SLOT2_RANK = Object.fromEntries(SLOT2_ORDER.map((k, i) => [k, i]));

    // Bare-value order for display (no prefix) — Ruby first, None last
    const SLOT2_ORDER_RAW = ['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen', 'none'];
    const SLOT2_RANK_RAW = Object.fromEntries(SLOT2_ORDER_RAW.map((k, i) => [k, i]));

    const ALL_SLOT2_VALS = ['none', 'ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'];

    /** Normalize and sort any list of slot-2 values to Ruby-first, None-last display order. */
    function sortSlot2ValuesForDisplay(values) {
        const norm = (v) => String(v).toLowerCase().replace(/^slot-2-/, '');
        return [...new Set(values.map(norm))]
            .sort((a, b) => (SLOT2_RANK_RAW[a] ?? 999) - (SLOT2_RANK_RAW[b] ?? 999));
    }

    function titleCaseSlot2(v) {
        const map = {
            ruby: 'Ruby', sapphire: 'Sapphire', emerald: 'Emerald',
            firered: 'FireRed', leafgreen: 'LeafGreen', none: 'None'
        };
        return map[v] || (v ? (v[0].toUpperCase() + v.slice(1)) : v);
    }

    function prettySlot2List(values) {
        const ordered = sortSlot2ValuesForDisplay(values);
        return `Slot 2: ${ordered.map(titleCaseSlot2).join(', ')}`;
    }

    // =========================================================
    // Condition formatting (DPPt-specific vocabulary)
    // =========================================================

    const DEFAULT_CONDITION_OVERRIDES = {
        'pokeradar': 'Poké Radar',
        'no-pokeradar': 'No Poké Radar',
        'swarm': 'Swarm',
        'no-swarm': 'No swarm',
    };

    function formatCondition(cond) {
        if (!cond) return '';
        // If already a composed label (e.g., "Slot 2: Ruby, Sapphire"), leave as-is
        if (cond.includes(':')) return cond;
        const overrides = Object.assign({}, DEFAULT_CONDITION_OVERRIDES, (window.DPPT_CONDITION_OVERRIDES || {}));
        if (overrides[cond]) return overrides[cond];
        if (cond.startsWith(SLOT2_PREFIX)) {
            const v = cond.slice(SLOT2_PREFIX.length);
            return `Slot 2: ${titleCaseSlot2(v)}`;
        }
        return humanizeWords(cond);
    }

    function timeLabelList(timeConds) {
        if (!timeConds || timeConds.length === 0) return [];
        return timeConds.map(formatCondition);
    }

    function labelConditions(conds) {
        const cleaned = stripFullTimeTriplet(conds);
        const list = (cleaned || []).map(formatCondition).filter(Boolean);
        return !list.length ? 'Anytime' : list.join(', ');
    }

    function ConditionsCell(props) {
        return h('span', null, labelConditions(props.conds));
    }

    // =========================================================
    // Class / stripe helpers
    // =========================================================
    const gamePrefix = g => g.toLowerCase();
    const headerClass = g => (g ? `${gamePrefix(g)}-true` : 'light-true');
    const zebra = (prefix, rowIndex) => prefix
        ? `${prefix}-${(rowIndex % 2 === 0) ? 'false' : 'true'}`
        : `light-${(rowIndex % 2 === 0) ? 'false' : 'true'}`;

    // =========================================================
    // Data extraction
    // =========================================================
    function extractWalking(location) { return location?.encounters?.walking || []; }
    function gamesForEncounter(enc) { return (enc?.games || []).filter(g => GAME_KEYS.has(g)); }

    function detectAvailableFilters(location) {
        const seen = new Set();
        for (const block of extractWalking(location)) {
            for (const opt of (block.options || [])) {
                for (const c of (opt.conditions || [])) seen.add(String(c));
            }
        }
        const hasSwarm = seen.has('swarm') || seen.has('no-swarm');
        const hasRadar = seen.has('pokeradar') || seen.has('no-pokeradar');
        const hasSlot2 = [...seen].some(c => String(c).startsWith(SLOT2_PREFIX));
        return { hasSwarm, hasRadar, hasSlot2 };
    }

    function computeAvailableConditionFilters(location) {
        const out = { hasSwarm: false, hasRadar: false, hasSlot2: false };
        if (!location) return out;
        for (const block of extractWalking(location)) {
            for (const opt of (block.options || [])) {
                const conds = opt.conditions || [];
                if (conds.includes('swarm') || conds.includes('no-swarm')) out.hasSwarm = true;
                if (conds.includes('pokeradar') || conds.includes('no-pokeradar')) out.hasRadar = true;
                if (conds.some(c => String(c).startsWith(SLOT2_PREFIX))) out.hasSlot2 = true;
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
    const isSwarmActive = s => !!s.swarm;
    const isRadarActive = s => !!s.pokeradar;
    const slot2Tag = s => `slot-2-${s.slot2}`;

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

    // =========================================================
    // Species ordering (DPPt 3-game bit-mask approach)
    // =========================================================
    function bitCount3(mask) {
        return ((mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1));
    }

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

    function buildCompressedOrderingMeta(rows, showGames) {
        const meta = new Map();
        for (const r of rows) {
            const name = r.name;
            let m = meta.get(name);
            if (!m) { m = { mask: 0, totalPct: 0, maxRate: 0 }; meta.set(name, m); }
            for (const g of showGames) {
                const cell = r.perGame?.[g];
                const pct = cell?.rate || 0;
                const hasLevels = !!(cell && cell.levels && cell.levels.length);
                const hasData = (pct > 0) || hasLevels;
                if (hasData) m.mask |= (1 << GAME_BIT[g]);
                m.totalPct += pct;
                if (pct > m.maxRate) m.maxRate = pct;
            }
        }
        for (const info of meta.values()) {
            info.count = bitCount3(info.mask);
            info.rank = availabilityComboRank(info.mask);
        }
        return meta;
    }

    function compressedSpeciesCompare(a, b, meta) {
        const A = meta.get(a.name) || { count: 0, rank: 3, maxRate: 0, totalPct: 0 };
        const B = meta.get(b.name) || { count: 0, rank: 3, maxRate: 0, totalPct: 0 };
        if (A.count !== B.count) return B.count - A.count;
        if (A.count === 2 || A.count === 1) {
            if (A.rank !== B.rank) return A.rank - B.rank;
        }
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
    function rowHasSlot2Evidence(r) {
        if (r && r.kind === 'slot2') return true;
        if (r && r.slot2All && typeof r.slot2All.size === 'number' && r.slot2All.size > 0) return true;
        for (const g of GAMES) {
            const s = r?.slot2PerGame?.[g];
            if (s && (Array.isArray(s) ? s.length : s.size > 0)) return true;
        }
        const raw = r?.rawConditions || [];
        if (raw.some(c => String(c).startsWith('Slot 2:') || String(c).startsWith(SLOT2_PREFIX))) return true;
        const base = r?.nonSlot2Conds || [];
        if (base.some(c => String(c).startsWith(SLOT2_PREFIX))) return true;
        return false;
    }

    function timeRankForRow(r) {
        const times = toTimeOnly(r?.nonSlot2Conds || []);
        if (!times.length) return -1; // Anytime first
        return Math.min(...times.map(t => TIME_ORDER.indexOf(t)));
    }

    function fullRowSortTuple(rec) {
        const conds = rec.rawConditions || [];
        const s2 = conds.find(c => c.startsWith(SLOT2_PREFIX));
        const s2rank = (s2 && (SLOT2_RANK[s2] ?? 999)) ?? 999;
        const swarmW = conds.includes('swarm') ? 0 : (conds.includes('no-swarm') ? 1 : 2);
        const radarW = conds.includes('pokeradar') ? 0 : (conds.includes('no-pokeradar') ? 1 : 2);
        const tail = conds.join('|');
        return [s2rank, swarmW, radarW, tail];
    }

    function compressedRowSortTuple(r) {
        const base = r?.nonSlot2Conds || [];
        const nonTime = base.filter(c => !TIME_FLAGS.has(c));
        const onlyTime = nonTime.length === 0;
        const hasS2 = rowHasSlot2Evidence(r);

        let macro;
        if (hasS2) {
            macro = 4;
        } else if (onlyTime) {
            macro = 0;
        } else if (hasAny(nonTime, SWARM_FLAGS)) {
            macro = 1;
        } else if (hasAny(nonTime, RADAR_FLAGS)) {
            macro = 2;
        } else {
            macro = 3;
        }

        let subA = 0;
        if (macro === 0) {
            subA = timeRankForRow(r);
        } else if (macro === 1) {
            subA = base.includes('swarm') ? 0 : base.includes('no-swarm') ? 1 : 2;
        } else if (macro === 2) {
            subA = base.includes('pokeradar') ? 0 : base.includes('no-pokeradar') ? 1 : 2;
        } else if (macro === 4) {
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

    function makeCondKey(name, baseConds, slot2Label) {
        return `${name}|${(baseConds || []).join('|')}|${slot2Label || ''}`;
    }

    function slot2IntersectionForRow(row) {
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

    // =========================================================
    // Row builders
    // =========================================================

    function buildFullRows(location, s) {
        const map = new Map();

        for (const block of extractWalking(location)) {
            const { rate, slot, options: encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const conds = processConditions(opt.conditions || []);
                const condKey = conds.join('|');
                const key = `${slot}|${condKey}`;

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
            if (a.slot !== b.slot) return a.slot - b.slot;
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
    }

    function buildCompressedRows(location, s) {
        const FLAGS_RADAR = new Set(['pokeradar', 'no-pokeradar']);
        const FLAGS_SWARM = new Set(['swarm', 'no-swarm']);

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

        function mergeOneGameInto(targetPerGame, g, sourcePerGame, useMax) {
            const dst = targetPerGame[g] || (targetPerGame[g] = { rate: 0, levels: [] });
            const src = (sourcePerGame[g] || { rate: 0, levels: [] });
            dst.rate = useMax
                ? Math.max(dst.rate || 0, src.rate || 0)
                : (dst.rate || 0) + (src.rate || 0);
            const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
            dst.levels = [...set].sort();
        }

        function perGameRateSignature(perGame) {
            return GAMES.map(g => String(perGame[g]?.rate || 0)).join('|');
        }

        function addIntoPerGame(target, source) {
            for (const g of GAMES) {
                const t = target[g] || (target[g] = { rate: 0, levels: [] });
                const s = source[g] || { rate: 0, levels: [] };
                t.rate += (s.rate || 0);
                const set = new Set([...(t.levels || []), ...(s.levels || [])]);
                t.levels = [...set].sort();
            }
        }

        function noTimeConds(arr) { return (arr || []).filter(c => !TIME_FLAGS.has(c)); }
        function onlyTimeConds(arr) { return (arr || []).filter(c => TIME_FLAGS.has(c)); }

        // ========= Pass 1: species + (non-slot2 conds incl. time) + slot2 variant =========
        const perVariant = new Map();

        for (const block of extractWalking(location)) {
            const { rate, options: encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const allConds = processConditions(opt.conditions || []);
                const slot2 = (allConds.find(c => c.startsWith(SLOT2_PREFIX)) || null);
                const slot2Val = slot2 ? slot2.slice(SLOT2_PREFIX.length) : null;

                const nonSlot2Conds = allConds.filter(c => !c.startsWith(SLOT2_PREFIX));
                const nonSlot2Key = nonSlot2Conds.join('|');

                const key = `${opt.name}|${nonSlot2Key}|${slot2Val ?? '__no_slot2__'}`;

                if (!perVariant.has(key)) {
                    perVariant.set(key, {
                        name: opt.name,
                        nonSlot2Conds: new Set(nonSlot2Conds),
                        slot2Val,
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
            const baseConds = [...row.nonSlot2Conds];
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
        if (s.showAllConditions) {
            const groups = new Map();
            const passthrough = [];

            for (const r of rows) {
                if (r.kind !== 'slot2') { passthrough.push(r); continue; }
                const key = `${r.name}|${(r.nonSlot2Conds || []).join('|')}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(r);
            }

            const baseAgg = new Map();

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

            function mergeOneGameMax(dstPerGame, g, srcPerGame) {
                const dst = dstPerGame[g] || (dstPerGame[g] = { rate: 0, levels: [] });
                const src = (srcPerGame[g] || { rate: 0, levels: [] });
                dst.rate = Math.max(dst.rate || 0, src.rate || 0);
                const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
                dst.levels = [...set].sort();
            }

            for (const [key, list] of groups) {
                for (const g of GAMES) {
                    const withData = list.filter(r =>
                        (r.perGame?.[g]?.rate || 0) > 0 || (r.perGame?.[g]?.levels || []).length > 0
                    );
                    if (withData.length === 0) continue;

                    const union = new Set();
                    for (const r of withData) {
                        const sset = r.slot2PerGame?.[g] || new Set();
                        const arr = Array.isArray(sset) ? sset : [...sset];
                        for (const v of arr) union.add(v);
                    }
                    const coversAll = ALL_SLOT2_VALS.every(v => union.has(v));

                    const sigs = new Set(withData.map(r => {
                        const cell = r.perGame[g] || { rate: 0, levels: [] };
                        const lv = (cell.levels || []).slice().sort().join(',');
                        return `${cell.rate || 0}|${lv}`;
                    }));

                    if (coversAll && sigs.size === 1) {
                        const acc = getAgg(key);
                        mergeOneGameMax(acc, g, withData[0].perGame);
                        for (const r of withData) r.perGame[g] = { rate: 0, levels: [] };
                    }
                }
            }

            const keptSlot2 = [];
            for (const r of rows) {
                if (r.kind !== 'slot2') continue;
                const hasAnyData = GAMES.some(g =>
                    (r.perGame?.[g]?.rate || 0) > 0 || (r.perGame?.[g]?.levels || []).length > 0
                );
                if (hasAnyData) keptSlot2.push(r);
            }

            for (const [key, perGame] of baseAgg) {
                const [name, ...condParts] = key.split('|');
                const nonSlot2Conds = condParts.filter(Boolean);

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

                for (const g of GAMES) mergeOneGameSum(baseRow.perGame, g, perGame);
            }

            rows = [...passthrough, ...keptSlot2];
        }

        // ========= Pass 3: Show-all collapse for Radar / Swarm =========
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
                const byGroup = new Map();
                for (const r of rows) {
                    const baseNoFlag = (r.nonSlot2Conds || []).filter(c => !FLAG_SET.has(c));
                    const key = `${r.name}|${baseNoFlag.join('|')}|${r.kind || 'base'}|${slot2SignatureForRow(r)}`;
                    if (!byGroup.has(key)) byGroup.set(key, { name: r.name, baseNoFlag, items: [] });
                    byGroup.get(key).items.push(r);
                }

                const rebuilt = [];
                const makeEmptyPerGame = () => Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }]));

                const sigRate = (pg, g) => String(pg[g]?.rate || 0);

                for (const [, grp] of byGroup) {
                    const { name, baseNoFlag, items } = grp;
                    const acc = { [flagA]: [], [flagB]: [], none: [] };

                    for (const r of items) {
                        const flagsIn = (r.nonSlot2Conds || []).filter(c => FLAG_SET.has(c));
                        if (flagsIn.includes(flagA)) acc[flagA].push(r);
                        else if (flagsIn.includes(flagB)) acc[flagB].push(r);
                        else acc.none.push(r);
                    }

                    function fold(rowsList) {
                        const useMax = rowsList.some(r => (r.kind === 'slot2'));
                        const out = {
                            perGame: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                            slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])),
                            timeConds: new Set(),
                            useMax,
                        };
                        for (const row of rowsList) {
                            mergePerGameInto(out.perGame, row.perGame, useMax);
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

                    const outNone = { name, nonSlot2Conds: baseNoFlag.slice(), perGame: makeEmptyPerGame(), slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])), timeConds: new Set(toTimeOnly(baseNoFlag)) };
                    const outA = { name, nonSlot2Conds: [...baseNoFlag, flagA], perGame: makeEmptyPerGame(), slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])), timeConds: new Set(toTimeOnly(baseNoFlag)) };
                    const outB = { name, nonSlot2Conds: [...baseNoFlag, flagB], perGame: makeEmptyPerGame(), slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()])), timeConds: new Set(toTimeOnly(baseNoFlag)) };

                    const sharedKind = (items[0]?.kind) || 'base';
                    outNone.kind = sharedKind;
                    outA.kind = sharedKind;
                    outB.kind = sharedKind;

                    for (const g of GAMES) {
                        const hasA = (aggA.perGame[g].rate || 0) > 0;
                        const hasB = (aggB.perGame[g].rate || 0) > 0;
                        const equalAB = hasA && hasB &&
                            (String(aggA.perGame[g].rate || 0) === String(aggB.perGame[g].rate || 0));

                        if (equalAB) {
                            mergeOneGameInto(outNone.perGame, g, aggN.perGame, aggN.useMax);
                            mergeOneGameInto(outNone.perGame, g, aggA.perGame, (aggA.useMax || aggN.useMax));
                            for (const v of aggN.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                            for (const v of aggA.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                            for (const v of aggB.slot2PerGame[g]) outNone.slot2PerGame[g].add(v);
                        } else {
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

            collapsePair('pokeradar', 'no-pokeradar');
            collapsePair('swarm', 'no-swarm');
        }

        // ========= Pass 4: TIME harmonisation =========
        {
            function slot2Signature(r) {
                if (r.kind !== 'slot2') return '';
                return GAMES.map(g => {
                    const set = r.slot2PerGame?.[g] || new Set();
                    const arr = Array.isArray(set) ? set : [...set];
                    return `${g}:${arr.slice().sort().join(',')}`;
                }).join(';');
            }

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
                const hasExplicitTime = items.some(r => onlyTimeConds(r.nonSlot2Conds).length > 0);
                if (!hasExplicitTime) {
                    rebuilt.push(...items);
                    continue;
                }

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

                const makeSig = (t) => {
                    if (s.game === 'All') return perGameRateSignature(perTime[t]);
                    const g = s.game;
                    return String(perTime[t][g]?.rate || 0);
                };

                const sigToTimes = new Map();
                for (const t of ['morning', 'day', 'night']) {
                    const sig = makeSig(t);
                    if (!sigToTimes.has(sig)) sigToTimes.set(sig, []);
                    sigToTimes.get(sig).push(t);
                }

                for (const [sig, times] of sigToTimes) {
                    const first = times[0];
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

                for (const row of rebuilt.slice(-sigToTimes.size)) {
                    for (const it of items) {
                        for (const g of GAMES) for (const v of (it.slot2PerGame?.[g] || [])) {
                            row.slot2PerGame[g].add(v);
                            row.slot2All.add(v);
                        }
                    }
                }
            }

            function noTimeConds(arr) { return (arr || []).filter(c => !TIME_FLAGS.has(c)); }
            function onlyTimeConds(arr) { return (arr || []).filter(c => TIME_FLAGS.has(c)); }

            rows = rebuilt;
        }

        // ========= Pass 5: Slot-2–aware recombine (Compressed · All · Show-all) =========
        if (s.showAllConditions && s.game === 'All') {
            const passthrough = [];
            const groups = new Map();

            for (const r of rows) {
                if (r.kind !== 'slot2') { passthrough.push(r); continue; }
                const key = `${r.name}|${(r.nonSlot2Conds || []).join('|')}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(r);
            }

            const rebuilt5 = [];
            const anyAgg = new Map();

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

            function mergeOneGameMax(dstPerGame, g, srcPerGame) {
                const dst = dstPerGame[g] || (dstPerGame[g] = { rate: 0, levels: [] });
                const src = (srcPerGame[g] || { rate: 0, levels: [] });
                dst.rate = Math.max(dst.rate || 0, src.rate || 0);
                const set = new Set([...(dst.levels || []), ...(src.levels || [])]);
                dst.levels = [...set].sort();
            }

            for (const [key, items] of groups) {
                const bySig = new Map();
                const rateSig = (pg) => GAMES.map(g => String(pg[g]?.rate || 0)).join('|');

                for (const r of items) {
                    const sig = rateSig(r.perGame);
                    if (!bySig.has(sig)) {
                        bySig.set(sig, {
                            rows: [],
                            perGame: Object.fromEntries(GAMES.map(g => [
                                g, { rate: r.perGame[g]?.rate || 0, levels: (r.perGame[g]?.levels || []).slice() }
                            ])),
                            nonSlot2Conds: (r.nonSlot2Conds || []).slice(),
                            timeConds: (r.timeConds || []).slice(),
                            slot2PerGame: Object.fromEntries(GAMES.map(g => [g, new Set()]))
                        });
                    }
                    const acc = bySig.get(sig);
                    acc.rows.push(r);
                    for (const g of GAMES) {
                        const sset = r.slot2PerGame?.[g] || new Set();
                        const arr = Array.isArray(sset) ? sset : [...sset];
                        for (const v of arr) acc.slot2PerGame[g].add(v);
                    }
                    for (const g of GAMES) {
                        const lvUnion = new Set([...(acc.perGame[g].levels || []), ...((r.perGame[g]?.levels) || [])]);
                        acc.perGame[g].levels = [...lvUnion].sort();
                    }
                }

                for (const [, acc] of bySig) {
                    const anyKey = `${acc.rows[0].name}|${acc.nonSlot2Conds.join('|')}`;
                    const anyRow = getAnyAgg(anyKey, acc.rows[0].name, acc.nonSlot2Conds, acc.timeConds);

                    const slot2CoversAll = Object.fromEntries(GAMES.map(g => {
                        const set = acc.slot2PerGame[g] || new Set();
                        const arr = Array.isArray(set) ? set : [...set];
                        const covers = ALL_SLOT2_VALS.every(v => arr.includes(v));
                        return [g, covers];
                    }));

                    const slot2PerGameOut = Object.fromEntries(GAMES.map(g => {
                        const cell = acc.perGame[g] || { rate: 0, levels: [] };
                        const invariant = slot2CoversAll[g] && (cell.rate || 0) > 0;
                        if (invariant) {
                            mergeOneGameMax(anyRow.perGame, g, acc.perGame);
                            return [g, { rate: 0, levels: [] }];
                        }
                        return [g, { rate: cell.rate || 0, levels: (cell.levels || []).slice() }];
                    }));

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

        // ========= Finish: stable order =========
        rows = rows.filter(r => r && typeof r.name === 'string' && r.name.trim().length);
        rows.sort((a, b) => {
            const n = byName(a.name, b.name);
            if (n !== 0) return n;
            return a.nonSlot2Conds.join('|').localeCompare(b.nonSlot2Conds.join('|'));
        });
        return rows;
    }

    function buildCompressedRowsFiltered(location, s) {
        const map = new Map();

        for (const block of extractWalking(location)) {
            const { rate, options: encounters } = block;
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
            const perTime = {
                morning: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                day: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
                night: Object.fromEntries(GAMES.map(g => [g, { rate: 0, levels: [] }])),
            };

            for (const r of rows) {
                const times = (r.timeConds && r.timeConds.length) ? r.timeConds : ['morning', 'day', 'night'];
                for (const t of times) addIntoPerGameUnionLevels(perTime[t], r.perGame);
            }

            const nonEmptyTimes = ['morning', 'day', 'night'].filter(t =>
                GAMES.some(g => (perTime[t][g]?.rate || 0) > 0 || (perTime[t][g]?.levels || []).length > 0)
            );

            const sigForGame = (pg, g) => String(pg[g]?.rate || 0);
            const sigForAllByRates = (pg) => GAMES.map(g => String(pg[g]?.rate || 0)).join('|');
            const signature = (pg) =>
                (s.game && s.game !== 'All') ? sigForGame(pg, s.game) : sigForAllByRates(pg);

            const sigMap = new Map();
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
                    const merged = Object.fromEntries(GAMES.map(g => [
                        g, {
                            rate: acc.perGame[g].rate,
                            levels: [...new Set([...acc.perGame[g].levels, ...perTime[t][g].levels])].sort()
                        }
                    ]));
                    acc.perGame = merged;
                }
            }

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

        const clean = rebuiltAll.filter(r => r && typeof r.name === 'string' && r.name.trim().length);
        return clean.sort((a, b) => {
            const n = byName(a.name, b.name);
            if (n !== 0) return n;
            return (a.timeConds.join(',')).localeCompare(b.timeConds.join(','));
        });
    }

    // =========================================================
    // Sprite (DPPt version — has hardcoded form overrides)
    // =========================================================
    function Sprite(props) {
        const ReactRef = React;
        const useState = ReactRef.useState, useMemo = ReactRef.useMemo, useEffect = ReactRef.useEffect;
        const nm = normalizedName(props.name);
        var hardcodedOverride = "";
        const hardcodedListLookup = [
            { key: "east", name: 'shellos', path: "../../Resources/images/home-renders/gen-4/shellos-east.png" },
            { key: "east", name: 'gastrodon', path: "../../Resources/images/home-renders/gen-4/gastrodon-east.png" },
            { key: "west", name: 'shellos', path: "../../Resources/images/home-renders/gen-4/shellos-west.png" },
            { key: "west", name: 'gastrodon', path: "../../Resources/images/home-renders/gen-4/gastrodon-west.png" },
            { key: "", name: 'nidoran♀', path: "../../Resources/images/home-renders/gen-1/nidoran-f.png" },
            { key: "", name: 'nidoran♂', path: "../../Resources/images/home-renders/gen-1/nidoran-m.png" },
            { key: "", name: 'unown', path: "../../Resources/images/home-renders/gen-2/unown-a.png" },
        ];
        if (hardcodedListLookup.some(e => e.name === nm)) {
            if (nm.indexOf("unown") > -1) hardcodedOverride = hardcodedListLookup.find(e => e.name === nm).path;
            else if (nm.indexOf("nidoran") > -1) hardcodedOverride = hardcodedListLookup.find(e => e.name === nm).path;
            else hardcodedOverride = hardcodedListLookup.find(e => e.name === nm && e.key == SHELLOS).path;
        }
        if (hardcodedOverride !== "") {
            var nameToUse = props.name;
            if (nameToUse == "Shellos") nameToUse = "Shellos (" + SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1) + ")";
            if (nameToUse == "Gastrodon") nameToUse = "Gastrodon (" + SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1) + ")";
            return h('img', { src: hardcodedOverride, alt: nameToUse, loading: 'lazy', className: 'flex-img' });
        }

        const candidates = useMemo(() => {
            const list = spriteCandidates(props.name, props.mount);
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
            src,
            alt: props.name,
            loading: 'lazy',
            className: 'flex-img',
            onLoad: () => { if (src) SPRITE_URL_CACHE.set(nm, src); },
            onError: () => {
                React.startTransition(() => {
                    setIdx(i => (i + 1 < candidates.length ? i + 1 : i));
                });
            }
        });
    }

    // =========================================================
    // ViewControls
    // =========================================================
    function ViewControls(props) {
        const state = props.state;
        const set = p => props.setState(prev => Object.assign({}, prev, p));

        return h('div', { style: { margin: '8px 0 12px' } },
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 6 } },
                h(Select, {
                    label: 'View',
                    value: state.view,
                    onChange: v => set({ view: v }),
                    options: [
                        { value: 'full', label: 'Full (slots)' },
                        { value: 'compressed', label: 'Compressed' }
                    ]
                }),
                !props.unified && h(Select, {
                    label: 'Game',
                    value: state.game,
                    onChange: v => set({ game: v }),
                    options: [
                        { value: 'All', label: 'All' },
                        { value: 'separate', label: 'Separate' },
                        ...GAMES.map(g => ({ value: g, label: g }))
                    ]
                }),
                !props.hideShowAllToggle && h(Toggle, {
                    label: 'Show all conditions',
                    checked: state.showAllConditions,
                    onChange: v => set({ showAllConditions: v })
                }),
            ),
            !props.hideShowAllToggle && h('div', {
                style: {
                    display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
                    opacity: state.showAllConditions ? 0.4 : 1,
                    pointerEvents: state.showAllConditions ? 'none' : 'auto',
                },
            },
                props.hasSwarm && h(Toggle, {
                    label: 'Swarm active',
                    checked: state.swarm,
                    onChange: v => set({ swarm: v })
                }),
                props.hasRadar && h(Toggle, {
                    label: 'Poké Radar active',
                    checked: state.pokeradar,
                    onChange: v => set({ pokeradar: v })
                }),
                props.hasSlot2 && h(Select, {
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
        }, [location, s.view, s.showAllConditions, s.swarm, s.pokeradar, s.slot2, s.game]);

        return React.createElement(Table, {
            rows,
            games: GAMES,
            gameFilter: game,
            mount,
            view: s.view,
            onlyTimeMode: !s.showAllConditions,
            prebuiltForGame: game,
            noConditions,
        });
    }

    // =========================================================
    // Table — the main render component
    // =========================================================
    function Table(props) {
        const onlyTimeMode = !!props.onlyTimeMode;
        const unified = !!props.unified;
        const rows = props.rows;
        const gameFilter = props.gameFilter;
        const mount = props.mount;
        const view = props.view;
        const showGames = gameFilter === 'All' ? (props.games || GAMES) : [gameFilter];
        const viewLabel = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = unified
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        function getBaseStripePrefix() {
            return (gameFilter && gameFilter !== 'All') ? gamePrefix(gameFilter) : 'light';
        }

        const headerClassLocal = g => (g ? `${gamePrefix(g)}-true` : `${getBaseStripePrefix()}-true`);

        function hasSpeciesName(r) {
            return !!(r && typeof r.name === 'string' && r.name.trim().length);
        }

        const renderRows = (gameFilter && gameFilter !== 'All')
            ? rows.filter(r => {
                const g = gameFilter;
                const cell = r.perGame?.[g];
                return view === 'full'
                    ? !!(cell && cell.name)
                    : !!(cell && ((cell.rate || 0) > 0 || (cell.levels && cell.levels.length)));
            })
            : rows;

        let processedRows = renderRows;
        const isPrebuiltSingle = props.prebuiltForGame && props.prebuiltForGame === gameFilter;
        if (!isPrebuiltSingle && view === 'compressed' && gameFilter && gameFilter !== 'All') {
            const g = gameFilter;
            const group1 = new Map();

            for (const r of renderRows) {
                const cell = r.perGame?.[g];
                if (!cell) continue;
                const baseConds = (r.nonSlot2Conds || r.rawConditions || []).slice();
                const baseKey = `${r.name}|${baseConds.join('|')}`;
                const perGameSet = r.slot2PerGame?.[g] || new Set();
                const slot2Vals = Array.isArray(perGameSet) ? perGameSet : [...perGameSet];
                const sig = `${cell.rate}|${(cell.levels || []).slice().sort().join(',')}`;

                if (!group1.has(baseKey)) group1.set(baseKey, new Map());
                const bySig = group1.get(baseKey);
                if (!bySig.has(sig)) {
                    bySig.set(sig, {
                        name: r.name, baseConds,
                        rate: cell.rate || 0,
                        levels: new Set(cell.levels || []),
                        slot2Union: new Set(),
                    });
                }
                const acc = bySig.get(sig);
                for (const lv of (cell.levels || [])) acc.levels.add(lv);
                for (const v of slot2Vals) acc.slot2Union.add(v);
            }

            const out = [];
            for (const [, bySig] of group1) {
                for (const [, acc] of bySig) {
                    const union = [...acc.slot2Union].sort((a, b) => a.localeCompare(b));
                    const coversAll = ALL_SLOT2_VALS.every(v => acc.slot2Union.has(v));
                    const slot2Label = (union.length > 0 && !coversAll)
                        ? `Slot 2: ${union.map(titleCaseSlot2).join(', ')}`
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

            const merged = new Map();
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
                        : rawConds.filter(c => !/^Slot 2:/.test(c));
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

        const sanitizedRows = (processedRows || []).filter(
            r => r && typeof r.name === 'string' && r.name.trim().length > 0
        );

        let renderList;

        if (view === 'compressed') {
            const buckets = bucketRowsByName(sanitizedRows);
            const orderedNames = orderSpeciesNames(buckets, showGames);

            // Cross-species slot2 reordering (Ruby first, None last within same-rate groups)
            (() => {
                function getPureSlot2Token(name) {
                    const rows = buckets.get(name);
                    if (!rows || rows.length === 0) return null;
                    const purRows = rows.filter(r =>
                        r.kind === 'slot2' &&
                        !(r.nonSlot2Conds || []).some(c => !TIME_FLAGS.has(c))
                    );
                    if (purRows.length !== rows.length) return null;
                    const tokens = new Set(
                        purRows.map(r =>
                            (r.rawConditions || []).find(c => String(c).startsWith(SLOT2_PREFIX))
                        ).filter(Boolean)
                    );
                    if (tokens.size !== 1) return null;
                    return [...tokens][0];
                }
                function rateSignature(name) {
                    const rows = buckets.get(name);
                    if (!rows) return null;
                    return showGames.map(g =>
                        rows.reduce((s, r) => s + (r.perGame?.[g]?.rate || 0), 0)
                    ).join(',');
                }
                const slot2TokenMap = new Map();
                for (const name of orderedNames) {
                    const tok = getPureSlot2Token(name);
                    if (tok) slot2TokenMap.set(name, tok);
                }
                if (slot2TokenMap.size < 2) return;
                const sigGroups = new Map();
                for (const [name] of slot2TokenMap) {
                    const sig = rateSignature(name);
                    if (!sigGroups.has(sig)) sigGroups.set(sig, []);
                    sigGroups.get(sig).push(name);
                }
                for (const [, group] of sigGroups) {
                    if (group.length < 2) continue;
                    const positions = group
                        .map(name => ({ name, pos: orderedNames.indexOf(name) }))
                        .filter(x => x.pos !== -1)
                        .sort((a, b) => a.pos - b.pos);
                    if (positions.length < 2) continue;
                    const sorted = positions
                        .map(x => x.name)
                        .sort((a, b) =>
                            (SLOT2_RANK[slot2TokenMap.get(a)] ?? 999) -
                            (SLOT2_RANK[slot2TokenMap.get(b)] ?? 999)
                        );
                    positions.forEach(({ pos }, i) => { orderedNames[pos] = sorted[i]; });
                }
            })();

            renderList = [];
            for (const name of orderedNames) {
                const arr = buckets.get(name).slice();
                arr.sort(compressedRowComparator);

                // Within-species slot2 sort: Ruby first, None last
                const pureSlot2 = arr.filter(r =>
                    r.kind === 'slot2' &&
                    !(r.nonSlot2Conds || []).some(c => !TIME_FLAGS.has(c))
                );
                if (pureSlot2.length > 1) {
                    const ref = pureSlot2[0];
                    const allSameRate = pureSlot2.every(r =>
                        showGames.every(g =>
                            (r.perGame?.[g]?.rate || 0) === (ref.perGame?.[g]?.rate || 0)
                        )
                    );
                    if (allSameRate) {
                        const pureSet = new Set(pureSlot2);
                        const indices = [];
                        arr.forEach((r, i) => { if (pureSet.has(r)) indices.push(i); });
                        pureSlot2.sort((a, b) => {
                            const s2A = (a.rawConditions || []).find(c => String(c).startsWith(SLOT2_PREFIX));
                            const s2B = (b.rawConditions || []).find(c => String(c).startsWith(SLOT2_PREFIX));
                            return (SLOT2_RANK[s2A] ?? 999) - (SLOT2_RANK[s2B] ?? 999);
                        });
                        indices.forEach((idx, j) => { arr[idx] = pureSlot2[j]; });
                    }
                }

                renderList.push(...arr);
            }
        } else {
            renderList = sanitizedRows;
        }

        function rowHasNonAnytimeConditions(r) {
            if (Array.isArray(r.timeConds) && r.timeConds.length > 0) return true;
            if (view == 'full') return r.rawConditions.length > 0;
            if (gameFilter && gameFilter !== 'All') {
                const base = (r.nonSlot2Conds || []).slice();
                const baseNonTime = base.filter(c => !TIME_FLAGS.has(c));
                if (baseNonTime.length > 0) return true;
                const sset = r.slot2PerGame?.[gameFilter] || new Set();
                let slot2Arr = Array.isArray(sset) ? sset : [...sset];
                if (!slot2Arr.length && Array.isArray(r.rawConditions)) {
                    var slot2Tok = r.rawConditions.find(x => /^Slot 2:\s*/i.test(String(x)));
                    if (slot2Tok) {
                        slot2Arr = slot2Tok.replace(/^Slot 2:\s*/i, '').split(',').map(s => s.trim().toLowerCase());
                    } else {
                        slot2Tok = r.rawConditions.find(x => /^slot-2\s*/i.test(String(x)));
                        if (slot2Tok) {
                            slot2Arr = slot2Tok.replace(/^slot-2\s*/i, '').split(',').map(s => s.trim().toLowerCase());
                        }
                    }
                }
                if (slot2Arr.length) {
                    const coversAll = ALL_SLOT2_VALS.every(v => slot2Arr.includes(v));
                    if (!coversAll) return true;
                }
                return false;
            }
            {
                const base = (r.nonSlot2Conds || []).slice();
                const baseNonTime = base.filter(c => !TIME_FLAGS.has(c));
                if (baseNonTime.length > 0) return true;
                if (r.kind === 'slot2') {
                    const inter = slot2IntersectionForRow(r);
                    if (inter.size > 0) return true;
                }
                return false;
            }
        }

        let hideConditionsColumn;

        // Stripe maps
        const rowStripeTrue = new Map();
        let blockByStart = null;

        if (view === 'compressed') {
            const blocks = [];
            let i = 0, blockIdx = 0;
            while (i < renderList.length) {
                const name = renderList[i].name;
                let j = i + 1;
                while (j < renderList.length && renderList[j].name === name) j++;
                const stripeTrue = (blockIdx % 2) === 1;
                for (let k = i; k < j; k++) rowStripeTrue.set(k, stripeTrue);
                blocks.push({ name, start: i, count: j - i });
                i = j; blockIdx++;
            }
            blockByStart = new Map(blocks.map(b => [b.start, b]));
        } else {
            const rowKeyFull = (r) => {
                for (const g of showGames) {
                    const nm = r.perGame?.[g]?.name;
                    if (nm) return nm;
                }
                return '__none__';
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

        let fullGroups = null;
        if (view === 'full') {
            fullGroups = new Map();
            for (const r of processedRows) {
                const k = `${r.slot}|${r.rate}`;
                if (!fullGroups.has(k)) fullGroups.set(k, []);
                fullGroups.get(k).push(r);
            }

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
            for (const [, arr] of fullGroups) arr.sort(compareFullRows);
        }

        if (view === 'full') {
            const SHOWN_GAMES = (gameFilter === 'All') ? (props.games || GAMES) : [gameFilter];

            function withoutTokens(arr, tokensSet) { return (arr || []).filter(x => !tokensSet.has(x)); }

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

            function withRawConds(row, rawConds) {
                return Object.assign({}, row, { rawConditions: rawConds.slice() });
            }

            function collapseFlagPairInGroup(groupRows, flagA, flagB) {
                const PAIR = new Set([flagA, flagB]);
                const buckets = new Map();
                for (const r of groupRows) {
                    const baseNoPair = withoutTokens(r.rawConditions || [], PAIR);
                    const name = (function getFirstName(row) {
                        for (const g of SHOWN_GAMES) { const nm = row.perGame?.[g]?.name; if (nm) return nm; }
                        return '';
                    })(r);
                    const key = `${name}|${baseNoPair.join('|')}`;
                    if (!buckets.has(key)) buckets.set(key, { baseNoPair, items: [] });
                    buckets.get(key).items.push(r);
                }

                const out = [];
                for (const { baseNoPair, items } of buckets.values()) {
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

                        let canCollapse = false;
                        outer: for (const ra of A) for (const rb of B) {
                            if (sameOutputsForShownGames(ra, rb)) { canCollapse = true; break outer; }
                        }

                        if (canCollapse) {
                            const seed = N[0] || A[0] || B[0];
                            const collapsed = withRawConds(seed, baseNoPair);
                            out.push(collapsed);
                            for (const rNone of N) out.push(rNone);
                        } else {
                            out.push(...rowsAtTime);
                        }
                    }
                }
                return out;
            }

            function collapseSlot2InvariantInGroup(groupRows) {
                const S2SET = new Set(ALL_SLOT2_VALS.map(v => `${SLOT2_PREFIX}${v}`));
                const byKey = new Map();
                for (const r of groupRows) {
                    const baseNoS2 = withoutTokens(r.rawConditions || [], S2SET);
                    const name = (function getFirstName(row) {
                        for (const g of SHOWN_GAMES) { const nm = row.perGame?.[g]?.name; if (nm) return nm; }
                        return '';
                    })(r);
                    const key = `${name}|${baseNoS2.join('|')}`;
                    if (!byKey.has(key)) byKey.set(key, { baseNoS2, items: [] });
                    byKey.get(key).items.push(r);
                }

                const out = [];
                for (const { baseNoS2, items } of byKey.values()) {
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
                        const byS2 = new Map();
                        for (const r of rowsAtTime) {
                            const s2tok = (r.rawConditions || []).find(x => String(x).startsWith(SLOT2_PREFIX)) || '';
                            if (!byS2.has(s2tok)) byS2.set(s2tok, []);
                            byS2.get(s2tok).push(r);
                        }
                        const s2TokensPresent = [...byS2.keys()].filter(k => k && k.startsWith(SLOT2_PREFIX));
                        const hasAllSix = ALL_SLOT2_VALS.every(v => byS2.has(`${SLOT2_PREFIX}${v}`));
                        let canCollapse = false;
                        if (hasAllSix) {
                            const reps = s2TokensPresent.map(tok => byS2.get(tok)[0]);
                            canCollapse = reps.every(r => sameOutputsForShownGames(r, reps[0]));
                        }
                        if (canCollapse) {
                            const seed = byS2.get(`${SLOT2_PREFIX}${ALL_SLOT2_VALS[0]}`)[0];
                            const collapsed = withRawConds(seed, baseNoS2);
                            const noneRows = byS2.get('') || [];
                            out.push(collapsed, ...noneRows);
                        } else {
                            out.push(...rowsAtTime);
                        }
                    }
                }
                return out;
            }

            const baseNoTimeKey = (r) => (r.rawConditions || [])
                .filter(c => !TIME_FLAGS.has(c))
                .join('|');

            function aggregatePerTime(items) {
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
                            if (nm) nm.split('/').map(s => s.trim()).filter(Boolean).forEach(p => perTime[t][g].names.add(p));
                            (cell.levels || []).forEach(lv => perTime[t][g].levels.add(String(lv)));
                        }
                    }
                }
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

            function signatureForPerGame(pg) {
                return SHOWN_GAMES.map(g => {
                    const name = pg[g]?.name || '';
                    const lvls = (pg[g]?.levels || []).join(',');
                    return `${g}:${name}|${lvls}`;
                }).join(';');
            }

            for (const [groupKey, groupRows] of fullGroups) {
                let rowsG = groupRows.slice();
                rowsG = collapseFlagPairInGroup(rowsG, 'swarm', 'no-swarm');
                rowsG = collapseFlagPairInGroup(rowsG, 'pokeradar', 'no-pokeradar');
                rowsG = collapseSlot2InvariantInGroup(rowsG);

                const byBase = new Map();
                for (const r of rowsG) {
                    const key = baseNoTimeKey(r);
                    if (!byBase.has(key)) byBase.set(key, []);
                    byBase.get(key).push(r);
                }

                const rebuiltForGroup = [];
                for (const [baseKey, items] of byBase) {
                    const perTimePG = aggregatePerTime(items);
                    const sigToTimes = new Map();
                    for (const t of ['morning', 'day', 'night']) {
                        const sig = signatureForPerGame(perTimePG[t]);
                        if (!sigToTimes.has(sig)) sigToTimes.set(sig, []);
                        sigToTimes.get(sig).push(t);
                    }

                    const baseTokens = baseKey ? baseKey.split('|').filter(Boolean) : [];

                    for (const [sig, times] of sigToTimes) {
                        const anyData = times.some(t =>
                            GAMES.some(g => (perTimePG[t][g]?.name) || (perTimePG[t][g]?.levels?.length))
                        );
                        if (!anyData) continue;

                        const firstT = times[0];
                        const perGame = Object.fromEntries(GAMES.map(g => {
                            const name = perTimePG[firstT][g]?.name || null;
                            const lvlUnion = new Set();
                            for (const t of times) (perTimePG[t][g]?.levels || []).forEach(lv => lvlUnion.add(String(lv)));
                            return [g, { name, levels: [...lvlUnion].sort((a, b) => a.localeCompare(b)) }];
                        }));

                        const timeTokens = (times.length === 3) ? [] : times.slice().sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
                        const ref = items[0];

                        rebuiltForGroup.push({
                            key: `${ref.slot}|${ref.rate}|${baseKey}|${timeTokens.join('+')}|recombined`,
                            slot: ref.slot,
                            rate: ref.rate,
                            rawConditions: [...baseTokens, ...timeTokens],
                            perGame,
                        });
                    }
                }

                rebuiltForGroup.sort((a, b) => {
                    const aTimes = toTimeOnly(a.rawConditions);
                    const bTimes = toTimeOnly(b.rawConditions);
                    const aRank = aTimes.length ? TIME_ORDER.indexOf(aTimes[0]) : -1;
                    const bRank = bTimes.length ? TIME_ORDER.indexOf(bTimes[0]) : -1;
                    if (aRank !== bRank) return aRank - bRank;
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

                fullGroups.set(groupKey, rebuiltForGroup);
            }
        }

        if (view === 'full') {
            const flat = fullGroups ? Array.from(fullGroups.values()).flat() : [];
            hideConditionsColumn = flat.length > 0
                ? flat.every(r => !(Array.isArray(r.rawConditions) && r.rawConditions.length))
                : true;
        } else {
            hideConditionsColumn = renderList.length > 0
                ? renderList.every(r => !rowHasNonAnytimeConditions(r))
                : true;
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
                    (unified || gameFilter !== 'All')
                        ? [
                            h('th', { key: 'pkmn', colSpan: 2, className: headerClassLocal(null) }, 'Pokémon'),
                            h('th', { key: 'lv',   className:  headerClassLocal(null) }, 'Level'),
                          ]
                        : showGames.map(g => h('th', { key: g, colSpan: 3, className: headerClassLocal(g) }, g))
                )
            );
        }

        function CompressedHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { colSpan: 2, className: headerClassLocal(null) }, 'Pokémon'),
                    ...(unified || gameFilter !== 'All'
                        ? [
                            h('th', { key: 'r', className: headerClassLocal(null) }, 'Rate'),
                            h('th', { key: 'l', className: headerClassLocal(null) }, 'Level'),
                        ]
                        : showGames.map(g => h('th', { key: g, colSpan: 2, className: headerClassLocal(g) }, g))
                    ),
                    !hideConditionsColumn && h('th', { className: headerClassLocal(null) }, 'Conditions')
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
                            const rowsOut = [];
                            for (const [, group] of fullGroups) {
                                const rowspan = group.length;
                                group.forEach((r, iInGroup) => {
                                    rowsOut.push(
                                        h('tr', { key: `${r.key}::${iInGroup}`, className: (gameFilter && gameFilter !== 'All') ? zebraBySlot(gamePrefix(gameFilter), r.slot) : undefined },
                                            ...(iInGroup === 0
                                                ? [
                                                    h('td', { rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, String(r.slot)),
                                                    h('td', { rowSpan: rowspan, className: zebraBySlot(null, r.slot) }, `${r.rate}%`),
                                                ]
                                                : []
                                            ),
                                            !hideConditionsColumn && h('td', { className: zebraBySlot(null, r.slot) },
                                                h(ConditionsCell, { conds: r.rawConditions })
                                            ),
                                            ...(unified ? (() => {
                                                const g = GAMES[0];
                                                const cell = r.perGame?.[g];
                                                const has = !!(cell && cell.name);
                                                const lv = has ? formatLevels(cell.levels) : '';
                                                const cellName = has
                                                    ? (cell.name == "Shellos"
                                                        ? "Shellos (" + SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1) + ")"
                                                        : cell.name == "Gastrodon"
                                                            ? "Gastrodon (" + SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1) + ")"
                                                            : cell.name)
                                                    : '—';
                                                return [
                                                    h('td', { key: 'u:sprite:' + r.key, className: zebraBySlot(null, r.slot) },
                                                        has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'
                                                    ),
                                                    h('td', { key: 'u:name:' + r.key, className: zebraBySlot(null, r.slot) }, cellName),
                                                    h('td', { key: 'u:lv:' + r.key, className: zebraBySlot(null, r.slot) },
                                                        has ? (`lv. ${lv}` || '—') : '—'
                                                    ),
                                                ];
                                            })() : showGames.flatMap(g => {
                                                const gp = gamePrefix(g);
                                                const cell = r.perGame?.[g];
                                                const has = !!(cell && cell.name);
                                                const lv = has ? formatLevels(cell.levels) : '';
                                                var cellName = has
                                                    ? (cell.name == "Shellos"
                                                        ? "Shellos (" + SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1) + ")"
                                                        : cell.name == "Gastrodon"
                                                            ? "Gastrodon (" + SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1) + ")"
                                                            : cell.name)
                                                    : '-';
                                                return [
                                                    h('td', { key: g + ':sprite:' + r.key, className: zebraBySlot(gp, r.slot) },
                                                        has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'
                                                    ),
                                                    h('td', { key: g + ':name:' + r.key, className: zebraBySlot(gp, r.slot) }, cellName),
                                                    h('td', { key: g + ':lv:' + r.key, className: zebraBySlot(gp, r.slot) },
                                                        has ? (`lv. ${lv}` || '—') : '—'
                                                    ),
                                                ];
                                            }))
                                        )
                                    );
                                });
                            }
                            return rowsOut;
                        })()
                        : renderList.map((r, rowIndex) => {
                            const rowKey = `${r.key}::${rowIndex}`;
                            return h('tr', { key: rowKey, className: (gameFilter && gameFilter !== 'All') ? zebraByBlock(gamePrefix(gameFilter), rowIndex) : undefined },
                                (function () {
                                    const block = blockByStart.get(rowIndex);
                                    var monName = r.name == "Shellos"
                                        ? "Shellos (" + SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1) + ")"
                                        : r.name == "Gastrodon"
                                            ? "Gastrodon (" + SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1) + ")"
                                            : r.name;
                                    return block
                                        ? h(React.Fragment, null,
                                            h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) },
                                                h(Sprite, { name: r.name, mount })
                                            ),
                                            h('td', { rowSpan: block.count, className: zebraByBlock(null, rowIndex) }, monName)
                                        )
                                        : null;
                                })(),
                                ...(unified ? (() => {
                                    const cell = r.perGame?.[GAMES[0]];
                                    const pct = cell?.rate || 0;
                                    const lvStr = (cell && cell.levels && cell.levels.length) ? formatLevels(cell.levels) : '';
                                    const hasData = !!pct || !!lvStr;
                                    return [
                                        h('td', {
                                            key: 'u:pct',
                                            colSpan: hasData ? 1 : 2,
                                            className: zebraByBlock(null, rowIndex),
                                        }, hasData ? (pct ? `${pct}%` : '—') : 'N/A'),
                                        hasData
                                            ? h('td', { key: 'u:lv', className: zebraByBlock(null, rowIndex) }, (`lv. ${lvStr}` || '—'))
                                            : null,
                                    ];
                                })() : showGames.flatMap(g => {
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
                                })),
                                !hideConditionsColumn && h('td', { className: zebraByBlock(null, rowIndex) }, (function () {
                                    if (onlyTimeMode) return h(ConditionsCell, { conds: r.timeConds || [] });

                                    if (gameFilter && gameFilter !== 'All') {
                                        const raw = (r.nonSlot2Conds || []).slice();
                                        const sset = r.slot2PerGame?.[gameFilter] || new Set();
                                        let slot2Arr = Array.isArray(sset) ? sset : [...sset];
                                        if (!slot2Arr.length && Array.isArray(r.rawConditions)) {
                                            const slot2Tok = r.rawConditions.find(x => /^Slot 2:\s*/i.test(String(x)));
                                            if (slot2Tok) {
                                                slot2Arr = slot2Tok.replace(/^Slot 2:\s*/i, '').split(',').map(s => s.trim().toLowerCase());
                                            }
                                        }
                                        if (slot2Arr.length) {
                                            const coversAll = ALL_SLOT2_VALS.every(v => slot2Arr.includes(v));
                                            if (!coversAll) raw.push(prettySlot2List(slot2Arr));
                                        }
                                        return h(ConditionsCell, { conds: raw });
                                    }

                                    const raw = (r.nonSlot2Conds || []).slice();
                                    if (r.kind === 'slot2') {
                                        const inter = slot2IntersectionForRow(r);
                                        if (inter.size > 0) raw.push(prettySlot2List([...inter]));
                                    }
                                    return h(ConditionsCell, { conds: raw });
                                })())
                            );
                        })
                )
            )
        );
    }

    // =========================================================
    // App
    // =========================================================
    // =========================================================
    // Shared data cache — one script load per location, shared by
    // the walking App and any SlotApp (surfing / fishing).
    // =========================================================
    const DATA_PROMISE_CACHE = new Map();
    function getLocationData(locId) {
        if (DATA_PROMISE_CACHE.has(locId)) return DATA_PROMISE_CACHE.get(locId);
        const LOC_BASE = window.DPPT_LOCATION_BASE || '../javascript/DPPt/';
        const p = loadScript(`${LOC_BASE}${locId}.js`).then(() => {
            if (!window.DPPT_DATA) throw new Error('DPPT_DATA not found after script load');
            const d = window.DPPT_DATA;
            delete window.DPPT_DATA;
            return d;
        });
        DATA_PROMISE_CACHE.set(locId, p);
        return p;
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
        const [isPending, startTransition] = React.useTransition();

        const locationId = inferLocationId(mount);

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

        const unified = useMemo(() => activeLocation ? walkingGamesIdentical(activeLocation) : false, [activeLocation]);

        if (activeLocation != null && activeLocation.shellos) SHELLOS = activeLocation.shellos;

        const rows = useMemo(() => {
            if (!activeLocation) return [];
            if (state.view === 'full') return buildFullRows(activeLocation, state);
            return state.showAllConditions
                ? buildCompressedRows(activeLocation, state)
                : buildCompressedRowsFiltered(activeLocation, state);
        }, [activeLocation, state]);

        useEffect(() => {
            let alive = true;
            getLocationData(locationId).then(d => {
                if (alive) { setData([d]); setLoading(false); }
            }).catch(e => {
                console.error(e);
                if (alive) { setError(String((e && e.message) || e)); setLoading(false); }
            });
            return () => { alive = false; };
        }, []);

        const setStateDeferred = React.useCallback(
            updater => startTransition(() => setState(updater)),
            [startTransition]
        );

        return h('div', {},
            h('div', {},
                h(ViewControls, {
                    state,
                    setState: setStateDeferred,
                    hasSwarm: filterAvailability.hasSwarm,
                    hasRadar: filterAvailability.hasRadar,
                    hasSlot2: filterAvailability.hasSlot2,
                    hideShowAllToggle,
                    unified,
                }),
                loading ? h('p', null, 'Loading…')
                    : error ? h('p', { style: { color: 'red' } }, 'Error: ', error)
                        : !activeLocation ? h('p', null, 'No matching location for ', h('code', null, String(locationId)), '.')
                            : (
                                state.game === 'separate' && !unified
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
                                        games: GAMES,
                                        gameFilter: unified ? 'All' : state.game,
                                        mount,
                                        view: state.view,
                                        onlyTimeMode: !state.showAllConditions,
                                        noConditions,
                                        unified,
                                    })
                            )
            )
        );
    }

    // =========================================================
    // Slot encounter utilities (Surfing / Fishing)
    // =========================================================

    function slotFormName(name) {
        if (name === 'Shellos' || name === 'Gastrodon') {
            const form = SHELLOS.charAt(0).toUpperCase() + SHELLOS.slice(1);
            return `${name} (${form})`;
        }
        return name;
    }

    /**
     * Full view rows — one row per slot.
     * Returns: [{ slot, rate, perGame: { [game]: { name, level } } }]
     */
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

    /**
     * Compressed view rows — grouped by Pokémon name, rates summed.
     * Returns: [{ name, perGame: { [game]: { rate, level } } }]
     * Order is preserved by first appearance.
     */
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
        return order.map(name => {
            const pg = accum.get(name);
            return {
                name,
                perGame: Object.fromEntries(
                    games.filter(g => pg[g]).map(g => [g, {
                        rate: pg[g].rate,
                        level: mergeRanges(pg[g].levels),
                    }])
                ),
            };
        });
    }

    // =========================================================
    // CSS class helpers (match the Walking table's common.css usage)
    // =========================================================

    /**
     * Zebra-stripe class keyed by slot number (odd slot → -true, even → -false).
     * prefix: game prefix ('diamond','pearl','platinum') or null/'light' for neutral.
     */
    /**
     * Merge overlapping / adjacent level range strings from compressed view.
     * Handles single numbers ('5') and ranges ('3-7', '20-30').
     * e.g. ['3-7', '4-6', '5-10'] → '3-10'
     */
    function mergeRanges(levels) {
        const parsed = (levels || []).map(l => {
            const m = String(l).match(/^(\d+)-(\d+)$/);
            if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
            const n = parseInt(l, 10);
            if (!isNaN(n)) return [n, n];
            return null;
        }).filter(Boolean);
        if (parsed.length === 0) return (levels || []).join(', ');
        parsed.sort((a, b) => a[0] - b[0]);
        const merged = [parsed[0].slice()];
        for (let i = 1; i < parsed.length; i++) {
            const last = merged[merged.length - 1];
            const [lo, hi] = parsed[i];
            if (lo <= last[1] + 1) { last[1] = Math.max(last[1], hi); }
            else { merged.push([lo, hi]); }
        }
        return merged.map(([lo, hi]) => lo === hi ? String(lo) : `${lo}-${hi}`).join(', ');
    }

    function slotCls(prefix, slot) {
        const isTrue = (Number(slot) || 0) % 2 === 1;
        const p = prefix || 'light';
        return `${p}-${isTrue ? 'true' : 'false'}`;
    }

    /**
     * Zebra-stripe class keyed by row index (odd → -true, even → -false).
     * Used for compressed view where striping is per species-block.
     */
    function rowCls(prefix, idx) {
        const isTrue = idx % 2 === 1;
        const p = prefix || 'light';
        return `${p}-${isTrue ? 'true' : 'false'}`;
    }

    /** Header class for a column.  g=null → neutral header. */
    function hdrCls(g, basePrefix) {
        if (g) return `${gamePrefix(g)}-true`;
        return `${basePrefix || 'light'}-true`;
    }

    // =========================================================
    // SlotViewControls — simplified controls for surf/fish tables
    // =========================================================
    function SlotViewControls({ state, setState, unified }) {
        const set = p => setState(prev => Object.assign({}, prev, p));
        return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '8px 0 12px' } },
            h(Select, {
                label: 'View',
                value: state.view,
                onChange: v => set({ view: v }),
                options: [
                    { value: 'full', label: 'Full (slots)' },
                    { value: 'compressed', label: 'Compressed' },
                ],
            }),
            !unified && h(Select, {
                label: 'Game',
                value: state.game,
                onChange: v => set({ game: v }),
                options: [
                    { value: 'All', label: 'All' },
                    { value: 'separate', label: 'Separate' },
                    ...GAMES.map(g => ({ value: g, label: g })),
                ],
            }),
        );
    }

    // =========================================================
    // SlotSection — one <table> for a flat list of encounter slots
    // Handles surfing (and per-rod sections of fishing when needed).
    // =========================================================
    function SlotSection({ slots, games, gameFilter, view, mount, unified }) {
        if (!slots || slots.length === 0) return null;

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
                                : showGames.flatMap(g => [
                                    h('th', { key: g, colSpan: 3, className: hdrCls(g) }, g),
                                ]),
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
                                            h('td', { key: 'n', className: slotCls(base, row.slot) }, c ? slotFormName(c.name) : '—'),
                                            h('td', { key: 'l', className: slotCls(base, row.slot) }, c ? `lv. ${c.level}` : '—'),
                                        ];
                                    })()
                                    : showGames.flatMap(g => {
                                        const gp = gamePrefix(g);
                                        const c = row.perGame[g];
                                        return [
                                            h('td', { key: g + '-s', className: slotCls(gp, row.slot) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                            h('td', { key: g + '-n', className: slotCls(gp, row.slot) }, c ? slotFormName(c.name) : '—'),
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

        // Compressed view
        const compRows = buildSlotCompressedRows(slots, games);
        const rows = isSingle
            ? compRows.filter(r => r.perGame[gameFilter]).sort((a, b) => (b.perGame[gameFilter]?.rate || 0) - (a.perGame[gameFilter]?.rate || 0))
            : compRows;
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
                            : showGames.map(g =>
                                h('th', { key: g, colSpan: 2, className: hdrCls(g) }, g)
                            ),
                    )
                ),
                h('tbody', null,
                    rows.map((row, i) =>
                        h('tr', { key: row.name },
                            h('td', { className: rowCls(base, i) }, h(Sprite, { name: row.name, mount })),
                            h('td', { className: rowCls(base, i) }, slotFormName(row.name)),
                            ...((isSingle || unified)
                                ? (() => {
                                    const c = row.perGame[unified ? GAMES[0] : gameFilter];
                                    return [
                                        h('td', { key: 'r', className: rowCls(base, i) }, c ? c.rate + '%' : '—'),
                                        h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })()
                                : showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const c = row.perGame[g];
                                    if (!c) return [h('td', { key: g + '-na', colSpan: 2, className: rowCls(null, i) }, 'N/A')];
                                    return [
                                        h('td', { key: g + '-r', className: rowCls(gp, i) }, c.rate + '%'),
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
    // FishTable — all three rods in one table, Rod as first column
    // =========================================================
    function FishTable({ fish, games, gameFilter, view, mount, unified }) {
        const ROD_KEYS = [
            { key: 'old',   label: 'Old' },
            { key: 'good',  label: 'Good' },
            { key: 'super', label: 'Super' },
        ];

        const isSingle = GAMES.includes(gameFilter);
        const showGames = isSingle ? [gameFilter] : games;
        const base = (isSingle || unified) ? (unified ? 'light' : gamePrefix(gameFilter)) : 'light';
        const viewLabel = view === 'compressed' ? 'Compressed' : 'Full';
        const tableLabel = unified
            ? viewLabel
            : ((gameFilter === 'All' ? 'Combined' : gameFilter) + ` (${viewLabel})`);

        if (view === 'full') {
            // Build flat list of rows: { rod, slot, rate, perGame }
            const allRows = [];
            for (const { key, label } of ROD_KEYS) {
                const rows = buildSlotFullRows(fish[key] || [], games);
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
                                : showGames.flatMap(g => [
                                    h('th', { key: g, colSpan: 3, className: hdrCls(g) }, g),
                                ]),
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
                                            h('td', { key: 'n', className: rowCls(base, i) }, c ? slotFormName(c.name) : '—'),
                                            h('td', { key: 'l', className: rowCls(base, i) }, c ? `lv. ${c.level}` : '—'),
                                        ];
                                    })()
                                    : showGames.flatMap(g => {
                                        const gp = gamePrefix(g);
                                        const c = row.perGame[g];
                                        return [
                                            h('td', { key: g + '-s', className: rowCls(gp, i) }, c ? h(Sprite, { name: c.name, mount }) : '—'),
                                            h('td', { key: g + '-n', className: rowCls(gp, i) }, c ? slotFormName(c.name) : '—'),
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

        // Compressed view — one table, Rod column, rows grouped per rod type
        // Build compressed rows per rod, then flatten with rod label attached.
        // Row index for striping resets per rod group.
        let globalIdx = 0;
        const sections = ROD_KEYS.map(({ key, label }) => {
            const compRows = buildSlotCompressedRows(fish[key] || [], games);
            const filtered = isSingle
                ? compRows.filter(r => r.perGame[gameFilter]).sort((a, b) => (b.perGame[gameFilter]?.rate || 0) - (a.perGame[gameFilter]?.rate || 0))
                : compRows;
            const tagged = filtered.map(row => {
                const idx = globalIdx++;
                return { rod: label, idx, ...row };
            });
            return tagged;
        });
        const allRows = sections.flat();

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
                            : showGames.map(g =>
                                h('th', { key: g, colSpan: 2, className: hdrCls(g) }, g)
                            ),
                    )
                ),
                h('tbody', null,
                    allRows.map(row =>
                        h('tr', { key: `${row.rod}-${row.name}` },
                            h('td', { className: rowCls(base, row.idx) }, row.rod),
                            h('td', { className: rowCls(base, row.idx) }, h(Sprite, { name: row.name, mount })),
                            h('td', { className: rowCls(base, row.idx) }, slotFormName(row.name)),
                            ...((isSingle || unified)
                                ? (() => {
                                    const c = row.perGame[unified ? GAMES[0] : gameFilter];
                                    return [
                                        h('td', { key: 'r', className: rowCls(base, row.idx) }, c ? c.rate + '%' : '—'),
                                        h('td', { key: 'l', className: rowCls(base, row.idx) }, c ? `lv. ${c.level}` : '—'),
                                    ];
                                })()
                                : showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const c = row.perGame[g];
                                    if (!c) return [h('td', { key: g + '-na', colSpan: 2, className: rowCls(null, row.idx) }, 'N/A')];
                                    return [
                                        h('td', { key: g + '-r', className: rowCls(gp, row.idx) }, c.rate + '%'),
                                        h('td', { key: g + '-l', className: rowCls(gp, row.idx) }, `lv. ${c.level}`),
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
    // SlotApp — App component for Surfing / Fishing tables
    // =========================================================
    function SlotApp({ encounterType, mount }) {
        const useState = React.useState, useEffect = React.useEffect;
        const [error, setError] = useState(null);
        const [loading, setLoading] = useState(true);
        const [data, setData] = useState(null);
        const [state, setState] = useState({ view: 'compressed', game: 'All' });

        const locId = inferLocationId(mount);

        useEffect(() => {
            let alive = true;
            getLocationData(locId).then(d => {
                if (alive) { setData(d); setLoading(false); }
            }).catch(e => {
                if (alive) { setError(String((e && e.message) || e)); setLoading(false); }
            });
            return () => { alive = false; };
        }, []);

        // Must be called unconditionally before any early returns (Rules of Hooks).
        const unified = React.useMemo(() => {
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
        if (error) return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data) return null;
		if (data.shellos) SHELLOS = data.shellos;

        const encounters = data.encounters || {};
        const isSeparate = state.game === 'separate';

        let content;

        if (encounterType === 'surfing') {
            const slots = encounters.surfing || [];
            if (slots.length === 0) return null;
            if (isSeparate && !unified) {
                content = h('div', null,
                    GAMES.map(g => h('div', { key: g, style: { marginBottom: 16 } },
                        h(SlotSection, { slots, games: GAMES, gameFilter: g, view: state.view, mount })
                    ))
                );
            } else {
                content = h(SlotSection, { slots, games: GAMES, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified });
            }
        } else if (encounterType === 'fishing') {
            const fish = encounters.fishing || {};
            const hasAny = ['old', 'good', 'super'].some(k => (fish[k] || []).length > 0);
            if (!hasAny) return null;
            if (isSeparate && !unified) {
                content = h('div', null,
                    GAMES.map(g => h('div', { key: g, style: { marginBottom: 16 } },
                        h(FishTable, { fish, games: GAMES, gameFilter: g, view: state.view, mount })
                    ))
                );
            } else {
                content = h(FishTable, { fish, games: GAMES, gameFilter: unified ? 'All' : state.game, view: state.view, mount, unified });
            }
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
        const SELECTOR = '.pokemon-dppt-walking-replace-me';

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
                if (n.__dpptMounted) return;
                n.__dpptMounted = true;
                mountReact(n);
            });
        }

        function mountReact(originalNode) {
            const container = document.createElement('div');
            const copyAttrs = ['data-location-id', 'data-sprite-base', 'data-sprite-gens'];
            for (const a of copyAttrs) {
                const v = originalNode.getAttribute(a);
                if (v != null) container.setAttribute(a, v);
            }
            originalNode.replaceWith(container);
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(App, { mount: container }));
        }

        // ---- Surfing and Fishing mounts ----
        const SLOT_SELECTORS = [
            { selector: '.pokemon-dppt-surfing-replace-me', encounterType: 'surfing' },
            { selector: '.pokemon-dppt-fishing-replace-me', encounterType: 'fishing' },
        ];

        for (const { selector, encounterType } of SLOT_SELECTORS) {
            const slotObs = new MutationObserver(() => mountSlotAll(selector, encounterType));
            slotObs.observe(document.documentElement, { childList: true, subtree: true });
            mountSlotAll(selector, encounterType);
        }

        function mountSlotAll(selector, encounterType) {
            document.querySelectorAll(selector).forEach(n => {
                if (n.__dpptSlotMounted) return;
                n.__dpptSlotMounted = true;
                mountSlotReact(n, encounterType);
            });
        }

        function mountSlotReact(originalNode, encounterType) {
            const container = document.createElement('div');
            const copyAttrs = ['data-location-id', 'data-sprite-base', 'data-sprite-gens'];
            for (const a of copyAttrs) {
                const v = originalNode.getAttribute(a);
                if (v != null) container.setAttribute(a, v);
            }
            originalNode.replaceWith(container);
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(SlotApp, { encounterType, mount: container }));
        }
    })();

})();
