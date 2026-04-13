$(function() {
	/** Leaflet Setup. */
	// Variables used by the leaflet map
	const minZoom = 1;
	const maxZoom = 4;
	const mapSize = [4096, 4096];
	
	// Initialize map object
	var map = L.map('map', {
		crs: L.CRS.Simple,
		minZoom: minZoom,
		maxZoom: maxZoom
	});
	
	// Prepare raster coordinates to handle this pixel image
	var rc = new L.RasterCoords(map, mapSize);
	
	// Set the base size and zoom for the raster coords, setting to the exact middle of the map
	map.setView(rc.unproject([2048, 2048]), maxZoom);
	
	// Set the tile layer for the base map
	L.tileLayer('images/raster-tiles/{z}/{x}/{y}.png', {
		noWrap: true,
		bounds: rc.getMaxBounds(),
		maxNativeZoom: rc.zoomLevel()
	}).addTo(map);
	
	loadItemMarkers();
	loadLadderMarkers();
	loadScrewMarkers();
	
	// Debug: add click event to map to show coordinates
	map.on('click', function(e) {
		var coord = rc.project(e.latlng);
		console.log(coord.x + ", " + coord.y);
	});
	
	
	async function loadItemMarkers() {
		// Image Icon Class
		var ImageIcon = L.Icon.extend({
			options: {
				iconSize: [24, 24],
				iconAnchor: [12, 12]
			}
		});

		// Initialize the icon object array
		var itemIcons = {
			"ultraBall": new ImageIcon({iconUrl: 'images/item-icons/ultra-ball.png'}),
			"potion": new ImageIcon({iconUrl: 'images/item-icons/potion.png'}),
			"antidote": new ImageIcon({iconUrl: 'images/item-icons/antidote.png'}),
			"pokeBall": new ImageIcon({iconUrl: 'images/item-icons/poke-ball.png'}),
			"paralyzeHeal": new ImageIcon({iconUrl: 'images/item-icons/paralyze-heal.png'}),
			"revive": new ImageIcon({iconUrl: 'images/item-icons/revive.png'}),
			"pearl": new ImageIcon({iconUrl: 'images/item-icons/pearl.png'}),
			"greatBall": new ImageIcon({iconUrl: 'images/item-icons/great-ball.png'}),
			"superPotion": new ImageIcon({iconUrl: 'images/item-icons/super-potion.png'}),
			"healBall": new ImageIcon({iconUrl: 'images/item-icons/heal-ball.png'}),
			"fullHeal": new ImageIcon({iconUrl: 'images/item-icons/full-heal.png'}),
			"expCandyS": new ImageIcon({iconUrl: 'images/item-icons/exp-candy-s.png'}),
			"hpUp": new ImageIcon({iconUrl: 'images/item-icons/hp-up.png'}),
			"burnHeal": new ImageIcon({iconUrl: 'images/item-icons/burn-heal.png'}),
			"tm": new ImageIcon({iconUrl: 'images/item-icons/tm.png'}),
			"leafStone": new ImageIcon({iconUrl: 'images/item-icons/leaf-stone.png'}),
			"protein": new ImageIcon({iconUrl: 'images/item-icons/protein.png'}),
			"waterStone": new ImageIcon({iconUrl: 'images/item-icons/water-stone.png'}),
			"duskBall": new ImageIcon({iconUrl: 'images/item-icons/dusk-ball.png'}),
			"diveBall": new ImageIcon({iconUrl: 'images/item-icons/dive-ball.png'}),
			"iron": new ImageIcon({iconUrl: 'images/item-icons/iron.png'}),
			"hyperPotion": new ImageIcon({iconUrl: 'images/item-icons/hyper-potion.png'}),
			"expCandyM": new ImageIcon({iconUrl: 'images/item-icons/exp-candy-m.png'}),
			"rareCandy": new ImageIcon({iconUrl: 'images/item-icons/rare-candy.png'}),
			"awakening": new ImageIcon({iconUrl: 'images/item-icons/awakening.png'}),
			"maxPotion": new ImageIcon({iconUrl: 'images/item-icons/max-potion.png'}),
			"nestBall": new ImageIcon({iconUrl: 'images/item-icons/nest-ball.png'}),
			"carbos": new ImageIcon({iconUrl: 'images/item-icons/carbos.png'}),
			"zinc": new ImageIcon({iconUrl: 'images/item-icons/zinc.png'}),
			"duskStone": new ImageIcon({iconUrl: 'images/item-icons/dusk-stone.png'}),
			"luxuryBall": new ImageIcon({iconUrl: 'images/item-icons/luxury-ball.png'}),
			"shinyStone": new ImageIcon({iconUrl: 'images/item-icons/shiny-stone.png'}),
			"calcium": new ImageIcon({iconUrl: 'images/item-icons/calcium.png'}),
			"maxRevive": new ImageIcon({iconUrl: 'images/item-icons/max-revive.png'}),
			"thunderStone": new ImageIcon({iconUrl: 'images/item-icons/thunder-stone.png'}),
			"fireStone": new ImageIcon({iconUrl: 'images/item-icons/fire-stone.png'}),
			"repeatBall": new ImageIcon({iconUrl: 'images/item-icons/repeat-ball.png'}),
			"netBall": new ImageIcon({iconUrl: 'images/item-icons/net-ball.png'}),
			"nugget": new ImageIcon({iconUrl: 'images/item-icons/nugget.png'}),
			"timerBall": new ImageIcon({iconUrl: 'images/item-icons/timer-ball.png'}),
			"bigPearl": new ImageIcon({iconUrl: 'images/item-icons/big-pearl.png'}),
			"iceStone": new ImageIcon({iconUrl: 'images/item-icons/ice-stone.png'}),
			"quickBall": new ImageIcon({iconUrl: 'images/item-icons/quick-ball.png'}),
			"fullRestore": new ImageIcon({iconUrl: 'images/item-icons/full-restore.png'}),
			"dawnStone": new ImageIcon({iconUrl: 'images/item-icons/dawn-stone.png'}),
			"sunStone": new ImageIcon({iconUrl: 'images/item-icons/sun-stone.png'}),
			"moonStone": new ImageIcon({iconUrl: 'images/item-icons/moon-stone.png'}),
		};

		// Fetch the item data from the JSON
		const fetchItemData = async () => {
			try {
				const response = await fetch('javascript/items.json');
				if (!response.ok) {
					throw new Error('Network response was not ok ' + response.statusText);
				}
				data = await response.json();
				return data;
			} catch (error) {
				console.error('Error fetching JSON:' , error);
			}
		};

		var itemsJson = await fetchItemData();

		// Prepare one layer group per item group
		var itemLayers = {};
		['ball', 'boosters', 'candy', 'evo', 'healing', 'revival', 'status', 'tm', 'treasure'].forEach(function(group) {
			itemLayers[group] = L.layerGroup();
			map.addLayer(itemLayers[group]);
		});

		$.each(itemsJson, function(e) {
			var curItem = this;
			L.marker(rc.unproject(curItem.coordinates), {icon: itemIcons[curItem.iconName]}).addTo(itemLayers[curItem.group]).on('click', function(e) {
				$("#item-name").text(curItem.friendlyItemName);
				$("#item-area").text(curItem.area);
				$("#item-location").text(curItem.location);
				$("#item-notes").text(curItem.notes);
				$("#table-img").show();
			});
		});

		// Update the indeterminate/checked state of the Select All pill
		function updateSelectAllState() {
			var total = $('.filter-item-group').length;
			var checkedCount = $('.filter-item-group:checked').length;
			var allBox = document.getElementById('filter-items-all');
			var $allLabel = $('#label-items-all');
			if (checkedCount === 0) {
				allBox.checked = false;
				allBox.indeterminate = false;
				$allLabel.removeClass('filter-pill-indeterminate');
			} else if (checkedCount === total) {
				allBox.checked = true;
				allBox.indeterminate = false;
				$allLabel.removeClass('filter-pill-indeterminate');
			} else {
				allBox.checked = false;
				allBox.indeterminate = true;
				$allLabel.addClass('filter-pill-indeterminate');
			}
		}

		$('.filter-item-group').on('change', function() {
			var group = $(this).data('group');
			if (this.checked) {
				map.addLayer(itemLayers[group]);
			} else {
				map.removeLayer(itemLayers[group]);
			}
			updateSelectAllState();
		});

		$('#filter-items-all').on('change', function() {
			var checked = this.checked;
			$('#label-items-all').removeClass('filter-pill-indeterminate');
			$('.filter-item-group').each(function() {
				$(this).prop('checked', checked);
				var group = $(this).data('group');
				if (checked) {
					map.addLayer(itemLayers[group]);
				} else {
					map.removeLayer(itemLayers[group]);
				}
			});
		});

		// Apply restored checkbox states on load
		$('.filter-item-group').trigger('change');
	}
	
	async function loadLadderMarkers() {
		// Ladder Icon
		var ladderIcon = L.icon({
			iconUrl: 'images/ladder-icon.png',
			iconSize: [24, 24],
			iconAnchor: [12, 12]
		});
		
		// Fetch the item data from the JSON
		const fetchLadderData = async () => {
			try {
				const response = await fetch('javascript/ladders.json');
				if (!response.ok) {
					throw new Error('Network response was not ok ' + response.statusText);
				}
				data = await response.json();
				return data;
			} catch (error) {
				console.error('Error fetching JSON:' , error);
			}
		};
		
		var laddersJson = await fetchLadderData();	
		
		// Prepare the item layer on the map
		var ladderLayer = L.layerGroup();
		map.addLayer(ladderLayer);

		$.each(laddersJson, function(e) {
			var curLadder = this;
			L.marker(rc.unproject(curLadder.coordinates), {icon: ladderIcon}).addTo(ladderLayer);
		});

		$('#filter-ladders').on('change', function() {
			if (this.checked) {
				map.addLayer(ladderLayer);
			} else {
				map.removeLayer(ladderLayer);
			}
		});

		// Apply restored checkbox state on load
		$('#filter-ladders').trigger('change');
	}
	async function loadScrewMarkers() {
		// Ladder Icon
		var screwIcon = L.icon({
			iconUrl: 'images/item-icons/colorful-screw.png',
			iconSize: [24, 24],
			iconAnchor: [12, 12]
		});
		
		// Fetch the item data from the JSON
		const fetchScrewData = async () => {
			try {
				const response = await fetch('javascript/colorful-screws.json');
				if (!response.ok) {
					throw new Error('Network response was not ok ' + response.statusText);
				}
				data = await response.json();
				return data;
			} catch (error) {
				console.error('Error fetching JSON:' , error);
			}
		};
		
		var screwsJson = await fetchScrewData();	
		
		// Prepare the item layer on the map
		var screwLayer = L.layerGroup();
		map.addLayer(screwLayer);

		$.each(screwsJson, function(e) {
			var curScrew = this;
			L.marker(rc.unproject(curScrew.coordinates), {icon: screwIcon}).addTo(screwLayer).on('click', function(e) {
				$("#item-name").text("Colorful Screw");
				$("#item-area").text(curScrew.area);
				$("#item-location").text(curScrew.location);
				$("#item-notes").text(curScrew.notes);
				$("#table-img").show();
			});
		});

		$('#filter-screws').on('change', function() {
			if (this.checked) {
				map.addLayer(screwLayer);
			} else {
				map.removeLayer(screwLayer);
			}
		});

		// Apply restored checkbox state on load
		$('#filter-screws').trigger('change');
	}
});