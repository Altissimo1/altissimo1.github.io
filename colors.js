$(function() {
	var typeCheckbox = $("#type-checkbox");
	var hasTypeCheckbox = typeCheckbox.length > 0;
	
	var statusCheckbox = $("#status-checkbox");
	var hasStatusCheckbox = statusCheckbox.length > 0;
	
	if (hasTypeCheckbox) {
		if (!typeCheckbox.is(":checked")) {
			statusCheckbox.prop("disabled", "disabled");
		}
		
		updateTypes();		
		typeCheckbox.change(updateTypes);
	}
	
	if (hasStatusCheckbox)
	{
		updateStatusMoves();
		statusCheckbox.change(updateStatusMoves);
	}
	
	setCheckbox();
	
	$("#dark-mode").click(function() {
		if ($(this).is(":checked")) {
			setCookie("altissimo1-darkmode", true);
			updateURL(true);
		}
		else {
			setCookie("altissimo1-darkmode", false);
			updateURL(false);
		}
	});
	
});

// Set the dark mode checkbox
function setCheckbox() {
	var hasCookie = checkCookie("altissimo1-darkmode");
	if (hasCookie)
		var darkModeSet = getCookie("altissimo1-darkmode") == "set";
	
	var dark = hasCookie && darkModeSet;
	
	updateURL(dark);
	
	$("#dark-mode").prop("checked", dark);	
}

// Update the stylesheet reference
function updateURL(dark) {
	var path = $("#common").attr("href");
	
	var path = path.replace("common.css", "");
	
	if (dark)
		$("#style").attr("href", path + "dark.css");
	else
		$("#style").attr("href", path + "light.css");
}

// Update colors w/ the status checkbox
function updateStatusMoves() {
	if ($("#status-checkbox").is(":checked")) {
		$.each($(".status-move"), function() {
			var statusMove = this;
			var typeColor;
			$.each(statusMove.classList, function() {
				if (this != "status-move")
					typeColor = this;
			});
			
			$(statusMove).attr("data-type", typeColor);
			
			statusMove.classList.remove(typeColor);
			statusMove.classList.add("status");
		});
	}
	else {
		$.each($(".status-move"), function() {
			var statusMove = this;
			var typeColor = $(statusMove).attr("data-type");
			
			statusMove.classList.remove("status");
			statusMove.classList.add(typeColor);
		});
	}
}

// Update type colors
function updateTypes() {
	if ($("#type-checkbox").is(":checked")) {
		$("#status-checkbox").removeAttr("disabled");
		$(".type-true").css({"background-color": "", "color": ""});
		$(".type-false").css({"background-color": "", "color": ""});
	}
	else {		
		$("#status-checkbox").prop("disabled", "disabled");
		$(".type-true").css({"background-color": "var(--light-true-background)", "color": "var(--light-true-color)"});
		$(".type-false").css({"background-color": "var(--light-false-background)", "color": "var(--light-false-color)"});
	}
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