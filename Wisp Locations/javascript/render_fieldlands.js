"use strict";

var wisp = true;
var unown = true;
var verse = true;
var dig = true;

updateImage();

fetch('json/filter-lands.json')
	.then(function (response) {
        return response.json();
    })
    .then(function (data) {
        appendFilter(data);
    })
    .catch(function (err) {
        console.log('error: ' + err);
    });
		
	function appendFilter(data) {
		var mainContainer = document.getElementById("check-div");
		mainContainer.innerHTML = "<h3>Select filters to apply:</h3>";
	
		for (var i = 0; i < data.length; i++) {
			var label = document.createElement("label");
			label.value = data[i].value;
			label.textContent = data[i].name;
		
			var input = document.createElement("input");
			input.checked = data[i].check;
			input.type= "checkbox";
			input.name = "filter";
			input.id = data[i].id;
			input.setAttribute("onclick", "toggleFilterVisibility(this.id)");
			label.appendChild(input);
		
			mainContainer.appendChild(label);
			mainContainer.appendChild(document.createElement("br"));
			mainContainer.appendChild(document.createElement("br"));
		}
	}
	
	function toggleFilterVisibility(id) {
	var filter = document.getElementById(id);
		switch (id) {
			case "filter-wisp":
				wisp = filter.checked;
				break;
			case "filter-unown":
				unown = filter.checked;
				break;
			case "filter-verse":
				verse = filter.checked;
				break;
			case "filter-dig":
				dig = filter.checked;
				break;
		}	
	updateImage();
}

function updateImage() {
	
	// Load in the .json with all the spawn data for the Fieldlands.
	
	fetch('json/fieldlands.json')
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
			var iconDisplayContainer = document.getElementById("display");
			iconDisplayContainer.innerHTML = "";
			
			// For each spawn point in the json data, show it if and only if all its "conditions" match the filters.
			
			for (var i = 0; i < data.length; i++) {
				var type = data[i].type;
				var point = data[i].tag;
				if ((wisp && type=="wisp") || (unown && type=="unown") || (verse && type=="verse") || (dig && type=="dig")) {
					var icon = document.createElement("img");
					icon.src = data[i].icon;
					icon.className = type;
					icon.id = point
					icon.setAttribute("onmouseover", "showDisplay(this.id)");
					icon.setAttribute("onmouseout", "hideDisplay()");
					icon.setAttribute("onclick", "swapIcon(this.id)");
					icon.style.top = data[i].iconTop;
					icon.style.left = data[i].iconLeft;
					iconDisplayContainer.appendChild(icon);
				}
			}
		}
}

function showDisplay(tag) {
	
	hideDisplay();
	
	fetch('json/fieldlands.json')
	.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			appendDisplay(data, tag);
		})
		.catch(function (err) {
			console.log('error: ' + err);
		});
		
	
	function appendDisplay(data, tag) {
		console.log("mouse on " + tag);
		var body = document.getElementById("hover-display");
		
		// Get the tag from the icon calling the function and use it to locate the data for that spawn in the json.
		
		var tag = data[parseInt(tag)];
		
		var detailContainer = document.createElement("img");
		detailContainer.id = "detail-image";
		
		// Set the location of the img. I try to make it so that this is icon + 3%.
			
		detailContainer.style.top = tag.displayTop;
		detailContainer.style.left = tag.displayLeft;
		detailContainer.src = tag.imgsrc;
		
		// Add the div to the body.
		body.appendChild(detailContainer);
						
	}
}

// To hide a display, simply remove the small-displays element.
	
function hideDisplay() {
	if (document.contains(document.getElementById("detail-image"))) {
		document.getElementById("detail-image").remove();
	}
}

// Show detail is called whenever the icon is clicked.
	    
function swapIcon(tag) {
	fetch('json/fieldlands.json')
	.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			swap(data, tag);
		})
		.catch(function (err) {
			console.log('error: ' + err);
		});
	
	function swap(data, tag) {
		var img = document.getElementById(tag);
		
		
		if (img.getAttribute("src") != "../resources/legends_arceus/other_icons/Check.png") {
			img.src = "../resources/legends_arceus/other_icons/Check.png";
		} else {
			img.src = data[parseInt(tag)].icon;
		}
	}
}