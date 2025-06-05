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
		$("#721-dex").show();
		$("#oras-dex").hide();
	}
	else if (id == "gamedex") {
		$("#721-dex").hide();
		$("#oras-dex").show();
		$(".natdex-hide").show();
	}
	else {
		$("#721-dex").hide();
		$("#oras-dex").show();
		$(".natdex-hide").hide();
	}
}