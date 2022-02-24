var weather = "all-weather";
	
var time = "morning";
	
var ground = true;
var water = true;
var air = true;
var alpha = true;
var tree = false;
var ore = false;
	
var pokemon = "all";


updateImage();

		
function toggleWeatherVisibility(id) {
	weather = id;
	updateImage();
}

			
function toggleTimeVisibility(id) {
	time = id;
	updateImage();
}

			
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

			
function togglePokemonVisibility(id) {
	pokemon = id;
	updateImage();
}
	
	
function updateImage() {
	
	var allw = false;
	if (weather=="all-weather") {
		allw = true;
	}
				
	var allp = false;
	if (pokemon=="all") {
		allp = true;
	}
	
	fetch('table-test.json')
		.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			appendIcons(data);
		})
		.catch(function (err) {
			console.log('error: ' + err);
		});
		
		function appendIcons(data) {
			var smallDisplayContainer = document.getElementById("small-displays");
			var iconDisplayContainer = document.getElementById("display-icons");
			var displayTest = document.getElementById("display-test");
			smallDisplayContainer.innerHTML = "";
			iconDisplayContainer.innerHTML = "";
			
			for (var i = 0; i < data.length; i++) {
				var group = data[i].groups;
				var point = data[i].tag;
				for (var j = 0; j < group.length; j++) {
				
					if (
						(allw || (!allw && group[j].conditions.includes(weather)) || group[j].conditions.includes("all-weather"))
			
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
					
					var icon = document.createElement("img");
					icon.src = group[j].icon;
					icon.className = "testClass";
					icon.id = point;
					icon.style.top = group[j].iconTop;
					icon.style.left = group[j].iconLeft;
					iconDisplayContainer.appendChild(icon);
					
					var displays = group[j].display;
						
					var individualDisplay = document.createElement("div");
					individualDisplay.style.top = group[j].displayTop;
					individualDisplay.style.left = group[j].displayLeft;
					
					for (var k = 0; k < displays.length; k++) {
						individualDisplay.innerText += displays[k];
						individualDisplay.appendChild(document.createElement("br"));
					}
						
					smallDisplayContainer.appendChild(individualDisplay);
					
					}
				}
			}
		}
	
	
	
}
