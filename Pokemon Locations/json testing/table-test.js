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
			var iconDisplayContainer = document.getElementById("display-icons");
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
					icon.setAttribute("onmouseover", "showDisplay(this.class, this.id)");
					icon.setAttribute("onmouseout", "hideDisplay(this.class, this.id)");
					icon.setAttribute("onclick", "showDetail(this.class)");
					icon.className = point;
					icon.id = group[j].subtag;
					icon.style.top = group[j].iconTop;
					icon.style.left = group[j].iconLeft;
					iconDisplayContainer.appendChild(icon);
					
					}
				}
			}
		}
	
	
	
}

function showDisplay(tag, subtag) {
	.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			appendDisplay(data);
		})
		.catch(function (err) {
			console.log('error: ' + err);
		});
	
	function appendDisplay(data, tag, subtag) {
		var tagGroup = data[parseInt(tag)];
		var subtagGroup = tagGroup[parseInt(subtag)];
		var smallDisplayContainer = document.getElementById("small-displays");
		var individualDisplay = document.createElement("div");
		individualDisplay.style.top = subtagGroup.displayTop;
		individualDisplay.style.left = subtagGroup.displayLeft;
		var displays = subtagGroup.display;
		for (var i = 0; i < displays.length; i++) {
			individualDisplay.innerText += displays[i];
			individualDisplay.appendChild(document.createElement("br"));
		}
						
		smallDisplayContainer.appendChild(individualDisplay);
		
	
