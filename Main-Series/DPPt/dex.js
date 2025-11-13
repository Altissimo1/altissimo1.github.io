$(function() {
	var dexButtons = $("input[type=radio][name=dex-display]");
	dexButtons.each(function() {
		if ($(this).is(":checked")) {
			$(this).trigger("click");
		}
	});
});

var dex = function dexClick() {

	var id = $(this).attr("id");
	
	if (id == "natdex") {
		$("#493-dex").show();
		$("#dppt-dex").hide();
	}
	else {
		$("#493-dex").hide();
		$("#dppt-dex").show();
	}
}