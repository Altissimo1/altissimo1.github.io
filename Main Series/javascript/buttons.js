var topButton = function topClick() {
	
	if ($(this).attr("id").startsWith("all")) {
		$(".button-set").each(function() {
			$(this).hide();
		});
		
		// if all full is selected, show the All-Full tables; one for each gen
		if ($(this).attr("id") == "all-full")
			showAll(".compressed", ".full");
		// otherwise, all-compressed is selected; display only compressed containers
		else
			showAll(".full", ".compressed");
	}
	else {
		
		var gameSet = ($(this).attr("id"));
		
		$(".button-set").each(function() {
			if ($(this).attr("id").indexOf(gameSet) >= 0) {
				$(this).show();
			} else
				$(this).hide();
		});
		
		$(".game-container").each(function() {
			if ($(this).attr("id").endsWith(gameSet))
				$(this).show();
			else
				$(this).hide();
		});
	}
}

function showAll(class1, class2) {
	// Show all game containers.
	$(".game-container").each(function() {
		 $(this).show();
	 });
	 
	 // Hide class1.
	 $(class1).each(function() {
		 $(this).hide();
	 });
	 
	 // Show class2 combined.
	 $(class2).each(function() {
		 if ($(this).hasClass("combined"))
			 $(this).show();
		 else
			 $(this).hide();
	 });
	 
	 // Show "all".
	 $(".all").each(function() {
		 if ($(this).hasClass("combined"))
			 $(this).show();
		 else
			 $(this).hide();
	 });
	 
}

var gameButton = function gameClick() {
	var selection = $(this).attr("id");
	var gameSetButtons = $($(this).parent().parent()).attr("id");
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
		else {
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
	
	// Now all the tables are shown/hidden. Show/hide the headers appropriately.
	
	$("h3").each(function() {
		let endReached = false;
		var thing = $(this);
		let visible = false;
		let paragraphObject = "";
		while (!endReached) {
			var thing = $(thing).next();
			if (thing.length == 0 || thing[0].localName == "h3")
				endReached = true;
			else if (thing.is(":visible") && thing[0].localName != "p")
				visible = true;
			else if (thing[0].localName == "p")
				paragraphObject = thing;
		}
		if (!visible) {
			$(this).hide();
			$(paragraphObject).hide();
		}
		else {
			$(this).show();
			if (selection.endsWith("combined") || selection.endsWith("separate"))
				$(paragraphObject).show();
			else
				$(paragraphObject).hide();
		}
	});	
}