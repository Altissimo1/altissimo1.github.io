$(function() {
	
	var usCodes = [];
	var jpCodes = [];
	var euCodes = [];
	$.getJSON("/json/qr-codes.json", function(data) {
		$.each(data, function() {
			if (this.region == "US")
				usCodes.push(this);
			else if (this.region == "EU")
				euCodes.push(this);
			else
				jpCodes.push(this);
		});
	});
	
	$("#generate").click(function() {
		var currentRegion = "";
		$('input[name="regions"]').each(function() {
			if ($(this).is(":checked"))
				currentRegion = $(this).attr("id");
		});
		
		var innerText = "";
		
		var display = true;
		
		$(".container input:checked").each(function() {
			// Create an image item
			if (!display)
				innerText += "<div style='margin:auto;width:50%;display:none;'>";
			else {
				innerText += "<div style='margin:auto;width:50%;'>";
				display = false;
			}
			
			innerText += "<span><strong>" + $(this)[0].value + "</strong></span><br>";
			var jsonObject;
			console.log(currentRegion);
			if (currentRegion == "us")
				jsonObject = usCodes[parseInt($(this).attr("id")) - 1];
			else if (currentRegion == "eu")
				jsonObject = euCodes[parseInt($(this).attr("id")) - 1];
			else
				jsonObject = jpCodes[parseInt($(this).attr("id")) - 1];
			innerText += '<img src=../"' + jsonObject.src + '" alt="' + jsonObject.alt + '"></div>';
		});
		
		$(".images").html(innerText);
		$(".generated").show();
		$("#next").focus();
		$("#current").text("1");
		$("#total").text($(".images div").length);
		
	});
	
	$("#next").click(function() {
		var display = false;
		$(".images div").each(function() {
			if (display) {
				$(this).show();
				$("#current").text(parseInt($("#current").text()) + 1);
				display = false;
			}
			else if ($(this).is(":visible")) {
				display = true;
				$(this).hide();
			}
		});
	});
	
	$("#previous").click(function() {
		for (var i = 0; i < $(".images div").length; i++) {
			if ($($(".images div")[i + 1]).is(":visible")) {
				$($(".images div")[i]).show();
				$($(".images div")[i + 1]).hide();
				$("#current").text(parseInt($("#current").text()) - 1);
				break;
			}
		}
	});
});
