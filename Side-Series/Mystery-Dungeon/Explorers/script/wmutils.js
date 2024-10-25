if(typeof(console) === "undefined" || typeof(console.log) === "undefined") {
	var console = { log: function() {} };
	console.info = console.log;
	console.error = console.log;
	console.warn = console.log;
}

if(!Array.prototype.indexOf) {
	// Based on the Mozilla-provided sample:
	// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Array/indexOf#Compatibility
	Array.prototype.indexOf = function(elt, from) {
		var from = Number(from) || 0;
		var len = this.length;

		for(var i = from; i < len; i++) {
			if(this[i] == elt) {
				return i;
			}
		}

		return -1;
	}
}

/**
 * Wrapper for document.getElementById because I am lazy.
 * @param String ID
 * @return DOMstuff
 */
function $(id) {
	return document.getElementById(id);
}

/**
 * Prettifies a mail string, given the amount of rows and the length of the middle column. Outer column
 * width is automagically calculated.
 * @param String Mail string to prettify
 * @param Number Amount of rows
 * @param Number Amount of characters in the middle column
 * @return String Prettified mail string
 */
function prettyMailString(mailString, rows, middleColumnSize) {
	mailString = WMSParser.sanitize(mailString);

	// If our mailString is 18 bytes and the middle column is 5 bytes with 2 rows, we'll have 8 bytes left for the rest.
	// There'll be 2 columns for 2 rows each = 8/2/2 = 2 bytes.
	//                    (18                - (2 * 5))                   / (2 * 2)    = 2
	var outerColumnSize = (mailString.length - (rows * middleColumnSize)) / (rows * 2);

	var prettyString = "";
	var stringPtr = 0;
	for(var row = 0; row < rows; row++) {
		if(prettyString != "") {
			prettyString += "\n";
		}
		prettyString += mailString.substr(stringPtr, outerColumnSize) + " ";
		stringPtr += outerColumnSize;
		prettyString += mailString.substr(stringPtr, middleColumnSize) + " ";
		stringPtr += middleColumnSize;
		prettyString += mailString.substr(stringPtr, outerColumnSize);
		stringPtr += outerColumnSize;
	}
	return prettyString;
}

/**
 * Returns the item name for a given item ID. Requires the sky_item file to be loaded.
 * @param Number Item ID
 * @return String Item name or "Unknown Item"
 */
function getItemName(itemId) {
	if(WMSkyItem[itemId]) {
		return WMSkyItem[itemId];
	}
	else {
		return "Unknown Item";
	}
}

/**
 * Returns the dungeon name for a given dungeon ID. Requires the sky_dungeon file to be loaded.
 * @param Number Dungeon ID
 * @return String Dungeon name or "Unknown"
 */
function getDungeonName(dungeonId) {
	// TODO: keep list of valid/invalid WMS dungeons
	if(WMSkyDungeon[dungeonId]) {
		return WMSkyDungeon[dungeonId];
	}
	else {
		return "Unknown";
	}
}

/**
 * Returns the monster name for a given monster ID. Requires the sky_monster file to be loaded.
 * @param Number Monster ID
 * @return String Monster name or "Unknown"
 */
function getMonName(monId) {
	var female = (monId > 600);
	if(female) {
		monId -= 600;
	}

	if(WMSkyPoke[monId]) {
		// (female ? "[F]" : "[M]") +
		return WMSkyPoke[monId];
	}
	else {
		return "Unknown";
	}
}

// simple filter with regex system
function add_filter(select_id, placeholder, insert_before) {

	// set default values
	placeholder = typeof placeholder !== 'undefined' ? placeholder : "Filter...";

	// get the select tag
	var select_tag;
	if(typeof select_id === 'string') {
		select_tag = document.getElementById(select_id);
	} else {
		select_tag = select_id;
	}

	// create a simple input and insert just before the select tag
	var searchInput = document.createElement('input');
	searchInput.placeholder=placeholder;
	searchInput.id = select_tag.id + "Filter";
	searchInput.className = "filterBox";
	searchInput.type = "text";

	insert_before = typeof insert_before !== 'undefined' ? insert_before : select_tag;
	insert_before.parentElement.insertBefore(searchInput, insert_before);

	// add an event listener to any key pressed
	searchInput.addEventListener("keyup", function (e) {
		var text = e.target.value;
		var options = select_tag.options;
		for (var i = 0; i < options.length; i++) {
			var option = options[i];
			var optionText = option.text;
			// lowercase comparison for case-insensitivity
			var lowerOptionText = optionText.toLowerCase();
			var lowerText = text.toLowerCase();
			var regex = new RegExp("^" + text, "i");
			var match = optionText.match(regex);
			var contains = lowerOptionText.indexOf(lowerText) != -1;

			// enabled / disbaled option matched to text
			option.disabled = match || contains ? false: true ;
			option.hidden = option.disabled;
		}
	});
}