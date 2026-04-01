$(function() {
	
	// Variables.

	// The spawn type filter values
	var tree = true;
	var ore = true;
		
	// The item filter value
	var items = "all";

	// JSON to find the pokemon spawns
	var spawnURL = "../Landmarks/json/" + land + "-spawns.json";

	// JSON to find the pokemon species
	var itemsURL = "../Landmarks/json/" + land + "-items.json";

	// Holds the JSON data.
	var jsonData = [];
	
	var indexOfName = 24; // This corresponds to the index of a pokemon image URL where the name starts.
	
	// Setup.
	
	// Hide the small displays div.
	$("#small-displays").hide();
	
	// Set up the pokemon in the dropdown.
	$.getJSON(itemsURL, function(data) {
		appendItems(data);
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
			// Spawn types
			if (this.name == "filter") {
				var checked = false;
				if ($(this).is(":checked"))
					checked = true;
				if (this.value == "tree")
					tree = checked;
				else if (this.value == "ore")
					ore = checked;
			}
			// Update the image.
			updateImage();
		});
	});
	
	// Set up click event for item dropdown.
	$("#item-dropdown").change(function() {
		items = this.value;		
		updateImage();
	});
	
	// Functions.
	
	// Update the image when a filter changes.
	function updateImage() {
		// Check each item icon.
		$(".item-icon").each(function() {
			// If it matches the current filters, show it.
			if (hasType(this) && hasItem(this))
				$(this).show();
			// Otherwise, hide it.
			else
				$(this).hide();
		});
	}
	
	// Checks if an icon should be visible based on selected type filter.
	function hasType(icon) {
		if (tree && $(icon).hasClass("tree"))
			return true;
		else if (ore && $(icon).hasClass("ore"))
			return true;
		return false;
	}
	
	// Checks if an icon should be visible based on selected item filter.
	function hasItem(icon) {
		if (items == "all" || $(icon).hasClass(items))
			return true;
		return false;
	}
	
	// Add items to the dropdown, using the JSON.
	function appendItems(data) {	
		var itemDropdown = $("#item-dropdown");
		$.each(data, function() {
			// Create a new option element for each item.
			var itemOption = document.createElement("option");
			itemOption.value = this.id;
			itemOption.textContent = this.name;
			// Append it to the dropdown.
			itemDropdown.append(itemOption);
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
				// Set the ID based on the item's tag.
				var id = "item-" + this.tag;
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
					icon.classList.add("item-icon");
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
			$.each($(".item-icon"), function() {
				// Set up click event.
				$(this).click(function() {
					// Get the div holding the tables & clear it.
					var tableContainer = $("#table-displays");
					$(tableContainer).html("");
					// Get the tag from the id.
					var id = this.id.replace("item-", "");
					
					// Get the spawn from the data.
					var spawnPoint = jsonData[parseInt(id)];
					$.each(spawnPoint.full, function() {
						// Create a new table.
						var table = "<table>";
						
						// Set the background.						
						var color = true;
						
						// Set the table headers.
						table += "<thead><tr class='light-" + color + "'><th>Item</th><th>Spawn Rate</th></tr></thead>";
						color = !color;
						var htmlBlock;
						// Iterate over all the contained items
						for (i = 0; i < this.itemName.length; i++) {
							// Add the item as a row
							htmlBlock = "<tr class='light-" + color + "'><td>" + this.itemName[i] + "</td><td>" + this.spawn[i] + "</td></tr>";
							color = !color;
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
					var tag = this.id.replace("item-", "");
					var subtag = this.className.match(/group-\d+/)[0].replace("group-", "");
					
					// Get the spawn point and the group the item is part of
					var tagGroup = jsonData[parseInt(tag)];
					var subtagGroup = tagGroup.groups[parseInt(subtag)];
					
					// Set the background color.
						$(container).addClass("light-true");
					
					// Set the location of the div. I try to make it so that this is icon + 3%.
					$(container).css("top", subtagGroup.displayTop);
					$(container).css("left", subtagGroup.displayLeft);
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