$(function() {
	let fullPlaceTitle = $("title").text();
	fullPlaceTitle = fullPlaceTitle.replace(" ", ""); // Holds the title without spaces
	let place = fullPlaceTitle.toLowerCase(); // Holds the lowercase title
	
	$.getJSON("../json/" + place + ".json", function(data) {
		
		let topButtonText = "";
		let gameButtonText = "";
		
		let itemText = "<h2>Items</h2>";
		let trainerText = "<h2>Trainers</h2>";
		let pokemonText = "<h2>Pokémon</h2>";
		
		let firstMultiLocation = false;
		let firstLocation = false;
		
		let gameTextArray = [];
		let gameItemArray = [];
		let gameTrainerArray = [];
		
		// This if statement executes if the file contains a single location
		if (data.location) {
		// Read each set of games from the data's "games" value. For each set, perform operations.
			$.each(data.games, function() {
				if (this == data.games[0])
					firstLocation = true;
				else
					firstLocation = false;
				gameTextArray.push(readPokemon(this, parseGen(this), data, firstLocation, true, ""));
				topButtonText += populateTopButton(this, firstLocation, true);
				gameButtonText += populateGameButtons(this, firstLocation, true);
				if (data.hasOwnProperty("items"))
					gameItemArray.push(readItems(this, parseGen(this), data.items, firstLocation, true, ""));
				else
					gameItemArray.push(readItems(this, parseGen(this), null, firstLocation, true, ""));
					
				if (data.hasOwnProperty("trainers"))
					gameTrainerArray.push(readTrainers(this, parseGen(this), data.trainers, firstLocation, true, ""));
				else
					gameTrainerArray.push(readTrainers(this, parseGen(this), null, firstLocation, true, ""));
			});
		}
		// This else statement concerns multi-floor/multi-area areas (Mt Moon, Safari Zone)
		else {
			for (let i = 0; i < data.length; i++) {
				for (let j = 0; j < data[i].games.length; j++) {
					if (j == 0)
						// Prepare multiple arrays so that each gameset's stuff gets sorted into its own individual div
						gameTextArray.push("");
						gameItemArray.push("");
						gameTrainerArray.push("");
				}
			}
			
			for (let i = 0; i < data.length; i++) {
				// Set up a string that contains the "additional" info indicating the sub-area designation
				// Compare fullPlaceTitle and data[i].location
				let index = fullPlaceTitle.length;
				let subArea = data[i].location.substring(index);
				
				for (let j = 0; j < data[i].games.length; j++) {
					if (i == 0)						
						firstMultiLocation = true;
					else
						firstMultiLocation = false;
					if (data[i].games[j] == data[i].games[0])
						firstLocation = true;
					else
						firstLocation = false;
					gameTextArray[j] += readPokemon(data[i].games[j], parseGen(data[i].games[j]), data[i], firstLocation, firstMultiLocation, subArea);
					topButtonText += populateTopButton(data[i].games[j], firstLocation, firstMultiLocation);
					gameButtonText += populateGameButtons(data[i].games[j], firstLocation, firstMultiLocation);
					if (data[i].hasOwnProperty("items"))
						gameItemArray[j] += readItems(data[i].games[j], parseGen(data[i].games[j]), data[i].items, firstLocation, firstMultiLocation, subArea);
					else
						gameItemArray[j] += readItems(data[i].games[j], parseGen(data[i].games[j]), null, firstLocation, firstMultiLocation, subArea);
						
					if (data[i].hasOwnProperty("trainers"))
						gameTrainerArray[j] += readTrainers(data[i].games[j], parseGen(data[i].games[j]), data[i].trainers, firstLocation, firstMultiLocation, subArea);
					else
						gameTrainerArray[j] += readTrainers(data[i].games[j], parseGen(data[i].games[j]), null, firstLocation, firstMultiLocation, subArea);
					
				}
			}
		}
		
		for (let m = 0; m < gameTextArray.length; m++) {
			gameTextArray[m] += "</div>";
			gameItemArray[m] += "</div>";
			gameTrainerArray[m] += "</div>";
		}
		
		// Finish setting up the top level buttons
		$("#topButtons").html(topButtonText);
		$("#pokemon-buttons").html(gameButtonText);
		
		// Set up the containers
		$("#items-container").html(itemText + gameItemArray.join(""));
		$("#trainers-container").html(trainerText + gameTrainerArray.join(""));
		$("#pokemon-tables").html(pokemonText + gameTextArray.join(""));
		
		function populateTopButton(gen, checked, isFirstMulti) {
			if (!isFirstMulti)
				return "";
			let thisText = "";
			let addText = "";
			if (gen == "RGBY")
				addText += " (Japanese)";
			if (gen == "RBY")
				addText += " (Western)";
			if (checked)
				thisText = "<input type='radio' onclick='topButton.call(this)' id='" + gen.toLowerCase() + "' name='games' value='" + gen + "' checked='checked'>";
			else
				thisText = "<input type='radio' onclick='topButton.call(this)' id='" + gen.toLowerCase() + "' name='games' value='" + gen + "'>";
			return thisText += "<label for='" + gen.toLowerCase() + "' style='padding-right:1em;'>" + gen + addText + "</label>";
		}

		function populateGameButtons(gameSet, visible, isFirstMulti) {
			if (!isFirstMulti)
				return "";
			let buttonText = "";
			if (visible)
				buttonText += "<div class='button-set' id='pokemon-" + gameSet.toLowerCase() + "-buttons'>";
			else
				buttonText += "<div class='button-set' id='pokemon-" + gameSet.toLowerCase() + "-buttons' style='display:none'>";
			buttonText += "<div style='display:flex;flex-direction:row;'>";
			gameArray = parseGen(gameSet);
			let displayArray = gameArray;
			if (gameSet == "RGBY")
				displayArray = ["Aka", "Midori", "Ao", "Ki"];
			for (let i = 0; i < gameArray.length; i++) {
				buttonText += "<div style='padding-right:1em;'><input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-full-" + displayArray[i].toLowerCase() + "' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='" + gameArray[i] + " (Full)'>";
				buttonText += "<label for='pokemon-" + gameSet.toLowerCase() + "-full-" + displayArray[i].toLowerCase() + "'>" + gameArray[i] + " (Full)</label><br />";
				buttonText += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-compressed-" + displayArray[i].toLowerCase() + "' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='" + gameArray[i] + " (Compressed)'>";
				buttonText += "<label for='pokemon-" + gameSet.toLowerCase() + "-compressed-" + displayArray[i].toLowerCase() + "'>" + gameArray[i] + " (Compressed)</label></div>";
			}
			
			buttonText += "<div style='padding-right:1em;'><input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-full-combined' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='Combined (Full)'>";
			buttonText += "<label for='pokemon-" + gameSet.toLowerCase() + "-full-combined'>Combined (Full)</label><br />";
			buttonText += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-full-separate' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='Separate (Full)'>";
			buttonText += "<label for='pokemon-" + gameSet.toLowerCase() + "-full-separate'>Separate (Full)</label></div>";
			
			buttonText += "<iv><input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-compressed-combined' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='Combined (Compressed)'";
			buttonText += " checked='checked'";
			buttonText += ">";
			buttonText += "<label for='pokemon-" + gameSet.toLowerCase() + "-compressed-combined'>Combined (Compressed)</label><br />";
			buttonText += "<input type='radio' onclick='gameButton.call(this)' id='pokemon-" + gameSet.toLowerCase() + "-compressed-separate' name='pokemon-" + gameSet.toLowerCase() + "-games' class='pokemon-button' value='Separate (Compressed)'>";
			buttonText += "<label for='pokemon-" + gameSet.toLowerCase() + "-compressed-separate'>Separate (Compressed)</label></div></div></div>";
			
			return buttonText;
		}
	});
});

// Reads all pokemon for the current generation and generates tables based on what is in the code.
function readPokemon(gameString, gameArray, data, isFirst, isFirstMulti, subArea) {
	// Indices: 0 = walking, 2 = surfing, 3 = fishing, 4 = purchase, 5 = gift, 6 = trade, 7 = static
	
	let startDiv = "";
	if (isFirstMulti) {
		startDiv += "<div id='pokemon-" + gameString.toLowerCase() + "' class='game-container'";
		if (!isFirst)
			startDiv += "style='display:none'";
		startDiv += ">";
	}
		
	let thisArray = gameArray;
	if (gameString == "RGBY")
		thisArray = ["Aka", "Midori", "Ao", "Ki"];
		
	let genHasPokemon = false;
	$.each(data.pokemon, function() {
		$.each(this, function() {
			if (thisArray.some(game => this.games.includes(game))) {
				genHasPokemon = true;
			}
		});
	});
	
	// If location has no pokemon in any gen, display "No Pokémon"
	if (!(data.hasOwnProperty('pokemon')) || !genHasPokemon)
		return startDiv + "<p>No Pokémon in " + gameString + ".</p>";
	
	let innerText = "";
	
	if (data.pokemon.hasOwnProperty('walking'))
		innerText += readRateEncounter(gameString, thisArray, data.pokemon.walking, "walking", isFirstMulti, subArea);
	if (data.pokemon.hasOwnProperty('surfing'))
		innerText += readRateEncounter(gameString, thisArray, data.pokemon.surfing, "surfing", isFirstMulti, subArea);
	if (data.pokemon.hasOwnProperty('fishing'))
		innerText += readRateEncounter(gameString, thisArray, data.pokemon.fishing, "fishing", isFirstMulti, subArea);
	if (data.pokemon.hasOwnProperty('purchase'))
		innerText += readPurchase(gameString, thisArray, data.pokemon.purchase, "purchase", isFirstMulti, subArea);
	if (data.pokemon.hasOwnProperty('gift'))
		innerText += readLevelEncounter(gameString, thisArray, data.pokemon.gift, "gift", isFirstMulti, subArea);
	if (data.pokemon.hasOwnProperty('trade'))
		innerText += readTrade(gameString, thisArray, data.pokemon.trade, "trade", isFirstMulti, subArea);
	if (data.pokemon.hasOwnProperty('statics'))
		innerText += readLevelEncounter(gameString, thisArray, data.pokemon.statics, "static", isFirstMulti, subArea);
		
	
	if (innerText == "")
		return startDiv + "<p>No Pokémon in " + gameString + ".</p>";
	else
		return startDiv + innerText;
}

function readLevelEncounter(gameString, gameArray, data, type, isFirstMulti, subArea) {
	
	let idAdd = "";
	if (subArea)
		idAdd = "-" + subArea;
	
	let encounters = checkEncounterType(gameArray, data);
	if (!encounters)
		return "";
	// else, process
	
	let displayArray = gameArray;
	if (gameString == "RGBY")
		displayArray = ["Red", "Green", "Blue", "Yellow"];
	
	fullColorBools = [];
	combinedColorBool = true;
	
	let individualTableStrings = [];
	let combinedTableInnerText = "<div id='pokemon-" + gameString.toLowerCase() + "-all-combined-" + type + "-table" + idAdd + "' class='pokemon-table all combined'>";
	combinedTableInnerText += "<table><caption>All Versions</caption><tr><th colspan='2'>Pokémon</th><th>Level</th><th colspan='" + gameArray.length + "'>Games</th><th>Notes</th></tr>";
	
	for (let i = 0; i < gameArray.length; i++) {
		fullColorBools.push(true);
		individualTableStrings.push(["<div id='pokemon-" + gameString.toLowerCase() + "-all-" + gameArray[i].toLowerCase() + "-" + type + "-table" + idAdd + "' class='pokemon-table all' style='display:none'>"]);
		individualTableStrings[i] += "<table><caption>" + displayArray[i] + "</caption><tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Level</th><th>Notes</th></tr>";
		fullColorBools[i] = !fullColorBools[i];
	}
	
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			combinedTableInnerText += "<tr><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + this.image + "'></div></td><td>" + this.name + "</td><td>"  + this.level + "</td>";
			
			for (let i = 0; i < gameArray.length; i++) {
				// add a cell for the game
				combinedTableInnerText += "<td";
				// for each pokemon, check if it is in the current game array
				let index = jQuery.inArray(gameArray[i], this.games);
				// If index != -1, then it is in in that game; add the text to individualTableStrings
							
				if (index > -1) {
					individualTableStrings[i] += "<tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + this.image + "'></div></td><td>" + this.name + "</td><td>" + this.level + "</td><td>" + this.notes + "</td></tr>";
					combinedTableInnerText += " class='" + displayArray[i].toLowerCase() + "-" + combinedColorBool + "'>";
					fullColorBools[i] = !fullColorBools[i];
				}
				else {
					combinedTableInnerText += ">";
				}
				combinedTableInnerText += gameString[i] + "</td>";
			}
			combinedColorBool = !combinedColorBool;
			
			combinedTableInnerText += "<td>" + this.notes + "</td></tr>";
		}
		
	});
	
	for (let i = 0; i < individualTableStrings.length; i++)  {
		individualTableStrings[i] += "</table></div>";
	};
	
	let header = "";	
	if (isFirstMulti)
		header = "<h3>" + type[0].toUpperCase() + type.substring(1) + "</h3>";
	if (subArea)
		header += "<h4>" + subArea + "</h4>";
	
	return header + combinedTableInnerText + "</table></div>" + individualTableStrings.join('');
}

function readPurchase(gameString, gameArray, data, type, isFirst, isFirstMulti, subArea) {
	
	let idAdd = "";
	if (subArea)
		idAdd = "-" + subArea;
	
	let encounters = checkEncounterType(gameArray, data);
	if (!encounters)
		return "";
	// else, process
	
	let displayArray = gameArray;
	if (gameString == "RGBY")
		displayArray = ["Red", "Green", "Blue", "Yellow"];
	
	fullColorBools = [];
	combinedColorBool = true;
	
	let individualTableStrings = [];
	let combinedTableInnerText = "<div id='pokemon-" + gameString.toLowerCase() + "-all-combined-" + type + "-table" + idAdd + "' class='pokemon-table all combined'>";
	combinedTableInnerText += "<table><caption>All Versions</caption><tr><th colspan='2'>Pokémon</th><th>Level</th><th colspan='" + gameArray.length +"'>Games</th><th>Price</th></tr>";
	
	for (let i = 0; i < gameArray.length; i++) {
		fullColorBools.push(true);
		individualTableStrings.push(["<div id='pokemon-" + gameString.toLowerCase() + "-all-" + gameArray[i].toLowerCase() + "-" + type + "-table" + idAdd + "' class='pokemon-table all' style='display:none'>"]);
		individualTableStrings[i] += "<table><caption>" + displayArray[i] + "</caption><tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Level</th><th>Price</th></tr>";
		fullColorBools[i] = !fullColorBools[i];
	}
	
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			combinedTableInnerText += "<tr><td style='padding:1px;background-color:white;'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + this.image + "'></div></td><td>" + this.name + "</td><td>"  + this.level + "</td>";
			
			for (let i = 0; i < gameArray.length; i++) {
				// add a cell for the game
				combinedTableInnerText += "<td";
				// for each pokemon, check if it is in the current game array
				let index = jQuery.inArray(gameArray[i], this.games);
				
				// If index != -1, then it is in in that game; add the text to individualTableStrings
				if (index > -1) {
					individualTableStrings[i] += "<tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + this.image + "'></div></td><td>" + this.name + "</td><td>" + this.level + "</td><td>" + this.price + "</td></tr>";
					combinedTableInnerText += " class='" + displayArray[i].toLowerCase() + "-" + combinedColorBool + "'>";
					fullColorBools[index] = !fullColorBools[index];
				}
				else {
					combinedTableInnerText += ">";
				}
				combinedTableInnerText += gameString[i] + "</td>";
			}
			combinedColorBool = !combinedColorBool;
			
			combinedTableInnerText += "<td>" + this.price + "</td></tr>";
		}
		
	});
	
	for (let i = 0; i < individualTableStrings.length; i++)  {
		individualTableStrings[i] += "</table></div>";
	};
	
	let header = "";	
	if (isFirstMulti)
		header = "<h3>" + type[0].toUpperCase() + type.substring(1) + "</h3>";
	if (subArea)
		header += "<h4>" + subArea + "</h4>";
	
	return header + combinedTableInnerText + "</table></div>" + individualTableStrings.join('');
}

function readTrade(gameString, gameArray, data, type, isFirstMulti, subArea) {
	
	let idAdd = "";
	if (subArea)
		idAdd = "-" + subArea;
	
	let encounters = checkEncounterType(gameArray, data);
	if (!encounters)
		return "";
	// else, process
	
	let displayArray = gameArray;
	if (gameString == "RGBY")
		displayArray = ["Red", "Green", "Blue", "Yellow"];
	
	fullColorBools = [];
	combinedColorBool = true;
	
	let individualTableStrings = [];
	let combinedTableInnerText = "<div id='pokemon-" + gameString.toLowerCase() + "-all-combined-" + type + "-table" + idAdd + "' class='pokemon-table all combined'>";
	combinedTableInnerText += "<table><caption>All Versions</caption><tr><th colspan='2'>Your Pokémon</th><th colspan='2'>NPC's Pokémon</th><th colspan='" + gameArray.length + "'>Games</th><th>Notes</th></tr>";
	
	for (let i = 0; i < gameArray.length; i++) {
		fullColorBools.push(true);
		individualTableStrings.push(["<div id='pokemon-" + gameString.toLowerCase() + "-all-" + gameArray[i].toLowerCase() + "-" + type + "-table" + idAdd + "' class='pokemon-table all' style='display:none'>"]);
		individualTableStrings[i] += "<table><caption>" + displayArray[i] + "</caption><tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Your Pokémon</th><th colspan='2'>NPC's Pokémon</th><th>Notes</th></tr>";
		fullColorBools[i] = !fullColorBools[i];
	}
	
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			combinedTableInnerText += "<tr><td><div style='display:flex;flex-direction:flex-row; align-items:center;justify-content:center;'><img src='" + this.image2 + "'></div></td><td>" + this.trade + "</td><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + this.image + "'></div></td><td>" + this.name + "</td>";
			
			for (let i = 0; i < gameArray.length; i++) {
				// add a cell for the game
				combinedTableInnerText += "<td";
				// for each pokemon, check if it is in the current game array
				let index = jQuery.inArray(gameArray[i], this.games);
				
				// If index != -1, then it is in in that game; add the text to individualTableStrings
				if (index > -1) {
					individualTableStrings[i] += "<tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + this.image + "'></div></td><td>" + this.trade + "</td><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + this.image + "'></div></td><td>" + this.name + "</td><td>" + this.notes + "</td></tr>";
					combinedTableInnerText += " class='" + displayArray[i].toLowerCase() + "-" + combinedColorBool + "'>";
					fullColorBools[index] = !fullColorBools[index];
				}
				else {
					combinedTableInnerText += ">";
				}
				combinedTableInnerText += gameString[i] + "</td>";
			}
			combinedColorBool = !combinedColorBool;
			
			combinedTableInnerText += "<td>" + this.notes + "</td></tr>";
		}
		
	});
	
	for (let i = 0; i < individualTableStrings.length; i++)  {
		individualTableStrings[i] += "</table></div>";
	};
	
	
	let header = "";	
	if (isFirstMulti)
		header = "<h3>" + type[0].toUpperCase() + type.substring(1) + "</h3>";
	if (subArea)
		header += "<h4>" + subArea + "</h4>";
	
	return header + combinedTableInnerText + "</table></div>" + individualTableStrings.join('');
}

function readRateEncounter(gameString, gameArray, data, type, isFirstMulti, subArea) {	

	let idAdd = "";
		if (subArea)
			idAdd = "-" + subArea;

	// If this gen does not contain any pokemon with a certain encounter type, return a blank string
	let encounters = checkEncounterType(gameArray, data);
	if (!encounters)
		return "";
	// else, process
	
	// Check if fishing.
	let fish = false;
	if (type == "fishing")
		fish = true;
	
	let displayArray = gameArray;
	if (gameString == "RGBY")
		displayArray = ["Red", "Green", "Blue", "Yellow"];
	
	let header = "";	
	if (isFirstMulti) {
		header = "<h3>" + type[0].toUpperCase() + type.substring(1) + "</h3>";
	}
	if (subArea)
		header += "<h4>" + subArea + "</h4>";
	
	
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
	
	combinedFullTableInnerText += "<div id='pokemon-" + gameString.toLowerCase() + "-full-combined-" + type + "-table" + idAdd + "' class='pokemon-table full combined' style='display:none'>";
	combinedFullTableInnerText += "<table><caption>Combined (Full)</caption><tr><th>Rate</th>";
	if (fish)
		combinedFullTableInnerText += "<th>Rod</th>";
	// Arrays of compressed arrays
	let arrayCmpNameArray = [];
	let arrayCmpLevelArray = [];
	let arrayCmpRateArray = [];
	let arrayCmpRodArray = [];
	let arrayCmpImgArray = [];
	
	// Combined compressed table's header
	combinedCmpTableInnerText += "<div id='pokemon-" + gameString.toLowerCase() + "-compressed-combined-" + type + "-table" + idAdd + "' class='pokemon-table combined compressed'>";
	combinedCmpTableInnerText += "<table><caption>Combined (Compressed)</caption><tr><th colspan='2'>Pokémon</th>";
	if (fish)
		combinedCmpTableInnerText += "<th>Rod</th>"
	
	for (let i = 0; i < gameArray.length; i++) {
		// If the splitGamesArray array is blank, add to the noPokemon string, and DON'T write the header.
		if (splitGameArrays[i].length == 0) {
			// Check if noPokemon is blank before adding to the string.
			if (noPokemon == "")
				noPokemon += "<p>No Pokémon can be found here by " + type + " in " + displayArray[i];
			else
				noPokemon += ", " + displayArray[i];
		}
		// Otherwise, if it has content, add the header cell.
		else
			combinedCmpTableInnerText += "<th class='" + displayArray[i].toLowerCase() + "-" + combinedCmpColorBool + "'>" + displayArray[i] + "</th>";
	
	}
	combinedCmpColorBool = !combinedCmpColorBool;
	combinedCmpTableInnerText += "</tr>";
	
	// Now finish cleanup on the noPokemon string.
	// Look for the last index of a comma.
	let index = noPokemon.lastIndexOf(",");
	// Only need to do anything if the comma exists.
	if (index != -1) {
		// Now check to see if there are more than one comma. If there are, add "or"
		if (index != noPokemon.indexOf(",")) {
			noPokemon = noPokemon.substring(0, index + 1) + " or" + noPokemon.substring(index + 1);
		}
		// Otherwise, if it is the same index, replace comma with "and"
		else {
			noPokemon = noPokemon.replace(",", " or");
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
	combinedCmpImgArray = [];
	
	// Shared game Array Logic
	for (let i = 0; i < gameArray.length; i++) {
		
		// In order for the logic to not screw up some arrays, we will need to start
		// by pushing a blank array to a few of our combined arrays
		
		arrayCmpNameArray.push([]);
		arrayCmpLevelArray.push([]);
		arrayCmpRateArray.push([]);
		arrayCmpRodArray.push([]);
		arrayCmpImgArray.push([]);
		
		// If the game has no pokemon for this method, just continue the loop.
		if (splitGameArrays[i].length == 0)
			continue;
		
		// OPENING STATEMENTS:
		// Individual Full Table headers
		individualFullTableInnerText += "<div id='pokemon-" + gameString.toLowerCase() + "-full-" + gameArray[i].toLowerCase() + "-" + type + "-table" + idAdd + "' class='pokemon-table full' style='display:none'>";
		if (fish)
			individualFullTableInnerText += "<table><caption>" + displayArray[i] + " Full</caption><tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Rod</th><th>Level</th><th>Rate</th></tr>";
		else
			individualFullTableInnerText += "<table><caption>" + displayArray[i] + " Full</caption><tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Level</th><th>Rate</th></tr>";
		fullColorBools[i] = !fullColorBools[i];
		
		// Combined Full Table header cells
		combinedFullTableInnerText += "<th colspan='3' class='" + displayArray[i].toLowerCase() + "-" + combinedFullColorBool + "'>" + displayArray[i] + "</th>";
	
		// Individual Compressed Table headers
		individualCmpTableInnerText += "<div id='pokemon-" + gameString.toLowerCase() + "-compressed-" + gameArray[i].toLowerCase() + "-" + type + "-table" + idAdd + "' class='pokemon-table compressed' style='display:none'>";
		if (fish)
			individualCmpTableInnerText += "<table><caption>" + displayArray[i] + " Compressed</caption><tr class='" + displayArray[i].toLowerCase() + "-" + cmpColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Rod</th><th>Level</th><th>Rate</th></tr>";
		else
			individualCmpTableInnerText += "<table><caption>" + displayArray[i] + " Compressed</caption><tr class='" + displayArray[i].toLowerCase() + "-" + cmpColorBools[i] + "'><th colspan='2'>Pokémon</th><th>Level</th><th>Rate</th></tr>";
		cmpColorBools[i] = !cmpColorBools[i];
		
		// Initialize Individual Compressed Arrays
		let cmpNameArray = [];
		let cmpLevelArray = [];
		let cmpRateArray = [];
		let cmpRodArray = [];
		let cmpImgArray = [];
		
		// SPECIFIC LOOPS:
		for (let j = 0; j < splitGameArrays[i].length; j++) {
			// Individual Full Table rows
			individualFullTableInnerText += "<tr class='" + displayArray[i].toLowerCase() + "-" + fullColorBools[i] + "'><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + splitGameArrays[i][j].image + "'></div></td><td>" + splitGameArrays[i][j].name + "</td>";
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
					cmpImgArray.push(splitGameArrays[i][j].image);
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
						cmpImgArray.push(splitGameArrays[i][j].image);
					}
				}
			}
			else {
				let index = jQuery.inArray(splitGameArrays[i][j].name, cmpNameArray);
				if (index === -1) {
					cmpNameArray.push(splitGameArrays[i][j].name);
					cmpLevelArray.push([splitGameArrays[i][j].level]);
					cmpRateArray.push(splitGameArrays[i][j].rate);
					cmpImgArray.push(splitGameArrays[i][j].image);
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
		arrayCmpImgArray[i] = cmpImgArray
		if (fish)
			arrayCmpRodArray[i] = cmpRodArray;
	
		// Iterate over name array; create table cells
		for (let m = 0; m < cmpNameArray.length; m++) {
			// Individual Compressed Table rows
			individualCmpTableInnerText += "<tr class='" + displayArray[i].toLowerCase() + "-" + cmpColorBools[i] + "'><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + cmpImgArray[m] + "'></div></td><td>" + cmpNameArray[m] + "</td>";
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
					combinedCmpImgArray.push("");
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
					//Set img value
					combinedCmpImgArray[combinedCmpImgArray.length - 1] = arrayCmpImgArray[i][m];
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
						combinedCmpImgArray.push("");
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
						// Set image
						combinedCmpImgArray[combinedCmpImgArray.length - 1] = arrayCmpImgArray[i][m];
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
					combinedCmpImgArray.push(arrayCmpImgArray[i][m]);
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
					combinedCmpImgArray[index][i] = arrayCmpImgArray[i][m];
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
	if ((gameString.toLowerCase() == "rgby" || gameString.toLowerCase() == "rby") && fish) {
		// Add a cell for each of RGB
		for (let i = 0; i < splitGameArrays[0].length; i++) {
			for (let j = 0; j < gameString.length; j++) {
				// If j is 0, handle row
				if (j == 0)
					combinedFullTableInnerText += "<tr><td>" + splitGameArrays[j][i].rate + "%</td><td>" + splitGameArrays[j][i].rod + "</td>";
				// Add a cell for all Old and Good Rod. If Super Rod, only add a cell for RGB
				if (splitGameArrays[j][i].rod != "Super" || j < gameString.length - 1)
					combinedFullTableInnerText += "<td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + splitGameArrays[j][i].image + "'></div></td><td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].name + "</td><td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].level + "</td>";
				else if (splitGameArrays[j][i].rod == "Super" && j == gameString.length - 1)
					combinedFullTableInnerText += "<td colspan='3'>N/A</td>";
			}		
			
			combinedFullTableInnerText += "</tr>";
			combinedFullColorBool = !combinedFullColorBool;
					
		}
		// Now add Yellow cells
		for (let i = 0; i < splitGameArrays[gameString.length - 1].length; i++) {
			for (let j = 0; j < gameString.length; j++) {
				if (j == 0 && splitGameArrays[gameString.length - 1][i].rod == "Super")
					combinedFullTableInnerText += "<tr><td>" + splitGameArrays[gameString.length - 1][i].rate + "%</td><td>" + splitGameArrays[gameString.length - 1][i].rod + "</td>";
				// If rod is super and j = 0-2, add blank row
				if (splitGameArrays[gameString.length - 1][i].rod == "Super" && j < gameString.length - 1)
					combinedFullTableInnerText += "<td colspan='3'>N/A</td>";
				else if (splitGameArrays[gameString.length - 1][i].rod == "Super" && j == gameString.length - 1)
					combinedFullTableInnerText += "<td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + splitGameArrays[j][i].image + "'></div></td><td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].name + "</td><td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].level + "</td>";
				}
			combinedFullTableInnerText += "</tr>";
			combinedFullColorBool = !combinedFullColorBool;
		}		
	}
		// Use highestSplitIndex for this.
	else {
		for (let i = 0; i < splitGameArrays[highestSplitIndex].length; i++) {
			
			for (let j = 0; j < gameArray.length; j++) {
				if (j == 0) {
					combinedFullTableInnerText += "<tr><td>" + splitGameArrays[highestSplitIndex][i].rate + "%</td>";
					if (fish)
						combinedFullTableInnerText += "<td>" + splitGameArrays[highestSplitIndex][i].rod + "</td>";
				}
				// Only add a cell if splitGameArrays[j] isnt 0
				if (splitGameArrays[j].length != 0) {
					combinedFullTableInnerText += "<td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + splitGameArrays[j][i].image + "'></div></td><td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].name + "</td><td class='" + displayArray[j].toLowerCase() + "-" + combinedFullColorBool + "'>" + splitGameArrays[j][i].level + "</td>";
				}
			}
			combinedFullTableInnerText += "</tr>";
			combinedFullColorBool = !combinedFullColorBool;
		}
	}
	combinedFullTableInnerText += "</table><br /></div>";

	// Combined Compressed Array logic
	for (let m = 0; m < combinedCmpNameArray.length; m++) {
		combinedCmpTableInnerText += "<tr><td><div style='display:flex; flex-direction:flex-row; align-items: center; justify-content:center;'><img src='" + combinedCmpImgArray[m] + "'></div></td><td>" + combinedCmpNameArray[m] + "</td>";
		if (fish)
			combinedCmpTableInnerText += "<td>" + combinedCmpRodArray[m] + "</td>";
		for (let n = 0; n < gameArray.length; n++) {
			// Only execute any of this if the splitGameArrays[i] isnt 0
			if (splitGameArrays[n].length != 0) {
				// Still display N/A for games that do have a pokemon in this type but not currently
				if (combinedCmpRateArray[m][n] == 0) {
					combinedCmpTableInnerText += "<td>" + "N/A</td>";
				} else {
					combinedCmpTableInnerText += "<td class='" + displayArray[n].toLowerCase() + "-" + combinedCmpColorBool + "'>" + combinedCmpRateArray[m][n] + "%<br />";
				}
				if (combinedCmpLevelArray[m][n].length != 0) {
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

function readItems(gameString, gameArray, data, isFirst, isFirstMulti, subArea) {
	let idAdd = "";
	if (subArea)
		idAdd = subArea + "-";
	
	var thisText = "<div id='" + subArea + "pokemon-" + gameString.toLowerCase() + "-items' class='game-container'";
	if (!isFirst)
		thisText += "style='display:none'";
	thisText += ">";
	if (subArea)
		thisText += "<h4>" + subArea + "</h4>";
	
	if (!data && !subArea)
		return thisText + "<p>No items in " + gameString + ".</p></div>"
	else if (!data && subArea)
		return thisText + "<p>" + subArea + " has no items in " + gameString + ".</p></div>";
	
	var color = true;
	let thisArray = gameArray;
	if (gameString == "RGBY")
		thisArray = ["Aka", "Midori", "Ao", "Ki"];
	
	thisText += "<table><tr><th>Item</th><th colspan='" + gameString.length + "'>Games</th><th>Location</th><th>Notes</th></tr>";
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			thisText += "<tr><td>" + this.name + "</td>";
			for (var i = 0; i < gameString.length; i++) {
				let index = jQuery.inArray(thisArray[i], this.games);
				if (index != -1) {
					thisText += "<td class='" + gameArray[i].toLowerCase() + "-" + color +"'>";
				}
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

function readTrainers(gameString, gameArray, data, isFirst, isFirstMulti, subArea) {
	let idAdd = "";
	if (subArea)
		idAdd = subArea + "-";
	
	var thisText = "<div id='" + subArea + "pokemon-" + gameString.toLowerCase() + "-trainers' class='game-container'";
	if (!isFirst)
		thisText += "style='display:none'";
	thisText += ">";
	if (subArea)
		thisText += "<h4>" + subArea + "</h4>";
	
	if (!data && !subArea)
		return thisText + "<p>No trainers in " + gameString + ".</p></div>"
	else if (!data && subArea)
		return thisText + "<p>" + subArea + " has no trainers in " + gameString + ".</p></div>";
	
	var color = true;
	let thisArray = gameArray;
	if (gameString == "RGBY")
		thisArray = ["Aka", "Midori", "Ao", "Ki"];
	
	thisText += "<table><tr><th>Trainer</th><th colspan='" + gameString.length + "'>Games</th><th>Party</th><th>Notes</th></tr>";
	$.each(data, function() {
		if (gameArray.some(game => this.games.includes(game))) {
			thisText += "<tr><td>" + this.name + "</td>";
			for (var i = 0; i < gameString.length; i++) {
				let index = jQuery.inArray(thisArray[i], this.games);
				if (index != -1) {
					thisText += "<td class='" + gameArray[i].toLowerCase() + "-" + color +"'>";
				}
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

// Designed to check whether an object's games array contains a particular string
function isInGame(game, gameArray) {
	if (jQuery.inArray(game, gameArray) !== -1) {
		return true;
	}
	return false;
}

function parseGen(genString) {
	
	if (genString == "RGBY")
		return ["Red", "Green", "Blue", "Yellow"];
	else if (genString == "RBY")
		return ["Red", "Blue", "Yellow"]
	
	// handle a bad case?

	
}
	
function simplifyLevels(levels) {
	levels.sort(function(a, b){return a-b});
	
	// Set an array to push simplified levels to
	let simpleArray = [];
	
	// Get the first level
	let firstValue = levels[0];
	
	// Initialize "sequence" to 1 because there is 1 level so far
	let sequence = 1;
	
	// Declare empty combination string
	let combinedString = "";
	
	// Start at the 2nd level in the array.
	for (let i = 1; i < levels.length; i++) {
		// If this level is one higher than the previous level, increment sequence
		if (levels[i] - levels[i - 1] == 1) {
			sequence++;
			// If the sequence is 3 or greater, set a combined string combining the levels
			if (sequence >= 3) {
				combinedString = firstValue + "-" + levels[i];
			}
		}
		// If this level is not equal to previous level - 1, and the difference is not 0, there is a skip in levels
		else if (!(levels[i] - levels[i - 1] == 0)) {
			// If combined string exists, push it and then empty it
			if (combinedString != "") {
				simpleArray.push(combinedString);
			}
			// If combined string does not exist, but a sequence of 2 exists, add the previous two levels
			else {
				if (sequence == 2) {
					simpleArray.push(levels[i - 2]);
				}
				simpleArray.push(levels[i - 1]);
			}
			// Empty combined string, reset sequence and first value
			combinedString = "";
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
