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
		$("#386-dex").show();
		$("#frlg-dex").hide();
		$(".natdex-hide").show();
	}
	else if (id == "gamedex") {
		$("#386-dex").hide();
		$("#frlg-dex").show();
	}
	else {
		$("#386-dex").show();
		$("#frlg-dex").hide();
		$(".natdex-hide").hide();
	}
}