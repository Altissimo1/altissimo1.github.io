var gameData = {};

$.each(gameSets, function() {
	var gameSet = this;
	$.getJSON("../json/" + gameSet + '-variables.json', function(data) {
		gameData[gameSet] = data;
		$("#set-conditions-" + gameSet).change();
	});
});

function getConditions(gameSet) {
	// Initialize the conditions box with the conditions used by the variable file
	var conditions = [];
	
	// Create the checkboxes.
	$.each(Object.keys(gameData[gameSet].secondaryConditions), function() {
		conditions.push(this);
	});
	
	$.each(Object.keys(gameData[gameSet].complexConditions), function() {
		conditions.push(this);
	});
	
	return conditions;
}

function getBaseConditions(gameSet) {
	return gameData[gameSet].baseConditions;
}

function getSecondaryConditions(gameSet) {
	return gameData[gameSet].secondaryConditions;
}

function getComplexConditions(gameSet) {
	return gameData[gameSet].complexConditions;	
}

function getGames(gameSet) {
	return gameData[gameSet].games;
}

function getGameSet(id) {
	// Gets the game set identifier from an ID. This assumes the ID ends with e.g. -dppt.
	var split = id.split("-");
	return split[split.length - 1];
}

$(function() {
	// Initializes the conditions & sets a change event to update visibility.
	$(".condition-check").change(function() {
		var $container = $(this).closest(".table-collection");
		updateVisibility($(this).data("condition"), getGameSet(this.id), $(this).is(":checked"), $container);
		createSetTables($container);
	});
	
	// Shows the full table and hides the set tables, or shows all table rows, when the "show all"
	// button is clicked.
	$(".show-all-conditions").change(function() {
		if ($(this).is(":checked")) {
			// Hide the condition checkboxes.
			var $container = $(this).closest(".table-collection");
			$container.find(".condition-checkboxes").hide();
			
			var gameSet = getGameSet($container.parent().attr("id"));
			var conditions = getConditions(gameSet);
			
			// For the Full tables:
			// Iterate over each condition.
			$.each(conditions, function() {
				var condition = this;				
				var slots = 0;
				var fishing = false;
				
				// If the row matches the condition and the condition is true, show it, and add to the slots to update
				// the rowspan of the 'parent' pokemon row.
				$.each($container.find("." + condition + "-true"), function() {
					var div = $(this).parent().parent().parent();
					if (div.attr("id").indexOf("fishing") > -1)
						fishing = true;
					$(this).show();
					restoreRowspans(this, condition, fishing);
				});
				
				// If the row matches the condition and the condition is false, show it, and hide other rows.
				$.each($container.find("." + condition + "-false"), function() {
					var div = $(this).parent().parent().parent();
					if (div.attr("id").indexOf("fishing") > -1)
						fishing = true;
					$(this).show();
					restoreRowspans(this, condition, fishing);
				});
			});
		}
		
		// Destroy existing set tables if there are any.
		destroySetTables($container);
		
		// Show the "condition-table" tables which are the base tables for conditions when the logic
		// is used to generate additional tables.
		$.each($container.find("table.condition-table"), function() {
			$(this).show();
		});
	});
	
	function restoreRowspans(row, condition, fishing)
	{		
		if ($(row).hasClass("base")) {
			var firstChild = $(row).children().first();
			var secondChild = $(row).children().first().next();
			$(firstChild).show();
			$(secondChild).show();
			var slots = $(row).nextUntil(".base").length + 1;
			$(firstChild).attr("rowspan", slots);
			$(secondChild).attr("rowspan", slots);
			
			if (fishing) {
				var thirdChild = $(row).children().first().next().next();				
				$(thirdChild).show();
				$(thirdChild).attr("rowspan", slots);
			}
		}
		else {
			var firstChild = $(row).children().first();
			var secondChild = $(row).children().first().next();
			if ($(firstChild).hasClass(condition + "-base"))
				$(firstChild).hide();
			if ($(secondChild).hasClass(condition + "-base"))
				$(secondChild).hide();
			
			if (fishing) {
				var thirdChild = $(row).children().first().next().next();
				if ($(thirdChild).hasClass(condition + "-base"))
					$(thirdChild).hide();
			}
		}
	}
	
	// If the set conditions button is clicked, show the checkboxes, update visibility, and create
	// set tables if relevant.
	$(".set-conditions").change(function() {
		if ($(this).is(":checked")) {
			var $container = $(this).closest(".table-collection");
			$container.find(".condition-checkboxes").show();
			var gameSet = getGameSet(this.id);
			$.each(getConditions(gameSet), function() {
				updateVisibility(this, gameSet, $("#" + this).is(":checked"), $container);
			});

			createSetTables($(this).closest(".table-collection"));
		}
	});
	
	// Functions.	
	
	// Shows and hides table rows depending on whether their corresponding checkbox is checked.
	function updateVisibility(item, gameSet, visible, $container) {
		var fishing = false;
		if (visible) {
			$.each($container.find($("#pokemon-" + gameSet).find("." + item + "-true")), function() {
				var div = $(this).parent().parent().parent();
				if (div.attr("id").indexOf("fishing") > -1)
					fishing = true;
				$(this).show();
				updateBaseChild(this, "true", item, fishing);
			});
			$.each($container.find($("#pokemon-" + gameSet).find("." + item + "-false")), function() {
				$(this).hide();
			});
		}
		else {
			$.each($container.find($("#pokemon-" + gameSet).find("." + item + "-true")), function() {
				$(this).hide();
			});
			$.each($container.find($("#pokemon-" + gameSet).find("." + item + "-false")), function() {
				var div = $(this).parent().parent().parent();
				if (div.attr("id").indexOf("fishing") > -1)
					fishing = true;
				$(this).show();
				updateBaseChild(this, "false", item, fishing);
			});
		}	
	}
	
	// Updates the row span of rows as rows are shown or hidden.
	function updateBaseChild(object, condition, item, fishing) {
		var firstChild = $(object).children().first();
		var secondChild = $(object).children().first().next();
		if (firstChild.hasClass(item + "-base"))
		{
			var slots = $(object).nextUntil("tr:not(." + item + "-" + condition + "), tr.base").length + 1;
			$(firstChild).attr("rowspan", slots);
			$(firstChild).show();
		}
		if (secondChild.hasClass(item + "-base"))
		{
			var slots = $(object).nextUntil("tr:not(." + item + "-" + condition + "), tr.base").length + 1;
			$(secondChild).attr("rowspan", slots);
			$(secondChild).show();
		}
		
		if (fishing)
		{
			var thirdChild = $(object).children().first().next().next();
			if (thirdChild.hasClass(item + "-base"))
			{
				var slots = $(object).nextUntil("tr:not(." + item + "-" + condition + ")").length + 1;
				$(thirdChild).attr("rowspan", slots);
				$(thirdChild).show();
			}
		}		
	}
	
	// Creates a new table corresponding to the selected conditions when set conditions/checkboxes
	// are selected.
	function createSetTables($container) {
		var gameSet = getGameSet($container.parent().attr("id"))
		// Destroy any existing table.
		destroySetTables($container);
		var fishing = false;
		
		// Iterate over each of the condition tables to create a secondary table.
		// This causes this function to run in the background even on hidden tables.
		$.each($container.find("table.condition-table"), function() {
			// Get the table's parent, which is a div.
			var div = $(this).parent();
			
			// Get the caption of the existing table so that you can use it for the new table.
			var caption = $($(this).find("caption")[0])[0];
			
			// Determine if it is a fishing table.
			if (div.attr("id").indexOf("fishing") > -1)
				fishing = true;
			
			// Determine if the table is a single game table or a multi game table and update accordingly.
			if (div.hasClass("compressed") && div.hasClass("combined"))
			{
				createCombinedTable(div, this, caption.innerText, fishing, gameSet);
			}
			else
			{
				// Get the game being iterated over so we can use it for the color-coding.
				var firstRow = $(this).find("tr").first();
				var game = firstRow[0].className.replace("-true", "");
				// Call createIndividualTable, passing the relevant data.
				createIndividualTable(div, this, caption.innerText, game, fishing, gameSet);				
			}

			// Hide this table.
			$(this).hide();
		});
	}
	
	// Create an individual table.
	function createIndividualTable(tableParent, table, caption, game, fishing, gameSet)
	{
		var baseConditions = getBaseConditions(gameSet);
		var secondaryConditions = getSecondaryConditions(gameSet);
		var complexConditions = getComplexConditions(gameSet);
	
		// Set the color variable to false.
		var color = false;
		// SEt strings for beginning, middle, and end of table.
		var newTableStartText = "<table class='set-table'><caption>" + caption + "</caption><thead><tr class='" + game + "-true'><th colspan='2'>Pokémon</th><th>Rate</th><th>Level</th><th>Condition(s)</th></tr></thead><tbody>";
		if (fishing)
			var newTableStartText = "<table class='set-table'><caption>" + caption + "</caption><thead><tr class='" + game + "-true'><th>Rod</th><th colspan='2'>Pokémon</th><th>Rate</th><th>Level</th><th>Condition(s)</th></tr></thead><tbody>";
		var newTableMiddleText = "";
		var newTableEndText = "</tbody></table>";
		
		// Get all pokemon out of the table and add to object.
		
		var allRows = $(table).find("tr");
		var pokemonContainer = [];
		var currentPokemon = [];
		
		// Iterate over the rows.
		
		$.each(allRows, function() {
			var row = this;
			
			// Get the image table cell. If it has an image, its the start of a POkemon entity.
			var imageTableCell = $(row).find("td").first();
			
			var rod = "";
			if (fishing) 
			{
				imageTableCell = $(row).find("td").first().next();
			}
			var img = $(imageTableCell).find("img");
			
			// Skip the first row which is always just the table header.
			if ($(row).find("th").length == 0)
			{
				// Set variables for condition, level, and rate.
				var conditionString = $(row).find("td:last-child")[0].innerText;
				var conditions = conditionString.split(", ");

				// Check if the image has content.
				if (img.length > 0)
				{
					// If fishing, get the rod.
					var rod = "";
					if (fishing) {
						rod = $(row).find("td").first()[0].innerText;
					}
					
					// Check if the current object is empty. If not, it contains a previous pokemon's data; push it to the container.
					if (!$.isEmptyObject(currentPokemon))
						pokemonContainer.push(currentPokemon);
					
					// Get the pokemon's name.
					var name = $(row).find("td:nth-child(2)")[0].innerText;
					if (fishing)
						name = $(row).find("td:nth-child(3)")[0].innerText;
					// Get the URL.
					var url = $(img).attr("src");
					
					// for fishing: add rod here?
					var rowObject = {
						rate: $(row).find("td:nth-child(3)")[0].innerText,
						level: $(row).find("td:nth-child(4)")[0].innerText,
						conditions: conditions
					};
					if (fishing) {
						var rowObject = {
							rate: $(row).find("td:nth-child(4)")[0].innerText,
							level: $(row).find("td:nth-child(5)")[0].innerText,
							conditions: conditions
						};
					}
					
					currentPokemon = {
						name: name,
						URL: url,
						rod: rod,
						rowdata: [rowObject]
					};
					
				}
				// IF the row does not already have an image, then a pokemon object exists, add level & rate & Condition
				else {
					currentPokemon.rowdata.push({
						rate: $(row).find("td:nth-child(1)")[0].innerText,
						level: $(row).find("td:nth-child(2)")[0].innerText,
						conditions: conditions
					});
				}
			}			
		});
		
		pokemonContainer.push(currentPokemon);
				
		// Now iterate over every pokmeon object in the pokemon container.
		
		// Create a new object to hold information.
		
		var newPokeObject = [];
		
		$.each(pokemonContainer, function() {
			var complexCondition = "";
			var complexConditionUsedValues = "";
			var complexConditionUnusedValues = "";
			var complexConditionRate = "0%";
			var complexConditionLevels = "0";
			// Get the pokemon
			var pokemon = this;
			
			var outputRows = [];
			// Iterate over the pokemon rows.
			$.each(pokemon.rowdata, function() {
				var existingRow = this;
				
				// Check if it is a base row.
				var allBaseOrAnytime = true;
				var otherConditions = [];
				var baseConditionsUsed = [];
								
				$.each(existingRow.conditions, function() {
					var condition = this.toString();
					if (!(condition == "Anytime" || baseConditions.indexOf(condition) > -1)) {
						allBaseOrAnytime = false;
						otherConditions.push(condition);
					}
					else
						baseConditionsUsed.push(condition);
				});
				
				if (baseConditionsUsed.length == 0 || (baseConditionsUsed.length == 1 && baseConditionsUsed[0] == "Anytime")) {
					
					if (baseConditionsUsed.length == 1 && baseConditionsUsed[0] == "Anytime")
						baseConditionsUsed = [];

					$.each(baseConditions, function() {
						var condition = this.toString();
						baseConditionsUsed.push(condition);
					});						
				}
				
				// If it is a base row, add its data to combinedLevel and combinedRate.
				if (allBaseOrAnytime) {			
					$.each(baseConditionsUsed, function() {
						var condition = this.toString();
						var pushed = false;
						
						$.each(outputRows, function() {
							if (Object.values(this).indexOf(condition) > -1) {
								this.level = concatLevels(this.level, existingRow.level);
								this.rate = concatRates(this.rate, existingRow.rate);
								pushed = true;
							}
						});
						
						if (!pushed) {
							outputRows.push({
								level: existingRow.level,
								rate: existingRow.rate,
								condition: condition
							});
						}
					});
				}
				
				// If it is not all base or anytime, we need to account for other conditions.
				else {
					// The otherCondition string will have the other condition. There should only be 1.
					// Check to see if it is a secondary condition & if the secondary conditions box is checked.
					$.each(Object.keys(secondaryConditions), function() {
						var key = this;
						var secondary = secondaryConditions[key];
						// First check to see if the otherCondition is related to this secondary condition.
						
						// If there are multiple entries in the otherCondition, then it is not going to be a secondary condition, because the only way there would be multiple entries
						// is if there are >2 values for a condition, which can only happen for complexConditions. Iterate over the conditions in otherConditions to see if you can find
						// one that matches.
						
						$.each(otherConditions, function() 
						{
							var otherCondition = this.toString();
							if (otherCondition.toLowerCase() == secondary.active || otherCondition.toLowerCase() == secondary.inactive) {
								// If it is, we want to add to existing data IF the secondary condition matches the checkbox setting.
								
								var conditionChecks = tableParent.parent().find($(".condition-check"));
									
								var currentCheck = "";
								
								$.each(conditionChecks, function() {
									if (this.id.indexOf(key) != -1)
										currentCheck = this.id;
								});			
									
								if (($("#" + currentCheck).is(":checked") && otherCondition.toLowerCase() == secondary.active) ||
									(!($("#" + currentCheck).is(":checked")) && otherCondition.toLowerCase() == secondary.inactive)) {
									// Add the existing data.
									$.each(baseConditionsUsed, function() {
										var condition = this.toString();
										var pushed = false;
										
										$.each(outputRows, function() {
											if (Object.values(this).indexOf(condition) > -1) {
												this.level = concatLevels(this.level, existingRow.level);
												this.rate = concatRates(this.rate, existingRow.rate);
												pushed = true;
											}
										});
										
										if (!pushed) {
											outputRows.push({
												level: existingRow.level,
												rate: existingRow.rate,
												condition: condition
											});
										}
									});
								}
							}
						});
					});
					
					// Now check against complex conditions.
					$.each(Object.keys(complexConditions), function() {
						var key = this;
						var complex = complexConditions[key];
						// First check to see if the otherCondition values are related to this complex condition.
						
						// If there are multiple entries in otherConditions, find all of the ones related to this complex condition.
						
						var entries = [];
						
						var complexConFound = false;
						
						$.each(otherConditions, function() {
							var otherCondition = this.toString();
							if (complex.activeConditions.indexOf(otherCondition) > -1)
								entries.push(otherCondition);
							else if (otherCondition.toLowerCase().indexOf(complex.inactive) > -1) {
								entries.push(otherCondition);
								if (otherCondition.indexOf(complex.tableText) > -1)
									complexConFound = true;
							}
							else if (otherCondition.indexOf(complex.tableText) > -1) {
								complexConFound = true;
								entries.push(otherCondition);
							}
						});
						
						var isActive = true;
						$.each(entries, function() {
							if (this.toString().toLowerCase().indexOf(complex.inactive) > -1)
								isActive = false;
						});
						
						if (complexConFound) {							
							if (isActive) {
								var cons = [];
								$.each(entries, function() {
									if (this.toString().toLowerCase().indexOf(complex.inactive) == -1) {
										var newStr = this.toString().replace(complex.tableText, "");
										cons.push(newStr);
									}
								});
								
								complexCondition = complex.tableText + cons.join(", ").toString();
							}
							
							// If it is, we want to add to existing data IF the complex condition matches the checkbox setting.
							
							var conditionChecks = tableParent.parent().find($(".condition-check"));
									
							var currentCheck = "";
							
							$.each(conditionChecks, function() {
								if (this.id.indexOf(key) != -1)
									currentCheck = this.id;
							});
							
							// In the unique case that a single pokmeon object contains data for both when a condition is active and when it is inactive, we need some special handling.
														
							if (!isActive && entries.length > 1 && ($("#" + currentCheck).is(":checked"))) {
								complexConditionRate = concatRates(complexConditionRate, existingRow.rate);
								complexConditionLevels = concatLevels(complexConditionLevels, existingRow.level);
								
								var cons = [];
								$.each(entries, function() {
									if (this.toString().toLowerCase().indexOf(complex.inactive) == -1) {
										var newStr = this.toString().replace(complex.tableText, "");
										cons.push(newStr);
									}
								});
								
								complexConditionUsedValues = complex.tableText + cons.join(", ").toString();
								
								var unusedCons = [];
								$.each(complex.activeConditions, function() {
									if (complexConditionUsedValues.indexOf(this.toString()) == -1)
										unusedCons.push(this.toString());
								});
								
								complexConditionUnusedValues = complex.tableText + unusedCons.join(", ").toString();								
							}
							
							if (($("#" + currentCheck).is(":checked") && isActive) ||
								(!($("#" + currentCheck).is(":checked")) && !isActive)) {
								// Add the existing data.
								$.each(baseConditionsUsed, function() {
									var condition = this.toString();
									var pushed = false;
									
									$.each(outputRows, function() {
										if (Object.values(this).indexOf(condition) > -1) {
											this.level = concatLevels(this.level, existingRow.level);
											this.rate = concatRates(this.rate, existingRow.rate);
											pushed = true;
										}
									});
									
									if (!pushed) {
										outputRows.push({
											level: existingRow.level,
											rate: existingRow.rate,
											condition: condition
										});
									}
								});
							}
						}
					});
				}
			});
			
			// Now combine instances of the same level/rate.
					
			var newOutputRows = [];
			
			$.each(outputRows, function() {
				var row = this;
				
				if ($.isEmptyObject(newOutputRows)) {
					newOutputRows.push({
						level: row.level,
						rate: row.rate,
						conditions: [row.condition]
					});
				}
				else {
					var pushed = false;
					$.each(newOutputRows, function() {
						var newRow = this;
						
						if (newRow.level == row.level && newRow.rate == row.rate) {
							newRow.conditions.push(row.condition);
							pushed = true;
						}								
					});		
					
					if (!pushed) {
						newOutputRows.push({
								level: row.level,
								rate: row.rate,
								conditions: [row.condition]
							})	
					}
				}						
			});
			
			var outputTableRows = [];
			
			var baseConditionsHaveOutput = [];
			var baseConditionsPushed = [];
			
			$.each(baseConditions, function() {
				var condition = this.toString();
				baseConditionsHaveOutput[condition] = false;
				baseConditionsPushed[condition] = false;
			});
			
			$.each(newOutputRows, function() {
				var row = this;
				$.each(baseConditions, function() {
					var condition = this.toString();
					if (row.conditions.indexOf(condition) > -1)
						baseConditionsHaveOutput[condition] = true;
				});				
			});
						
			$.each(baseConditions, function() {
				var condition = this.toString();
				
				$.each(newOutputRows, function() {
					var existingRow = this;
					
					if (existingRow.conditions.indexOf(condition) > -1 && !baseConditionsPushed[condition]) {
						$.each(existingRow.conditions, function() {
							baseConditionsPushed[this.toString()] = true;
						});
						
						var conditionString = existingRow.conditions.join(", ");
						var hasAllConditions = true;
						$.each(baseConditions, function() {
							var condition = this.toString();
							if (conditionString.indexOf(condition) == -1)
								hasAllConditions = false;
						});
						
						if (hasAllConditions)
							conditionString = "Anytime";
						if (complexCondition != "")
							conditionString = complexCondition;
						
						// Check if a row needs to be pushed for a complex condition.
						if (complexConditionLevels != "0") {
							var newRow = "<td>" + concatRates(existingRow.rate, complexConditionRate).toString() + "</td><td>" + concatLevels(existingRow.level, complexConditionLevels).toString() + "</td><td>" + conditionString + "<br>" + complexConditionUsedValues + "</td>";
							outputTableRows.push(newRow);
							newRow = "<td>" + existingRow.rate.toString() + "</td><td>" + existingRow.level.toString() + "</td><td>" + conditionString + "<br>" + complexConditionUnusedValues + "</td>";
							outputTableRows.push(newRow);
						}
						else {
							var newRow = "<td>" + existingRow.rate.toString() + "</td><td>" + existingRow.level.toString() + "</td><td>" + conditionString + "</td>";
							outputTableRows.push(newRow);
						}								
					}					
				});

				if (!baseConditionsHaveOutput[condition] && complexConditionLevels != "0") {
					var newRow = "<td>" + complexConditionRate.toString() + "</td><td>" + complexConditionLevels.toString() + "</td><td>" + condition + "<br>" + complexConditionUsedValues + "</td>";
					outputTableRows.push(newRow);
				}
			});
			
			var middleString = "";
			for (var i = 0; i < outputTableRows.length; i++) {
				if (i == 0) {
					if (fishing) {
						middleString = middleString + "<tr class='" + game + "-" + color + "'><td rowspan=" + outputTableRows.length + ">" + pokemon.rod + "</td>";
						middleString = middleString + "<td rowspan=" + outputTableRows.length + "><div class='flex-img'><img src='" + pokemon.URL + "' alt='" + pokemon.name + "'></div></td>";
					}
					else
						middleString = middleString + "<tr class='" + game + "-" + color + "'><td rowspan=" + outputTableRows.length + "><div class='flex-img'><img src='" + pokemon.URL + "' alt='" + pokemon.name + "'></div></td>";
					middleString = middleString + "<td rowspan=" + outputTableRows.length + ">" + pokemon.name + "</td>";
				}
				else
					middleString = middleString + "<tr class='" + game + "-" + color + "'>";
				
				middleString = middleString + outputTableRows[i].toString();					
			}
				
			newTableMiddleText = newTableMiddleText + middleString;
		
			if (middleString != "")				
				color = !color;			
		});
		
		tableParent.append(newTableStartText + newTableMiddleText + newTableEndText);		
	}
	
	function createCombinedTable(tableParent, table, caption, fishing, gameSet) {
		var baseConditions = getBaseConditions(gameSet);
		var secondaryConditions = getSecondaryConditions(gameSet);
		var complexConditions = getComplexConditions(gameSet);
		var games = getGames(gameSet);		
		
		var color = false;
		
		// Set the strings for the beginning, middle, and end of the table.		
		var newTableStartText = "<table class='set-table'><caption>" + caption + "</caption><thead><tr class='light-true'><th colspan='2'>Pokémon</th>";
		if (fishing)
			newTableStartText = "<table class='set-table'><caption>" + caption + "</caption><thead><tr class='light-true'><th>Rod</th><th colspan='2'>Pokémon</th>";
		$.each(games, function() {
			// Brilliant Diamond and Shining Pearl have to be treated differently since they're two words
			var gameName = this;
			if (gameName == "BrilliantDiamond")
				gameName = "Brilliant Diamond";
			else if (gameName == "ShiningPearl")
				gameName = "Shining Pearl";
			newTableStartText = newTableStartText + "<th class='" + this.toLowerCase() + "-true' colspan='2'>" + gameName + "</th>";
		});
		newTableStartText = newTableStartText + "<th>Condition</th></tr></thead><tbody>";
		var newTableMiddleText = "";
		var newTableEndText = "</tbody></table>";
		
		// Get all of the pokemon out of the table and add them to an object.
		var allRows = $(table).find("tr");
		var pokemonContainer = [];
		var currentPokemon = [];
		
		// Iterate over the rows.
		
		$.each(allRows, function() {
			var row = this;
			
			// Get the first table cell. If it has an image, it's the beginning of a Pokemon entity.
			var imageTableCell = $(row).find("td").first();
			
			var rod = "";
			if (fishing)
			{
				imageTableCell = $(row).find("td").first().next();
			}
			
			var img = $(imageTableCell).find("img");
			
			// Skip the first row, which will always just have the header.
			if ($(row).find("th").length == 0)
			{				
				// Set variables for condition, level, and rate.
				var conditionString = $(row).find("td:last-child")[0].innerText;
				var conditions = conditionString.split(", ");
				
				var rateStart = 1;
				
				// Check if the image has content.
				if (img.length > 0)
				{
					var rod = "";
					if (fishing) {
						rod = $(row).find("td").first()[0].innerText;
					}
					
					// Check if the current object is empty. If not, it contains a previous pokemon's data; push it to the container.
					if (!$.isEmptyObject(currentPokemon))
						pokemonContainer.push(currentPokemon);
					
					// Get the pokemon's name.
					var name = $(row).find("td:nth-child(2)")[0].innerText;
					if (fishing)
						name = $(row).find("td:nth-child(3)")[0].innerText;
					// Get the URL.
					var url = $(img).attr("src");
					
					var gameObject = {};
					
					var rateStart = 3;
					if (fishing)
						rateStart = 4;
					$.each(games, function() {
						var game = this.toString();
						var rate = $(row).find("td:nth-child(" + rateStart + ")")[0].innerText;
						rateStart++;
						var rowObject = {};
						if (rate == "N/A") {
							rowObject = {
								level: "0",
								rate: "0%",
								conditions: []
							};
						}
						else {
							rowObject = {
								level: $(row).find("td:nth-child(" + rateStart + ")")[0].innerText,
								rate: rate,
								conditions: conditions
							}
							rateStart++;
						}
						
						gameObject[game] = [rowObject];
					});
					
					currentPokemon = {
						name: name,
						URL: url,
						rod: rod,
						rowdata: gameObject
					};
					
				}
				// IF the row does not already have an image, then a pokemon object exists, add level & rate & Condition
				else {
					var rateStart = 1;
					
					$.each(games, function() {
						var game = this.toString();
						var rate = $(row).find("td:nth-child(" + rateStart + ")")[0].innerText;
						rateStart++;
						var rowObject = {};
						if (rate == "N/A") {
							rowObject = {
								level: "0",
								rate: "0%",
								conditions: []
							};
						}
						else {
							rowObject = {
								level: $(row).find("td:nth-child(" + rateStart + ")")[0].innerText,
								rate: rate,
								conditions: conditions
							}
							rateStart++;
						}
						currentPokemon.rowdata[game].push(rowObject);
					});
				}
			}
		});
		
		pokemonContainer.push(currentPokemon);
		
		var newPokeObject = [];
		
		$.each(pokemonContainer, function() {
			// Get the pokemon
			var pokemon = this;
			var complexCondition = "";
			var complexConditionUsedValues = [];
			var complexConditionUnusedValues = [];
			var complexConditionRate = [];
			var complexConditionLevels = [];

			var outputRows = {};
			
			$.each(Object.keys(pokemon.rowdata), function() {
				var key = this.toString();
				var data = pokemon.rowdata[key];
				
				complexConditionUsedValues[key] = "";
				complexConditionUnusedValues[key] = "";
				complexConditionRate[key] = "0%";
				complexConditionLevels[key] = "0";
				outputRows[key] = [];
				
				$.each(data, function() {
					var existingRow = this;
				
					// Check if it is a base row.
					var allBaseOrAnytime = true;
					var otherConditions = [];
					var baseConditionsUsed = [];
								
					$.each(existingRow.conditions, function() {
						var condition = this.toString();
						if (!(condition == "Anytime" || baseConditions.indexOf(condition) > -1)) {
							allBaseOrAnytime = false;
							otherConditions.push(condition);
						}
						else
							baseConditionsUsed.push(condition);
					});
				
					if (baseConditionsUsed.length == 0 || (baseConditionsUsed.length == 1 && baseConditionsUsed[0] == "Anytime")) {
						
						if (baseConditionsUsed.length == 1 && baseConditionsUsed[0] == "Anytime")
							baseConditionsUsed = [];

						$.each(baseConditions, function() {
							var condition = this.toString();
							baseConditionsUsed.push(condition);
						});						
					}
					
					// If it is a base row, add its data to combinedLevel and combinedRate.
					if (allBaseOrAnytime) {			
						$.each(baseConditionsUsed, function() {
							var condition = this.toString();
							var pushed = false;
							
							$.each(outputRows[key], function() {
								if (Object.values(this).indexOf(condition) > -1) {
									this.level = concatLevels(this.level, existingRow.level);
									this.rate = concatRates(this.rate, existingRow.rate);
									pushed = true;
								}
							});
							
							if (!pushed) {
								outputRows[key].push({
									level: existingRow.level,
									rate: existingRow.rate,
									condition: condition
								});
							}
						});
					}
				
					// If it is not all base or anytime, we need to account for other conditions.
					else {
						// The otherCondition string will have the other condition. There should only be 1.
						// Check to see if it is a secondary condition & if the secondary conditions box is checked.
						$.each(Object.keys(secondaryConditions), function() {
							var secondKey = this;
							var secondary = secondaryConditions[secondKey];
							// First check to see if the otherCondition is related to this secondary condition.
							
							// If there are multiple entries in the otherCondition, then it is not going to be a secondary condition, because the only way there would be multiple entries
							// is if there are >2 values for a condition, which can only happen for complexConditions. Iterate over the conditions in otherConditions to see if you can find
							// one that matches.
							
							$.each(otherConditions, function() 
							{								
								var otherCondition = this.toString();
								if (otherCondition.toLowerCase() == secondary.active || otherCondition.toLowerCase() == secondary.inactive) {
									// If it is, we want to add to existing data IF the secondary condition matches the checkbox setting.
									
									var conditionChecks = tableParent.parent().find($(".condition-check"));
									
									var currentCheck = "";
									
									$.each(conditionChecks, function() {
										if (this.id.indexOf(secondKey) != -1)
											currentCheck = this.id;
									});			
									
									if (($("#" + currentCheck).is(":checked") && otherCondition.toLowerCase() == secondary.active) ||
										(!($("#" + currentCheck).is(":checked")) && otherCondition.toLowerCase() == secondary.inactive)) {
											
										// Add the existing data.
										$.each(baseConditionsUsed, function() {
											var condition = this.toString();
											var pushed = false;
											
											$.each(outputRows[key], function() {
												if (Object.values(this).indexOf(condition) > -1) {
													this.level = concatLevels(this.level, existingRow.level);
													this.rate = concatRates(this.rate, existingRow.rate);
													pushed = true;
												}
											});
											
											if (!pushed) {
												outputRows[key].push({
													level: existingRow.level,
													rate: existingRow.rate,
													condition: condition
												});
											}
										});
									}
								}
							});
						});
						
						// Now check against complex conditions.
						$.each(Object.keys(complexConditions), function() {
							var complexKey = this;
							var complex = complexConditions[complexKey];
							// First check to see if the otherCondition values are related to this complex condition.
							
							// If there are multiple entries in otherConditions, find all of the ones related to this complex condition.
							
							var entries = [];
							
							var complexConFound = false;
							
							var complexConFound = false;
						
							$.each(otherConditions, function() {
								var otherCondition = this.toString();
								if (complex.activeConditions.indexOf(otherCondition) > -1)
									entries.push(otherCondition);
								else if (otherCondition.toLowerCase().indexOf(complex.inactive) > -1) {
									entries.push(otherCondition);
									if (otherCondition.indexOf(complex.tableText) > -1)
										complexConFound = true;
								}
								else if (otherCondition.indexOf(complex.tableText) > -1) {
									complexConFound = true;
									entries.push(otherCondition);
								}
							});
							
							var isActive = true;
							
							$.each(entries, function() {
								if (this.toString().toLowerCase().indexOf(complex.inactive) > -1)
									isActive = false;
							});													
							
							if (complexConFound) {
								
								if (isActive) {
									var cons = [];
									$.each(entries, function() {
										if (this.toString().toLowerCase().indexOf(complex.inactive) == -1) {
											var newStr = this.toString().replace(complex.tableText, "");
											cons.push(newStr);
										}
									});
									
									complexCondition = complex.tableText + cons.join(", ").toString();
								}
								
								// If it is, we want to add to existing data IF the complex condition matches the checkbox setting.
								
								var conditionChecks = tableParent.parent().find($(".condition-check"));
									
								var currentCheck = "";
								
								$.each(conditionChecks, function() {
									if (this.id.indexOf(complexKey) != -1)
										currentCheck = this.id;
								});
								
								// In the unique case that a single pokmeon object contains data for both when a condition is active and when it is inactive, we need some special handling.
															
								if (!isActive && entries.length > 1 && ($("#" + currentCheck).is(":checked"))) {
									complexConditionRate[key] = concatRates(complexConditionRate[key], existingRow.rate);
									complexConditionLevels[key] = concatLevels(complexConditionLevels[key], existingRow.level);
									
									var cons = [];
									$.each(entries, function() {
										if (this.toString().toLowerCase().indexOf(complex.inactive) == -1) {
											var newStr = this.toString().replace(complex.tableText, "");
											cons.push(newStr);
										}
									});
									
									complexConditionUsedValues[key] = complex.tableText + cons.join(", ").toString();
									
									var unusedCons = [];
									$.each(complex.activeConditions, function() {
										if (complexConditionUsedValues[key].indexOf(this.toString()) == -1)
											unusedCons.push(this.toString());
									});
									
									complexConditionUnusedValues[key] = complex.tableText + unusedCons.join(", ").toString();								
								}
								
								if (($("#" + currentCheck).is(":checked") && isActive) ||
									(!($("#" + currentCheck).is(":checked")) && !isActive)) {
									
									// Add the existing data.
									$.each(baseConditionsUsed, function() {
										var condition = this.toString();
										var pushed = false;
										
										$.each(outputRows[key], function() {
											if (Object.values(this).indexOf(condition) > -1) {
												this.level = concatLevels(this.level, existingRow.level);
												this.rate = concatRates(this.rate, existingRow.rate);
												pushed = true;
											}
										});
										
										if (!pushed) {
											outputRows[key].push({
												level: existingRow.level,
												rate: existingRow.rate,
												condition: condition
											});
										}
									});
								}
							}
						});
					}
				});				
			});
			
			var newOutputRows = [];			
			
			$.each(baseConditions, function() {
				var condition = this.toString();
				
				newOutputRows[condition] = {};
			});
			
			$.each(Object.keys(outputRows), function() {
				var key = this.toString();
				var data = outputRows[key];
				
				$.each(data, function() {
					var obj = this;
					
					$.each(baseConditions, function() {
						var condition = this.toString();
						
						if (obj.condition == condition) {
							newOutputRows[condition][key] = {
								level: obj.level,
								rate: obj.rate
							};
						}
					});
				});
			});
			
			var removeUnusedOutputRows = [];
			
			$.each(baseConditions, function() {
				var condition = this.toString();
				var thisConditionUsed = false;
				
				$.each(Object.keys(newOutputRows[condition]), function() {
					var key = this.toString();
					var row = newOutputRows[condition][key];
					
					if (row != undefined && row.level != "0")
						thisConditionUsed = true;
				});
				
				if (thisConditionUsed) {
					removeUnusedOutputRows[condition] = newOutputRows[condition];
				}
			});
			
			var newOutputRows = [];
			
			$.each(Object.keys(removeUnusedOutputRows), function() {
				var condition = this.toString();
				var row = removeUnusedOutputRows[condition];
				
				if ($.isEmptyObject(newOutputRows)) {
					newOutputRows.push({
						gameData: row,
						conditions: [condition]
					});					
				}
				
				else {					
					var added = false;
					for (var i = 0; i < newOutputRows.length; i++) {
						var currentRow = newOutputRows[i];
						var allGamesMatch = true;
						$.each(Object.keys(row), function() {
							var key = this.toString();
							var newRow = row[key];
							if (currentRow.gameData[key].level != newRow.level || currentRow.gameData[key].rate != newRow.rate)
								allGamesMatch = false;							
						});
						
						if (allGamesMatch) {
							currentRow.conditions.push(condition);
							added = true;
						}
					}
					
					if (!added) {
						newOutputRows.push({
							gameData: row,
							conditions: [condition]
						});	
					}
				}
			});			
			
			var outputTableRows = [];
			
			// Declare 2 variables, one to state which base conditions have a row for their output,
			// and one to state which base conditions have already been pushed to output rows.
			var baseConditionsHaveOutput = [];
			var baseConditionsPushed = [];
			
			// Set both to false for each base condition.
			$.each(baseConditions, function() {
				var condition = this.toString();
				baseConditionsHaveOutput[condition] = false;
				baseConditionsPushed[condition] = false;
			});
			
			// Get all the base conditions with output and set the appropriate variable to true.
			$.each(newOutputRows, function() {
				var row = this;
				$.each(baseConditions, function() {
					var condition = this.toString();
					if (row.conditions.indexOf(condition) > -1)
						baseConditionsHaveOutput[condition] = true;
				});
			});
			
			// Now it is time to output the tables. Iterate over each base condition.
			$.each(baseConditions, function() {
				var condition = this.toString();				
				
				// If anyComplexConExtraConditions = true, then we have a condition (e.g. Starly)
				// where it has SOME complex cons at one rate and SOME at another.
				var anyComplexConExtraConditions = false;
				$.each(Object.keys(complexConditionLevels), function() {
					var key = this.toString();
					if (complexConditionLevels[key] != "0")
						anyComplexConExtraConditions = true;
				});
				
				// Iterate over each new row.
				$.each(newOutputRows, function() {
					var row = this;					
					
					// If the row a) contains the current condition and b) the current condition
					// has not been pushed, go ahead and start the push process.
					if (row.conditions.indexOf(condition) > -1 && !baseConditionsPushed[condition]) {
						// Set baseConditionsPushed to true for each base condition contained within
						// the current row's condition list.
						$.each(row.conditions, function() {
							baseConditionsPushed[this.toString()] = true;
						});
						
						var conditionString = row.conditions.join(", ");
						
						// Check to see if the condition list has all base conditions, in which case
						// it can be replaced with "Anytime".
						var hasAllConditions = true;
						$.each(baseConditions, function() {
							var condition = this.toString();
							if (conditionString.indexOf(condition) == -1)
								hasAllConditions = false;
						});
						
						if (hasAllConditions)
							conditionString = "Anytime";
						// This value will only not be empty if the pokemon has ONE complex condition,
						// e.g. dual-slot FR Seedot.
						// It WILL be empty in the case of e.g. Starly due to the fact of where this variable
						// is defined.
						if (complexCondition != "")
							conditionString = complexCondition;
						
						// Set up a new string to hold output.
						var tableRow = "";
						
						// If there are any extra conditions, we need to create multiple rows.
						if (anyComplexConExtraConditions) {
							// Declare a variable to see if all games match. usedCons and unusedCons
							// are used only by the upcoming foreach loop; a different approach will be needed
							// to determine what to do if all games do NOT match.
							var allGamesMatch = true;
							var usedCons = "";
							var unusedCons = "";
							// Iterate over the complexConditionUsedValues object. It,
							// and the complexConditionUnusedValues object, contain 1 entry
							// for each game.
							$.each(Object.keys(complexConditionUsedValues), function() {
								// Get the game.
								var key = this.toString();
								
								// If usedCons is empty, initialize it and unusedCons.
								if (usedCons == "") {
									usedCons = complexConditionUsedValues[key];
									unusedCons = complexConditionUnusedValues[key];
								}
								// Otherwise, check to see if the current values match the existing ones.
								else {
									if (complexConditionUsedValues[key] != usedCons ||
										complexConditionUnusedValues[key] != unusedCons)
										allGamesMatch = false;
								}						
							});
							
							// Ths if statement only executes if all games DO match.
							if (allGamesMatch) {
								// We will output 2 lines: 1 for the row with used conditions, and 1 for the row
								// with unused conditions, as these will have different rates and potentially different levels.
								
								// The first row will use the used conditions, and therefore have a higher rate than the second row.
								
								// Iterate over the row's gameData object. There is one key for each game.
								$.each(Object.keys(row.gameData), function() {
									// Get the game.
									var key = this.toString();
									// Get the data.
									var origData = row.gameData[key];
									
									// Add the data of the complex condition to the data, as it is not already added
									// due to funkiness in how previous code executes.
									var rate = concatRates(origData.rate, complexConditionRate[key]).toString();
									var level = concatLevels(origData.level, complexConditionLevels[key]).toString();
									
									if (level.indexOf("lv. ") == -1)
										level = "lv. " + level;
									
									// If the rate is still 0, the pokemon is not in this game. Add an empty row.
									if (rate == "0%") {
										tableRow += "<td class=\"light-" + color.toString() + "\" colspan=\"2\">N/A</td>";
									}
									// Otherwise, add the row.
									else {							
										tableRow += "<td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + rate + "</td><td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + level + "</td>";
									}
								});
								
								// Add the condition string at the end of the row.
								tableRow += "<td class=\"light-" + color.toString() + "\">" + conditionString + "<br>" + usedCons + "</td></tr>";

								// Push the row.
								outputTableRows.push(tableRow);
																
								// Now do roughly the same thing, except with unused conditions.
								// This time, there is no need to add the rate value.
								tableRow = "";
								
								$.each(Object.keys(row.gameData), function() {
									var key = this.toString();
									var origData = row.gameData[key];
									
									var levelString = origData.level.toString();
									if (levelString.indexOf("lv. ") == -1)
										levelString = "lv. " + levelString;
									
									if (origData.level != "0")
										tableRow += "<td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + origData.rate.toString() + "</td><td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + levelString + "</td>";
									else
										tableRow += "<td class=\"light-" + color.toString() + "\" colspan=\"2\">N/A</td>";
								});
								
								tableRow += "<td class=\"light-" + color.toString() + "\">" + conditionString + "<br>" + unusedCons + "</td>";

								outputTableRows.push(tableRow);
							}
							else {
								var gamesPushed = {};
								$.each(Object.keys(complexConditionUsedValues), function() {
									var key = this.toString();
									gamesPushed[key] = false;
								});
								
								var allGamesWritten = false;
								
								while (!allGamesWritten) {
									var usedCons = "";
									var unusedCons = "";
									var gamesInCurrentSet = {};
									
									$.each(Object.keys(complexConditionUsedValues), function() {
										// Get the game.
										var key = this.toString();
										
										// If usedCons is empty, initialize it and unusedCons.
										if (usedCons == "" && !gamesPushed[key]) {
											usedCons = complexConditionUsedValues[key];
											unusedCons = complexConditionUnusedValues[key];
											gamesInCurrentSet[key] = true;
										}
										// Otherwise, check to see if the current values match the existing ones.
										else if (!gamesPushed[key]) {
											if (complexConditionUsedValues[key] == usedCons ||
												complexConditionUnusedValues[key] == unusedCons)
												gamesInCurrentSet[key] = true;
												gamesPushed[key] = true;
										}
									});									

									// We will output 2 lines: 1 for the row with used conditions, and 1 for the row
									// with unused conditions, as these will have different rates and potentially different levels.
									
									// The first row will use the used conditions, and therefore have a higher rate than the second row.
									
									// Iterate over the row's gameData object. There is one key for each game.
									$.each(Object.keys(row.gameData), function() {
										// Get the game.
										var key = this.toString();
										// Get the data.
										var origData = row.gameData[key];
										
										// Add the data of the complex condition to the data, as it is not already added
										// due to funkiness in how previous code executes.
										var rate = concatRates(origData.rate, complexConditionRate[key]).toString();
										var level = concatLevels(origData.level, complexConditionLevels[key]).toString();
										if (level.indexOf("lv. ") == -1)
											level = "lv. " + level;
										
										// If the rate is still 0, the pokemon is not in this game. Add an empty row.
										if (rate == "0%" || !(gamesInCurrentSet[key])) {
											tableRow += "<td class=\"light-" + color.toString() + "\" colspan=\"2\">N/A</td>";
										}
										// Otherwise, add the row.
										else {							
											tableRow += "<td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + rate + "</td><td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + level + "</td>";
										}
									});
									
									// Add the condition string at the end of the row.
									tableRow += "<td class=\"light-" + color.toString() + "\">" + conditionString + "<br>" + usedCons + "</td></tr>";

									// Push the row.
									outputTableRows.push(tableRow);
																	
									// Now do roughly the same thing, except with unused conditions.
									// This time, there is no need to add the rate value.
									tableRow = "";
									
									$.each(Object.keys(row.gameData), function() {
										var key = this.toString();
										var origData = row.gameData[key];
										
										var levelString = origData.level.toString();
										if (levelString.indexOf("lv. ") == -1)
											levelString = "lv. " + levelString;
										
										if (origData.level == "0" || !(gamesInCurrentSet[key]))
											tableRow += "<td class=\"light-" + color.toString() + "\" colspan=\"2\">N/A</td>";
										else
											tableRow += "<td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + origData.rate.toString() + "</td><td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + levelString + "</td>";
									});
									
									tableRow += "<td class=\"light-" + color.toString() + "\">" + conditionString + "<br>" + unusedCons + "</td>";

									outputTableRows.push(tableRow);
									
									var allGamesUsed = true;
									$.each(Object.keys(gamesPushed), function() {
										if (!gamesPushed[this.toString()])
											allGamesUsed = false;
									});
									
									allGamesWritten = allGamesUsed;									
								}
							}
						}
						// The following line will execute if we do not have multiple complex conditions to display,
						//ex. the complex condition's checkbox is not checked, or the pokmeon doesn't have multiple complex conditions.
						else {							
							$.each(Object.keys(row.gameData), function() {
								// Each key is a game.
								var key = this.toString();
								var data = row.gameData[key];
								
								var levelString = data.level.toString();
								if (levelString.indexOf("lv. ") == -1)
									levelString = "lv. " + levelString;
								
								// If the game data is 0, output an empty row for that game.
								if (data.level != "0")
									tableRow += "<td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + data.rate.toString() + "</td><td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + levelString + "</td>";
								else
									tableRow += "<td class=\"light-" + color.toString() + "\" colspan=\"2\">N/A</td>";
							});
							
							tableRow += "<td class=\"light-" + color.toString() + "\">" + conditionString + "</td>";

							outputTableRows.push(tableRow);
						}
					}
				});

				// This if statement executes if there are any base conditions that were not already written,
				// but there are extra conditions.
				// Ex. if Starly has no appearance in "Night" except for in certain extra conditions.
				// You can trigger this if block by removing the Poke Radar row for Starly from the combined
				// compressed table. (line 1677-1683 of route207.html)

				if (!baseConditionsHaveOutput[condition] && anyComplexConExtraConditions) {
					// Do the same check to see if all games match.
					var allGamesMatch = true;
					var usedCons = "";
					var unusedCons = "";
					// Check to see that all used match & all unused match.
					$.each(Object.keys(complexConditionUsedValues), function() {
						var key = this.toString();
						
						if (usedCons == "") {
							usedCons = complexConditionUsedValues[key];
							unusedCons = complexConditionUnusedValues[key];
						}
						else {
							if (complexConditionUsedValues[key] != usedCons ||
								complexConditionUnusedValues[key] != unusedCons)
								allGamesMatch = false;
						}						
					});
					
					// If they do, output the results of specifically the stored extra condition data in a row, with the
					// unused condition string.
					if (allGamesMatch) {
					
						var tableRow = "";
						$.each(Object.keys(complexConditionRate), function() {
							var key = this.toString();
							var levelString = complexConditionLevels[key].toString();
							if (levelString.indexOf("lv. ") == -1)
								levelString = "lv. " + levelString;
							
							if (complexConditionLevels[key].level != "0")
								tableRow += "<td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + complexConditionRate[key].toString() + "</td><td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + levelString + "</td>";
							else
								tableRow += "<td class=\"light-" + color.toString() + "\" colspan=\"2\">N/A</td>";
						});
						tableRow += "<td class=\"light-" + color.toString() + "\">" + condition + "<br>" + usedCons + "</td>";
						outputTableRows.push(tableRow);
					}
					else {
						var gamesPushed = {};
						$.each(Object.keys(complexConditionUsedValues), function() {
							var key = this.toString();
							gamesPushed[key] = false;
						});
						
						var allGamesWritten = false;
						
						while (!allGamesWritten) {
							var usedCons = "";
							var unusedCons = "";
							var gamesInCurrentSet = {};
							
							$.each(Object.keys(complexConditionUsedValues), function() {
								// Get the game.
								var key = this.toString();
								
								// If usedCons is empty, initialize it and unusedCons.
								if (usedCons == "" && !gamesPushed[key]) {
									usedCons = complexConditionUsedValues[key];
									unusedCons = complexConditionUnusedValues[key];
									gamesInCurrentSet[key] = true;
								}
								// Otherwise, check to see if the current values match the existing ones.
								else if (!gamesPushed[key]) {
									if (complexConditionUsedValues[key] == usedCons ||
										complexConditionUnusedValues[key] == unusedCons)
										gamesInCurrentSet[key] = true;
										gamesPushed[key] = true;
								}
							});									

							// We will output 2 lines: 1 for the row with used conditions, and 1 for the row
							// with unused conditions, as these will have different rates and potentially different levels.
							
							// The first row will use the used conditions, and therefore have a higher rate than the second row.
							
							$.each(Object.keys(row.gameData), function() {
								var key = this.toString();
								var levelString = complexConditionLevels[key].toString();
								if (levelString.indexOf("lv. ") == -1)
									levelString = "lv. " + levelString;
								
								if (complexConditionLevels[key].level == "0" || !(gamesInCurrentSet[key]))
									tableRow += "<td class=\"light-" + color.toString() + "\" colspan=\"2\">N/A</td>";
								else
									tableRow += "<td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + complexConditionRate[key].toString() + "</td><td class=\"" + key.toLowerCase() + "-" + color.toString() + "\">" + levelString + "</td>";
							});
							tableRow += "<td class=\"light-" + color.toString() + "\">" + condition + "<br>" + usedCons + "</td>";
							outputTableRows.push(tableRow);
							
							var allGamesUsed = true;
							$.each(Object.keys(gamesPushed), function() {
								if (!gamesPushed[this.toString()])
									allGamesUsed = false;
							});
							
							allGamesWritten = allGamesUsed;									
						}
					}
				}				
			});
			
			var middleString = "";
			
			for (var i = 0; i < outputTableRows.length; i++) {
				if (i == 0) {
					if (fishing) {
						middleString = middleString + "<tr><td class=\"light-" + color.toString() + "\" rowspan=" + outputTableRows.length + ">" + pokemon.rod + "</td>";
						middleString = middleString + "<td class=\"light-" + color.toString() + "\" rowspan=" + outputTableRows.length + "><div class='flex-img'><img src='" + pokemon.URL + "' alt='" + pokemon.name + "'></div></td>";
					}
					else {
						middleString = middleString + "<tr><td class=\"light-" + color.toString() + "\" rowspan=" + outputTableRows.length + "><div class='flex-img'><img src='" + pokemon.URL + "' alt='" + pokemon.name + "'></div></td>";
					}
					middleString = middleString + "<td class=\"light-" + color.toString() + "\" rowspan=" + outputTableRows.length + ">" + pokemon.name + "</td>";
				}
				else
					middleString = middleString + "<tr>";
				
				middleString = middleString + outputTableRows[i].toString();					
			}
				
			newTableMiddleText = newTableMiddleText + middleString;
		
			if (middleString != "")				
				color = !color;
		});
		
		tableParent.append(newTableStartText + newTableMiddleText + newTableEndText);
	}
	
	
	function destroySetTables($container) {
		$.each($container.find("table.set-table"), function() {
			$(this).remove();
		});
	}
	
	function concatLevels(levels1, levels2) {
		if (levels1 == "0" && levels2 == "0")
			return "0";
		else if (levels1 == "0" && levels2 != undefined && levels2 != "" && levels2 != null)
			return levels2;
		else if (levels2 == "0" && levels1 != undefined && levels1 != "" && levels1 != null)
			return levels1;
		
		
		levels1Obj = null;
		levels2Obj = null;
		if (levels1 != undefined && levels1 != "" && levels1 != null)
			levels1Obj = getLevels(levels1);
		if (levels2 != undefined && levels2 != "" && levels2 != null)
			levels2Obj = getLevels(levels2);
		
		if (levels1Obj && levels2Obj) {
			let newArr = [...levels1Obj, ...levels2Obj];
			let mergedArr = [... new Set(newArr)];
			mergedArr.sort(function (a, b) {
				return a - b;
			});
			return combineRunsReduce(mergedArr);
		}
		else if (levels1Obj)
			return combineRunsReduce(levels1Obj);
		else if (levels2Obj)
			return combineRunsReduce(levels2Obj);
		return levels1Obj.toString() + levels2Obj.toString();
	}
	
	function concatRates(rate1, rate2) {
		return parseInt(rate1) + parseInt(rate2) + "%";
	}	
	
	function getLevels(stringNumbers) {
		stringNumbers = stringNumbers.replace("lv. ", "");
		//personal preference, but I got this handy tip from the internet that

		//if you had assignments, better if they are individually var'ed
		var nums = [];
		var entries = stringNumbers.split(',');
		var length = entries.length;

		//for variabes that don't, comma separated
		var i, entry, low, high, range;

		for (i = 0; i < length; i++) {
			entry = entries[i];

			//shortcut for testing a -1
			if (!~entry.indexOf('-')) {
				//absence of dash, must be a number
				//force to a number using +
				nums.push(+entry);
			} else {
				//presence of dash, must be range
				range = entry.split('-');

				//force to numbers
				low = +range[0];
				high = +range[1];

				//XOR swap, no need for an additional variable. still 3 steps though
				//http://en.wikipedia.org/wiki/XOR_swap_algorithm
				if(high < low){
				  low = low ^ high;
				  high = low ^ high;
				  low = low ^ high;
				}

				//push for every number starting from low
				while (low <= high) {
					nums.push(low++);
				}
			}
		}

		//edit to sort list at the end
		return nums.sort(function (a, b) {
			return a - b;
		});
	}
	
	function combineRunsReduce(levels) {
		return levels.reduce((accumulator, currentValue) => {
			if (accumulator.length < 1) return [[currentValue]];

			const lastRange = accumulator[accumulator.length - 1];
			const lastValue = lastRange[lastRange.length - 1];
			if (currentValue === lastValue + 1) {
				lastRange.push(currentValue);
			} else {
				accumulator.push([currentValue]);
			}
			return accumulator;
		}, []).map(range => {
			if (range.length > 2) {
				return range[0] + "-" + range[range.length - 1];
			} else {
				return range.join(", ");
			}
		}).join(", ");
	}
});