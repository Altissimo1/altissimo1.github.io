$(function() {
	
	if (!$("#sweeper-checkbox").is(":checked"))
	{
		var tdSpecialFalse = $("td.special-false");
		var tdSpecialTrue = $("td.special-true");
		var trSpecialFalse = $("tr.special-false");
		var trSpecialTrue = $("tr.special-true");
		
		var tdPhysicalFalse = $("td.physical-false");
		var tdPhysicalTrue = $("td.physical-true");
		var trPhysicalFalse = $("tr.physical-false");
		var trPhysicalTrue = $("tr.physical-true");
		
		var tdMixedFalse = $("td.mixed-false");
		var tdMixedTrue = $("td.mixed-true");
		var trMixedFalse = $("tr.mixed-false");
		var trMixedTrue = $("tr.mixed-true");
		
		var tdDefensiveFalse = $("td.defensive-false");
		var tdDefensiveTrue = $("td.defensive-true");
		var trDefensiveFalse = $("tr.defensive-false");
		var trDefensiveTrue = $("tr.defensive-true");

		$.each(tdSpecialFalse, function() {
			$(this).css("background-color", "#ffffff");
		});
		$.each(tdSpecialTrue, function() {
			$(this).css("background-color", "#f5f5f5");
		});
		$.each(trSpecialFalse, function() {
			$(this).css("background-color", "#ffffff");
		});
		$.each(trSpecialTrue, function() {
			$(this).css("background-color", "#f5f5f5");
		});
		
		$.each(tdPhysicalFalse, function() {
			$(this).css("background-color", "#ffffff");
		});
		$.each(tdPhysicalTrue, function() {
			$(this).css("background-color", "#f5f5f5");
		});
		$.each(trPhysicalFalse, function() {
			$(this).css("background-color", "#ffffff");
		});
		$.each(trPhysicalTrue, function() {
			$(this).css("background-color", "#f5f5f5");
		});
		
		$.each(tdMixedFalse, function() {
			$(this).css("background-color", "#ffffff");
		});
		$.each(tdMixedTrue, function() {
			$(this).css("background-color", "#f5f5f5");
		});
		$.each(trMixedFalse, function() {
			$(this).css("background-color", "#ffffff");
		});
		$.each(trMixedTrue, function() {
			$(this).css("background-color", "#f5f5f5");
		});
		
		$.each(tdDefensiveFalse, function() {
			$(this).css("background-color", "#ffffff");
		});
		$.each(tdDefensiveTrue, function() {
			$(this).css("background-color", "#f5f5f5");
		});
		$.each(trDefensiveFalse, function() {
			$(this).css("background-color", "#ffffff");
		});
		$.each(trDefensiveTrue, function() {
			$(this).css("background-color", "#f5f5f5");
		});
	}
	
	$("#sweeper-checkbox").click(function() {
		var tdSpecialFalse = $("td.special-false");
		var tdSpecialTrue = $("td.special-true");
		var trSpecialFalse = $("tr.special-false");
		var trSpecialTrue = $("tr.special-true");
		
		var tdPhysicalFalse = $("td.physical-false");
		var tdPhysicalTrue = $("td.physical-true");
		var trPhysicalFalse = $("tr.physical-false");
		var trPhysicalTrue = $("tr.physical-true");
		
		var tdMixedFalse = $("td.mixed-false");
		var tdMixedTrue = $("td.mixed-true");
		var trMixedFalse = $("tr.mixed-false");
		var trMixedTrue = $("tr.mixed-true");
		
		var tdDefensiveFalse = $("td.defensive-false");
		var tdDefensiveTrue = $("td.defensive-true");
		var trDefensiveFalse = $("tr.defensive-false");
		var trDefensiveTrue = $("tr.defensive-true");
		
		if ($(this).is(":checked")) {
			$.each(tdSpecialFalse, function() {
				$(this).css("background-color", "");
			});
			$.each(tdSpecialTrue, function() {
				$(this).css("background-color", "");
			});
			$.each(trSpecialFalse, function() {
				$(this).css("background-color", "");
			});
			$.each(trSpecialTrue, function() {
				$(this).css("background-color", "");
			});
			
			$.each(tdPhysicalFalse, function() {
				$(this).css("background-color", "");
			});
			$.each(tdPhysicalTrue, function() {
				$(this).css("background-color", "");
			});
			$.each(trPhysicalFalse, function() {
				$(this).css("background-color", "");
			});
			$.each(trPhysicalTrue, function() {
				$(this).css("background-color", "");
			});
			
			$.each(tdMixedFalse, function() {
				$(this).css("background-color", "");
			});
			$.each(tdMixedTrue, function() {
				$(this).css("background-color", "");
			});
			$.each(trMixedFalse, function() {
				$(this).css("background-color", "");
			});
			$.each(trMixedTrue, function() {
				$(this).css("background-color", "");
			});
			
			$.each(tdDefensiveFalse, function() {
				$(this).css("background-color", "");
			});
			$.each(tdDefensiveTrue, function() {
				$(this).css("background-color", "");
			});
			$.each(trDefensiveFalse, function() {
				$(this).css("background-color", "");
			});
			$.each(trDefensiveTrue, function() {
				$(this).css("background-color", "");
			});
			
		}
		else {
			$.each(tdSpecialFalse, function() {
				$(this).css("background-color", "#ffffff");
			});
			$.each(tdSpecialTrue, function() {
				$(this).css("background-color", "#f5f5f5");
			});
			$.each(trSpecialFalse, function() {
				$(this).css("background-color", "#ffffff");
			});
			$.each(trSpecialTrue, function() {
				$(this).css("background-color", "#f5f5f5");
			});
			
			$.each(tdPhysicalFalse, function() {
				$(this).css("background-color", "#ffffff");
			});
			$.each(tdPhysicalTrue, function() {
				$(this).css("background-color", "#f5f5f5");
			});
			$.each(trPhysicalFalse, function() {
				$(this).css("background-color", "#ffffff");
			});
			$.each(trPhysicalTrue, function() {
				$(this).css("background-color", "#f5f5f5");
			});
			
			$.each(tdMixedFalse, function() {
				$(this).css("background-color", "#ffffff");
			});
			$.each(tdMixedTrue, function() {
				$(this).css("background-color", "#f5f5f5");
			});
			$.each(trMixedFalse, function() {
				$(this).css("background-color", "#ffffff");
			});
			$.each(trMixedTrue, function() {
				$(this).css("background-color", "#f5f5f5");
			});
			
			$.each(tdDefensiveFalse, function() {
				$(this).css("background-color", "#ffffff");
			});
			$.each(tdDefensiveTrue, function() {
				$(this).css("background-color", "#f5f5f5");
			});
			$.each(trDefensiveFalse, function() {
				$(this).css("background-color", "#ffffff");
			});
			$.each(trDefensiveTrue, function() {
				$(this).css("background-color", "#f5f5f5");
			});
		}
	});
	
});