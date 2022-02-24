var weather = "sun";
	
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
					
					var icon = document.createElement("img");
					icon.src = group[j].icon;
					icon.className = point;
					icon.setAttribute("onmouseover", "showDisplay(this.className, this.id)");
					icon.setAttribute("onmouseout", "hideDisplay()");
					icon.setAttribute("onclick", "showDetail(this.className)");
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
	fetch('table-test.json')
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
		var body = document.getElementById("body-div");
		var tagGroup = data[parseInt(tag)];
		var subtagGroup = tagGroup.groups[parseInt(subtag)];
		var smallDisplayContainer = document.createElement("div");
		smallDisplayContainer.id = "small-displays";
		smallDisplayContainer.style.top = subtagGroup.displayTop;
		smallDisplayContainer.style.left = subtagGroup.displayLeft;
		var displays = subtagGroup.display;
		for (var i = 0; i < displays.length; i++) {
			smallDisplayContainer.innerText += displays[i];
			smallDisplayContainer.appendChild(document.createElement("br"));
		}
		body.appendChild(smallDisplayContainer);
						
	}
}
	
function hideDisplay() {
	document.getElementById("small-displays").remove();
}

	    
function showDetail(tag) {
	fetch('table-test.json')
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
		var tableContainer = document.getElementById("table-displays");
		tableContainer.innerHTML = "";
		
		var point = data[parseInt(tag)];
		
		
		for (var i = 0; i < point.full.length; i++) {
			var table = document.createElement("table");
			table.innerHTML += "<tr><th colspan='2'>" + point.full[i].heading + "</th></tr>";
			table.innerHTML += "<tr><th>Pokémon</th><th>Spawn Rate</th></tr>";
			for (var j = 0; j < point.full[i].icon.length; j++) {
				table.innerHTML += "<tr><td><img src='" + point.full[i].icon[j] + "'/></td><td>" + point.full[i].spawn[j] + "</td></tr>";
			}
			tableContainer.append(table);
		}
	}
}
			
			
	
