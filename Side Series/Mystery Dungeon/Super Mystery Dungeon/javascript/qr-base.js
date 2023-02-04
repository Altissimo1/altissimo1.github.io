var regionButton = function regionClick() {
	var region = ($(this).attr("id"));
	
	$(".container").each(function() {
		if ($(this).hasClass(region))
			$(this).show();
		else
			$(this).hide();
	});
}
