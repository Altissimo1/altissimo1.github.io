$(function() {
	updateStatusMoves();
	
	$("#status-checkbox").change(function() {
		updateStatusMoves();
	});
	
	function updateStatusMoves() {
		if ($("#status-checkbox").is(":checked")) {
			$.each($(".status-move"), function() {
				var statusMove = this;
				var typeColor;
				$.each(statusMove.classList, function() {
					if (this != "status-move")
						typeColor = this;
				});
				
				$(statusMove).attr("data-type", typeColor);
				
				statusMove.classList.remove(typeColor);
				statusMove.classList.add("status-false");
			});
		}
		else {
			$.each($(".status-move"), function() {
				var statusMove = this;
				var typeColor = $(statusMove).attr("data-type");
				
				statusMove.classList.remove("status-false");
				statusMove.classList.add(typeColor);
			});
		}
	}
});