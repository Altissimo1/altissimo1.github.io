$(function() {
	
	// Variables.
	// Check icon.
	const checkURL = "../../../../Resources/images/pla-icons/other-icons/check.png";
	
	// JSON file to check against.
	var jsonURL = "../Collectibles/json/" + land + ".json";
	
	// Set a variable to hold the JSON data.
	var jsonData = [];
	
	var useCookies = false;
	
	var cookiePrefix = "altissimo1-collectible-" + land + "-";
	
	// Setup.
	
	checkCookies();
	
	prepareImage();
	
	// Check if cookies are present
	if (useCookies) {
		// Set up filters based on cookies.
		$.each($(".filter"), function() {
			var type = this.id.replace("-filter", "");
			if (getCookie(cookiePrefix + type) == "set")
				$(this).prop("checked", false);
		});
	}
	
	// Set listener on checkbox object.
	$("#cookie-check").click(function() {
		// If cookies are checked, add a cookie to state that it is checked, and add existing checks to cookies
		if ($(this).is(":checked")) {
			setCookie(cookiePrefix + "cookie", true);
			useCookies = true;
			$.each($(".click-img"), function() {
				var type = getType(this);
				var point = this.id.replace(type + "-", "");
				if ($(this).attr("src") == checkURL)
					setCookie(cookiePrefix + type + point, true);
			});
		}
		// Otherwise, remove the cookie (if present) and remove any existing cookies.
		else {
			setCookie(cookiePrefix + "cookie", false);
			var cookies = document.cookie.split(";");
			for (var i = 0; i < cookies.length; i++)
				setCookie(cookies[i].split("=")[0], false);	
			useCookies = false;
		}
	});
	
	$(".filter").click(function() {
		var type = this.id.replace("filter-", "");
		if ($(this).is(":checked")) {
			$(".click-img." + type).show();
			// Set a cookie only if it should be DEselected
			if (useCookies)
				setCookie(cookiePrefix + type, false);
		} else {
			$(".click-img." + type).hide();
			if (useCookies)
				setCookie(cookiePrefix + type, true);
		}
	});
	
	$("#reset-button").click(function() {
		$.each($(".click-img"), function() {
			changeIcon(false, this);
		});
	});
	
	$("#check-all-button").click(function() {
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
				if (useCookies) {
					var cookieName = cookiePrefix + type + point;
					if (getCookie(cookieName) == "set") {
						src = checkURL;
						alt = "check";
					}
				}
				var icon = document.createElement("img");
				icon.src = src;
				icon.className = type;
				if (type == "wisp" || type == "unown")
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
	
	// Get and set cookies.
	function setCookie(name, active) {
		if (active) {
			document.cookie = name + "=set; path=/; SameSite=None; Secure;";
		} else {
			document.cookie = name + "=unset; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure;"
		}
	}		

	function getCookie(cname) {
		let name = cname + "=";
		let ca = document.cookie.split(";");
		for (let i = 0; i < ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) == ' ') {
				c = c.substring(1);
			}
			if (c.indexOf(name) == 0) {
				return c.substring(name.length, c.length);
			}
		}
		return "";
	}

	function checkCookie(cname) {
		let cookie = getCookie(cname);
		if (cookie == "" || cookie == null) {
			return false;
		} else {
			return true;
		}
	}
	
	// Check if user has cookies set.
	function checkCookies() {
		let cookie = getCookie(cookiePrefix + "cookie");
		if (cookie != "" && cookie != null) {
			useCookies = true;
			$("#cookie-check").prop('checked', true);
		}
	};
	
	function changeIcon(makeCheck, entity) {
		var type = getType(entity);
		var point = entity.id.replace(type + "-", "");
		if (makeCheck) {
			$(entity).attr("src", checkURL);
			$(entity).attr("alt", "check");
			if (useCookies)
				setCookie(cookiePrefix + type + point, true);
		}
		else {
			$(entity).attr("src", jsonData[parseInt(point)].icon);
			$(entity).attr("alt", type);
			if (useCookies)
				setCookie(cookiePrefix + type + point, false);
		}					
	}
	
});