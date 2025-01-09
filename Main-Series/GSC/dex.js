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
	
	if (id == "johtodex") {
		$(".johtodex").show();
		$(".natdex").hide();
	}
	else if (id == "natdex") {
		$(".johtodex").hide();
		$(".natdex").show();
	}
}