// ==============================================
// pokemon-core.js — game-agnostic utilities, sprite system, and UI atoms
// Load this BEFORE any game-specific table script (dppt.js, bdsp.js, etc.)
//
// Usage:
//   <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="/assets/js/pokemon-core.js"></script>
//   <script src="/assets/js/dppt.js"></script>   <!-- or bdsp.js, etc. -->
//
// Exposes: window.PokemonCore
// ==============================================
(function () {
    if (!window.React || !window.ReactDOM) { console.warn('[pokemon-core] React/ReactDOM globals not found.'); return; }
    const React = window.React;
    const h = React.createElement;

    // =========================================================
    // Time constants (apply to all main-series games)
    // =========================================================
    const TIME_FLAGS = new Set(["morning", "day", "night"]);
    const TIME_ORDER = ["morning", "day", "night"];

    // =========================================================
    // Time helpers
    // =========================================================

    /** Return only the time-of-day tokens from a condition list, in canonical order. */
    function toTimeOnly(conds) {
        const arr = Array.isArray(conds) ? conds : Array.from(conds || []);
        const uniq = Array.from(new Set(arr.filter(c => TIME_FLAGS.has(c))));
        return uniq.sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
    }

    /**
     * Canonicalize a condition list: time-of-day tokens first (sorted), then others.
     * If all three time tokens are present they are dropped (treated as "any time").
     */
    function processConditions(conds) {
        const c = Array.from(conds || []);
        const times = c.filter(x => TIME_FLAGS.has(x));
        const uniqTimes = Array.from(new Set(times));
        const keepTimes = (uniqTimes.length === TIME_FLAGS.size) ? [] : uniqTimes;
        const sortedTimes = keepTimes.sort((a, b) => TIME_ORDER.indexOf(a) - TIME_ORDER.indexOf(b));
        const others = c.filter(x => !TIME_FLAGS.has(x));
        return [...sortedTimes, ...others];
    }

    /** Stable key for grouping by time-of-day only. */
    function normalizeTimeKey(conds) {
        const has = (conds || []).filter(c => TIME_FLAGS.has(c));
        if (has.length === 0) return 'anytime';
        const uniq = Array.from(new Set(has));
        if (uniq.length === TIME_FLAGS.size) return 'anytime';
        return uniq.sort().join('+');
    }

    /**
     * Remove morning/day/night from a condition array when all three are present
     * (making the effective condition "Anytime").
     */
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
        if (hasM && hasD && hasN) return arr.filter(t => !isTime(t));
        return arr;
    }

    /** True if any element of arr is in set. */
    function hasAny(arr, set) { return (arr || []).some(c => set.has(c)); }

    // =========================================================
    // Text / level utilities
    // =========================================================

    /** "some-token" → "Some Token" */
    function humanizeWords(s) {
        return String(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    }

    /**
     * Format a set of level values into a compact human-readable string.
     * - Exactly 2 consecutive integers → "a, b" (not "a-b")
     * - 3+ consecutive integers → "a-z"
     * - Non-integer tokens (e.g., "20-40") → sorted, comma-joined
     */
    function formatLevels(levels) {
        const uniq = Array.from(new Set(levels || []));
        if (uniq.some(v => !/^\d+$/.test(v))) {
            return uniq.sort((a, b) => a.localeCompare(b)).join(', ');
        }
        const nums = uniq.map(v => parseInt(v, 10)).sort((a, b) => a - b);
        function rangeStr(s, p) {
            if (s === p) return String(s);
            if (p - s === 1) return `${s}, ${p}`;
            return `${s}-${p}`;
        }
        const ranges = [];
        let start = null, prev = null;
        for (const n of nums) {
            if (start === null) { start = prev = n; continue; }
            if (n === prev + 1) { prev = n; continue; }
            ranges.push(rangeStr(start, prev));
            start = prev = n;
        }
        if (start !== null) ranges.push(rangeStr(start, prev));
        return ranges.join(', ');
    }

    // =========================================================
    // Misc helpers
    // =========================================================

    const byName = (a, b) => a.localeCompare(b);

    /** Dynamically load a JS file and return a Promise that resolves on load. */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load ' + src));
            document.head.appendChild(s);
        });
    }

    /** Legacy mount-node picker (kept for backward compatibility). */
    function pickMountNode() {
        return document.querySelector('#pokemon-dppt-walking .table-collection.walking');
    }

    /**
     * Derive the location ID from a mount element's data attribute or from the page URL.
     * Accepts an optional map of basename → location-id overrides (e.g. multi-floor dungeons).
     */
    function inferLocationId(mount, floorGuesses) {
        const hinted = mount?.getAttribute('data-location-id');
        if (hinted) return hinted;
        const fname = (location.pathname.split('/').pop() || '').toLowerCase();
        const base = fname.replace(/\.html?$/, '');
        const FLOOR_GUESSES = floorGuesses || { "oreburgh-mine": "oreburgh-mine_1f" };
        return FLOOR_GUESSES[base] || base;
    }

    /** Group an array of row objects into a Map keyed by row.name. */
    function bucketRowsByName(rows) {
        const m = new Map();
        for (const r of rows) {
            if (!m.has(r.name)) m.set(r.name, []);
            m.get(r.name).push(r);
        }
        return m;
    }

    // =========================================================
    // Style objects (shared table cell defaults)
    // =========================================================
    const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 6px', background: '#fafafa', position: 'sticky', top: 0 };
    const td = { borderBottom: '1px solid #eee', padding: '8px 6px' };
    const tdMono = Object.assign({}, td, { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' });

    // =========================================================
    // UI atoms (game-agnostic form controls)
    // =========================================================

    function Toggle(props) {
        return h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12, userSelect: 'none' } },
            h('input', { type: 'checkbox', checked: props.checked, onChange: e => props.onChange(e.target.checked) }),
            h('span', null, props.label));
    }

    function Select(props) {
        return h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12 } },
            h('span', null, props.label),
            h('select', { value: props.value, onChange: e => props.onChange(e.target.value) },
                props.options.map(o => h('option', { key: o.value, value: o.value }, o.label))));
    }

    function HelpTag(props) {
        return h('span', {
            title: 'Mutually exclusive with other time-of-day variants',
            style: { fontSize: 12, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 8, marginLeft: 6 }
        }, props.children);
    }

    // =========================================================
    // Sprite system
    // =========================================================

    /** Default generation search order for sprite fallback. */
    const DEFAULT_GEN_ORDER = ["gen-4", "gen-3", "gen-2", "gen-1"];

    /** Cache the first working URL per normalized name to avoid repeated 404s. */
    const SPRITE_URL_CACHE = new Map();

    /** Normalize a Pokémon name to a filename-safe slug. */
    function normalizedName(name) {
        if (name.indexOf("Nidoran") > -1) return String(name).toLowerCase();
        if (name.indexOf("Farfetch") > -1) return "farfetchd";
        return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    /**
     * Resolve sprite base directories to try, in order.
     * Reads data-sprite-gens / data-sprite-base from the mount element,
     * or falls back to window globals / sensible defaults.
     */
    function spriteBaseDirs(mount) {
        const gensAttr = mount?.getAttribute('data-sprite-gens');
        const gens = (gensAttr ? gensAttr.split(',').map(s => s.trim()).filter(Boolean)
            : (window.POKEMON_SPRITE_GENS || DEFAULT_GEN_ORDER));
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

    /**
     * Build an ordered list of sprite URLs to try for a given Pokémon name.
     * Tries name-f.png → name-m.png → name.png across each generation.
     */
    function spriteCandidates(name, mount) {
        const nm = normalizedName(name);
        const bases = spriteBaseDirs(mount);
        const files = [`${nm}-f.png`, `${nm}-m.png`, `${nm}.png`];
        const out = [];
        for (const base of bases) for (const f of files) out.push(base + f);
        return out;
    }

    // =========================================================
    // Export
    // =========================================================
    window.PokemonCore = {
        // Time
        TIME_FLAGS, TIME_ORDER,
        toTimeOnly, processConditions, normalizeTimeKey, stripFullTimeTriplet, hasAny,
        // Text / levels
        humanizeWords, formatLevels,
        // Helpers
        byName, loadScript, pickMountNode, inferLocationId, bucketRowsByName,
        // Styles
        th, td, tdMono,
        // UI atoms
        Toggle, Select, HelpTag,
        // Sprite system
        DEFAULT_GEN_ORDER, SPRITE_URL_CACHE,
        normalizedName, spriteBaseDirs, spriteCandidates,
    };

})();
