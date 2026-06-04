/**
 * stat-toggle.js
 *
 * Adds a toggle to tables that have paired IV & EV stat columns, allowing
 * the user to switch between viewing raw IV/EV values and calculated stats.
 *
 * REQUIREMENTS
 *   - base-stats.js must be loaded before this script (provides BASE_STATS constant)
 *   - Tables are auto-detected: any table whose <thead> contains a <th> with "IV"
 *     in its text is treated as toggleable
 *   - In each Pokémon's data row, add:
 *       data-species="species-key"   on the name cell  (e.g. "wormadam-sandy")
 *       data-nature="nature-name"    on the nature cell (e.g. "impish")
 *     Species keys follow the same normalization as base-stats.js:
 *       lowercase, spaces→hyphens, dots/? removed, (Form)→-form
 *
 * PAGE-LEVEL CONFIGURATION (optional, define before loading this script)
 *   const STAT_TOGGLE_CONFIG = {
 *     defaultLevel:    50,    // level assumed for stat calculation
 *     showLevelWidget: false, // true = show level + IV-override inputs
 *     formula:      'gen3',   // 'gen3' (default) or 'gen1' (Gen 1/2 Stat Exp formula)
 *   };
 *
 * FORMULA NOTES
 *   'gen3' (default): Gen 3+ formula with EVs (0–252), IVs (0–31), and natures.
 *   'gen1': Gen 1/2 formula. EVs are Stat Exp (0–65535); IVs are DVs (0–15).
 *     Stat Exp bonus = ceil(sqrt(StatExp)) / 4  — kept as a decimal inside the
 *     outer floor, capped at 63. Equivalent to Excel CEILING(SQRT(se),1)/4.
 *     No nature modifier.
 *     The 'spc' stat key is special: a single "Spc IV & EV" column provides the
 *     DV/StatExp for both SpA and SpD. In calculated view it expands into two
 *     columns (SpA and SpD) using the separate spa/spd base stats.
 *
 * TOGGLE UI PLACEMENT
 *   If the page contains <div id="stat-toggle-container"></div>, the controls
 *   are injected there. Otherwise they are inserted before the first toggleable
 *   table. For stargazer-colosseum.html, place the container div in the
 *   existing checkbox section near the top of the page.
 */

(function () {
  'use strict';

  // ─── Page-level config ────────────────────────────────────────────────────

  var defaults = {
    defaultLevel:    50,
    showLevelWidget: false,
    formula:         'gen3',
  };
  var config = Object.assign({}, defaults, window.STAT_TOGGLE_CONFIG || {});

  // ─── Nature modifier table ────────────────────────────────────────────────
  // boost/lower are stat keys ('atk','def','spa','spd','spe'), or null for neutral.
  // HP is never affected by nature.

  var NATURES = {
    hardy:   { boost: null,   lower: null   },
    lonely:  { boost: 'atk', lower: 'def'  },
    brave:   { boost: 'atk', lower: 'spe'  },
    adamant: { boost: 'atk', lower: 'spa'  },
    naughty: { boost: 'atk', lower: 'spd'  },
    bold:    { boost: 'def', lower: 'atk'  },
    docile:  { boost: null,   lower: null   },
    relaxed: { boost: 'def', lower: 'spe'  },
    impish:  { boost: 'def', lower: 'spa'  },
    lax:     { boost: 'def', lower: 'spd'  },
    timid:   { boost: 'spe', lower: 'atk'  },
    hasty:   { boost: 'spe', lower: 'def'  },
    serious: { boost: null,   lower: null   },
    jolly:   { boost: 'spe', lower: 'spa'  },
    naive:   { boost: 'spe', lower: 'spd'  },
    modest:  { boost: 'spa', lower: 'atk'  },
    mild:    { boost: 'spa', lower: 'def'  },
    quiet:   { boost: 'spa', lower: 'spe'  },
    bashful: { boost: null,   lower: null   },
    rash:    { boost: 'spa', lower: 'spd'  },
    calm:    { boost: 'spd', lower: 'atk'  },
    gentle:  { boost: 'spd', lower: 'def'  },
    sassy:   { boost: 'spd', lower: 'spe'  },
    careful: { boost: 'spd', lower: 'spa'  },
    quirky:  { boost: null,   lower: null   },
  };

  // Maps the first word of a stat header (lowercased) to an internal key.
  // "HP IV & EV" → "hp", "SpA IV & EV" → "spa", etc.
  var HEADER_TO_KEY = {
    hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', spc: 'spc',
  };

  // Display labels for the calculated-stat column headers.
  var STAT_LABELS = {
    hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', spc: 'Spc',
  };

  // ─── Species name normalization ───────────────────────────────────────────
  /**
   * Converts a display name from the HTML cell to the key used in BASE_STATS.
   * "Wormadam (Sandy) ♀" → "wormadam-sandy"
   * "Mr. Mime ♂"         → "mr-mime"
   * "Porygon-Z"          → "porygon-z"
   * Must produce the same results as the normalization used when building base-stats.js.
   */
  function normalizeSpecies(name) {
    return name
      .replace(/[♂♀]/g, '')
      .replace(/\./g, '')
      .replace(/\?/g, '')
      .toLowerCase()
      .replace(/\s*\(([^)]+)\)/g, function (_, form) {
        return '-' + form.toLowerCase().replace(/\s+/g, '-');
      })
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ─── Nature modifier lookup ───────────────────────────────────────────────
  /**
   * Returns 1.1, 0.9, or 1.0 depending on whether the given nature
   * boosts, lowers, or is neutral for the given stat.
   */
  function getNatureModifier(statKey, natureName) {
    if (statKey === 'hp') return 1.0;
    var nature = NATURES[natureName ? natureName.toLowerCase() : ''];
    if (!nature) return 1.0;
    if (nature.boost === statKey) return 1.1;
    if (nature.lower === statKey) return 0.9;
    return 1.0;
  }

  // ─── Stat calculation ─────────────────────────────────────────────────────
  /**
   * Calculate a single stat value using the Gen 4 formulas.
   *
   * HP:    floor((2*base + iv + floor(ev/4)) * level / 100) + level + 10
   * Other: floor((floor((2*base + iv + floor(ev/4)) * level / 100) + 5) * natureMod)
   *
   * @param {string} statKey  - 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
   * @param {number} base     - base stat value from BASE_STATS
   * @param {number} iv       - individual value (0–31)
   * @param {number} ev       - effort value (0–252)
   * @param {string} nature   - nature name (lowercase)
   * @param {number} level    - Pokémon's level
   * @returns {number|null}   - integer stat value, or null if inputs are invalid
   */
  function calculateStat(statKey, base, iv, ev, nature, level) {
    if (base == null || isNaN(base) || isNaN(iv) || isNaN(ev) || isNaN(level)) return null;
    var inner;
    if (config.formula === 'gen1') {
      // Gen 1/2: ev is Stat Exp (0–65535), iv is DV (0–15), no nature modifier.
      // Bonus = ceil(sqrt(StatExp)) / 4, kept as a decimal (not floored again),
      // capped at 63. Matches Excel: MIN(63, CEILING(SQRT(ev), 1) / 4).
      var statExpBonus = Math.min(63, Math.ceil(Math.sqrt(ev)) / 4);
      inner = Math.floor((base * 2 + iv * 2 + statExpBonus) * level / 100);
      return (statKey === 'hp') ? (inner + level + 10) : (inner + 5);
    }
    // Gen 3+: ev is EV (0–252), iv is IV (0–31), apply nature modifier.
    inner = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
    if (statKey === 'hp') {
      return inner + level + 10;
    }
    return Math.floor((inner + 5) * getNatureModifier(statKey, nature));
  }

  // ─── Table detection and annotation ──────────────────────────────────────
  /**
   * Finds all <th> cells in the table's <thead> that represent an IV&EV stat
   * pair. Saves their original colspan and innerHTML for later restoration, and
   * tags them with data-stat-key. Returns an array of stat keys in column order.
   */
  function parseStatHeaders(table) {
    var statKeys = [];
    var ths = table.querySelectorAll('thead th');
    ths.forEach(function (th) {
      var text = th.textContent.trim().toLowerCase();
      if (!text.includes('iv')) return;
      var match = text.match(/^(\w+)\s+iv/);
      if (!match) return;
      var key = HEADER_TO_KEY[match[1]];
      if (!key) return;
      // Save original state before any manipulation
      th.dataset.statKey      = key;
      th.dataset.savedColspan = th.getAttribute('colspan') || '1';
      th.dataset.savedHtml    = th.innerHTML;
      statKeys.push(key);
    });
    return statKeys;
  }

  /**
   * Annotates each stat cell in the tbody with:
   *   data-stat-key      : 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
   *   data-stat-role     : 'iv' | 'ev'
   *   data-stat-original : the cell's original text content
   *
   * Stat cells are the last (numStats × 2) cells with a rowspan attribute in
   * each data row. This works regardless of how many non-stat columns precede
   * them (Ability present or absent, etc.).
   */
  function annotateDataRows(table, statKeys) {
    var numStatCells = statKeys.length * 2;
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function (row) {
      var rowspanCells = Array.from(row.querySelectorAll('td[rowspan]'));
      if (rowspanCells.length < numStatCells) return; // icon/move rows, skip
      var statCells = rowspanCells.slice(-numStatCells);
      statCells.forEach(function (cell, i) {
        cell.dataset.statKey      = statKeys[Math.floor(i / 2)];
        cell.dataset.statRole     = (i % 2 === 0) ? 'iv' : 'ev';
        cell.dataset.statOriginal = cell.textContent.trim();
      });
    });
  }

  /**
   * Runs detection and annotation on all tables in the document.
   * Returns only the tables that had IV&EV columns.
   */
  function findAndAnnotateTables() {
    var toggleable = [];
    document.querySelectorAll('table').forEach(function (table) {
      var statKeys = parseStatHeaders(table);
      if (statKeys.length === 0) return;
      annotateDataRows(table, statKeys);
      toggleable.push(table);
    });
    return toggleable;
  }

  // ─── View switching ───────────────────────────────────────────────────────
  /**
   * Transforms all toggleable tables to show a single calculated-stat column
   * per stat instead of the IV/EV pair.
   *
   * @param {Element[]} tables
   * @param {number}    level      - level to use in the formula
   * @param {number|null} ivOverride - if set, replaces all IV values in the formula
   */
  function switchToCalculated(tables, level, ivOverride) {
    tables.forEach(function (table) {
      // Per-table level override (e.g. battle-tower uses data-level="10" … "100")
      var effectiveLevel = parseInt(table.dataset.level, 10) || level;

      // Collapse (or split) stat column headers
      table.querySelectorAll('thead th[data-stat-key]').forEach(function (th) {
        var key = th.dataset.statKey;
        if (key === 'spc' && config.formula === 'gen1') {
          // 'spc' expands into two columns: SpA and SpD
          th.removeAttribute('colspan');
          th.textContent = 'SpA';
          var spdTh = document.createElement('th');
          spdTh.textContent = 'SpD';
          spdTh.dataset.statInserted = 'spc';
          th.parentNode.insertBefore(spdTh, th.nextSibling);
        } else {
          th.removeAttribute('colspan');
          th.textContent = STAT_LABELS[key] || key.toUpperCase();
        }
      });

      // Process each IV cell
      table.querySelectorAll('td[data-stat-role="iv"]').forEach(function (ivCell) {
        var statKey = ivCell.dataset.statKey;
        var row     = ivCell.closest('tr');

        // Locate the paired EV cell
        var evCell = row.querySelector('td[data-stat-role="ev"][data-stat-key="' + statKey + '"]');

        // In gen1 mode, the 'spc' EV cell stays visible and shows SpD
        if (statKey === 'spc' && config.formula === 'gen1') {
          // leave evCell visible — it will be populated with SpD below
        } else {
          if (evCell) evCell.style.display = 'none';
        }

        // Locate species and nature from this row's annotated cells
        var nameCell   = row.querySelector('td[data-species]');
        var natureCell = row.querySelector('td[data-nature]');
        if (!nameCell) {
          ivCell.textContent = '—';
          if (statKey === 'spc' && config.formula === 'gen1' && evCell) evCell.textContent = '—';
          return;
        }

        var speciesKey = nameCell.dataset.species
          || normalizeSpecies(nameCell.textContent.trim());
        var nature = natureCell
          ? (natureCell.dataset.nature || natureCell.textContent.trim().toLowerCase())
          : null;

        var baseStats = (typeof BASE_STATS !== 'undefined') ? BASE_STATS[speciesKey] : null;
        if (!baseStats) {
          // Base stats not found — check console for the key that failed
          console.warn('stat-toggle: no base stats found for key "' + speciesKey + '"');
          ivCell.textContent = '—';
          if (statKey === 'spc' && config.formula === 'gen1' && evCell) evCell.textContent = '—';
          return;
        }

        var iv = (ivOverride !== null && ivOverride !== undefined)
          ? ivOverride
          : parseInt(ivCell.dataset.statOriginal, 10);
        var ev = evCell ? parseInt(evCell.dataset.statOriginal, 10) : 0;

        if (statKey === 'spc' && config.formula === 'gen1') {
          // SpA and SpD share the same DV and Stat Exp but use separate base stats
          var spaResult = calculateStat('spa', baseStats['spa'], iv, ev, null, effectiveLevel);
          var spdResult = calculateStat('spd', baseStats['spd'], iv, ev, null, effectiveLevel);
          ivCell.textContent = (spaResult !== null) ? spaResult : '—';
          if (evCell) evCell.textContent = (spdResult !== null) ? spdResult : '—';
        } else {
          var result = calculateStat(statKey, baseStats[statKey], iv, ev, nature, effectiveLevel);
          ivCell.textContent = (result !== null) ? result : '—';
        }
      });
    });
  }

  /**
   * Restores all toggleable tables to the original IV & EV two-column view.
   */
  function switchToIvEv(tables) {
    tables.forEach(function (table) {

      // Remove any inserted SpD header cells (gen1 spc split)
      table.querySelectorAll('thead th[data-stat-inserted]').forEach(function (th) {
        th.parentNode.removeChild(th);
      });

      // Restore stat column headers
      table.querySelectorAll('thead th[data-stat-key]').forEach(function (th) {
        if (th.dataset.savedColspan && th.dataset.savedColspan !== '1') {
          th.setAttribute('colspan', th.dataset.savedColspan);
        }
        if (th.dataset.savedHtml) th.innerHTML = th.dataset.savedHtml;
      });

      // Restore IV cell text values
      table.querySelectorAll('td[data-stat-role="iv"]').forEach(function (cell) {
        cell.textContent = cell.dataset.statOriginal || '';
      });

      // Restore and unhide EV cells (text may have been overwritten in gen1 spc mode)
      table.querySelectorAll('td[data-stat-role="ev"]').forEach(function (cell) {
        cell.textContent = cell.dataset.statOriginal || '';
        cell.style.display = '';
      });
    });
  }

  // ─── Toggle UI construction ───────────────────────────────────────────────
  /**
   * Builds and returns the toggle controls DOM node.
   * Wires up event listeners that call switchToCalculated / switchToIvEv.
   */
  function createToggleUI(tables) {
    var level = config.defaultLevel;

    var wrapper = document.createElement('div');
    wrapper.className = 'flex-row stat-toggle-controls';
    wrapper.style.cssText = 'margin-bottom:1ex; gap:1em; align-items:center; flex-wrap:wrap;';

    // ── Radio: IV & EV ──
    var radioIvEv  = document.createElement('input');
    radioIvEv.type    = 'radio';
    radioIvEv.name    = 'stat-view';
    radioIvEv.id      = 'stat-view-ivev';
    radioIvEv.value   = 'ivev';
    radioIvEv.checked = true;
    var labelIvEv  = document.createElement('label');
    labelIvEv.htmlFor     = 'stat-view-ivev';
    labelIvEv.textContent = ' Show IV & EV';

    // ── Radio: Calculated ──
    var radioCalc  = document.createElement('input');
    radioCalc.type  = 'radio';
    radioCalc.name  = 'stat-view';
    radioCalc.id    = 'stat-view-calc';
    radioCalc.value = 'calc';
    var labelCalc  = document.createElement('label');
    labelCalc.htmlFor     = 'stat-view-calc';
    labelCalc.textContent = ' Show calculated stats';

    wrapper.appendChild(radioIvEv);
    wrapper.appendChild(labelIvEv);
    wrapper.appendChild(radioCalc);
    wrapper.appendChild(labelCalc);

    // ── Optional level / IV-override widget ──
    var levelInput     = null;
    var ivOverrideInput = null;

    if (config.showLevelWidget) {
      var widget = document.createElement('span');
      widget.style.cssText = 'display:inline-flex; gap:0.75em; align-items:center;';

      var lvlLabel  = document.createElement('label');
      lvlLabel.textContent = 'Level:';
      lvlLabel.style.marginLeft = '1em';
      levelInput = document.createElement('input');
      levelInput.type  = 'number';
      levelInput.min   = 1;
      levelInput.max   = 100;
      levelInput.value = level;
      levelInput.style.width = '4em';

      var ivLabel = document.createElement('label');
      ivLabel.textContent = 'Override all IVs:';
      ivOverrideInput = document.createElement('input');
      ivOverrideInput.type        = 'number';
      ivOverrideInput.min         = 0;
      ivOverrideInput.max         = 31;
      ivOverrideInput.placeholder = '(use table values)';
      ivOverrideInput.style.width = '6em';

      widget.appendChild(lvlLabel);
      widget.appendChild(levelInput);
      widget.appendChild(ivLabel);
      widget.appendChild(ivOverrideInput);
      wrapper.appendChild(widget);
    }

    // ── Helpers ──
    function getLevel()      { return levelInput ? (parseInt(levelInput.value, 10) || level) : level; }
    function getIvOverride() {
      if (!ivOverrideInput || ivOverrideInput.value === '') return null;
      return parseInt(ivOverrideInput.value, 10);
    }
    function refresh() {
      if (radioCalc.checked) {
        switchToCalculated(tables, getLevel(), getIvOverride());
      } else {
        switchToIvEv(tables);
      }
    }

    radioIvEv.addEventListener('change', refresh);
    radioCalc.addEventListener('change', refresh);
    if (levelInput)      levelInput.addEventListener('input', function () { if (radioCalc.checked) refresh(); });
    if (ivOverrideInput) ivOverrideInput.addEventListener('input', function () { if (radioCalc.checked) refresh(); });

    return wrapper;
  }

  /**
   * Inserts the toggle UI into the page.
   * Uses <div id="stat-toggle-container"> if present; otherwise inserts
   * immediately before the first toggleable table.
   */
  function injectToggleUI(ui, tables) {
    var container = document.getElementById('stat-toggle-container');
    if (container) {
      container.appendChild(ui);
      return;
    }
    if (tables.length > 0) {
      var firstTable = tables[0];
      firstTable.parentNode.insertBefore(ui, firstTable);
    }
  }

  // ─── Entry point ──────────────────────────────────────────────────────────
  function init() {
    var tables = findAndAnnotateTables();
    if (tables.length === 0) return;
    var ui = createToggleUI(tables);
    injectToggleUI(ui, tables);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init(); // already parsed (e.g. script at bottom of body)
  }

}());
