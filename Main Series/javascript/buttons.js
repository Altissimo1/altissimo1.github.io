$(function() {
	headerHider();
});	
	
var topButton = function topClick() {
	
	var gameSet = ($(this).attr("id"));
	
	$(".button-set").each(function() {
		if ($(this).hasClass(gameSet)) {
			$(this).show();
		} else
			$(this).hide();
	});
	
	$(".game-container").each(function() {
		if ($(this).hasClass(gameSet))
			$(this).show();
		else
			$(this).hide();
	});
	
	$("p").each(function() {
		if ($(this).hasClass(gameSet) || $(this).hasClass("buttondisplay"))
			$(this).show();
		else
			$(this).hide();
	});
	
	headerHider();
}

var gameButton = function gameClick() {
	var selection = $(this).attr("id");
	var gameSetButtons = $($(this).parent().parent().parent()).attr("id");
	var gameSet = gameSetButtons.substring(0, gameSetButtons.length - 8);
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
