$(function() {
	setTopButton();	
	
	var topButtons = $("input[type=radio][name=games]");
	topButtons.each(function() {
		if ($(this).is(":checked"))
			$(this).trigger("click");
	});
	
	var pokebuttons = $("input[type=radio][class=pokemon-button]");
	pokebuttons.each(function() {
		if ($(this).is(":checked"))
			$(this).trigger("click");
	});
	
	headerHider();
});	

// This function controls what happens when on of the top-level buttons are clicked.
var topButton = function topClick() {
	
	// Get the game set that was clicked
	var gameSet = ($(this).attr("id"));
	
	// Show the button set associated with the game set
	$(".button-set").each(function() {
		if ($(this).hasClass(gameSet)) {
			$(this).show();
		} else
			$(this).hide();
	});
	
	// Show any containers associated with the game set
	$(".game-container").each(function() {
		if ($(this).hasClass(gameSet))
			$(this).show();
		else
			$(this).hide();
	});
	
	// Show any paragraph data associated with the game set
	$("p").each(function() {
		if (!($(this).hasClass("permanent"))) {
			if ($(this).hasClass("only")) {
				if ($(this).hasClass(gameSet))
					$(this).show();
				else
					$(this).hide();
			}
			else {		
				if ($(this).hasClass(gameSet) || $(this).hasClass("buttondisplay")) {
					$(this).show();
				}
				else
					$(this).hide();
			}
		}
	});
	
	// Update location URLs
	
	$("a").each(function() {
		if (($(this).hasClass("location-link"))) {
			// Check to see if a question mark tag has already been appended
			var href = this.href;
			var question = href.indexOf("?");
			if (question > 0) {
				var href = this.href.substring(0, question);
			}
			
			this.href = href + "?" + gameSet;
		}
	});
	
	headerHider();
}

// This function controls what happens when a game's table display button is clicked.
var gameButton = function gameClick() {
	// Get the id of the button
	var selection = $(this).attr("id");
	// Find the game set associated with it
	var gameSetButtons = $($(this).parent().parent().parent().parent()).attr("id");
	var gameSet = gameSetButtons.substring(0, gameSetButtons.length - 8);
	// For each pokemon table, show or hide it only if it meets the requirements of the table
	$(".pokemon-table").each(function() {
		let thisTable = $(this).attr("id");
		let full = selection.indexOf("full");
		let compressed = selection.indexOf("compressed");
		if (~thisTable.indexOf("all") && full > -1) 
			thisTable = thisTable.replace("all", "full");
		else if (~thisTable.indexOf("all") && compressed > -1)
			thisTable = thisTable.replace("all", "compressed");
		if (thisTable.startsWith(selection)) {
			$(this).show();
		}
		else if (thisTable.startsWith(gameSet)) {
			if (selection.endsWith("separate")) {
				if (selection.endsWith("full-separate")) {
					if ($(this).hasClass("combined") || $(this).hasClass("compressed"))
						$(this).hide();
					else
						$(this).show();
				}
				else {
					if (($(this).hasClass("compressed") || $(this).hasClass("all")) && !($(this).hasClass("combined")))
						$(this).show();
					else
						$(this).hide();
				}
			}
			else 
				$(this).hide();
		}
	});
	
	headerHider();
}

// Show and hide tables that need to be displayed or hidden
function headerHider() {
	$(".table-collection").each(function() {
		var visible = false;
		$(this.children).each(function() {
			if ($(this).prop('nodeName') == "DIV" && $(this).css('display') != 'none') {
				visible = true;
			}
		});
		
		if (!visible)
			$(this).hide();
		else
			$(this).show();
	});
}

function setTopButton() {
	var url = window.location.href;
	
	var game = url.substring(url.indexOf("?") + 1);
	
	var bookmark = "";
	
	if (game.indexOf("#") > 0) {
		bookmark = true;
		bookmark = game.substring(game.indexOf("#") + 1);
		game = game.substring(0, game.indexOf("#"));
	}
	
	var topButtons = $("input[type=radio][name=games]");
	
	topButtons.each(function() {
		if (this.id == game)
			$(this).prop("checked", true);
	});
	
	if (bookmark !== "") {		
		window.location.hash = bookmark;
	}	
}