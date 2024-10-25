$(function() {
	
	// Variables.

	// The weather filter value
	var weather = "sun";

	// The time filter value
	var time = "morning";

	// The spawn type filter values
	var ground = true;
	var water = true;
	var air = true;
	var alpha = true;
	var tree = false;
	var ore = false;
		
	// The pokemon filter value
	var pokemon = "all";

	// JSON to find the pokemon spawns
	var spawnURL = "../Pokemon/json/" + land + "-spawns.json";

	// JSON to find the pokemon species
	var pokemonURL = "../Pokemon/json/" + land + "-pokemon.json";

	// Holds the JSON data.
	var jsonData = [];
	
	var indexOfName = 24; // This corresponds to the index of a pokemon image URL where the name starts.
	
	// Setup.
	
	// Hide the small displays div.
	$("#small-displays").hide();
	
	// Set up the pokemon in the dropdown.
	$.getJSON(pokemonURL, function(data) {
		appendPokemon(data);
	}).fail(function() {
		console.log("An error has occurred.")
	});	
	
	// Prepare the image according to defaults.
	prepareImage();
	
	// Set up click event on the zoom button.
	$("#enlarge").click(function() {
		if ($("#zoom").attr('src') == "../../../../Resources/images/pla-icons/other-icons/zoom-minus.png") {
			$("#map-div").css("width", "58%");
			$("#zoom").attr("src", "../../../../Resources/images/pla-icons/other-icons/zoom-plus.png");
		} else {
			$("#map-div").css("width", "100%");
			$("#zoom").attr("src", "../../../../Resources/images/pla-icons/other-icons/zoom-minus.png");
		}
	});
	
	// Set up click event for filters, time, and weather.	
	$.each($(".checkradio"), function() {
		// Update the variable corresponding to the checkbox or radio button clicked.
		$(this).click(function() {
			// Weather
			if (this.name == "weather")
				weather = this.value;
			// Time
			else if (this.name == "time")
				time = this.value;
			// Spawn types
			else if (this.name == "filter") {
				var checked = false;
				if ($(this).is(":checked"))
					checked = true;
				if (this.value == "ground")
					ground = checked;
				else if (this.value == "water")
					water = checked;
				else if (this.value == "air")
					air = checked;
				else if (this.value == "tree")
					tree = checked;
				else if (this.value == "ore")
					ore = checked;
				else if (this.value == "alpha")
					alpha = checked;
			}
			// Update the image.
			updateImage();
		});
	});
	
	// Set up click event for pokemon dropdown.
	$("#pokemon-dropdown").change(function() {
		pokemon = this.value;		
		updateImage();
	});
	
	// Functions.
	
	// Update the image when a filter changes.
	function updateImage() {
		// Check each pokemon icon.
		$(".pokemon-icon").each(function() {
			// If it matches the current filters, show it.
			if (hasTime(this) && hasWeather(this) && hasType(this) && hasPokemon(this))
				$(this).show();
			// Otherwise, hide it.
			else
				$(this).hide();
		});
	}
	
	// Checks if an icon should be visible based on selected time filter.
	function hasTime(icon) {		
		if (time == "night") {
			if ($(icon).hasClass("night") || $(icon).hasClass("all-time"))
				return true;
			return false;
		} else {
			if ($(icon).hasClass(time) || $(icon).hasClass("all-time") || $(icon).hasClass("all-day"))
				return true;
			return false;
		}
	}
	
	// Checks if an icon should be visible based on selected weather filter.
	function hasWeather(icon) {
		if ($(icon).hasClass(weather) || $(icon).hasClass("all-weather"))
			return true;
		return false;
	}
	
	// Checks if an icon should be visible based on selected type filter.
	function hasType(icon) {
		if (ground && $(icon).hasClass("ground"))
			return true;
		else if (water && $(icon).hasClass("water"))
			return true;
		else if (air && $(icon).hasClass("air"))
			return true;
		else if (ore && $(icon).hasClass("ore"))
			return true;
		else if (tree && $(icon).hasClass("tree"))
			return true;
		else if (alpha && $(icon).hasClass("alpha"))
			return true;
		return false;
	}
	
	// Checks if an icon should be visible based on selected pokemon filter.
	function hasPokemon(icon) {
		if (pokemon == "all" || $(icon).hasClass(pokemon))
			return true;
		return false;
	}
	
	// Add pokemon to the dropdown, using the JSON.
	function appendPokemon(data) {
		var pokeDropdown = $("#pokemon-dropdown");
		$.each(data, function() {
			// Create a new option element for each pokemon.
			var pokeOption = document.createElement("option");
			pokeOption.value = this.id;
			pokeOption.textContent = this.name;
			// Append it to the dropdown.
			pokeDropdown.append(pokeOption);
		});
	}
	
	// Set up the image when the page is first loaded.
	function prepareImage() {
		// Get the JSON containing spawn info.
		$.getJSON(spawnURL, function(data) {
			// Set the data property for use by other functions.
			jsonData = data;
			appendIcons();
		}).fail(function() {
			console.log("An error has occurred.");
		});	
		
		// Add Pokemon icons to the page.
		function appendIcons() {
			// Get the display div.
			var iconDisplayContainer = $("#display-icons");
			
			// Hide the container while adding the icons.
			iconDisplayContainer.hide();
			
			// Display each spawn point.
			$.each(jsonData, function() {
				// Set the ID based on the pokemon's tag.
				var id = "pokemon-" + this.tag;
				// Iterate over each group.
				$.each(this.groups, function() {
					// Create an icon and set the source and ID.
					var icon = document.createElement("img");
					icon.src = this.icon;
					icon.id = id;
					icon.alt = this.icon.substring(indexOfName).replace(".png", "");
					
					// Set class names based on conditions and icon class.
					icon.className = this.iconClass;
					$.each(this.conditions, function() {
						icon.classList.add(this);
					});
					icon.classList.add("pokemon-icon");
					// Add a class name based on the subtag.
					icon.classList.add("group-" + this.subtag);
					
					// Set its location on the page.
					icon.style.top = this.iconTop;
					icon.style.left = this.iconLeft;
					
					// Add it to the display.
					iconDisplayContainer.append(icon);
				});			
			});
			
			// Set up events on each icon, and hide them all to begin with.
			$.each($(".pokemon-icon"), function() {
				// Set up click event.
				$(this).click(function() {
					// Get the div holding the tables & clear it.
					var tableContainer = $("#table-displays");
					$(tableContainer).html("");
					// Get the tag from the id.
					var id = this.id.replace("pokemon-", "");
					
					// Get the spawn from the data.
					var spawnPoint = jsonData[parseInt(id)];
					$.each(spawnPoint.full, function() {
						// Create a new table.
						var table = "<table>";
						
						// Set the background.						
						var color = true;
						var time = "day";
						if (this.heading.includes("Night"))
							time = "night";
						
						// Set the table headers.
						table += "<caption>" + this.heading + "</caption>";
						table += "<thead><tr class='" + time + "-" + color + "'><th>Pokémon</th><th>Spawn Rate</th><th>Levels</th></tr></thead>";
						color = !color;
						var htmlBlock;
						// Iterate over all the contained pokemon
						for (i = 0; i < this.icon.length; i++) {
							// Get the level values for the pokemon
							var levelsOne = this.levels1[i];
							var levelsTwo = this.levels2[i];
							// Add the pokemon as a row
							htmlBlock = "<tr class='" + time + "-" + color + "'><td><img src='" + this.icon[i] + "' alt=" + this.icon[i].substring(indexOfName).replace(".png", "") + "'></td><td>" + this.spawn[i] + "</td><td class='levelCell'>" + levelsOne;
							color = !color;
							// Only add second levels, alpha levels, if they exist
							if (!(levelsOne === "" || levelsTwo === ""))
								htmlBlock += "<br>";
							if (levelsTwo !== "")
								htmlBlock += "<img src='../../../../Resources/images/pla-icons/other-icons/alpha.png' class='alpha-icon' alt='Alpha icon'>";
							htmlBlock += levelsTwo + "</td></tr>";
							table += htmlBlock;
						}
						table += "</table>";
						tableContainer.append(table);
					});				
				});
				
				// Set up hover function
				$(this).on("mouseenter", function() {
					// Get the hover container.
					var container = $("#small-displays");
					
					// Hide it.
					container.hide();
					
					// Get the tag from the ID and the subtag from the class.
					var tag = this.id.replace("pokemon-", "");
					var subtag = this.className.match(/group-\d+/)[0].replace("group-", "");
					
					// Get the spawn point and the group the pokemon is part of
					var tagGroup = jsonData[parseInt(tag)];
					var subtagGroup = tagGroup.groups[parseInt(subtag)];
					
					// Set the background color.
					if (time == "night")
						$(container).addClass("night-true");
					else
						$(container).addClass("day-true");
					
					// Set the location of the div. I try to make it so that this is icon + 3%.
					$(container).css("top", subtagGroup.displayTop);
					$(container).css("left", subtagGroup.displayLeft);
					
					// Append all spawn data text into the div.
					$(container).html(subtagGroup.display.join("<br>"));	
					// Show the container.
					$(container).show();					
				});
				
				// Set up function when mouse leaves the icon				
				$(this).on("mouseleave", function() {
					// Hide the icon.
					var container = $("#small-displays");
					$(container).hide();
				});		
				// Hide the icon to start with.
				$(this).hide();				
			});
			
			// Call update image to show the icons that need to be shown.
			updateImage();
			// Show the icon container.
			iconDisplayContainer.show();
		}
	};	
});