/**
 * stat-toggle.js
 *
 * Adds a toggle to tables that have paired IV & EV stat columns (or EV-only
 * columns), allowing the user to switch between viewing raw values and
 * calculated stats.
 *
 * REQUIREMENTS
 *   - base-stats.js must be loaded before this script (provides BASE_STATS)
 *   - Tables are auto-detected: any table whose <thead> contains a <th> with
 *     "IV" or "EV" in its text is treated as toggleable.
 *   - For IV+EV tables: headers like "HP IV & EV" (colspan=2) with paired
 *     data cells. Add data-species on name cell, data-nature on nature cell.
 *   - For EV-only tables: headers like "HP EV" (single column). The IV comes
 *     entirely from the global IV widget. Add data-species on name cell.
 *
 * PAGE-LEVEL CONFIGURATION (optional, define with var before loading this script)
 *   var STAT_TOGGLE_CONFIG = {
 *     defaultLevel:     50,    // level assumed for stat calculation
 *     showLevelWidget:  false, // show level + IV-override inputs
 *     showIvWidget:     false, // show a standalone IV input (no level input)
 *     showNatureWidget: false, // show Boosted / Lowered stat dropdowns
 *     ivMin:            0,     // minimum for IV input
 *     ivMax:            31,    // maximum for IV input
 *     ivDefault:        null,  // pre-fill IV input with this value
 *     formula:          'gen3',// 'gen3' (default) or 'gen1'
 *   };
 *
 * FORMULA NOTES
 *   'gen3' (default): Gen 3+ formula — EVs 0–252, IVs 0–31, nature modifier.
 *   'gen1': Gen 1/2 formula — EVs are Stat Exp 0–65535, IVs are DVs 0–15.
 *     Bonus = ceil(sqrt(StatExp)) / 4 (kept as decimal, capped at 63).
 *     The 'spc' stat key maps to both SpA and SpD with separate base stats.
 *     No nature modifier.
 *
 * TOGGLE UI PLACEMENT
 *   Uses <div id="stat-toggle-container"> if present; otherwise inserts
 *   before the first toggleable table.
 */

(function () {
  'use strict';

  // ─── Page-level config ────────────────────────────────────────────────────

  var defaults = {
    defaultLevel:     50,
    showLevelWidget:  false,
    showIvWidget:     false,   // standalone IV input (no level)
    showNatureWidget: false,   // Boosted / Lowered dropdowns
    ivMin:            0,
    ivMax:            31,
    ivDefault:        null,    // pre-fill IV input; null = empty placeholder
    ivTiers:          null,    // if set (array), IV widget renders a <select> with these values
    fixedIv:          null,    // if set (number), silently uses this IV with no widget shown
    showIvOverride:   true,   // when false, suppresses the IV override input in the level widget
    formula:          'gen3',
  };
  var config = Object.assign({}, defaults, window.STAT_TOGGLE_CONFIG || {});

  // ─── Nature modifier table ─────────────────────────────────────────────────

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

  // Maps first word of a stat header to an internal key.
  var HEADER_TO_KEY = {
    hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', spc: 'spc',
  };

  // Display labels for calculated-stat column headers.
  var STAT_LABELS = {
    hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', spc: 'Spc',
  };

  // The 5 non-HP stat keys available for nature boost/lower selection.
  var NATURE_STAT_KEYS  = ['atk', 'def', 'spa', 'spd', 'spe'];
  var NATURE_STAT_LABELS = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

  // ─── Species name normalization ───────────────────────────────────────────

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

  function getNatureModifier(statKey, natureName) {
    if (statKey === 'hp') return 1.0;
    var nature = NATURES[natureName ? natureName.toLowerCase() : ''];
    if (!nature) return 1.0;
    if (nature.boost === statKey) return 1.1;
    if (nature.lower === statKey) return 0.9;
    return 1.0;
  }

  // ─── Stat calculation ─────────────────────────────────────────────────────

  function calculateStat(statKey, base, iv, ev, nature, level) {
    if (base == null || isNaN(base) || isNaN(iv) || isNaN(ev) || isNaN(level)) return null;
    // Shedinja always has exactly 1 HP regardless of level, IV, or EV.
    // Base HP of 1 is unique to Shedinja across all generations covered here.
    if (statKey === 'hp' && base === 1) return 1;
    var inner;
    if (config.formula === 'gen1') {
      // Gen 1/2: ev is Stat Exp (0–65535), iv is DV (0–15). No nature.
      var statExpBonus = Math.min(63, Math.ceil(Math.sqrt(ev)) / 4);
      inner = Math.floor((base * 2 + iv * 2 + statExpBonus) * level / 100);
      return (statKey === 'hp') ? (inner + level + 10) : (inner + 5);
    }
    // Gen 3+: ev is EV (0–252), iv is IV (0–31), apply nature.
    inner = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
    if (statKey === 'hp') {
      return inner + level + 10;
    }
    return Math.floor((inner + 5) * getNatureModifier(statKey, nature));
  }

  // ─── Table detection and annotation ──────────────────────────────────────

  /**
   * Scans <thead> for stat headers. Detects both IV+EV paired headers
   * ("HP IV & EV", colspan=2) and EV-only headers ("HP EV", single column).
   * Tags each th with data-stat-key and data-stat-mode ('ivev' | 'evonly').
   */
  function parseStatHeaders(table) {
    var statKeys = [];
    var ths = table.querySelectorAll('thead th');
    ths.forEach(function (th) {
      var text = th.textContent.trim().toLowerCase();
      var hasIv = text.includes('iv');
      var hasEv = text.includes('ev');
      if (!hasIv && !hasEv) return;
      // EV-only headers (no IV) are only treated as toggleable when showIvWidget
      // is enabled OR a fixedIv value is set — this prevents EV-only decoration
      // columns (e.g. Stargazer Championship tables) from being picked up
      // unintentionally on pages that don't opt in.
      if (!hasIv && !config.showIvWidget && config.fixedIv === null) return;
      var match = text.match(/^(\w+)\s+(?:iv|ev)/);
      if (!match) return;
      var key = HEADER_TO_KEY[match[1]];
      if (!key) return;
      th.dataset.statKey      = key;
      th.dataset.statMode     = hasIv ? 'ivev' : 'evonly';
      th.dataset.savedColspan = th.getAttribute('colspan') || '1';
      th.dataset.savedHtml    = th.innerHTML;
      statKeys.push(key);
    });
    return statKeys;
  }

  /**
   * Annotates stat cells in tbody rows.
   * IV+EV mode: last (numStats×2) rowspan cells → alternating iv/ev roles.
   * EV-only mode: last numStats rowspan cells → ev role only.
   */
  function annotateDataRows(table, statKeys) {
    var evOnly = !table.querySelector('thead th[data-stat-mode="ivev"]');
    var numStatCells = evOnly ? statKeys.length : statKeys.length * 2;
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function (row) {
      var rowspanCells = Array.from(row.querySelectorAll('td[rowspan]'));
      if (rowspanCells.length < numStatCells) return;
      var statCells = rowspanCells.slice(-numStatCells);
      statCells.forEach(function (cell, i) {
        if (evOnly) {
          cell.dataset.statKey      = statKeys[i];
          cell.dataset.statRole     = 'ev';
          cell.dataset.statOriginal = cell.textContent.trim();
        } else {
          cell.dataset.statKey      = statKeys[Math.floor(i / 2)];
          cell.dataset.statRole     = (i % 2 === 0) ? 'iv' : 'ev';
          cell.dataset.statOriginal = cell.textContent.trim();
        }
      });
    });
  }

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

  // ─── Helper: resolve nature for a row ─────────────────────────────────────

  function resolveNature(row, natureOverride) {
    if (natureOverride !== null && natureOverride !== undefined) return natureOverride;
    var nc = row.querySelector('td[data-nature]');
    return nc ? (nc.dataset.nature || nc.textContent.trim().toLowerCase()) : null;
  }

  // ─── View switching ───────────────────────────────────────────────────────

  /**
   * Transforms all toggleable tables to show calculated stats.
   *
   * @param {Element[]} tables
   * @param {number}    level         — default level (overridden by table's data-level)
   * @param {number|null} ivOverride  — replaces all IV cell values in the formula
   * @param {string|null} natureOverride — nature name to use for all rows
   */
  function switchToCalculated(tables, level, ivOverride, natureOverride) {
    tables.forEach(function (table) {
      var effectiveLevel = parseInt(table.dataset.level, 10) || level;

      // ── Collapse / relabel stat column headers ──────────────────────────
      table.querySelectorAll('thead th[data-stat-key]').forEach(function (th) {
        var key  = th.dataset.statKey;
        var mode = th.dataset.statMode;

        if (mode === 'evonly') {
          // Single EV column: just change the label, no colspan adjustment
          th.textContent = STAT_LABELS[key] || key.toUpperCase();
        } else if (key === 'spc' && config.formula === 'gen1') {
          // gen1 spc: split one colspan=2 header into SpA + SpD
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

      // ── Process IV+EV paired cells ──────────────────────────────────────
      table.querySelectorAll('td[data-stat-role="iv"]').forEach(function (ivCell) {
        var statKey = ivCell.dataset.statKey;
        var row     = ivCell.closest('tr');
        var evCell  = row.querySelector('td[data-stat-role="ev"][data-stat-key="' + statKey + '"]');

        // In gen1 spc mode: EV cell becomes SpD; otherwise hide it
        if (statKey === 'spc' && config.formula === 'gen1') {
          // leave evCell visible — populated below
        } else {
          if (evCell) evCell.style.display = 'none';
        }

        var nameCell = row.querySelector('td[data-species]');
        if (!nameCell) {
          ivCell.textContent = '—';
          if (statKey === 'spc' && config.formula === 'gen1' && evCell) evCell.textContent = '—';
          return;
        }

        var speciesKey = nameCell.dataset.species || normalizeSpecies(nameCell.textContent.trim());
        var nature     = resolveNature(row, natureOverride);
        var baseStats  = (typeof BASE_STATS !== 'undefined') ? BASE_STATS[speciesKey] : null;
        if (!baseStats) {
          console.warn('stat-toggle: no base stats for "' + speciesKey + '"');
          ivCell.textContent = '—';
          if (statKey === 'spc' && config.formula === 'gen1' && evCell) evCell.textContent = '—';
          return;
        }

        var iv = (ivOverride !== null && ivOverride !== undefined)
          ? ivOverride
          : parseInt(ivCell.dataset.statOriginal, 10);
        var ev = evCell ? parseInt(evCell.dataset.statOriginal, 10) : 0;

        if (statKey === 'spc' && config.formula === 'gen1') {
          var spaResult = calculateStat('spa', baseStats['spa'], iv, ev, null, effectiveLevel);
          var spdResult = calculateStat('spd', baseStats['spd'], iv, ev, null, effectiveLevel);
          ivCell.textContent = (spaResult !== null) ? spaResult : '—';
          if (evCell) evCell.textContent = (spdResult !== null) ? spdResult : '—';
        } else {
          var result = calculateStat(statKey, baseStats[statKey], iv, ev, nature, effectiveLevel);
          ivCell.textContent = (result !== null) ? result : '—';
        }
      });

      // ── Process standalone EV cells (EV-only tables) ───────────────────
      table.querySelectorAll('td[data-stat-role="ev"]').forEach(function (evCell) {
        var statKey = evCell.dataset.statKey;
        var row     = evCell.closest('tr');

        // Skip if there is a paired IV cell — handled above
        if (row.querySelector('td[data-stat-role="iv"][data-stat-key="' + statKey + '"]')) return;

        // EV-only cell: IV must come from the global override
        if (ivOverride === null || ivOverride === undefined) {
          evCell.textContent = '—';
          return;
        }

        var nameCell = row.querySelector('td[data-species]');
        if (!nameCell) { evCell.textContent = '—'; return; }

        var speciesKey = nameCell.dataset.species || normalizeSpecies(nameCell.textContent.trim());
        var nature     = resolveNature(row, natureOverride);
        var baseStats  = (typeof BASE_STATS !== 'undefined') ? BASE_STATS[speciesKey] : null;
        if (!baseStats) {
          console.warn('stat-toggle: no base stats for "' + speciesKey + '"');
          evCell.textContent = '—';
          return;
        }

        var iv = parseInt(ivOverride, 10);
        var ev = parseInt(evCell.dataset.statOriginal, 10);
        var result = calculateStat(statKey, baseStats[statKey], iv, ev, nature, effectiveLevel);
        evCell.textContent = (result !== null) ? result : '—';
      });
    });
  }

  /**
   * Restores all toggleable tables to the original IV/EV (or EV-only) view.
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

      // Restore and unhide EV cells (handles both paired and standalone)
      table.querySelectorAll('td[data-stat-role="ev"]').forEach(function (cell) {
        cell.textContent = cell.dataset.statOriginal || '';
        cell.style.display = '';
      });
    });
  }

  // ─── Toggle UI construction ───────────────────────────────────────────────

  function createToggleUI(tables) {
    var level = config.defaultLevel;
    var hasWidgets = config.showLevelWidget || config.showIvWidget || config.showNatureWidget;

    // ── Outer container ────────────────────────────────────────────────────
    var container = document.createElement('div');
    container.className = 'stat-toggle-controls';
    container.style.cssText = 'margin-bottom:1ex;';

    // ── Line 1: Radio buttons ──────────────────────────────────────────────
    var radioLine = document.createElement('div');
    radioLine.className = 'flex-row';
    radioLine.style.cssText = 'gap:1em; align-items:center; flex-wrap:wrap;';

    var radioIvEv = document.createElement('input');
    radioIvEv.type    = 'radio';
    radioIvEv.name    = 'stat-view';
    radioIvEv.id      = 'stat-view-ivev';
    radioIvEv.value   = 'ivev';
    radioIvEv.checked = true;
    var labelIvEv = document.createElement('label');
    labelIvEv.htmlFor     = 'stat-view-ivev';
    labelIvEv.textContent = ' Show IV & EV';

    var radioCalc = document.createElement('input');
    radioCalc.type  = 'radio';
    radioCalc.name  = 'stat-view';
    radioCalc.id    = 'stat-view-calc';
    radioCalc.value = 'calc';
    var labelCalc = document.createElement('label');
    labelCalc.htmlFor     = 'stat-view-calc';
    labelCalc.textContent = ' Show calculated stats';

    radioLine.appendChild(radioIvEv);
    radioLine.appendChild(labelIvEv);
    radioLine.appendChild(radioCalc);
    radioLine.appendChild(labelCalc);
    container.appendChild(radioLine);

    // ── Line 2: IV / Nature widgets (disabled until Calc is selected) ──────
    var widgetLine      = null;
    var levelInput      = null;
    var ivOverrideInput = null;
    var naturePlusSelect  = null;
    var natureMinusSelect = null;

    if (hasWidgets) {
      widgetLine = document.createElement('div');
      widgetLine.className = 'flex-row';
      widgetLine.style.cssText = 'gap:1em; align-items:center; flex-wrap:wrap; margin-top:0.4ex;';

      // ── Level input (showLevelWidget) ──────────────────────────────────────
      // When showIvWidget is also set, the IV control comes from that widget
      // instead; showLevelWidget then only contributes the level input.
      if (config.showLevelWidget) {
        var lvlSpan = document.createElement('span');
        lvlSpan.style.cssText = 'display:inline-flex; gap:0.75em; align-items:center;';

        var lvlLabel = document.createElement('label');
        lvlLabel.textContent = 'Level:';
        levelInput = document.createElement('input');
        levelInput.type  = 'number';
        levelInput.min   = 1;
        levelInput.max   = 100;
        levelInput.value = level;
        levelInput.style.width = '4em';

        lvlSpan.appendChild(lvlLabel);
        lvlSpan.appendChild(levelInput);

        // Only add IV override here when showIvWidget is not present, no fixedIv, and not suppressed
        if (!config.showIvWidget && config.fixedIv === null && config.showIvOverride) {
          var ivLabel = document.createElement('label');
          ivLabel.textContent = 'Override all IVs:';
          ivOverrideInput = document.createElement('input');
          ivOverrideInput.type  = 'number';
          ivOverrideInput.min   = config.ivMin;
          ivOverrideInput.max   = config.ivMax;
          ivOverrideInput.style.width = '5em';
          if (config.ivDefault !== null) {
            ivOverrideInput.value = config.ivDefault;
          } else {
            ivOverrideInput.placeholder = '(use table values)';
          }
          lvlSpan.appendChild(ivLabel);
          lvlSpan.appendChild(ivOverrideInput);
        }

        widgetLine.appendChild(lvlSpan);
      }

      // ── IV widget (showIvWidget) — number input or tier dropdown ──────────
      if (config.showIvWidget) {
        var ivSpan = document.createElement('span');
        ivSpan.style.cssText = 'display:inline-flex; gap:0.5em; align-items:center;';

        var ivOnlyLabel = document.createElement('label');
        ivOnlyLabel.textContent = 'IVs:';

        if (config.ivTiers) {
          // Render a <select> with discrete tier values
          ivOverrideInput = document.createElement('select');
          config.ivTiers.forEach(function (tier) {
            var opt = document.createElement('option');
            opt.value       = tier;
            opt.textContent = tier;
            ivOverrideInput.appendChild(opt);
          });
          if (config.ivDefault !== null) {
            ivOverrideInput.value = String(config.ivDefault);
          }
        } else {
          // Render a free-form number input
          ivOverrideInput = document.createElement('input');
          ivOverrideInput.type  = 'number';
          ivOverrideInput.min   = config.ivMin;
          ivOverrideInput.max   = config.ivMax;
          ivOverrideInput.style.width = '4em';
          if (config.ivDefault !== null) {
            ivOverrideInput.value = config.ivDefault;
          } else {
            ivOverrideInput.placeholder = '(use table values)';
          }
        }

        ivSpan.appendChild(ivOnlyLabel);
        ivSpan.appendChild(ivOverrideInput);
        widgetLine.appendChild(ivSpan);
      }

      // ── Nature plus / minus dropdowns (showNatureWidget) ──
      if (config.showNatureWidget) {
        var natSpan = document.createElement('span');
        natSpan.style.cssText = 'display:inline-flex; gap:0.4em; align-items:center;';

        var natLabel = document.createElement('label');
        natLabel.textContent = 'Nature:';

        var plusLabel = document.createElement('span');
        plusLabel.textContent = '+';

        naturePlusSelect = document.createElement('select');
        naturePlusSelect.id = 'stat-nature-plus';

        var minusLabel = document.createElement('span');
        minusLabel.textContent = '−';

        natureMinusSelect = document.createElement('select');
        natureMinusSelect.id = 'stat-nature-minus';

        NATURE_STAT_KEYS.forEach(function (key) {
          [naturePlusSelect, natureMinusSelect].forEach(function (sel) {
            var opt = document.createElement('option');
            opt.value       = key;
            opt.textContent = NATURE_STAT_LABELS[key];
            sel.appendChild(opt);
          });
        });
        // Both default to 'atk' → neutral

        natSpan.appendChild(natLabel);
        natSpan.appendChild(plusLabel);
        natSpan.appendChild(naturePlusSelect);
        natSpan.appendChild(minusLabel);
        natSpan.appendChild(natureMinusSelect);
        widgetLine.appendChild(natSpan);
      }

      // Start disabled — enabled only when Calc radio is selected
      setWidgetLineDisabled(true);
      container.appendChild(widgetLine);
    }

    // ── Enable / disable all inputs and selects in the widget line ─────────
    function setWidgetLineDisabled(disabled) {
      if (!widgetLine) return;
      widgetLine.querySelectorAll('input, select').forEach(function (el) {
        el.disabled = disabled;
      });
    }

    // ── Helper functions ───────────────────────────────────────────────────
    function getLevel() {
      return levelInput ? (parseInt(levelInput.value, 10) || level) : level;
    }
    function getIvOverride() {
      if (!ivOverrideInput || ivOverrideInput.value === '') return config.fixedIv;
      return parseInt(ivOverrideInput.value, 10);
    }
    function getNatureOverride() {
      if (!naturePlusSelect || !natureMinusSelect) return null;
      var boost = naturePlusSelect.value;
      var lower = natureMinusSelect.value;
      if (boost === lower) return null;
      for (var name in NATURES) {
        var n = NATURES[name];
        if (n.boost === boost && n.lower === lower) return name;
      }
      return null;
    }
    function refresh() {
      if (radioCalc.checked) {
        switchToCalculated(tables, getLevel(), getIvOverride(), getNatureOverride());
      } else {
        switchToIvEv(tables);
      }
    }

    // ── Event listeners ────────────────────────────────────────────────────
    radioIvEv.addEventListener('change', function () {
      setWidgetLineDisabled(true);
      switchToIvEv(tables);
    });
    radioCalc.addEventListener('change', function () {
      setWidgetLineDisabled(false);
      refresh();
    });
    if (levelInput)      levelInput.addEventListener('input', function () { if (radioCalc.checked) refresh(); });
    if (ivOverrideInput) ['input', 'change'].forEach(function (evt) {
      ivOverrideInput.addEventListener(evt, function () { if (radioCalc.checked) refresh(); });
    });
    if (naturePlusSelect)  naturePlusSelect.addEventListener('change', function () { if (radioCalc.checked) refresh(); });
    if (natureMinusSelect) natureMinusSelect.addEventListener('change',function () { if (radioCalc.checked) refresh(); });

    return container;
  }

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
    init();
  }

}());
