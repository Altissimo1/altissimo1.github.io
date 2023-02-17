var topButton = function topClick() {
	
	var gameSet = ($(this).attr("id"));
	
	$("table").each(function() {
		if ($(this).hasClass(gameSet)) {
			$(this).show();
		} else
			$(this).hide();
	});
}
