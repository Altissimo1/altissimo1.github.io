$(function() {
  // ── State ──
  let researchData = [];     // Array of { id, name, tasks: [{ name, values, isBoosted }] }
  let activeTasks = {};      // { [speciesId]: { [taskName]: highestActiveValue } }
  let searchTerm = '';
  let showCompletedTasks = true;

  // ── DOM refs ──
  const $grid = document.getElementById('taskGrid');
  const $search = document.getElementById('searchInput');
  const $showCompleted = document.getElementById('showCompletedTasks');
  const $totalPoints = document.getElementById('totalPoints');
  const $rankData = document.getElementById('rankData');
  const $entrySummary = document.getElementById('entrySummary');
  const $importError = document.getElementById('importError');
  const $importInput = document.getElementById('importInput');
  const $dropOverlay = document.getElementById('dropOverlay');

  // ── Persistence via localStorage ──
  const STORAGE_KEY = 'pla-research-state';

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTasks, searchTerm }));
    } catch(e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeTasks) activeTasks = parsed.activeTasks;
        if (parsed.searchTerm) {
          searchTerm = parsed.searchTerm;
          $search.value = searchTerm;
        }
      }
    } catch(e) { /* ignore */ }
  }

  // ── Rank calculations ──
  function calculateNextRank(total) {
    if (total < 500) return 0;
    if (total >= 8500) return '6 or higher';
    return [500, 1800, 3500, 6000, 8500].findIndex(v => total < v);
  }

  function calculatePointsToNextRank(total) {
    if (total < 500) return 500 - total;
    if (total >= 8500) return -1;
    const next = [500, 1800, 3500, 6000, 8500].find(v => total < v);
    return (next || total - 1) - total;
  }

  // ── Entry status ──
  function calculateEntryStatus(tasks, species) {
    let completionPoints = 0;
    let completedSegments = 0;

    for (const [taskName, taskValue] of Object.entries(tasks)) {
      const taskDef = species.tasks.find(t => t.name === taskName);
      if (!taskDef) continue;

      const segs = taskDef.values.filter(v => v <= taskValue).length;

      // Arceus (id 238) special case
      if (Number(species.id) === 238) {
        return { completionPoints: segs * 10, completedSegments: 1 };
      }

      completionPoints += segs * (taskDef.isBoosted ? 2 : 1);
      completedSegments += segs;
    }
    return { completionPoints, completedSegments };
  }

  // ── Compute derived data ──
  function computeStats() {
    const completeEntries = [];
    const perfectedEntries = [];
    const incompleteEntries = [];
    let researchPointsFromTasks = 0;
    const researchPointsByTask = {};

    for (const [speciesId, tasks] of Object.entries(activeTasks)) {
      const speciesDef = researchData.find(s => s.id === Number(speciesId));
      if (!speciesDef) continue;

      const { completionPoints, completedSegments } = calculateEntryStatus(tasks, speciesDef);
      const isComplete = completionPoints >= 10;
      const rankPoints = completionPoints * 10;

      const totalSegments = speciesDef.tasks.reduce((t, task) => t + task.values.length, 0);
      const isPerfected = completedSegments === totalSegments;

      if (isComplete) completeEntries.push(speciesDef.name);
      if (isPerfected) perfectedEntries.push(speciesDef.name);
      if (!isComplete && completionPoints > 0) incompleteEntries.push(speciesDef.name);

      researchPointsFromTasks += rankPoints;
      researchPointsByTask[speciesId] = rankPoints + (isComplete ? 100 : 0);
    }

    const totalResearchPoints = researchPointsFromTasks + completeEntries.length * 100;
    return { completeEntries, perfectedEntries, incompleteEntries, totalResearchPoints, researchPointsByTask };
  }

  // ── Filter ──
  function getFilteredData() {
    if (!searchTerm) return researchData;

    let term = searchTerm.toLowerCase().trim();

    if (term.startsWith('task:')) {
      term = term.replace('task:', '').trim();
      const result = [];
      for (const entry of researchData) {
        const filteredTasks = entry.tasks.filter(task => {
          const nameMatch = task.name.toLowerCase().indexOf(term) !== -1;
          const activeVal = (activeTasks[entry.id] && activeTasks[entry.id][task.name]) || 0;
          const isComplete = task.values[task.values.length - 1] <= activeVal;
          return nameMatch && (showCompletedTasks || !isComplete);
        });
        if (filteredTasks.length > 0) {
          result.push({ ...entry, tasks: filteredTasks });
        }
      }
      return result;
    }

    return researchData.filter(entry => {
      const normName = entry.name.toLowerCase();
      return normName.indexOf(term) !== -1 || term.indexOf(normName) !== -1;
    });
  }

  // ── Render ──
  function render() {
    const stats = computeStats();
    const filtered = getFilteredData();

    // Update sidebar text nodes directly — no innerHTML
    $totalPoints.textContent = stats.totalResearchPoints + ' total research points.';

    const nextRank = calculateNextRank(stats.totalResearchPoints);
    const ptsToNext = calculatePointsToNextRank(stats.totalResearchPoints);
    $rankData.textContent = 'Rank ' + nextRank + '. Points to next rank: ' + (ptsToNext === -1 ? '\u2013' : ptsToNext) + '.';

    // Entry summary — built via DOM, not innerHTML
    const summaryFrag = document.createDocumentFragment();

    if (stats.perfectedEntries.length > 0) {
      const div = document.createElement('div');
      const span = document.createElement('span');
      span.className = 'perfected';
      span.textContent = 'Perfected ' + stats.perfectedEntries.length + ' ' + (stats.perfectedEntries.length === 1 ? 'entry' : 'entries');
      div.appendChild(span);
      div.appendChild(document.createTextNode(': ' + stats.perfectedEntries.join(', ') + '.'));
      summaryFrag.appendChild(div);
    }

    const completedDiv = document.createElement('div');
    const completedSpan = document.createElement('span');
    completedSpan.className = 'completed';
    completedSpan.textContent = 'Completed ' + stats.completeEntries.length + ' ' + (stats.completeEntries.length === 1 ? 'entry' : 'entries');
    completedDiv.appendChild(completedSpan);
    if (stats.completeEntries.length > 0) {
      completedDiv.appendChild(document.createTextNode(': ' + stats.completeEntries.join(', ')));
    }
    completedDiv.appendChild(document.createTextNode('.'));
    summaryFrag.appendChild(completedDiv);

    const partialDiv = document.createElement('div');
    partialDiv.textContent = 'Partially completed ' + stats.incompleteEntries.length + ' ' +
      (stats.incompleteEntries.length === 1 ? 'entry' : 'entries') +
      (stats.incompleteEntries.length > 0 ? ': ' + stats.incompleteEntries.join(', ') : '') + '.';
    summaryFrag.appendChild(partialDiv);

    $entrySummary.textContent = '';
    $entrySummary.appendChild(summaryFrag);

    // Task grid — built entirely via DocumentFragment, never via innerHTML.
    // A single massive innerHTML assignment to a live DOM node causes Firefox's
    // DevTools mutation observer to deadlock when it tries to index the resulting
    // node tree. Building nodes individually and appending a fragment once avoids
    // this entirely.
    const gridFrag = document.createDocumentFragment();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No matching Pokemon found.';
      gridFrag.appendChild(empty);
      $grid.textContent = '';
      $grid.appendChild(gridFrag);
      return;
    }

    for (const entry of filtered) {
      const pts = stats.researchPointsByTask[entry.id] || 0;
      const isComplete = stats.completeEntries.includes(entry.name);

      const section = document.createElement('div');
      section.className = 'task-section';

      // Section header row
      const sectionName = document.createElement('div');
      sectionName.className = 'section-name';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = entry.name;
      sectionName.appendChild(nameSpan);

      const ptsSpan = document.createElement('span');
      ptsSpan.className = 'points';
      ptsSpan.textContent = '(' + pts + ')';
      sectionName.appendChild(ptsSpan);

      if (isComplete) {
        const badge = document.createElement('span');
        badge.className = 'complete-badge';
        sectionName.appendChild(badge);
      }

      section.appendChild(sectionName);
	  
	  // Food preference row
		if (entry.food) {
		  var foodNames = [
			{ key: 'springy-mushroom', label: 'Springy Mushroom' },
			{ key: 'dazzling-honey',   label: 'Dazzling Honey' },
			{ key: 'hearty-grains',    label: 'Hearty Grains' },
			{ key: 'plump-beans',      label: 'Plump Beans' },
			{ key: 'crunchy-salt',     label: 'Crunchy Salt' }
		  ];
		  var foodRow = document.createElement('div');
		  foodRow.className = 'food-row';
		  for (var fi = 0; fi < 5; fi++) {
			var liked = entry.food[fi];
			var foodImg = document.createElement('img');
			foodImg.src = '../../../Resources/images/pla-icons/item-icons/' + foodNames[fi].key + (liked ? '' : '-gray') + '.png';
			foodImg.alt = foodNames[fi].label + (liked ? '' : ' (not preferred)');
			foodImg.title = foodNames[fi].label + (liked ? '' : ' (not preferred)');
			foodImg.className = 'food-icon' + (liked ? '' : ' food-icon-disliked');
			foodRow.appendChild(foodImg);
		  }
		  section.appendChild(foodRow);
		}

      // Task rows
      for (const task of entry.tasks) {
        const activeVal = (activeTasks[entry.id] && activeTasks[entry.id][task.name]) || 0;

        if (!showCompletedTasks && task.values[task.values.length - 1] <= activeVal) continue;

        const row = document.createElement('div');
        row.className = 'task-row';

        const boostedIcon = document.createElement('div');
        boostedIcon.className = 'boosted-icon';
        if (task.isBoosted) {
          const img = document.createElement('img');
          img.src = '../../../Resources/images/pla-icons/other-icons/research-boosted.png';
          img.alt = 'boosted icon';
          boostedIcon.appendChild(img);
        }
        row.appendChild(boostedIcon);

        const taskNameEl = document.createElement('div');
        taskNameEl.className = 'task-name';
        taskNameEl.title = task.name;
        taskNameEl.textContent = task.name;
        row.appendChild(taskNameEl);

        // Empty spacer cells to right-align value pills into 5 columns
        const emptyCols = 5 - task.values.length;
        for (let i = 0; i < emptyCols; i++) {
          row.appendChild(document.createElement('div'));
        }

        for (const value of task.values) {
          const isActive = activeVal >= value;
          const cell = document.createElement('div');
          cell.className = 'task-value ' + (isActive ? 'active' : 'inactive');
          cell.dataset.species = entry.id;
          cell.dataset.task = task.name;
          cell.dataset.value = value;
          cell.textContent = value;
          row.appendChild(cell);
        }

        section.appendChild(row);
      }

      gridFrag.appendChild(section);
    }

    $grid.textContent = '';
    $grid.appendChild(gridFrag);
  }

  // ── Task toggle logic ──
  function handleTaskClick(speciesId, taskName, value) {
    if (!activeTasks[speciesId]) activeTasks[speciesId] = {};

    const current = activeTasks[speciesId][taskName] || 0;

    if (current === value) {
      // Deactivate: set to the next lower threshold, or 0
      const species = researchData.find(s => s.id === Number(speciesId));
      if (species) {
        const task = species.tasks.find(t => t.name === taskName);
        if (task) {
          const idx = task.values.indexOf(value);
          if (idx > 0) {
            activeTasks[speciesId][taskName] = task.values[idx - 1];
          } else {
            delete activeTasks[speciesId][taskName];
            if (Object.keys(activeTasks[speciesId]).length === 0) {
              delete activeTasks[speciesId];
            }
          }
        }
      }
    } else {
      activeTasks[speciesId][taskName] = value;
    }

    saveState();
    render();
  }

  // ── Event: click on task values ──
  $grid.addEventListener('click', function(e) {
    const el = e.target.closest('.task-value');
    if (!el) return;
    const speciesId = el.dataset.species;
    const taskName = el.dataset.task;
    const value = Number(el.dataset.value);
    handleTaskClick(speciesId, taskName, value);
  });

  // ── Event: search ──
  let searchTimeout = null;
  $search.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
      searchTerm = $search.value;
      saveState();
      render();
    }, 250);
  });

  // ── Event: show completed toggle ──
  $showCompleted.addEventListener('change', function() {
    showCompletedTasks = $showCompleted.checked;
    render();
  });

  // ── Event: reset ──
  document.getElementById('resetBtn').addEventListener('click', function() {
    if (!confirm('Reset all research data? This cannot be undone.')) return;
    activeTasks = {};
    searchTerm = '';
    $search.value = '';
    saveState();
    render();
  });

  // ── Event: export ──
  document.getElementById('exportBtn').addEventListener('click', function() {
    const blob = new Blob([JSON.stringify({ activeTasks, searchTerm }, null, 2)], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pla-research.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // ── Event: import (button) ──
  $importInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) importFile(e.target.files[0]);
    e.target.value = '';
  });

  // ── Event: drag & drop import ──
  document.addEventListener('dragenter', function(e) {
    e.preventDefault();
    $dropOverlay.classList.add('active');
  });
  document.addEventListener('dragover', function(e) {
    e.preventDefault();
  });
  document.addEventListener('dragleave', function(e) {
    if (e.relatedTarget === null) $dropOverlay.classList.remove('active');
  });
  document.addEventListener('drop', function(e) {
    e.preventDefault();
    $dropOverlay.classList.remove('active');
    if (e.dataTransfer.files.length > 0) importFile(e.dataTransfer.files[0]);
  });

  function importFile(file) {
    if (!file.name.endsWith('.json')) {
      showImportError('Research files must end in .json');
      return;
    }

    const reader = new FileReader();
    reader.onabort = function() { showImportError('The file read process was aborted.'); };
    reader.onerror = function() { showImportError('An unknown issue occurred trying to load the file.'); };
    reader.onload = function() {
      try {
        const data = JSON.parse(reader.result);
        if (data.activeTasks) {
          activeTasks = data.activeTasks;
          if (data.searchTerm !== undefined) {
            searchTerm = data.searchTerm;
            $search.value = searchTerm;
          }
          saveState();
          render();
          hideImportError();
        } else {
          showImportError('The file does not contain valid research data.');
        }
      } catch (err) {
        showImportError('The research file could not be read: ' + err);
      }
    };
    reader.readAsText(file);
  }

  function showImportError(msg) {
    $importError.textContent = msg;
    $importError.style.display = 'block';
  }
  function hideImportError() {
    $importError.style.display = 'none';
  }

  // ── Load data ──
  // The JSON is expected to be an array of objects like:
  // [{ "id": 25, "name": "Pikachu", "tasks": [{ "name": "Number caught", "values": [1,2,3,5,10], "isBoosted": true }, ...] }, ...]

  const DATA_URL = 'pla-research.json';

  loadState();

  fetch(DATA_URL)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      researchData = data;
      render();
    })
    .catch(function(err) {
      const errDiv = document.createElement('div');
      errDiv.className = 'empty-state';

      const p1 = document.createElement('p');
      p1.style.marginBottom = '0.5rem';
      p1.textContent = 'Could not load research data.';
      errDiv.appendChild(p1);

      const p2 = document.createElement('p');
      p2.style.fontSize = '0.78rem';
      p2.style.color = 'var(--text-muted)';
      p2.textContent = 'Make sure pla-research.json is in the same directory as this HTML file.';
      errDiv.appendChild(p2);

      $grid.textContent = '';
      $grid.appendChild(errDiv);
    });

});
