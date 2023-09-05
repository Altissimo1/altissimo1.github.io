var dropdown = function dropdownClick() {
	var classToUse = $(this).val();
	$("table").each(function() {
		if ($(this).hasClass(classToUse)) {
			$(this).show();
		} else {
			$(this).hide();
		}
	});
}
