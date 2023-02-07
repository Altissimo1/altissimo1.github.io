$(function() {
	
	var usCodes = [];
	var jpCodes = [];
	var euCodes = [];
	$.getJSON("qr-codes.json", function(data) {
		$.each(data, function() {
			if (this.region == "US")
				usCodes.push(this);
			else if (this.region == "EU")
				euCodes.push(this);
			else
				jpCodes.push(this);
		});
	});
	
	$(".checkbox").change(function() {
		addRemoveItem(this);
	});
	
	$(".allcheck").change(function() {
		if (this.checked) {
			$("." + this.id + " div input").each(function() {
				$(this).prop("checked", true);
				addRemoveItem(this);
			});
		}
		else
			$("." + this.id + " div input").each(function() {
				$(this).prop("checked", false);
				addRemoveItem(this);
			});
	});
	
	function addRemoveItem(checkItem) {
		if (checkItem.checked) {
			var textDisplay = "<span name='" + checkItem.id + "'><br>" + checkItem.value + "</span>";
			$("#textlist").html($("#textlist").html() + textDisplay);
		}
		else {
			$("." + checkItem.id).remove();
		}
	}
	
	$("#generate").click(function() {
		var currentRegion = "";
		$('input[name="regions"]').each(function() {
			if ($(this).is(":checked"))
				currentRegion = $(this).attr("id");
		});
		
		var innerText = "";
		
		var display = true;
		
		$("#textlist span").each(function() {
			// Create an image item
			if (!display)
				innerText += "<div style='margin:auto;width:50%;display:none;'>";
			else {
				innerText += "<div style='margin:auto;width:50%;'>";
				display = false;
			}
			
			innerText += "<span><strong>" + this.textContent + "</strong></span><br>";
			var jsonObject;
			if (currentRegion == "us")
				jsonObject = usCodes[parseInt($(this).attr("name")) - 1];
			else if (currentRegion == "eu")
				jsonObject = euCodes[parseInt($(this).attr("name")) - 1];
			else
				jsonObject = jpCodes[parseInt($(this).attr("name")) - 1];
			innerText += '<img src="' + jsonObject.src + '" alt="' + jsonObject.alt + '"></div>';
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
