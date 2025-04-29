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
		$("#rse-dex").hide();
	}
	else if (id == "gamedex") {
		$("#386-dex").hide();
		$("#rse-dex").show();
		$(".emerald-hide").show();
	}
	else {
		$("#386-dex").hide();
		$("#rse-dex").show();
		$(".emerald-hide").hide();
	}
}