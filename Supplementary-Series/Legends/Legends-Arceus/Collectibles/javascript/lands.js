// This function controls clicking the language buttons
var langButton = function languageClick() {
	var lang = $(this).attr("id");
	
	$(".langArea").each(function() {
		if ($(this).hasClass(lang)) {
			$(this).show();
		}
		else
			$(this).hide();
	});		
}

$(function() {
	setLanguageButton();
	
	var languageButtons = $("input[type=radio][name=language]");
	languageButtons.each(function() {
		if ($(this).is(":checked"))
			$(this).trigger("click");
	});
	
	// Variables.
	// Check icon.
	const checkURL = "../../../../Resources/images/pla-icons/other-icons/check.png";
	
	// JSON file to check against.
	var jsonURL = "../Collectibles/json/" + land + ".json";
	
	// Set a variable to hold the JSON data.
	var jsonData = [];
	
	// Saved progress for this map (localStorage), only used if the visitor ticks the save box.
	// Format: { checked: ["wisp-0", "unown-20", ...], hidden: ["dig", ...] }
	var storageKey = "altissimo1-collectibles-" + land;
	var saved = loadSaved();
	var useStorage = saved !== null;
	var iconsLoaded = false;
	
	// Setup.
	
	$(".save-check").prop("checked", useStorage);
	
	prepareImage();
	
	// Set up click event on the zoom button.
	$("#enlarge").click(function() {
		if ($("#zoom").attr('src') == "../../../../Resources/images/pla-icons/other-icons/zoom-minus.png") {
			$("#map-div").css("width", "45%");
			$("#zoom").attr("src", "../../../../Resources/images/pla-icons/other-icons/zoom-plus.png");
		} else {
			$("#map-div").css("width", "98%");
			$("#zoom").attr("src", "../../../../Resources/images/pla-icons/other-icons/zoom-minus.png");
		}
	});
	
	// Restore hidden filters.
	if (useStorage) {
		$.each(saved.hidden, function(i, type) {
			$("#filter-" + type).prop("checked", false);
		});
	}
	
	// Save box: turning it on saves the current progress; turning it off deletes this map's saved progress.
	$(".save-check").click(function() {
		useStorage = $(this).is(":checked");
		// Keep the English and Japanese checkboxes in sync.
		$(".save-check").prop("checked", useStorage);
		if (useStorage)
			writeSaved();
		else {
			try {
				localStorage.removeItem(storageKey);
			} catch (e) {}
		}
	});
	
	$(".filter").click(function() {
		var type = this.id.replace("filter-", "");
		if ($(this).is(":checked"))
			$(".click-img." + type).show();
		else
			$(".click-img." + type).hide();
		writeSaved();
	});
	
	$(".reset-button").click(function() {
		$.each($(".click-img"), function() {
			changeIcon(false, this);
		});
	});
	
	$(".check-all-button").click(function() {
		$.each($(".click-img"), function() {
			changeIcon(true, this);
		});
	});
	
	// Set up image when page is loaded.
	function prepareImage() {
		$.getJSON(jsonURL, function(data) {
			jsonData = data;
			appendIcons();
		}).fail(function() {
			console.log("An error has occurred.");
		});
		
		// Add icons to the page.
		function appendIcons() {
			// Get the display div.
			var iconDisplayContainer = $("#display");
			
			// Hide the container.
			iconDisplayContainer.hide();
			
			$.each(jsonData, function() {
				var type = this.type;
				var point = this.tag;
				var src = this.icon;
				var alt = type;
				if (useStorage && saved.checked.indexOf(type + "-" + point) != -1) {
					src = checkURL;
					alt = "check";
				}
				var icon = document.createElement("img");
				icon.src = src;
				icon.className = type;
				icon.classList.add("hover-img");
				icon.classList.add("click-img");
				icon.id = type + "-" + point;
				icon.alt = alt;
				
				icon.style.top = this.iconTop;
				icon.style.left = this.iconLeft;
				
				iconDisplayContainer.append(icon);
			});		

			// set up click events on each icon.
			$.each($(".click-img"), function() {
				$(this).click(function() {
					changeIcon($(this).attr("src") != checkURL, this);
				});
			});
			
			$.each($(".hover-img"), function() {				
				// Set up hover function on each icon.
				$(this).on("mouseenter", function() {
					// Get the hover container.
					var container = $("#hover-display");
					
					// Hide it.
					container.hide();
					
					// Get the hover image element.
					var img = document.createElement("img");
					
					img.id = "detail-image";
					
					// Get the type.
					var type = getType(this);
					
					// Get the tag from the ID.
					var point = jsonData[parseInt(this.id.replace(type + "-", ""))];
					
					// Give the image its source and alt.
					img.src = point.imgsrc;
					img.alt = type + "-location";
					img.style.top = point.displayTop;
					img.style.left = point.displayLeft;
					
					container.append(img);

					container.show();
				});
				
				// SEt up function when mouse leaves the icon				
				$(this).on("mouseleave", function() {
					// Hide the icon.
					if (document.contains(document.getElementById("detail-image")))
						$("#detail-image").remove();
				});		
			});
			
			// Hide icons if filter is hidden.
			$.each($(".filter"), function() {
				var type = this.id.replace("filter-", "");
				if (!$(this).is(":checked"))
					$(".click-img." + type).hide();
			});
			
			iconDisplayContainer.show();
			iconsLoaded = true;
		}		
	}
	
	// Get the icon's type based on its class list.
	function getType(icon) {
		if ($(icon).hasClass("wisp"))
			return "wisp";
		if ($(icon).hasClass("unown"))
			return "unown";
		if ($(icon).hasClass("dig"))
			return "dig";
		if ($(icon).hasClass("verse"))
			return "verse";
	}	
	
	// Load this map's saved progress, or null if saving isn't turned on.
	function loadSaved() {
		var data = null;
		try {
			data = JSON.parse(localStorage.getItem(storageKey));
		} catch (e) {}
		
		if (data && typeof data == "object")
			return { checked: data.checked || [], hidden: data.hidden || [] };
		
		return migrateCookies();
	}
	
	// Save the current checkmarks and hidden filters, if saving is turned on.
	function writeSaved() {
		if (!useStorage)
			return;
		
		var data = { checked: [], hidden: [] };
		
		// If the icons haven't loaded yet, keep the checkmarks that were already saved.
		if (iconsLoaded) {
			$.each($(".click-img"), function() {
				if ($(this).attr("src") == checkURL)
					data.checked.push(this.id);
			});
		} else if (saved)
			data.checked = saved.checked;
		
		$.each($(".filter"), function() {
			if (!$(this).is(":checked"))
				data.hidden.push(this.id.replace("filter-", ""));
		});
		
		try {
			localStorage.setItem(storageKey, JSON.stringify(data));
		} catch (e) {}
	}
	
	// Older versions of this page saved progress in cookies. Move it to localStorage once,
	// then delete those cookies. Returns the migrated progress, or null if there was none.
	function migrateCookies() {
		var prefix = "altissimo1-collectible-" + land + "-";
		var data = { checked: [], hidden: [] };
		var enabled = false;
		var names = [];
		
		var cookies = document.cookie.split(";");
		for (var i = 0; i < cookies.length; i++) {
			var pair = cookies[i].replace(/^\s+/, "").split("=");
			if (pair[0].indexOf(prefix) != 0)
				continue;
			
			names.push(pair[0]);
			if (pair[1] != "set")
				continue;
			
			var rest = pair[0].substring(prefix.length);
			var match = rest.match(/^([a-z]+)(\d*)$/);
			if (rest == "cookie")
				enabled = true;
			else if (match && match[2] != "")
				data.checked.push(match[1] + "-" + match[2]);
			else if (match)
				data.hidden.push(match[1]);
		}
		
		if (!enabled)
			return null;
		
		try {
			localStorage.setItem(storageKey, JSON.stringify(data));
		} catch (e) {
			return data; // Storage blocked: use the cookies for this visit and leave them in place.
		}
		for (var j = 0; j < names.length; j++)
			document.cookie = names[j] + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure";
		
		return data;
	}
	
	function changeIcon(makeCheck, entity) {
		var type = getType(entity);
		var point = entity.id.replace(type + "-", "");
		if (makeCheck) {
			$(entity).attr("src", checkURL);
			$(entity).attr("alt", "check");
		}
		else {
			$(entity).attr("src", jsonData[parseInt(point)].icon);
			$(entity).attr("alt", type);
		}
		writeSaved();
	}
	
	function setLanguageButton() {
		var url = window.location.href;
		
		var lang = url.substring(url.indexOf("?") + 1);
		
		var languageButtons = $("input[type=radio][name=language]");
		
		languageButtons.each(function() {
			if (this.id == lang)
				$(this).prop("checked", true);
		});
	}
});