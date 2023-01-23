$(function() {
	// Get location name
	let place = $("title").text();
	place = place.toLowerCase();
	place = place.replace(" ", "");
	
	// Get the json with the location's data.
	$.getJSON("../json/" + place + ".json", function (data) {
		let topButtonText = "";
		let gameButtonText = "";
		
		let itemText = "<h2>Items</h2>";
		let trainerText = "<h2>Trainers</h2>";
		let pokemonText = "<h2>Pokémon</h2>";
		
		// Read each set of games from the data's "games" value. For each set, perform operations.
		$.each(data.games, function() {
			pokemonText += readPokemon(this, parseGen(this), data);
			topButtonText += populateTopButton(this);
			gameButtonText += populateGameButtons(this);
			itemText += readItems(this, parseGen(this), data.items);
			trainerText += readTrainers(this, parseGen(this), data.trainers);
		});
		
		// Finish setting up the top level buttons
		$("#topButtons").html(topButtonText += finishTopButtons());
		$("#pokemon-buttons").html(gameButtonText);
		
		$("#items-container").html(itemText);
		$("#trainers-container").html(trainerText);
		$("#pokemon-tables").html(pokemonText);
	});
	
});

function populateTopButton(gen) {
	let thisText = "<input type='radio' onclick='topButton.call(this)' id='" + gen.toLowerCase() + "' name='games' value='" + gen + "'>";
	return thisText += "<label for='" + gen.toLowerCase() + "'>" + gen + "</label>";
}

function finishTopButtons() {
	let thisText = "<input type='radio' onclick='topButton.call(this)' id='all-full' name='games' value='All (Full)'>";
	thisText += "<label for='all-full'>All (Full)</label>";
	thisText += "<input type='radio' onclick='topButton.call(this)' id='all-cmp' name='games' value='All (Compressed)' checked>";
	return thisText += "<label for='all-cmp'>All (Compressed)</label>";
}

function populateGameButtons(gameSet) {
	let firstSet = "<div class='button-set' id='pokemon-" + gameSet.toLowerCase() + "-buttons' style='display:none'>";
	firstSet += "<div style='display:flex;flex-direction:row;'>";
	let secondSet = "<div style='display:flex;flex-direction:row;'>";
	gameArray = parseGen(gameSet);
	$.each(gameArray, function() {
		firstSet += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-full-" + this.toLowerCase() + "' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='" + this + " (Full)'>";
		firstSet += "<label for='pokemon-" + gameSet.toLowerCase() + "-full-" + this.toLowerCase() + "'>" + this + " (Full)</label>";
		secondSet += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-compressed-" + this.toLowerCase() + "' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='" + this + " (Compressed)'>";
		secondSet += "<label for='pokemon-" + gameSet.toLowerCase() + "-compressed-" + this.toLowerCase() + "'>" + this + " (Compressed)</label>";
	});
	
	firstSet += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-full-combined' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='Combined (Full)'>";
	firstSet += "<label for='pokemon-" + gameSet.toLowerCase() + "-full-combined'>Combined (Full)</label>";
	firstSet += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-full-separate' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='Separate (Full)'>";
	firstSet += "<label for='pokemon-" + gameSet.toLowerCase() + "-full-separate'>Separate (Full)</label></div>";
	
	secondSet += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-compressed-combined' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='Combined (Compressed)'>";
	secondSet += "<label for='pokemon-" + gameSet.toLowerCase() + "-compressed-combined'>Combined (Compressed)</label>";
	secondSet += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-compressed-separate' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='Separate (Compressed)'>";
	secondSet += "<label for='pokemon-" + gameSet.toLowerCase() + "-compressed-separate'>Separate (Compressed)</label></div>";
	
	return firstSet += secondSet;
	
}

// Reads all pokemon for the current generation and generates tables based on what is in the code.
function readPokemon(gameString, gameArray, data) {
	
	var spriteFolders = [];
	
	if (gameString == "RGBY") {
		spriteFolders.push("redgreen");
		spriteFolders.push("blue");
		spriteFolders.push("yellow");
	}
		
	
	// Indices: 0 = walking, 2 = surfing, 3 = fishing, 4 = purchase, 5 = gift, 6 = trade, 7 = static
	
	// If location has no pokemon in any gen, display "No Pokémon"
	if (!(data.hasOwnProperty('pokemon')))
		return "<p>No Pokémon.</p>";
	
	let genHasPokemon = false;
	$.each(data.pokemon, function() {
		$.each(this, function() {
			if (gameArray.some(game => this.games.includes(game))) {
				genHasPokemon = true;
			}
		});
	});
	
	// If location has Pokemon but none in the current gen, return "No Pokemon in [games]."
	if (!genHasPokemon)
		return "<p>No Pokémon in " + gameString + ".</p>";
	
	// Otherwise create a div.
	let startDiv = "<div id='pokemon-" + gameString.toLowerCase() + "' class='game-container'>";
	let innerText = "";
	
	if (data.pokemon.hasOwnProperty('walking'))
		innerText += readRateEncounter(gameString, gameArray, data.pokemon.walking, "walking", spriteFolders);
	
	if (data.pokemon.hasOwnProperty('surfing'))
		innerText += readRateEncounter(gameString, gameArray, data.pokemon.surfing, "surfing", spriteFolders);
	if (data.pokemon.hasOwnProperty('fishing'))
		innerText += readRateEncounter(gameString, gameArray, data.pokemon.fishing, "fishing", spriteFolders);
	if (data.pokemon.hasOwnProperty('purchase'))
		innerText += readPurchase(gameString, gameArray, data.pokemon.purchase, "purchase", spriteFolders);
	if (data.pokemon.hasOwnProperty('gift'))
		innerText += readLevelEncounter(gameString, gameArray, data.pokemon.gift, "gift", spriteFolders);
	if (data.pokemon.hasOwnProperty('trade'))
		innerText += readTrade(gameString, gameArray, data.pokemon.trade, "trade", spriteFolders);
	if (data.pokemon.hasOwnProperty('statics'))
		innerText += readLevelEncounter(gameString, gameArray, data.pokemon.statics, "static", spriteFolders);
	
	if (innerText == "")
		return innerText;
	else
		return startDiv + innerText + "</div>";
}

function readLevelEncounter(gameString, gameArray, data, type, spriteFolders) {
	let encounters = checkEncounterType(gameArray, data);
	if (!encounters)
		return "";
	// else, process
	
	fullColorBools = [];
	combinedColorBool = true;
	
	let individualTableStrings = [];
	let combinedTableInnerText = "<div id='pokemon-" + gameString.toLowerCase() + "-all-combined-" + type + "-table' class='pokemon-table all combined'>";
	combinedTableInnerText += "<table><caption>All Versions</caption><tr><th colspan='2'>Pokémon</th><th>Level</th><th colspan='4'>Games</th><th>Notes</th></tr>";
	
	for (let i = 0; i < gameArray.length; i++) {
		fullColorBools.push(true);
		individualTableStrings.push(["<div id='pokemon-" + gameString.toLowerCase() + "-all-" + gameArray[i].toLowerCase() + "-" + type + "-table' class='pokemon-table all' style='display:none'>"]);
		individualTableStrings[i] += "<table><caption>" + gameArray[i] + "</caption><tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Level</th><th>Notes</th></tr>";
		fullColorBools[i] = !fullColorBools[i];
	}
	
	$.each(data, function() {
		combinedTableInnerText += "<tr><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteFolders.length -1] + "/" + this.name.replace("'", "") + ".png'></div></td><td>" + this.name + "</td><td>"  + this.level + "</td>";
		
		for (let i = 0; i < gameArray.length; i++) {
			// add a cell for the game
			combinedTableInnerText += "<td";
			// for each pokemon, check if it is in the current game array
			let index = jQuery.inArray(gameArray[i], this.games);
			// If index != -1, then it is in in that game; add the text to individualTableStrings
			
			var spriteIndex = 0;
			if (spriteFolders.length > 1) {
				for (let j = 0; j < spriteFolders.length; j++) {
					if (~spriteFolders[j].indexOf(gameArray[i].toLowerCase()))
						spriteIndex = j;
				}
			}
			
			if (index > -1) {
				individualTableStrings[i] += "<tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + this.name.replace("'", "") + ".png'></div></td><td>" + this.name + "</td><td>" + this.level + "</td><td>" + this.notes + "</td></tr>";
				combinedTableInnerText += " class='" + gameArray[i].toLowerCase() + "-" + combinedColorBool + "'>";
				fullColorBools[i] = !fullColorBools[i];
			}
			else {
				combinedTableInnerText += ">";
			}
			combinedTableInnerText += gameString[i] + "</td>";
		}
		combinedColorBool = !combinedColorBool;
		
		combinedTableInnerText += "<td>" + this.notes + "</td></tr>";
		
	});
	
	for (let i = 0; i < individualTableStrings.length; i++)  {
		individualTableStrings[i] += "</table></div>";
	};
	
	
	let header = "<h3>" + type[0].toUpperCase() + type.substring(1) + "</h3>";
	
	// Loop through Pokemon, add to combined table & split to separate arrays
	
	
	return header + combinedTableInnerText + "</table></div>" + individualTableStrings.join('');
}

function readPurchase(gameString, gameArray, data, type, spriteFolders) {
	let encounters = checkEncounterType(gameArray, data);
	if (!encounters)
		return "";
	// else, process
	
	fullColorBools = [];
	combinedColorBool = true;
	
	let individualTableStrings = [];
	let combinedTableInnerText = "<div id='pokemon-" + gameString.toLowerCase() + "-all-combined-" + type + "-table' class='pokemon-table all combined'>";
	combinedTableInnerText += "<table><caption>All Versions</caption><tr><th colspan='2'>Pokémon</th><th>Level</th><th colspan='4'>Games</th><th>Price</th></tr>";
	
	for (let i = 0; i < gameArray.length; i++) {
		fullColorBools.push(true);
		individualTableStrings.push(["<div id='pokemon-" + gameString.toLowerCase() + "-all-" + gameArray[i].toLowerCase() + "-" + type + "-table' class='pokemon-table all' style='display:none'>"]);
		individualTableStrings[i] += "<table><caption>" + gameArray[i] + "</caption><tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Level</th><th>Price</th></tr>";
		fullColorBools[i] = !fullColorBools[i];
	}
	
	$.each(data, function() {
		combinedTableInnerText += "<tr><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteFolders.length -1] + "/" + this.name.replace("'", "") + ".png'></div></td><td>" + this.name + "</td><td>"  + this.level + "</td>";
		
		for (let i = 0; i < gameArray.length; i++) {
			// add a cell for the game
			combinedTableInnerText += "<td";
			// for each pokemon, check if it is in the current game array
			let index = jQuery.inArray(gameArray[i], this.games);
			
			var spriteIndex = 0;
			if (spriteFolders.length > 1) {
				for (let j = 0; j < spriteFolders.length; j++) {
					if (~spriteFolders[j].indexOf(gameArray[i].toLowerCase()))
						spriteIndex = j;
				}
			}
			
			// If index != -1, then it is in in that game; add the text to individualTableStrings
			if (index > -1) {
				individualTableStrings[i] += "<tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + this.name.replace("'", "") + ".png'></div></td><td>" + this.name + "</td><td>" + this.level + "</td><td>" + this.price + "</td></tr>";
				combinedTableInnerText += " class='" + gameArray[i].toLowerCase() + "-" + combinedColorBool + "'>";
				fullColorBools[index] = !fullColorBools[index];
			}
			else {
				combinedTableInnerText += ">";
			}
			combinedTableInnerText += gameString[i] + "</td>";
		}
		combinedColorBool = !combinedColorBool;
		
		combinedTableInnerText += "<td>" + this.price + "</td></tr>";
		
	});
	
	for (let i = 0; i < individualTableStrings.length; i++)  {
		individualTableStrings[i] += "</table></div>";
	};
	
	
	let header = "<h3>" + type[0].toUpperCase() + type.substring(1) + "</h3>";
	
	// Loop through Pokemon, add to combined table & split to separate arrays
	
	
	return header + combinedTableInnerText + "</table></div>" + individualTableStrings.join('');
	
}

function readTrade(gameString, gameArray, data, type, spriteFolders) {
	let encounters = checkEncounterType(gameArray, data);
	if (!encounters)
		return "";
	// else, process
	
	fullColorBools = [];
	combinedColorBool = true;
	
	let individualTableStrings = [];
	let combinedTableInnerText = "<div id='pokemon-" + gameString.toLowerCase() + "-all-combined-" + type + "-table' class='pokemon-table all combined'>";
	combinedTableInnerText += "<table><caption>All Versions</caption><tr><th colspan='2'>NPC's Pokémon</th><th colspan='2'>Your Pokémon</th><th colspan='4'>Games</th><th>Notes</th></tr>";
	
	for (let i = 0; i < gameArray.length; i++) {
		fullColorBools.push(true);
		individualTableStrings.push(["<div id='pokemon-" + gameString.toLowerCase() + "-all-" + gameArray[i].toLowerCase() + "-" + type + "-table' class='pokemon-table all' style='display:none'>"]);
		individualTableStrings[i] += "<table><caption>" + gameArray[i] + "</caption><tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>NPC's Pokémon</th><th colspan='2'>Your Pokémon</th><th>Notes</th></tr>";
		fullColorBools[i] = !fullColorBools[i];
	}
	
	$.each(data, function() {
		combinedTableInnerText += "<tr><td style='padding:1px;backgroud-color:white;'><div style='display:flex;flex-direction:flex-row; align-items:center;justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteFolders.length - 1] + "/" + this.trade.replace("'", "") + ".png'></div></td><td>" + this.trade + "</td><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteFolders.length - 1] + "/" + this.name.replace("'", "") + ".png'></div></td><td>" + this.name + "</td>";
		
		for (let i = 0; i < gameArray.length; i++) {
			// add a cell for the game
			combinedTableInnerText += "<td";
			// for each pokemon, check if it is in the current game array
			let index = jQuery.inArray(gameArray[i], this.games);
			
			var spriteIndex = 0;
			if (spriteFolders.length > 1) {
				for (let j = 0; j < spriteFolders.length; j++) {
					if (~spriteFolders[j].indexOf(gameArray[i].toLowerCase()))
						spriteIndex = j;
				}
			}
			
			// If index != -1, then it is in in that game; add the text to individualTableStrings
			if (index > -1) {
				individualTableStrings[i] += "<tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + this.trade.replace("'", "") + ".png'></div></td><td>" + this.trade + "</td><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + this.name.replace("'", "") + ".png'></div></td><td>" + this.name + "</td><td>" + this.notes + "</td></tr>";
				combinedTableInnerText += " class='" + gameArray[i].toLowerCase() + "-" + combinedColorBool + "'>";
				fullColorBools[index] = !fullColorBools[index];
			}
			else {
				combinedTableInnerText += ">";
			}
			combinedTableInnerText += gameString[i] + "</td>";
		}
		combinedColorBool = !combinedColorBool;
		
		combinedTableInnerText += "<td>" + this.notes + "</td></tr>";
		
	});
	
	for (let i = 0; i < individualTableStrings.length; i++)  {
		individualTableStrings[i] += "</table></div>";
	};
	
	
	let header = "<h3>" + type[0].toUpperCase() + type.substring(1) + "</h3>";
	
	// Loop through Pokemon, add to combined table & split to separate arrays
	
	
	return header + combinedTableInnerText + "</table></div>" + individualTableStrings.join('');
}

function generateEncounterArray(gameArray, data) {
	let encounterArray = [];
	for (let i = 0 ; i < gameArray.length; i++) {
		encounterArray.push(false);
		for (let j = 0; j < data.length; j++) {
			if (jQuery.inArray(gameArray[i], data[j].games) != -1) {
				encounterArray[i] = true;
				break;
			}
		}
	}
	
	return encounterArray;
	
}

function readRateEncounter(gameString, gameArray, data, type, spriteFolders) {
	// Check if fishing.
	let fish = false;
	if (type == "fishing")
		fish = true;
	
	// If this gen does not contain any pokemon with a certain encounter type, return a blank string
	let encounters = checkEncounterType(gameArray, data);
	if (!encounters)
		return "";
	// else, process
	
	let header = "<h3>" + type[0].toUpperCase() + type.substring(1) + "</h3>";
	
	splitGameArrays = [];
	fullColorBools = [];
	combinedFullColorBool = true;
	combinedCmpColorBool = true;
	cmpColorBools = [];
	$.each(gameArray, function() {
		splitGameArrays.push([]);
		fullColorBools.push(true);
		cmpColorBools.push(true);
	});
	
	let methodGames = generateEncounterArray(gameArray, data);
	
	let highestSplitIndex = 0;
	
	// Now populate the array with all Pokemon containing one of the game strings
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			for (let i = 0; i < gameArray.length; i++) {
				if (isInGame(gameArray[i], this.games)) {
					splitGameArrays[i].push(this);
					if (splitGameArrays[i].length > splitGameArrays[highestSplitIndex].length)
						highestSplitIndex = i;
				}
			}
		}
	});
	
	// Now splitGameArrays should contain 1 array with each game's pokemon.
	// If splitGameArrays contains any blank arrays, then that game does not have any pokemon with this
	// encounter type.
	// Declare a blank string to be used to display the line "No Pokémon can be found by [type] in [games].
	// The string will be used by combined and compressed tables.
	let noPokemon = "";
	
	let individualFullTableInnerText = "";
	let combinedFullTableInnerText = "";
	let individualCmpTableInnerText = "";
	let combinedCmpTableInnerText = "";
	
	// Setup statements
	
	// Combined full table's header
	
	combinedFullTableInnerText += "<div id='pokemon-" + gameString.toLowerCase() + "-full-combined-" + type + "-table' class='pokemon-table full combined' style='display:none'>";
	combinedFullTableInnerText += "<table><caption>All Versions (Full)</caption><tr><th>Rate</th>";
	if (fish)
		combinedFullTableInnerText += "<th>Rod</th>";
	// Arrays of compressed arrays
	let arrayCmpNameArray = [];
	let arrayCmpLevelArray = [];
	let arrayCmpRateArray = [];
	let arrayCmpRodArray = [];
	
	// Combined compressed table's header
	combinedCmpTableInnerText += "<div id='pokemon-" + gameString.toLowerCase() + "-compressed-combined-" + type + "-table' class='pokemon-table combined compressed'>";
	combinedCmpTableInnerText += "<table><caption>All Compressed</caption><tr><th colspan='2'>Pokémon</th>";
	if (fish)
		combinedCmpTableInnerText += "<th>Rod</th>"
	
	for (let i = 0; i < gameArray.length; i++) {
		// If the splitGamesArray array is blank, add to the noPokemon string, and DON'T write the header.
		if (splitGameArrays[i].length == 0) {
			// Check if noPokemon is blank before adding to the string.
			if (noPokemon == "")
				noPokemon += "<p>No Pokémon can be found here by " + type + " in " + gameArray[i];
			else
				noPokemon += ", " + gameArray[i];
		}
		// Otherwise, if it has content, add the header cell.
		else
			combinedCmpTableInnerText += "<th class='" + gameArray[i].toLowerCase() + "-" + combinedCmpColorBool + "'>" + gameArray[i] + " Rate</th><th class='" + gameArray[i].toLowerCase() + "-" + combinedCmpColorBool + "'>" + gameArray[i] + " Level</th>";
	
	}
	combinedCmpColorBool = !combinedCmpColorBool;
	combinedCmpTableInnerText += "</tr>";
	
	// Now finish cleanup on the noPokemon string.
	// Look for the last index of a comma.
	let index = noPokemon.lastIndexOf(",");
	// Only need to do anything if the comma exists.
	if (index != -1) {
		// Now check to see if there are more than one comma. If there are, add "and"
		if (index != noPokemon.indexOf(",")) {
			noPokemon = noPokemon.substring(0, index + 1) + " or" + noPokemon.substring(index + 1);
		}
		// Otherwise, if it is the same index, replace comma with "and"
		else {
			noPokemon.replace(",", " and");
		}
	}
	// Now add a period
	if (noPokemon != "")
		noPokemon += ".</p>";
	
	// Arrays of combined arrays
	combinedCmpNameArray = [];
	combinedCmpRateArray = [];
	combinedCmpLevelArray = [];
	combinedCmpRodArray = [];
	
	// Shared game Array Logic
	for (let i = 0; i < gameArray.length; i++) {
		
		// In order for the logic to not screw up some arrays, we will need to start
		// by pushing a blank array to a few of our combined arrays
		
		arrayCmpNameArray.push([]);
		arrayCmpLevelArray.push([]);
		arrayCmpRateArray.push([]);
		arrayCmpRodArray.push([]);
		
		// If the game has no pokemon for this method, just break the loop.
		if (splitGameArrays[i].length == 0)
			continue;
		
		// OPENING STATEMENTS:
		// Individual Full Table headers
		individualFullTableInnerText += "<div id='pokemon-" + gameString.toLowerCase() + "-full-" + gameArray[i].toLowerCase() + "-" + type + "-table' class='pokemon-table full' style='display:none'>";
		if (fish)
			individualFullTableInnerText += "<table><caption>" + gameArray[i] + " Full</caption><tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Rod</th><th>Level</th><th>Rate</th></tr>";
		else
			individualFullTableInnerText += "<table><caption>" + gameArray[i] + " Full</caption><tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Level</th><th>Rate</th></tr>";
		fullColorBools[i] = !fullColorBools[i];
		
		// Combined Full Table header cells
		combinedFullTableInnerText += "<th colspan='3' class='" + gameArray[i].toLowerCase() + "-" + combinedFullColorBool + "'>" + gameArray[i] + "</th>";
	
		// Individual Compressed Table headers
		individualCmpTableInnerText += "<div id='pokemon-" + gameString.toLowerCase() + "-compressed-" + gameArray[i].toLowerCase() + "-" + type + "-table' class='pokemon-table compressed' style='display:none'>";
		if (fish)
			individualCmpTableInnerText += "<table><caption>" + gameArray[i] + " Compressed</caption><tr class='" + gameArray[i].toLowerCase() + "-" + cmpColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Rod</th><th>Level</th><th>Rate</th></tr>";
		else
			individualCmpTableInnerText += "<table><caption>" + gameArray[i] + " Compressed</caption><tr class='" + gameArray[i].toLowerCase() + "-" + cmpColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Level</th><th>Rate</th></tr>";
		cmpColorBools[i] = !cmpColorBools[i];
		
		// Initialize Individual Compressed Arrays
		let cmpNameArray = [];
		let cmpLevelArray = [];
		let cmpRateArray = [];
		let cmpRodArray = [];
		
		var spriteIndex = 0;
			if (spriteFolders.length > 1) {
				for (let j = 0; j < spriteFolders.length; j++) {
					if (!spriteFolders[j].indexOf(gameArray[i].toLowerCase()))
						spriteIndex = j;
				}
			}
		
		// SPECIFIC LOOPS:
		for (let j = 0; j < splitGameArrays[i].length; j++) {
			// Individual Full Table rows
			individualFullTableInnerText += "<tr class='" + gameArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + splitGameArrays[i][j].name.replace("'", "") + ".png'></div></td><td>" + splitGameArrays[i][j].name + "</td>";
			if (fish)
				individualFullTableInnerText += "<td>" + splitGameArrays[i][j].rod + "</td>";
			individualFullTableInnerText += "<td>" + splitGameArrays[i][j].level + "</td>";
			individualFullTableInnerText += "<td>" + splitGameArrays[i][j].rate + "%</td></tr>";
			fullColorBools[i] = !fullColorBools[i];
		
			// Individual Compressed Table Array setup
			// check each name to see if it is in cmpnamearray, if not, add it.
			if (fish) {
				if (cmpNameArray.length == 0) {
					cmpNameArray.push(splitGameArrays[i][j].name);
					cmpLevelArray.push([splitGameArrays[i][j].level]);
					cmpRateArray.push(splitGameArrays[i][j].rate);
					cmpRodArray.push(splitGameArrays[i][j].rod);
				}
				else {
					let found = false;
					for (let k = 0; k < cmpNameArray.length; k++) {
						if (cmpNameArray[k] == splitGameArrays[i][j].name && cmpRodArray[k] == splitGameArrays[i][j].rod) {
							cmpLevelArray[k].push(splitGameArrays[i][j].level);
							cmpRateArray[k] += splitGameArrays[i][j].rate;
							found = true;
						}
					}
					if (!found) {
						cmpNameArray.push(splitGameArrays[i][j].name);
						cmpLevelArray.push([splitGameArrays[i][j].level]);
						cmpRateArray.push(splitGameArrays[i][j].rate);
						cmpRodArray.push(splitGameArrays[i][j].rod);
					}
				}
			}
			else {
				let index = jQuery.inArray(splitGameArrays[i][j].name, cmpNameArray);
				if (index === -1) {
					cmpNameArray.push(splitGameArrays[i][j].name);
					cmpLevelArray.push([splitGameArrays[i][j].level]);
					cmpRateArray.push(splitGameArrays[i][j].rate);
				}
				else {
					cmpLevelArray[index].push(splitGameArrays[i][j].level);
					cmpRateArray[index] += splitGameArrays[i][j].rate;
				}
			}
		}
		
		// Sort the level array
		$.each(cmpLevelArray, function() {
			this.sort();
		});
		
		// Push to full arrays
		arrayCmpNameArray[i] = cmpNameArray;
		arrayCmpLevelArray[i] = cmpLevelArray;
		arrayCmpRateArray[i] = cmpRateArray;
		if (fish)
			arrayCmpRodArray[i] = cmpRodArray;
	
		// Iterate over name array; create table cells
		for (let m = 0; m < cmpNameArray.length; m++) {
			// Individual Compressed Table rows
			individualCmpTableInnerText += "<tr class='" + gameArray[i].toLowerCase() + "-" + cmpColorBools[i] + "'><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + cmpNameArray[m].replace("'", "") + ".png'></div></td><td>" + cmpNameArray[m] + "</td>";
			if (fish)
				individualCmpTableInnerText += "<td>" + cmpRodArray[m] + "</td>";
			individualCmpTableInnerText += "<td>";
			individualCmpTableInnerText += simplifyLevels(cmpLevelArray[m]).join(', ');
			individualCmpTableInnerText += "</td>";
			individualCmpTableInnerText += "<td>" + cmpRateArray[m] + "%</td></tr>";
			cmpColorBools[i] = !cmpColorBools[i];
			
			// Combined Compressed Table rows
			// check each name to see if it is in cmpnamearray, if not, add it.
			if (fish) {
				if (combinedCmpNameArray.length == 0) {
					combinedCmpNameArray.push(arrayCmpNameArray[i][m]);
					combinedCmpLevelArray.push([]);
					combinedCmpRateArray.push([]);
					combinedCmpRodArray.push("");
					for (let k = 0; k < gameArray.length; k++) {
						combinedCmpRateArray[combinedCmpRateArray.length - 1].push(0);
						combinedCmpLevelArray[combinedCmpLevelArray.length - 1].push([]);
					}
					// Set the appropriate rate array value
					combinedCmpRateArray[combinedCmpRateArray.length - 1][i] = arrayCmpRateArray[i][m];
					// Set the appropriate level array value
					combinedCmpLevelArray[combinedCmpLevelArray.length - 1][i] = arrayCmpLevelArray[i][m];
					// Set rod value
					combinedCmpRodArray[combinedCmpRodArray.length - 1] = arrayCmpRodArray[i][m];
				}
				else {
					let found = false;
					for (let k = 0; k < combinedCmpNameArray.length; k++) {
						if (combinedCmpNameArray[k] == arrayCmpNameArray[i][m] && combinedCmpRodArray[k] == arrayCmpRodArray[i][m]) {
							combinedCmpLevelArray[k][i] = arrayCmpLevelArray[i][m];
							combinedCmpRateArray[k][i] += arrayCmpRateArray[i][m];
							found = true;
						}
					}
					if (!found) {
						combinedCmpNameArray.push(arrayCmpNameArray[i][m]);
						combinedCmpLevelArray.push([]);
						combinedCmpRateArray.push([]);
						combinedCmpRodArray.push("");
						for (let k = 0; k < gameArray.length; k++) {
							combinedCmpRateArray[combinedCmpRateArray.length - 1].push(0);
							combinedCmpLevelArray[combinedCmpLevelArray.length - 1].push([]);
						}
						// Set the appropriate rate array value
						combinedCmpRateArray[combinedCmpRateArray.length - 1][i] = arrayCmpRateArray[i][m];
						// Set the appropriate level array value
						combinedCmpLevelArray[combinedCmpLevelArray.length - 1][i] = arrayCmpLevelArray[i][m];
						// Set rod value
						combinedCmpRodArray[combinedCmpRodArray.length - 1] = arrayCmpRodArray[i][m];
					}
				}
			} else {
				// Check if name exists in combined array
				let index = jQuery.inArray(arrayCmpNameArray[i][m], combinedCmpNameArray);
				if (index === -1) {
					// If it does not, add it to the array
					combinedCmpNameArray.push(arrayCmpNameArray[i][m]);
					// Push an empty array to the Rate Array
					combinedCmpRateArray.push([]);
					// Push an empty array to the Level Array
					combinedCmpLevelArray.push([]);
					// Populate with empty values
					for (let k = 0; k < gameArray.length; k++) {
						combinedCmpRateArray[combinedCmpRateArray.length - 1].push(0);
						combinedCmpLevelArray[combinedCmpLevelArray.length - 1].push([]);
					}
					// Set the appropriate rate array value
					combinedCmpRateArray[combinedCmpRateArray.length - 1][i] = arrayCmpRateArray[i][m];
					// Set the appropriate level array value
					combinedCmpLevelArray[combinedCmpLevelArray.length - 1][i] = arrayCmpLevelArray[i][m];
				}
				// If it does exist, update the rate and level arrays with values. Use index.
				else {
					combinedCmpRateArray[index][i] = arrayCmpRateArray[i][m];
					combinedCmpLevelArray[index][i] = arrayCmpLevelArray[i][m];
				}
			}
		}
		
		// Set table row ends
		if (i == gameArray.length - 1) {
			combinedFullTableInnerText += "</tr>";
		}
	
		// All table end statements
		individualFullTableInnerText += "</table><br /></div>";
		individualCmpTableInnerText += "</table><br /></div>";
	}
	
	combinedFullColorBool = !combinedFullColorBool;
	
	// Combined Full Array logic
	// Use highestSplitIndex for this.
	
	//RGBY needs a special handling case because fishing encounters are different from RGB to Y
	if (gameString.toLowerCase() == "rgby" && fish) {
		// Add a cell for each of RGB
		for (let i = 0; i < splitGameArrays[0].length; i++) {
			for (let j = 0; j < 4; j++) {
				if (j == 0 || j == 1)
					spriteIndex = 0;
				else if (j == 2)
					spriteIndex = 1;
				else
					spriteIndex = 2;
				// If j is 0, handle row
				if (j == 0)
					combinedFullTableInnerText += "<tr><td>" + splitGameArrays[j][i].rate + "%</td><td>" + splitGameArrays[j][i].rod + "</td>";
				// Add a cell for all Old and Good Rod. If Super Rod, only add a cell for RGB
				if (splitGameArrays[j][i].rod != "Super" || j < 3)
					combinedFullTableInnerText += "<td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + splitGameArrays[j][i].name.replace("'", "") + ".png'></div></td><td class='" + gameArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].name + "</td><td class='" + gameArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].level + "</td>";
				else if (splitGameArrays[j][i].rod == "Super" && j == 3)
					combinedFullTableInnerText += "<td colspan='3'>N/A</td>";
			}		
			
			combinedFullTableInnerText += "</tr>";
			combinedFullColorBool = !combinedFullColorBool;
					
		}
		// Now add Yellow cells
		for (let i = 0; i < splitGameArrays[3].length; i++) {
			for (let j = 0; j < 4; j++) {
				if (j == 0 || j == 1)
					spriteIndex = 0;
				else if (j == 2)
					spriteIndex = 1;
				else
					spriteIndex = 2;
				if (j == 0 && splitGameArrays[3][i].rod == "Super")
					combinedFullTableInnerText += "<tr><td>" + splitGameArrays[3][i].rate + "%</td><td>" + splitGameArrays[3][i].rod + "</td>";
				// If rod is super and j = 0-2, add blank row
				if (splitGameArrays[3][i].rod == "Super" && j < 3)
					combinedFullTableInnerText += "<td colspan='3'>N/A</td>";
				else if (splitGameArrays[3][i].rod == "Super" && j == 3)
					combinedFullTableInnerText += "<td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + splitGameArrays[j][i].name.replace("'", "") + ".png'></div></td><td class='" + gameArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].name + "</td><td class='" + gameArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].level + "</td>";
				}
			combinedFullTableInnerText += "</tr>";
			combinedFullColorBool = !combinedFullColorBool;
		}		
	}
		// Use highestSplitIndex for this.
	else {
		for (let i = 0; i < splitGameArrays[highestSplitIndex].length; i++) {
			for (let j = 0; j < gameArray.length; j++) {
				var spriteIndex = 0;
				if (spriteFolders.length > 1) {
					for (let k = 0; k < spriteFolders.length; k++) {
						if (!spriteFolders[k].indexOf(gameArray[j].toLowerCase()))
							spriteIndex = k;
					}
				}				
				if (j == 0) {
					combinedFullTableInnerText += "<tr><td>" + splitGameArrays[highestSplitIndex][i].rate + "%</td>";
					if (fish)
						combinedFullTableInnerText += "<td>" + splitGameArrays[highestSplitIndex][i].rod + "</td>";
				}
				// Only add a cell if splitGameArrays[i] isnt 0
				if (splitGameArrays[j].length != 0)
					combinedFullTableInnerText += "<td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteIndex] + "/" + splitGameArrays[j][i].name.replace("'", "") + ".png'></div></td><td class='" + gameArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].name + "</td><td class='" + gameArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].level + "</td>";
			}
			combinedFullTableInnerText += "</tr>";
			combinedFullColorBool = !combinedFullColorBool;
		}
	}
	combinedFullTableInnerText += "</table><br /></div>";

	// Combined Compressed Array logic
	for (let m = 0; m < combinedCmpNameArray.length; m++) {
		combinedCmpTableInnerText += "<tr><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='../" + gameString + "/" + spriteFolders[spriteFolders.length - 1] + "/" + combinedCmpNameArray[m].replace("'", "") + ".png'></div></td><td>" + combinedCmpNameArray[m] + "</td>";
		if (fish)
			combinedCmpTableInnerText += "<td>" + combinedCmpRodArray[m] + "</td>";
		for (let n = 0; n < gameArray.length; n++) {
			// Only execute any of this if the splitGameArrays[i] isnt 0
			if (splitGameArrays[n].length != 0) {
				// Still display N/A for games that do have a pokemon in this type but not currently
				if (combinedCmpRateArray[m][n] == 0) {
					combinedCmpTableInnerText += "<td colspan='2'>" + "N/A</td>";
				} else {
					combinedCmpTableInnerText += "<td class='" + gameArray[n].toLowerCase() + "-" + combinedCmpColorBool + "'>" + combinedCmpRateArray[m][n] + "%</td>";
				}
				if (combinedCmpLevelArray[m][n].length != 0) {
					combinedCmpTableInnerText += "<td class='" + gameArray[n].toLowerCase() + "-" + combinedCmpColorBool + "'>";
					combinedCmpTableInnerText += simplifyLevels(combinedCmpLevelArray[m][n]).join(', ');
					combinedCmpTableInnerText += "</td>";
				}
			}
		}
		combinedCmpTableInnerText += "</tr>";
		combinedCmpColorBool = !combinedCmpColorBool;
	}
	combinedCmpTableInnerText += "</table><br /></div>";
	
	return header + noPokemon + individualFullTableInnerText + combinedFullTableInnerText + individualCmpTableInnerText + combinedCmpTableInnerText;
}

// Checks if any game in the gen has any encounters.
function checkEncounterType(gameArray, data) {
	let encounters = false;
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			encounters = true;
		}
	});
	return encounters;
}

function readItems(gameString, gameArray, data) {
	var color = true;
	var thisText = "<div id='pokemon-" + gameString.toLowerCase() + "-items'>";
	thisText += "<table><tr><th>Item</th><th colspan='4'>Games</th><th>Location</th><th>Notes</th></tr>";
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			thisText += "<tr><td>" + this.name + "</td>";
			for (var i = 0; i < gameString.length; i++) {
				let index = jQuery.inArray(this.games[i], gameArray);
				if (index != -1)
					thisText += "<td class='" + gameArray[index].toLowerCase() + "-" + color +"'>";
				else
					thisText += "<td>";
				thisText += gameString[i] + "</td>";
			}
			thisText += "<td>" + this.location + "</td>";
			thisText += "<td>" + this.notes + "</td></tr>";
			color = !color;
		}
	});
	
	thisText += "</table>";
	
	return thisText += "</div>";
	
}

function readTrainers(gameString, gameArray, data) {
	var color = true;
	var thisText = "<div id='pokemon-" + gameString.toLowerCase() + "-items'>";
	thisText += "<table><tr><th>Trainer</th><th colspan='4'>Games</th><th>Party</th><th>Notes</th></tr>";
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			thisText += "<tr><td>" + this.name + "</td>";
			for (var i = 0; i < gameString.length; i++) {
				let index = jQuery.inArray(this.games[i], gameArray);
				if (index != -1)
					thisText += "<td class='" + gameArray[index].toLowerCase() + "-" + color +"'>";
				else
					thisText += "<td>";
				thisText += gameString[i] + "</td>";
			}
			thisText += "<td>" + this.party.join("<br />") + "</td>";
			thisText += "<td>" + this.notes + "</td></tr>";
			color = !color;
		}
	});
	
	thisText += "</table>";
	
	return thisText += "</div>";
	
	
}

function parseGen(genString) {
	
	if (genString == "RGBY")
		return ["Red", "Green", "Blue", "Yellow"];
	
	// handle a bad case?

	
}
// Designed to check whether an object's games array contains a particular string
function isInGame(game, gameArray) {
	if (jQuery.inArray(game, gameArray) !== -1)
		return true;
	return false;
}

function simplifyLevels(levels) {
	let simpleArray = [];
	
	let firstValue = levels[0];
	
	let sequence = 1;
	
	let combinedString = "";
	
	for (let i = 1; i < levels.length; i++) {
		if (levels[i] - levels[i - 1] == 1) {
			sequence++;
			if (sequence >= 3) {
				combinedString = firstValue + "-" + levels[i];
			}
		}
		else {
			if (combinedString != "") {
				simpleArray.push(combinedString);
				combinedString = "";
			} else {
				if (sequence == 2) {
					simpleArray.push(levels[i - 2]);
				}
				simpleArray.push(levels[i - 1]);
			}
			sequence = 1;
			firstValue = levels[i];
		}
		
	}
	if (combinedString != "") {
		simpleArray.push(combinedString);
		combinedString = "";
	} else {
		if (sequence == 2) {
			simpleArray.push(levels[levels.length - 2]);
		}
		simpleArray.push(levels[levels.length - 1]);
	}
	
	let dupeFreeArray = [];
	
	$.each(simpleArray, function() {
		if (jQuery.inArray(this.toString(), dupeFreeArray) == -1) {
			dupeFreeArray.push(this.toString());
		}
	});
	
	return dupeFreeArray;
	
}
