// Global variables corresponding to what filter options are checked when the page loads.

var weather = "sun";
	
var time = "morning";
	
var ground = true;
var water = true;
var air = true;
var alpha = true;
var tree = false;
var ore = false;
	
var pokemon = "all";

// Calling updateImage() here will force the page to load the icons when first loaded.

updateImage();

// Function to change the global var associated with weather when a new weather condition is selected.

function toggleWeatherVisibility(id) {
	weather = id;
	updateImage();
}

// Function to change the global time var
			
function toggleTimeVisibility(id) {
	time = id;
	updateImage();
}

// Function to change the variables associated with the checkbox filters.
			
function toggleFilterVisibility(id) {
	var filter = document.getElementById(id);
		switch (id) {
			case "filter-ground":
				ground = filter.checked;
				break;
			case "filter-air":
				air = filter.checked;
				break;
			case "filter-alpha":
				alpha = filter.checked
				break;
			case "filter-water":
				water = filter.checked;
				break;
			case "filter-tree":
				tree = filter.checked;
				break;
			case "filter-ore":
				ore = filter.checked;
				break;
		}	
	updateImage();
}

// Function to change the pokemon selected.
			
function togglePokemonVisibility(id) {
	pokemon = id;
	updateImage();
}
	
	
// Update image will be called anytime any of the filters change. It will force-reload all of the icons on the page in accordance with the
// set of parameters in the filter.
	
function updateImage() {
	
	// Set an "all pokemon" variable that is set to true only if the "all" option is selected in the pokemon dropdown
				
	var allp = false;
	if (pokemon=="all") {
		allp = true;
	}
	
	// Load in the .json with all the spawn data for the fieldlands.
	
	fetch('json/fieldlands_spawns.json')
		.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			appendIcons(data);
		})
		.catch(function (err) {
			console.log('error: ' + err);
		});
		
		// Draw the icons with the appendIcons function.
		
		function appendIcons(data) {
			var iconDisplayContainer = document.getElementById("display-icons");
			iconDisplayContainer.innerHTML = "";
			
			// For each spawn point in the json data, show it if and only if all its "conditions" match the filters.
			
			for (var i = 0; i < data.length; i++) {
				var group = data[i].groups;
				var point = data[i].tag;
				for (var j = 0; j < group.length; j++) {
				
					if (
						(group[j].conditions.includes(weather) || group[j].conditions.includes("all-weather"))
						&&	
						(group[j].conditions.includes("all-time") || (group[j].conditions.includes("all-day") && (time=="morning" ||time=="day" || time=="evening")) ||
							(group[j].conditions.includes(time)))
						&&
						((ground && group[j].conditions.includes("ground")) || (water && group[j].conditions.includes("water")) ||
							(air && group[j].conditions.includes("air")) || (alpha && group[j].conditions.includes("alpha")) ||
							(tree && group[j].conditions.includes("tree")) || (ore && group[j].conditions.includes("ore")))
						&&
						(allp || (!allp &&  group[j].conditions.includes(pokemon)))
						)
						{
							// If the spawn point matches the filters:
					
							// Set the image to display as the icon src in the json
							var icon = document.createElement("img");
							icon.src = group[j].icon;
							
							// Set the class name as the "tag" value in the json file and the id as the "subtag". Each spawn point has a unique "tag" id. Each
							// individual spawn within the spawn point has a "subtag" id, and the numbering on the subtags restarts with each new tag.
							// Between the tag and subtag, you can locate any individual spawn in the json, which is used when displaying the divs associated
							// with the icon.
							icon.className = point;
							icon.classList.add(group[j].iconClass);
							icon.id = group[j].subtag;
							
							// Set hover and click functions for the icon.
							icon.setAttribute("onmouseover", "showDisplay(this.className, this.id)");
							icon.setAttribute("onmouseout", "hideDisplay(this.className)");
							icon.setAttribute("onclick", "showDetail(this.className)");
							
							// Set the location of the icon.
							icon.style.top = group[j].iconTop;
							icon.style.left = group[j].iconLeft;
							
							// Add the icon to the icon container div.
							iconDisplayContainer.appendChild(icon);
						}
				}
			}
		}
}

// This function will execute when the user hovers over an icon on the map.

function showDisplay(tag, subtag) {
	fetch('json/fieldlands_spawns.json')
	.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			appendDisplay(data, tag, subtag);
		})
		.catch(function (err) {
			console.log('error: ' + err);
		});
		
	
	function appendDisplay(data, tag, subtag) {
		console.log("mouse on " + tag);
		if (document.contains(document.getElementById("small-displays"))) {
			document.getElementById("small-displays").remove();
		}
		var body = document.getElementById("map-div");
		
		// Get the tag and subtag from the icon calling the function and use them to locate the data for that spawn in the json.
		
		var tagGroup = data[parseInt(tag)];
		var subtagGroup = tagGroup.groups[parseInt(subtag)];
		
		// Create a div and set its background color to correspond with the filter time.
		
		var smallDisplayContainer = document.createElement("div");
		smallDisplayContainer.id = "small-displays";
		if (time=="night") {
			smallDisplayContainer.    style.backgroundColor = "#5b89d4";
		}
		else {
			smallDisplayContainer.style.backgroundColor = "#b5c8e6";
		}
		
		// Set the location of the div. I try to make it so that this is icon + 3%.
			
		smallDisplayContainer.style.top = subtagGroup.displayTop;
		smallDisplayContainer.style.left = subtagGroup.displayLeft;
		
		// Append all spawn data text into the div.
		
		var displays = subtagGroup.display;
		for (var i = 0; i < displays.length; i++) {
			smallDisplayContainer.innerHTML += displays[i];
			smallDisplayContainer.appendChild(document.createElement("br"));
		}
		
		// Add the div to the body.
		body.appendChild(smallDisplayContainer);
						
	}
}

// To hide a display, simply remove the small-displays element.
	
function hideDisplay() {
	if (document.contains(document.getElementById("small-displays"))) {
		document.getElementById("small-displays").remove();
	}
}

// Show detail is called whenever the icon is clicked.
	    
function showDetail(tag) {
	fetch('json/fieldlands_spawns.json')
	.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			appendTable(data, tag);
		})
		.catch(function (err) {
			console.log('error: ' + err);
		});
	
	function appendTable(data, tag) {
		
		// Clear any existing tables from the table display div.
		
		var tableContainer = document.getElementById("table-displays");
		tableContainer.innerHTML = "";
		
		// Get the tag of the icon doing the calling. There is no need for the subtag because the table will contain all spawn data
		// for the point, so only the spawn point's unique identifier is needed.
		var point = data[parseInt(tag)];
		
		// Create a table for each parameter-set. Populate it with the data of that parameter-set.
		
		for (var i = 0; i < point.full.length; i++) {
			var table = document.createElement("table");
			if (point.full[i].heading.includes("Night")) {
				table.style.backgroundColor = "#5b89d4";
			}
			else {
				table.style.backgroundColor = "#b5c8e6";
			}
				
			table.innerHTML += "<tr><th colspan='2'>" + point.full[i].heading + "</th></tr>";
			table.innerHTML += "<tr><th>Pokémon</th><th>Spawn Rate</th></tr>";
			for (var j = 0; j < point.full[i].icon.length; j++) {
				table.innerHTML += "<tr><td><img src='" + point.full[i].icon[j] + "'/></td><td>" + point.full[i].spawn[j] + "</td></tr>";
			}
			tableContainer.append(table);
		}
	}
}
			
			
	
