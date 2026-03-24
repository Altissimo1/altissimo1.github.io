$(function() {
	var dlcButtons = $("input[type=radio][name=dlc-display]");
	dlcButtons.each(function() {
		if ($(this).is(":checked")) {
			$(this).trigger("click");
		}
	});
});

var dlc = function dlcClick() {

	var id = $(this).attr("id");
	
	if (id == "no-dlc-select") {
		$("#no-dlc").show();
		$("#dlc").hide();
	}
	else {
		$("#dlc").show();
		$("#no-dlc").hide();
	}
}