updateImage()

function updateImage() {
	
	// Load in the .json with all the spawn data for the icelands.
	
	fetch('json/icelands.json')
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
			
			for (var i = 0; i < data.length; i++) {
				var icon = document.createElement("img");
				icon.src = data[i].icon;
				icon.id = data[i].tag;
				if (data[i].icon == "../resources/legends_arceus/other_icons/verse.png") {
					icon.className = "verseImage";
				}
				else {
					icon.className = "iconImage";
					icon.setAttribute("onmouseover", "showDisplay(this.id)");
					icon.setAttribute("onmouseout", "hideDisplay()");
				}
				icon.setAttribute("onclick", "swapIcon(this.id)");
							
				// Set the location of the icon.
				icon.style.top = data[i].iconTop;
				icon.style.left = data[i].iconLeft;
							
				// Add the icon to the icon container div.
				iconDisplayContainer.appendChild(icon);
			}
			
		}
		
}


// This function will execute when the user hovers over an icon on the map.

function showDisplay(tag) {
	
	hideDisplay();
	
	fetch('json/icelands.json')
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
	fetch('json/icelands.json')
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