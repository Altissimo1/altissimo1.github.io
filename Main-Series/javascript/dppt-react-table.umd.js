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
    const zebra = (prefix, rowIndex) =>  prefix ? `${prefix}-${(rowIndex % 2 === 0) ? 'false' : 'true'}` : `light-${(rowIndex % 2 === 0) ? 'false' : 'true'}`;


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
        // Pass 1: collect by species + (non-slot2 conds incl. time) + slot2 variant
        const perVariant = new Map();

        for (const block of extractWalking(location)) {
            const { rate, encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const allConds = processConditions(opt.conditions || []);
                const slot2 = (allConds.find(c => c.startsWith(SLOT2_PREFIX)) || null);
                const slot2Val = slot2 ? slot2.slice(SLOT2_PREFIX.length) : null;

                // Non-slot2 conditions (includes Morning/Day/Night if present)
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
                const games = gamesForEncounter(opt);
                for (const g of games) {
                    rec.perGame[g].rate += (Number(rate) || 0);
                    rec.perGame[g].levels.add(String(opt.level));
                    if (slot2Val) rec.slot2PerGame[g].add(slot2Val);
                }
            }
        }

        // helper: per-game signature for merging slot2 variants
        function signatureFor(rec) {
            const parts = [];
            for (const g of GAMES) {
                const r = rec.perGame[g].rate;
                const lvls = [...rec.perGame[g].levels].sort().join(',');
                parts.push(`${g}:${r}|${lvls}`);
            }
            return parts.join(';');
        }

        // Pass 2: merge variants with identical per-game signatures
        const merged = new Map();
        for (const [, rec] of perVariant) {
            const sig = signatureFor(rec);
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
                    // union across variants as they merge
                    slot2PerGame: slot2PerGameFinal,
                });
            }

            const tgt = merged.get(groupKey);
            for (const g of GAMES) {
                for (const v of rec.slot2PerGame[g]) tgt.slot2PerGame[g].add(v);
            }
        }

        // Finalize rows: keep non-slot2 (incl. time) and compute union of slot2 variants across all games
        const out = [];
        for (const [, row] of merged) {
            const slot2All = new Set();
            for (const g of GAMES) {
                for (const v of row.slot2PerGame[g]) slot2All.add(v);
            }

            const baseConds = [...row.nonSlot2Conds];   // canonical non-slot2 (includes time tokens)
            out.push({
                key: row.key,
                name: row.name,
                perGame: row.perGame,
                nonSlot2Conds: baseConds,
                slot2PerGame: row.slot2PerGame,
                slot2All,
                rawConditions: baseConds,
                timeConds: toTimeOnly(baseConds)
            });
        }


        return out.sort((a, b) => byName(a.name, b.name));

    }


    function buildCompressedRowsFiltered(location, s) {
        // Group by species + time-of-day ONLY; sum rates, union levels (per game).
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
                        key,
                        name: opt.name,
                        timeConds: times,
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

        // finalize
        const out = [];
        for (const [, rec] of map) {
            out.push({
                key: rec.key,
                name: rec.name,
                timeConds: rec.timeConds,
                rawConditions: timeLabelList(rec.timeConds),
                perGame: Object.fromEntries(
                    GAMES.map(g => [g, {
                        rate: rec.perGame[g].rate,
                        levels: [...rec.perGame[g].levels].sort()
                    }])
                ),
            });
        }
        return out.sort((a, b) => byName(a.name, b.name));
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
                    const baseOnly = rawConds.filter(c => !/^Slot2:/.test(c));
                    return {
                        key: `${m.name}|${rawConds.join('|')}|${m.rate}|${levels.join(',')}`,
                        name: m.name,
                        perGame: { [g]: { rate: m.rate, levels } },
                        rawConditions: rawConds,
                        nonSlot2Conds: baseOnly,
                        timeConds: toTimeOnly(baseOnly)
                    };
                })
                .sort((a, b) => byName(a.name, b.name));
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
                                h('td', { className: zebra('light', rowIndex) }, String(r.slot)),
                                h('td', { className: zebra('light', rowIndex) }, `${r.rate}%`),
                                h('td', { className: zebra('light', rowIndex) }, [
                                    h(ConditionsCell, { conds: r.rawConditions })
                                ]),

                                ...showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const cell = r.perGame?.[g];
                                    const has = !!(cell && cell.name);
                                    const lv = has ? formatLevels(cell.levels) : '';
                                    return [
                                        h('td', { key: g + ':sprite', className: zebra(gp, rowIndex) },
                                            has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'
                                        ),
                                        h('td', { key: g + ':name', className: zebra(gp, rowIndex) },
                                            has ? cell.name : '—'
                                        ),
                                        h('td', { key: g + ':lv', className: zebra(gp, rowIndex) },
                                            has ? (`lv. ${lv}` || '—') : '—'
                                        ),
                                    ];
                                }),
                            ]
                            : [
                                // COMPRESSED
								r.key == processedRows.find(x => x.name == r.name).key
									? h('td', { rowSpan: processedRows.filter(x => x.name == r.name).length, className: zebra('light', rowIndex) }, h(Sprite, { name: r.name, mount }))
									: null,
								r.key == processedRows.find(x => x.name == r.name).key
									? h('td', { rowSpan: processedRows.filter(x => x.name == r.name).length, className: zebra('light', rowIndex),  }, r.name)
									: null,
									
                                ...showGames.flatMap(g => {
                                    const gp = gamePrefix(g);
                                    const cell = r.perGame?.[g];
                                    const pct = cell?.rate || 0;
                                    const lvStr = (cell && cell.levels && cell.levels.length) ? formatLevels(cell.levels) : '';
                                    const hasData = !!pct || !!lvStr;
                                    return [
                                        h('td', { key: g + ':pct', colSpan: hasData ? 1 : 2, className: hasData ? zebra(gp, rowIndex) : zebra(null, rowIndex) }, hasData ? (pct ? `${pct}%` : '—') : 'N/A'),
										hasData ?
											h('td', { key: g + ':lv', className: zebra(gp, rowIndex) }, (`lv. ${lvStr}` || '—'))
											: null,
                                    ];
                                }),
                                h('td', { className: zebra('light', rowIndex) }, (function () {
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

