// ==============================================
// honey.js — Honey Tree encounter table renderer (DPPt)
//
// Requires (in order):
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="../javascript/pokemon-core.js"></script>
//   <script src="../javascript/honey.js"></script>
//
// The data file (honey-tree.js, sets window.DPPT_HONEY_TREE_DATA) is loaded lazily
// on first mount. Override the load path with window.HONEY_TREE_BASE
// (default: '../javascript/').
//
// Mount selector: .pokemon-dppt-honey-replace-me
// ==============================================

window.DPPT_HONEY_TREE_DATA = {
  "col1": [
    // slot 0 — 40%
    { "Diamond": "Wurmple",  "Pearl": "Wurmple",  "Platinum": "Combee"  },
    // slot 1 — 20%
    { "Diamond": "Silcoon",  "Pearl": "Cascoon",  "Platinum": "Wurmple" },
    // slot 2 — 20%
    { "Diamond": "Combee",   "Pearl": "Combee",   "Platinum": "Burmy"   },
    // slot 3 — 10%
    { "Diamond": "Burmy",    "Pearl": "Burmy",    "Platinum": "Cherubi" },
    // slot 4 — 5%
    { "Diamond": "Cherubi",  "Pearl": "Cherubi",  "Platinum": "Aipom"   },
    // slot 5 — 5%
    { "Diamond": "Aipom",    "Pearl": "Aipom",    "Platinum": "Aipom"   }
  ],
  "col2": [
    { "Diamond": "Combee",    "Pearl": "Combee",    "Platinum": "Burmy"     },
    { "Diamond": "Burmy",     "Pearl": "Burmy",     "Platinum": "Cherubi"   },
    { "Diamond": "Cherubi",   "Pearl": "Cherubi",   "Platinum": "Combee"    },
    { "Diamond": "Aipom",     "Pearl": "Aipom",     "Platinum": "Aipom"     },
    { "Diamond": "Heracross", "Pearl": "Heracross", "Platinum": "Aipom"     },
    { "Diamond": "Wurmple",   "Pearl": "Wurmple",   "Platinum": "Heracross" }
  ]
  // col3 omitted — always Munchlax, renderer constant
};


(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[honey] React/ReactDOM not found.'); return; }
    if (!window.PokemonCore) { console.warn('[honey] pokemon-core.js must be loaded before honey.js.'); return; }

    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const h = React.createElement;

    const {
        loadScript,
        Select,
        SPRITE_URL_CACHE, normalizedName, spriteBaseDirs, spriteCandidates,
    } = window.PokemonCore;

    // =========================================================
    // Constants
    // =========================================================
    const GAMES = ['Diamond', 'Pearl', 'Platinum'];

    // Slot indices 0–5 map to these encounter rates.
    const SLOT_RATES = [40, 20, 20, 10, 5, 5];

    // Level range shared by all honey tree encounters.
    const LEVEL = '5-15';

    // Column 3 is always this Pokémon for every slot and every game.
    const COL3_MON = 'Munchlax';

    // Column selection weights (out of 100) for each tree type.
    // 'none' is the probability of no encounter being generated.
    const NORMAL_WEIGHTS   = { col1: 70, col2: 20, col3:  0, none: 10 };
    const MUNCHLAX_WEIGHTS = { col1: 20, col2: 70, col3:  1, none:  9 };

    const gamePrefix = g => g.toLowerCase();

    // =========================================================
    // CSS class helpers  (match common.css conventions in dppt.js)
    // =========================================================

    // Zebra-stripe by slot number (odd slot → -true).
    function slotCls(prefix, slot) {
        const p = prefix || 'light';
        return `${p}-${(Number(slot) || 0) % 2 === 1 ? 'true' : 'false'}`;
    }

    // Zebra-stripe by row index (odd index → -true).
    function rowCls(prefix, idx) {
        const p = prefix || 'light';
        return `${p}-${idx % 2 === 1 ? 'true' : 'false'}`;
    }

    // Header cell class.  g = null → neutral (light).
    function hdrCls(g, basePrefix) {
        return g ? `${gamePrefix(g)}-true` : `${basePrefix || 'light'}-true`;
    }

    // =========================================================
    // Rate formatting
    // =========================================================

    // Display a percentage with up to one decimal place, no trailing zero.
    // e.g. 40 → "40%",  11.5 → "11.5%",  3.5 → "3.5%"
    function formatRate(r) {
        return (Math.round(r * 10) / 10) + '%';
    }

    // =========================================================
    // Sprite component  (local copy with Burmy plant-form override)
    // =========================================================
    function Sprite({ name, mount }) {
        const nm = normalizedName(name);
        const isBurmy = (name === 'Burmy');

        // Burmy: always show the Plant Cloak sprite.
        // Build candidates normally for every other Pokémon.
        const candidates = React.useMemo(() => {
            if (isBurmy) {
                const bases = spriteBaseDirs(mount);
                const gen4 = bases.find(b => b.includes('/gen-4/')) || bases[0];
                return [gen4 + 'burmy-plant.png'];
            }
            const list = spriteCandidates(name, mount);
            const cached = SPRITE_URL_CACHE.get(nm);
            if (cached) {
                const idx = list.indexOf(cached);
                if (idx > 0) return [cached, ...list.slice(0, idx), ...list.slice(idx + 1)];
            }
            return list;
        }, [name, mount]);

        const [idx, setIdx] = React.useState(0);
        const src = candidates[idx] || '';
        React.useEffect(() => { setIdx(0); }, [name]);

        return h('img', {
            src,
            alt: name,
            loading: 'lazy',
            className: 'flex-img',
            onLoad:  () => { if (src && !isBurmy) SPRITE_URL_CACHE.set(nm, src); },
            onError: () => {
                React.startTransition(() => {
                    setIdx(i => i + 1 < candidates.length ? i + 1 : i);
                });
            },
        });
    }

    // =========================================================
    // Data loading
    // =========================================================
    let dataPromise = null;

    function getHoneyTreeData() {
        if (dataPromise) return dataPromise;
        if (window.DPPT_HONEY_TREE_DATA) {
            dataPromise = Promise.resolve(window.DPPT_HONEY_TREE_DATA);
            return dataPromise;
        }
        const base = window.HONEY_TREE_BASE || '../javascript/';
        dataPromise = loadScript(base + 'honey-tree.js').then(() => {
            if (!window.DPPT_HONEY_TREE_DATA) throw new Error('HONEY_TREE_DATA not found after script load');
            return window.DPPT_HONEY_TREE_DATA;
        });
        return dataPromise;
    }

    // =========================================================
    // Data derivation — Full view
    // =========================================================

    /**
     * Returns 6 row objects, one per slot:
     *   { slot, rate, col1, col2, col3 }
     * where col* is { Diamond, Pearl, Platinum } → Pokémon name.
     * col3 is synthesised (always COL3_MON for every game).
     */
    function buildFullRows(data) {
        const col3 = Object.fromEntries(GAMES.map(g => [g, COL3_MON]));
        return SLOT_RATES.map((rate, slot) => ({
            slot,
            rate,
            col1: data.col1[slot],
            col2: data.col2[slot],
            col3,
        }));
    }

    // =========================================================
    // Data derivation — Compressed view
    // =========================================================

    /**
     * Returns one object per unique Pokémon:
     *   { name, perGame: { [game]: { normalRate, munchlaxRate } } }
     *
     * perGame only has an entry for games where the Pokémon is reachable
     * (i.e. at least one of the two rates is > 0).
     */
    function buildCompressedRows(data) {
        const names = new Set();
        for (let i = 0; i < 6; i++) {
            for (const g of GAMES) {
                names.add(data.col1[i][g]);
                names.add(data.col2[i][g]);
            }
        }
        names.add(COL3_MON);

        const rows = [];
        for (const name of names) {
            const perGame = {};
            for (const g of GAMES) {
                let col1Rate = 0, col2Rate = 0;
                for (let i = 0; i < 6; i++) {
                    if (data.col1[i][g] === name) col1Rate += SLOT_RATES[i];
                    if (data.col2[i][g] === name) col2Rate += SLOT_RATES[i];
                }
                const col3Rate = (name === COL3_MON) ? 100 : 0;

                const normalRate   = col1Rate * NORMAL_WEIGHTS.col1   / 100
                                   + col2Rate * NORMAL_WEIGHTS.col2   / 100;
                const munchlaxRate = col1Rate * MUNCHLAX_WEIGHTS.col1 / 100
                                   + col2Rate * MUNCHLAX_WEIGHTS.col2 / 100
                                   + col3Rate * MUNCHLAX_WEIGHTS.col3 / 100;

                if (normalRate > 0 || munchlaxRate > 0) {
                    perGame[g] = { normalRate, munchlaxRate };
                }
            }
            if (Object.keys(perGame).length > 0) {
                rows.push({ name, perGame });
            }
        }
        return rows;
    }

    /**
     * Sort compressed rows:
     *   1. By number of showGames where the Pokémon is present (more = first).
     *   2. By sum of Normal tree rates across those games (higher = first).
     *      Munchlax has a Normal rate of 0 in all games, so it naturally falls
     *      below all mons with any Normal tree presence but above game-exclusive
     *      mons (Silcoon, Cascoon) because it is present in all 3 games.
     *   3. By earliest game the Pokémon appears in (Diamond < Pearl < Platinum).
     *      Ensures Silcoon (Diamond) sorts before Cascoon (Pearl).
     *   4. Alphabetical tiebreaker.
     */
    const GAME_RANK = Object.fromEntries(GAMES.map((g, i) => [g, i]));

    function sortCompressedRows(rows, showGames) {
        return rows.slice().sort((a, b) => {
            const aC = showGames.filter(g => a.perGame[g]).length;
            const bC = showGames.filter(g => b.perGame[g]).length;
            if (aC !== bC) return bC - aC;
            const aN = showGames.reduce((s, g) => s + (a.perGame[g]?.normalRate || 0), 0);
            const bN = showGames.reduce((s, g) => s + (b.perGame[g]?.normalRate || 0), 0);
            if (aN !== bN) return bN - aN;
            const aRank = Math.min(...showGames.filter(g => a.perGame[g]).map(g => GAME_RANK[g] ?? 99));
            const bRank = Math.min(...showGames.filter(g => b.perGame[g]).map(g => GAME_RANK[g] ?? 99));
            if (aRank !== bRank) return aRank - bRank;
            return a.name.localeCompare(b.name);
        });
    }

    // =========================================================
    // View controls
    // =========================================================
    function HoneyControls({ state, setState }) {
        const set = p => setState(prev => Object.assign({}, prev, p));
        return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '8px 0 12px' } },
            h(Select, {
                label: 'View',
                value: state.view,
                onChange: v => set({ view: v }),
                options: [
                    { value: 'full',       label: 'Full (slots)' },
                    { value: 'compressed', label: 'Compressed'   },
                ],
            }),
            h(Select, {
                label: 'Game',
                value: state.game,
                onChange: v => set({ game: v }),
                options: [
                    { value: 'All',      label: 'All'      },
                    { value: 'separate', label: 'Separate' },
                    ...GAMES.map(g => ({ value: g, label: g })),
                ],
            }),
        );
    }

    // =========================================================
    // Full-view table
    // =========================================================
    const COLS       = ['col1', 'col2', 'col3'];
    const COL_LABELS = ['Column 1', 'Column 2', 'Column 3'];

    function HoneyFullTable({ data, gameFilter, mount }) {
        const isSingle  = GAMES.includes(gameFilter);
        const showGames = isSingle ? [gameFilter] : GAMES;
        const base      = isSingle ? gamePrefix(gameFilter) : 'light';
        const rows      = buildFullRows(data);
        const caption   = isSingle ? `${gameFilter} (Full)` : 'Combined (Full)';

        if (isSingle) {
            // One header row; each column group is colspan=2 (sprite + name).
            return h('div', { style: { overflowX: 'auto' } },
                h('table', null,
                    h('caption', null, caption),
                    h('thead', null,
                        h('tr', null,
                            h('th', { className: hdrCls(null, base) }, 'Slot'),
                            h('th', { className: hdrCls(null, base) }, 'Rate'),
                            ...COLS.map((_, ci) =>
                                h('th', { key: ci, colSpan: 2, className: hdrCls(null, base) }, COL_LABELS[ci])
                            ),
                            h('th', { className: hdrCls(null, base) }, 'Level'),
                        )
                    ),
                    h('tbody', null,
                        rows.map(row =>
                            h('tr', { key: row.slot },
                                h('td', { className: slotCls(base, row.slot) }, row.slot),
                                h('td', { className: slotCls(base, row.slot) }, row.rate + '%'),
                                ...COLS.flatMap(col => {
                                    const name = row[col][gameFilter];
                                    return [
                                        h('td', { key: col + '-s', className: slotCls(base, row.slot) },
                                            h(Sprite, { name, mount })),
                                        h('td', { key: col + '-n', className: slotCls(base, row.slot) }, name),
                                    ];
                                }),
                                h('td', { className: slotCls(base, row.slot) }, 'lv. ' + LEVEL),
                            )
                        )
                    )
                )
            );
        }

        // Combined: two header rows.
        // Row 1: Slot(rs=2) | Rate(rs=2) | Column N (cs=6) × 3 | Level(rs=2)
        // Row 2: Diamond(cs=2) | Pearl(cs=2) | Platinum(cs=2)  — repeated per column
        return h('div', { style: { overflowX: 'auto' } },
            h('table', null,
                h('caption', null, caption),
                h('thead', null,
                    h('tr', null,
                        h('th', { rowSpan: 2, className: hdrCls(null, base) }, 'Slot'),
                        h('th', { rowSpan: 2, className: hdrCls(null, base) }, 'Rate'),
                        ...COL_LABELS.map((label, ci) =>
                            h('th', { key: ci, colSpan: 6, className: hdrCls(null, base) }, label)
                        ),
                        h('th', { rowSpan: 2, className: hdrCls(null, base) }, 'Level'),
                    ),
                    h('tr', null,
                        ...COLS.flatMap((_, ci) =>
                            GAMES.map(g =>
                                h('th', { key: ci + '-' + g, colSpan: 2, className: hdrCls(g) }, g)
                            )
                        )
                    )
                ),
                h('tbody', null,
                    rows.map(row =>
                        h('tr', { key: row.slot },
                            h('td', { className: slotCls('light', row.slot) }, row.slot),
                            h('td', { className: slotCls('light', row.slot) }, row.rate + '%'),
                            ...COLS.flatMap(col =>
                                GAMES.flatMap(g => {
                                    const name = row[col][g];
                                    const gp   = gamePrefix(g);
                                    return [
                                        h('td', { key: col + '-' + g + '-s', className: slotCls(gp, row.slot) },
                                            h(Sprite, { name, mount })),
                                        h('td', { key: col + '-' + g + '-n', className: slotCls(gp, row.slot) }, name),
                                    ];
                                })
                            ),
                            h('td', { className: slotCls('light', row.slot) }, 'lv. ' + LEVEL),
                        )
                    )
                )
            )
        );
    }

    // =========================================================
    // Compressed-view table
    // =========================================================
    function HoneyCompressedTable({ data, gameFilter, mount }) {
        const isSingle  = GAMES.includes(gameFilter);
        const showGames = isSingle ? [gameFilter] : GAMES;
        const base      = isSingle ? gamePrefix(gameFilter) : 'light';
        const caption   = isSingle ? `${gameFilter} (Compressed)` : 'Combined (Compressed)';

        const allRows = buildCompressedRows(data);
        const rows    = sortCompressedRows(
            isSingle ? allRows.filter(r => r.perGame[gameFilter]) : allRows,
            showGames
        );

        // The "No Pokémon" row always sits at the bottom; its stripe index follows
        // immediately after the last species row.
        const noneIdx = rows.length;

        if (isSingle) {
            return h('div', { style: { overflowX: 'auto' } },
                h('table', null,
                    h('caption', null, caption),
                    h('thead', null,
                        h('tr', null,
                            h('th', { colSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                            h('th', { className: hdrCls(null, base) }, 'Normal tree'),
                            h('th', { className: hdrCls(null, base) }, 'Munchlax tree'),
                            h('th', { className: hdrCls(null, base) }, 'Level'),
                        )
                    ),
                    h('tbody', null,
                        rows.map((row, i) => {
                            const pg         = row.perGame[gameFilter];
                            const normalStr  = (pg && pg.normalRate   > 0) ? formatRate(pg.normalRate)   : 'N/A';
                            const munchStr   = (pg && pg.munchlaxRate > 0) ? formatRate(pg.munchlaxRate) : 'N/A';
                            return h('tr', { key: row.name },
                                h('td', { className: rowCls(base, i) }, h(Sprite, { name: row.name, mount })),
                                h('td', { className: rowCls(base, i) }, row.name),
                                // In single-game view all cells use the game color, matching the
                                // old HTML where the <tr> class propagated to every cell.
                                h('td', { className: rowCls(base, i) }, normalStr),
                                h('td', { className: rowCls(base, i) }, munchStr),
                                h('td', { className: rowCls(base, i) }, 'lv. ' + LEVEL),
                            );
                        }),
                        h('tr', { key: 'none' },
                            h('td', { colSpan: 2, className: rowCls(base, noneIdx) }, 'No Pokémon'),
                            h('td', { className: rowCls(base, noneIdx) }, '10%'),
                            h('td', { className: rowCls(base, noneIdx) }, '9%'),
                            h('td', { className: rowCls(base, noneIdx) }, 'N/A'),
                        )
                    )
                )
            );
        }

        // Combined compressed:
        // Header row 1: Pokémon(rs=2, cs=2) | Normal tree(cs=3) | Munchlax tree(cs=3) | Level(rs=2)
        // Header row 2: Diamond | Pearl | Platinum | Diamond | Pearl | Platinum
        return h('div', { style: { overflowX: 'auto' } },
            h('table', null,
                h('caption', null, caption),
                h('thead', null,
                    h('tr', null,
                        h('th', { colSpan: 2, rowSpan: 2, className: hdrCls(null, base) }, 'Pokémon'),
                        h('th', { colSpan: 3, className: hdrCls(null, base) }, 'Normal tree'),
                        h('th', { colSpan: 3, className: hdrCls(null, base) }, 'Munchlax tree'),
                        h('th', { rowSpan: 2, className: hdrCls(null, base) }, 'Level'),
                    ),
                    h('tr', null,
                        ...GAMES.map(g => h('th', { key: 'n-' + g, className: hdrCls(g) }, g)),
                        ...GAMES.map(g => h('th', { key: 'm-' + g, className: hdrCls(g) }, g)),
                    )
                ),
                h('tbody', null,
                    rows.map((row, i) =>
                        h('tr', { key: row.name },
                            h('td', { className: rowCls('light', i) }, h(Sprite, { name: row.name, mount })),
                            h('td', { className: rowCls('light', i) }, row.name),
                            // Normal tree columns — use game color when present, light for N/A.
                            ...GAMES.map(g => {
                                const pg  = row.perGame[g];
                                const has = pg && pg.normalRate > 0;
                                return h('td', {
                                    key:       'n-' + g,
                                    className: has ? rowCls(gamePrefix(g), i) : rowCls(null, i),
                                }, has ? formatRate(pg.normalRate) : 'N/A');
                            }),
                            // Munchlax tree columns — same logic.
                            ...GAMES.map(g => {
                                const pg  = row.perGame[g];
                                const has = pg && pg.munchlaxRate > 0;
                                return h('td', {
                                    key:       'm-' + g,
                                    className: has ? rowCls(gamePrefix(g), i) : rowCls(null, i),
                                }, has ? formatRate(pg.munchlaxRate) : 'N/A');
                            }),
                            h('td', { className: rowCls('light', i) }, 'lv. ' + LEVEL),
                        )
                    ),
                    h('tr', { key: 'none' },
                        h('td', { colSpan: 2, className: rowCls('light', noneIdx) }, 'No Pokémon'),
                        ...GAMES.map(g => h('td', { key: 'n-' + g, className: rowCls(gamePrefix(g), noneIdx) }, '10%')),
                        ...GAMES.map(g => h('td', { key: 'm-' + g, className: rowCls(gamePrefix(g), noneIdx) }, '9%')),
                        h('td', { className: rowCls('light', noneIdx) }, 'N/A'),
                    )
                )
            )
        );
    }

    // =========================================================
    // HoneyTable — dispatches to the appropriate sub-component
    // =========================================================
    function HoneyTable({ data, gameFilter, view, mount }) {
        if (view === 'full') return h(HoneyFullTable,       { data, gameFilter, mount });
        return                      h(HoneyCompressedTable, { data, gameFilter, mount });
    }

    // =========================================================
    // HoneyApp — top-level stateful component
    // =========================================================
    function HoneyApp({ mount }) {
        const [loading, setLoading] = React.useState(true);
        const [error,   setError  ] = React.useState(null);
        const [data,    setData   ] = React.useState(null);
        const [state,   setState  ] = React.useState({ view: 'compressed', game: 'All' });

        React.useEffect(() => {
            let alive = true;
            getHoneyTreeData()
                .then(d  => { if (alive) { setData(d);                  setLoading(false); } })
                .catch(e => { if (alive) { setError(String(e?.message || e)); setLoading(false); } });
            return () => { alive = false; };
        }, []);

        if (loading) return h('p', null, 'Loading…');
        if (error)   return h('p', { style: { color: 'red' } }, 'Error: ', error);
        if (!data)   return null;

        const content = state.game === 'separate'
            ? h('div', null,
                GAMES.map(g =>
                    h('div', { key: g, style: { marginBottom: 16 } },
                        h(HoneyTable, { data, gameFilter: g, view: state.view, mount })
                    )
                )
              )
            : h(HoneyTable, { data, gameFilter: state.game, view: state.view, mount });

        return h('div', null,
            h(HoneyControls, { state, setState }),
            content
        );
    }

    // =========================================================
    // Boot — mount on every .pokemon-dppt-honey-replace-me node
    // =========================================================
    (function boot() {
        const SELECTOR = '.pokemon-dppt-honey-replace-me';

        function mountAll() {
            document.querySelectorAll(SELECTOR).forEach(node => {
                if (node.__honeyMounted) return;
                node.__honeyMounted = true;

                const container = document.createElement('div');
                // Propagate sprite-path overrides; no data-location-id (data is global).
                for (const attr of ['data-sprite-base', 'data-sprite-gens']) {
                    const v = node.getAttribute(attr);
                    if (v != null) container.setAttribute(attr, v);
                }
                node.replaceWith(container);
                ReactDOM.createRoot(container).render(h(HoneyApp, { mount: container }));
            });
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            mountAll();
        } else {
            document.addEventListener('DOMContentLoaded', mountAll, { once: true });
        }

        new MutationObserver(mountAll)
            .observe(document.documentElement, { childList: true, subtree: true });
    })();

})();