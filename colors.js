var DARK_MODE_KEY = "altissimo1-darkmode";

// Folder that holds colors.js, light.css and dark.css (the site root).
var STYLE_BASE = (document.currentScript ? document.currentScript.src : "").replace(/colors\.js(\?.*)?$/, "");

// Apply the saved theme as soon as the <link id="style"> tag is parsed.
// For dark mode visitors, the page stays hidden on a dark background until dark.css
// has loaded, so they never see a flash of the light theme.
(function() {
	var dark = loadDarkMode();
	var root = document.documentElement;
	var revealed = false;
	
	function reveal() {
		if (revealed) return;
		revealed = true;
		root.style.colorScheme = "";
		root.style.visibility = "";
	}
	
	function apply() {
		var style = document.getElementById("style");
		if (!style) return false;
		style.addEventListener("load", reveal);
		style.addEventListener("error", reveal);
		updateURL(dark);
		return true;
	}
	
	if (dark) {
		root.style.colorScheme = "dark";
		root.style.visibility = "hidden";
		setTimeout(reveal, 2000); // Safety net: never leave the page hidden.
	}
	
	if (apply() || !window.MutationObserver) {
		if (!document.getElementById("style")) reveal();
		return;
	}
	var observer = new MutationObserver(function() {
		if (apply()) observer.disconnect();
	});
	observer.observe(root, { childList: true, subtree: true });
	document.addEventListener("DOMContentLoaded", function() {
		observer.disconnect();
		if (!document.getElementById("style")) reveal();
	});
})();

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
		var dark = $(this).is(":checked");
		saveDarkMode(dark);
		updateURL(dark);
	});
	
});

// Set the dark mode checkbox
function setCheckbox() {
	var dark = loadDarkMode();
	
	updateURL(dark);
	
	$("#dark-mode").prop("checked", dark);	
}

// Update the stylesheet reference
function updateURL(dark) {
	var style = document.getElementById("style");
	if (!style) return;
	
	var base = STYLE_BASE;
	if (!base) {
		var common = document.getElementById("common");
		base = common ? common.getAttribute("href").replace("common.css", "") : "";
	}
	
	var href = base + (dark ? "dark.css" : "light.css");
	if (style.getAttribute("href") != href)
		style.setAttribute("href", href);
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


// Save and load the dark mode preference (localStorage).
// Older versions of the site used a cookie, which is read once and then removed.
function loadDarkMode() {
	var saved = null;
	try {
		saved = localStorage.getItem(DARK_MODE_KEY);
	} catch (e) {}
	
	if (saved !== null)
		return saved == "on";
	
	var legacyDark = getLegacyCookie(DARK_MODE_KEY) == "set";
	if (legacyDark)
		saveDarkMode(true);
	return legacyDark;
}

function saveDarkMode(dark) {
	try {
		localStorage.setItem(DARK_MODE_KEY, dark ? "on" : "off");
	} catch (e) {
		return; // Storage blocked: keep any old cookie rather than lose the setting.
	}
	if (getLegacyCookie(DARK_MODE_KEY) != "")
		document.cookie = DARK_MODE_KEY + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure";
}

function getLegacyCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(";");
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i].replace(/^\s+/, "");
		if (c.indexOf(name) == 0)
			return c.substring(name.length);
	}
	return "";
}
