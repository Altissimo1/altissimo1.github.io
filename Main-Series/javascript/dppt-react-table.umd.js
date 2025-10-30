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

    function pickMountNode() { return document.querySelector('#pokemon-dppt-walking .table-collection.walking'); }
    function inferLocationId(mount) { const hinted = mount?.getAttribute('data-location-id'); if (hinted) return hinted; const fname = (location.pathname.split('/').pop() || '').toLowerCase(); const base = fname.replace(/\.html?$/, ''); const FLOOR_GUESSES = { "oreburgh-mine": "oreburgh-mine_1f" }; return FLOOR_GUESSES[base] || base; }
    const byName = (a, b) => a.localeCompare(b);
    function extractWalking(location) { return (location?.pokemon?.encounters || []).filter(b => b?.type === 'walking'); }
    function gamesForEncounter(enc) { return (enc?.games || []).filter(g => GAME_KEYS.has(g)); }
    function labelConditions(conds) { return !conds?.length ? '—' : conds.join(', '); }
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


    // FULL view now groups by Slot + timeKey + all non-time conditions
    function buildFullRows(location, s) {
        const map = new Map();

        for (const block of extractWalking(location)) {
            const { rate, slot, encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const conds = opt.conditions || [];
                const timeKey = normalizeTimeKey(conds);
                const nonTimeConds = conds.filter(c => !TIME_FLAGS.has(c)); // includes swarm/pokeradar/slot-2-*

                // Group key: Slot + time slice + ALL non-time conditions (sorted)
                const condKey = nonTimeConds.slice().sort().join('|');
                const key = `${slot}|${timeKey}|${condKey}`;

                if (!map.has(key)) {
                    map.set(key, {
                        key,
                        slot,
                        rate,               // slot's % (same across games for that slot)
                        timeKey,
                        rawConditions: nonTimeConds, // displayed in the Conditions column
                        perGame: Object.fromEntries(
                            GAMES.map(g => [g, { name: null, levels: new Set() }])
                        ),
                    });
                }

                const rec = map.get(key);

                // Fill per-game species + levels (one species per game for a given slot+conds)
                for (const g of gamesForEncounter(opt)) {
                    const pg = rec.perGame[g];
                    if (pg.name && pg.name !== opt.name) {
                        // Extremely rare: multiple names under same slot+conds+game — keep both
                        pg.name = `${pg.name} / ${opt.name}`;
                    } else if (!pg.name) {
                        pg.name = opt.name;
                    }
                    pg.levels.add(String(opt.level));
                }
            }
        }

        // Finalize levels to arrays
        const out = [];
        for (const [, rec] of map) {
            rec.perGame = Object.fromEntries(
                GAMES.map(g => [g, {
                    name: rec.perGame[g].name,
                    levels: [...rec.perGame[g].levels].sort(),
                }])
            );
            out.push(rec);
        }

        // Sort by slot, then by a stable string of conditions
        return out.sort((a, b) =>
            (a.slot - b.slot) ||
            a.rawConditions.join(',').localeCompare(b.rawConditions.join(','))
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
        // Pass 1: collect by species + time + non-slot2 conds + slot2 variant
        const perVariant = new Map(); // key -> { perGame, levels, meta... }

        for (const block of extractWalking(location)) {
            const { rate, encounters } = block;
            for (const opt of (encounters || [])) {
                if (!encounterOptionMatches(opt.conditions || [], s)) continue;

                const conds = opt.conditions || [];
                const timeKey = normalizeTimeKey(conds);

                // break out slot2 and non-slot2
                const slot2 = (conds.find(c => c.startsWith(SLOT2_PREFIX)) || null);
                const slot2Val = slot2 ? slot2.slice(SLOT2_PREFIX.length) : null; // e.g. 'ruby', 'none', etc.

                const nonSlot2Conds = conds.filter(c => !TIME_FLAGS.has(c) && !c.startsWith(SLOT2_PREFIX));
                const nonSlot2Key = nonSlot2Conds.slice().sort().join('|');

                const key = `${opt.name}|${timeKey}|${nonSlot2Key}|${slot2Val ?? '__no_slot2__'}`;

                if (!perVariant.has(key)) {
                    perVariant.set(key, {
                        name: opt.name,
                        timeKey,
                        nonSlot2Conds: new Set(nonSlot2Conds),
                        slot2Val, // may be null
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

        // helper: stable signature for "are these rows identical across games?"
        function signatureFor(rec) {
            const parts = [];
            for (const g of GAMES) {
                const r = rec.perGame[g].rate;
                const lvls = [...rec.perGame[g].levels].sort().join(',');
                parts.push(`${g}:${r}|${lvls}`);
            }
            return parts.join(';');
        }

        // Pass 2: merge variants that have identical per-game signatures
        const merged = new Map(); // key -> combined row with slot2 variants list
        for (const [, rec] of perVariant) {
            const sig = signatureFor(rec);
            const nonSlot2Key = [...rec.nonSlot2Conds].sort().join('|');
            const groupKey = `${rec.name}|${rec.timeKey}|${nonSlot2Key}|${sig}`;

            if (!merged.has(groupKey)) {
                // clone perGame with arrays instead of sets
                const perGameFinal = Object.fromEntries(GAMES.map(g => [
                    g,
                    {
                        rate: rec.perGame[g].rate,
                        levels: [...rec.perGame[g].levels].sort(),
                    }
                ]));

                merged.set(groupKey, {
                    key: groupKey,
                    name: rec.name,
                    timeKey: rec.timeKey,
                    perGame: perGameFinal,
                    nonSlot2Conds: new Set(rec.nonSlot2Conds),
                    slot2Variants: new Set(), // accumulate variants that share the same signature
                });
            }

            const tgt = merged.get(groupKey);
            if (rec.slot2Val) {
                tgt.slot2Variants.add(rec.slot2Val);
            } else {
                // If there was truly no slot2 condition, do NOT add a Slot2 label.
                // (Many datasets use explicit 'slot-2-none'; those will display as 'None'.)
            }
        }

        // Finalize rows: compose rawConditions (non-slot2 + combined Slot2 list if any)
        const out = [];
        for (const [, row] of merged) {
            const rawConditions = [...row.nonSlot2Conds];

            if (row.slot2Variants.size > 0) {
                const slot2List = [...row.slot2Variants]
                    .sort((a, b) => a.localeCompare(b))
                    .map(titleCaseSlot2)
                    .join(', ');
                rawConditions.push(`Slot2 ${slot2List}`);
            }

            out.push({
                key: row.key,
                name: row.name,
                timeKey: row.timeKey,
                perGame: row.perGame,
                rawConditions,
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

    // --- Sprite helpers & component (replace your current spritePath & Sprite) ---

    // Order of generations to try when falling back.
    // You can override via:
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

    // Build the candidate URL list in the exact order you requested:
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
        const ReactRef = React; // keep minifier-friendly
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
                width: 40,
                height: 40,
                loading: 'lazy',
                style: { width: 40, height: 40, objectFit: 'contain', opacity: 1 },
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

        // If we’ve exhausted candidates, fade the img.
        const style = { width: 40, height: 40, objectFit: 'contain', opacity: src ? 1 : 0.25 };

        return h('img', {
            src,
            alt: props.name,
            width: 40,
            height: 40,
            loading: 'lazy',
            style,
            onLoad: () => {
                if (src) SPRITE_URL_CACHE.set(nm, src);
            },
            onError: () => {
                // Try the next candidate (if any). If none left, blank out src.
                setIdx(i => (i + 1 < candidates.length ? i + 1 : i));
                if (idx + 1 >= candidates.length) {
                    // Final fallback: no sprite found—let opacity drop via style.
                    // (Optional) You could set a placeholder here instead.
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
                options: [{ value: 'All', label: 'All' }, ...GAMES.map(g => ({ value: g, label: g }))]
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

    function Table(props) {
        const rows = props.rows;
        const gameFilter = props.gameFilter;
        const mount = props.mount;
        const view = props.view;
        const showGames = gameFilter === 'All' ? GAMES : [gameFilter];

        // FULL header: Slot, Rate, Conditions, then each game spans 3 cols
        function FullHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { style: th }, 'Slot'),
                    h('th', { style: th }, 'Rate'),
                    h('th', { style: th }, 'Conditions'),
                    ...showGames.map(g => h('th', { key: g, style: th, colSpan: 3 }, g))
                )
            );
        }

        // COMPRESSED header (2-row, games span 2 cols: % + Lv) — unchanged
        function CompressedHeader() {
            return h('thead', null,
                h('tr', null,
                    h('th', { style: th }, 'Pokémon'),
                    h('th', { style: th }, 'Sprite'),
                    ...showGames.map(g => h('th', { key: g, style: th, colSpan: 2 }, g)),
                    h('th', { style: th }, 'Conditions')
                )
            );
        }

        return h('div', { style: { overflowX: 'auto' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                view === 'compressed' ? CompressedHeader() : FullHeader(),
                h('tbody', null,
                    rows.map(r => h('tr', { key: r.key },
                        ...(view === 'full'
                            ? [
                                // FULL view cells
                                h('td', { style: tdMono }, String(r.slot)),
                                h('td', { style: tdMono }, `${r.rate}%`),
                                h('td', { style: td }, [
                                    h(ConditionsCell, { conds: r.rawConditions }),
                                    r.timeKey !== 'anytime' && h(HelpTag, { key: 't' }, r.timeKey)
                                ]),
                                ...showGames.flatMap(g => {
                                    const cell = r.perGame?.[g];
                                    const has = !!(cell && cell.name);
                                    const lv = has ? formatLevels(cell.levels) : '';
                                    return [
                                        h('td', { key: g + ':sprite', style: td }, has ? h(Sprite, { name: cell.name.split(' / ')[0], mount }) : '—'),
                                        h('td', { key: g + ':name', style: td },
                                            has ? cell.name : '—'
                                        ),
                                        h('td', { key: g + ':lv', style: tdMono }, has ? (`Lv. ${lv}` || '—') : '—'),
                                    ];
                                }),

                            ]
                            : [
                                // COMPRESSED view cells (unchanged from your latest)
                                h('td', { style: td }, r.name),
                                h('td', { style: td }, h(Sprite, { name: r.name, mount })),
                                ...showGames.flatMap(g => {
                                    const cell = r.perGame?.[g];
                                    const pct = cell?.rate || 0;
                                    const lvStr = (cell && cell.levels && cell.levels.length) ? formatLevels(cell.levels) : '';
                                    const hasData = !!pct || !!lvStr;
                                    return [
                                        h('td', { key: g + ':pct', style: tdMono }, hasData ? (pct ? `${pct}%` : '—') : '—'),
                                        h('td', { key: g + ':lv', style: tdMono }, hasData ? (lvStr || '—') : '—'),
                                    ];
                                }),
                                h('td', { style: td }, [
                                    h(ConditionsCell, { conds: r.rawConditions }),
                                    r.timeKey !== 'anytime' && h(HelpTag, { key: 't' }, r.timeKey)
                                ]),
                            ]
                        )
                    ))
                )
            ),
            h('p', { style: { fontSize: 12, color: '#666', marginTop: 6 } },
                view === 'compressed'
                    ? 'Note: In compressed view, rates and level ranges are shown per game; mutually exclusive variants remain separate.'
                    : 'Note: Slot Rate is the overall encounter chance for the row; per-game cells show sprite, name, and level.'
            )
        );
    }




    function App(props) {
        const mount = props.mount;
        const useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo;
        const [error, setError] = useState(null); const [loading, setLoading] = useState(true); const [data, setData] = useState([]);
        const [state, setState] = useState({
            view: 'full',
            game: 'All',
            swarm: false,
            pokeradar: false,
            slot2: 'none',
            showAllConditions: true,
            collapsed: false,
        });
        const locationId = inferLocationId(mount);
        useEffect(function () {
            let alive = true;
            (async function () {
                try {
                    const locId = inferLocationId(mount);
                    const LOC_BASE = window.DPPT_LOCATION_BASE || '../javascript/Sinnoh-Locations/';
                    await loadScript(`${LOC_BASE}${locId}.js`);
                    if (!window.DPPT_DATA) throw new Error('DPPT_DATA not found after script load');
                    if (alive) setData([window.DPPT_DATA]);
                    delete window.DPPT_DATA;
                } catch (e) {
                    console.error(e);
                    if (alive) setError(String(e && e.message || e));
                } finally {
                    if (alive) setLoading(false);
                }
            })();
            return function () { alive = false; };
        }, []);

        const location = useMemo(function () { return data.find(function (loc) { return (loc && (loc.name || '').toLowerCase() === String(locationId).toLowerCase()); }) || null; }, [data, locationId]);
        const rows = useMemo(function () { if (!location) return []; return state.view === 'full' ? buildFullRows(location, state) : buildCompressedRows(location, state); }, [location, state]);
        return h('div', { style: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' } },
            // Header bar with title + Hide/Show button
            h('div', {
                style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 0 4px'
                }
            },
                h('h3', { style: { margin: 0 } },
                    'DPPT Walking Encounters',
                    location && [' — ', h('span', { key: 'n', style: { fontWeight: 400 } }, location.name)]
                ),
                h('button', {
                    type: 'button',
                    onClick: () => setState(prev => Object.assign({}, prev, { collapsed: !prev.collapsed })),
                    style: {
                        font: 'inherit', padding: '4px 10px', border: '1px solid #ccc',
                        borderRadius: 6, background: '#f7f7f7', cursor: 'pointer'
                    },
                    'aria-expanded': !state.collapsed
                }, state.collapsed ? 'Show' : 'Hide')
            ),

            // When collapsed, stop here (no controls or table)
            state.collapsed
                ? null
                : (
                    // existing content stays the same under here
                    h('div', { style: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' } },
            h(ViewControls, { state, setState }),
            loading ? h('p', null, 'Loading…') : error ? h('p', { style: { color: 'red' } }, 'Error: ', error) : !location ? h('p', null, 'No matching location for ', h('code', null, String(locationId)), '.') : h(Table, { rows, gameFilter: state.game, mount, view: state.view })
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

