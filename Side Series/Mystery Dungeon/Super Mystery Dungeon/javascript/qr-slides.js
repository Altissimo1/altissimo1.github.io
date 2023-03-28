var usCodes = [];
var jpCodes = [];
var euCodes = [];

$(function() {
	
	$(document).on("keyup", function (e) {
		if ($(".generated").is(":visible") && e.key == "Enter") {
			if (!($("#next").is(":disabled")))
				goToNext(true);
		}
		if ($(".generated").is(":visible") && e.key == "Backspace") {
			if (!($("#previous").is(":disabled")))
				goToPrevious(true);
		}
	});
	
	$.getJSON("json/qr-codes.json", function(data) {
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
		if (checkItem.checked && $("span[name='" + checkItem.id + "']").length == 0) {
			var textDisplay = "<span name='" + checkItem.id + "'><br>" + checkItem.value + "</span>";
			$("#textlist").html($("#textlist").html() + textDisplay);
		}
		else if (!checkItem.checked) {
			$("span[name='" + checkItem.id + "']").remove();
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
		if ($("#textlist span").length > 0) {
		
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
			$(this).blur();
			$("#current").text("1");
			$("#total").text($(".images div").length);
			
		}
		
	});
	
	$("#clearall").click(function() {
		$("#textlist").html("");
		$("#current").html("");
		$("#total").html("");
		$(".images").html("");
		$(".generated").hide();
		$(".allcheck").each(function() {
			$(this).prop("checked", false);
		});
		$(".checkbox").each(function() {
			$(this).prop("checked", false);
		});
	});
	
	$("#next").click(function() {
		console.log($("#importfile"));
		goToNext(false);
	});
	
	$("#previous").click(function() {
		goToPrevious(false);
	});
	
	$("#export").click(function() {
		var region = "";
		$(".regionButton").each(function() {
			if ($(this).is(":checked"))
				region = this.id;
		});
		console.log(region);
		
		var myData = {
			Region: region,
			AllButtons: [],
			Buttons: [],
		}
		
		$(".allcheck").each(function() {
			var thisButton = {
				Name: this.id,
				Selected: $(this).is(":checked")
			}
			myData.AllButtons.push(thisButton);
		});
		
		$(".checkbox").each(function() {
			var thisButton = {
				Name: this.id,
				Selected: $(this).is(":checked")
			}
			myData.Buttons.push(thisButton);
		});
		
		$("<a />", {
			"download": "codes.json",
			"href": "data:application/json," + encodeURIComponent(JSON.stringify(myData))
		}).appendTo("body")
		.click(function() {
			$(this).remove()
		})[0].click()
	});
	
	$("#submit").click(function(e) {
		let formData = new FormData();
		formData.append("file", fileupload.files[0]);
		console.log(formData);
	});
	
	async function uploadFile() {
		let formData = newFormData();
		formData.append("file", fileupload.files[0]);
		console.log(formData);
	}
	
	$("#upload-button").click(function(e) {
		var file = fileupload.files[0];
		var path = (window.URL || window.webkitURL).createObjectURL(file);
		readTextFile(path, function(text) {
			initializePage(JSON.parse(text));
		});
	});
	
	function readTextFile(file, callback) {
		var rawFile = new XMLHttpRequest();
		rawFile.overrideMimeType("application/json");
		rawFile.open("GET", file, true);
		rawFile.onreadystatechange = function() {
			if (rawFile.readyState === 4 && rawFile.status == "200") {
				callback(rawFile.responseText);
			}
		}
		rawFile.send(null);
	}

	function initializePage(importData) {
		$(".regionButton").each(function() {
			if (this.id == importData.Region) {
				$(this).prop("checked", true);
				regionButton.call(this);
			}
			else
				$(this).prop("checked", false);
		});
		
		$.each(importData.AllButtons, function() {
			$("#" + this.Name).prop("checked", this.Selected);
			$("#" + this.Name).trigger("change");
		});
		
		$.each(importData.Buttons, function() {
			$("#" + this.Name).prop("checked", this.Selected);
			$("#" + this.Name).trigger("change");
		});
	}
	
	
	function disableButton(button) {
		$(button).prop("disabled", true);
		setTimeout(function() {
			$(button).prop("disabled", false);
		}, 1000);
	}
	
	function goToNext(stop) {
		if (stop)
			disableButton($("#next"));
		var display = false;
		if ($("#current").text() != $("#total").text()) {
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
		}
		else {
			var counter = 0;
			$(".images div").each(function() {
				if (counter == 0)
					$(this).show();
				else
					$(this).hide();
				counter++;
			});
					
			$("#current").text(1);
		}
	}
	
	function goToPrevious(stop) {
		if (stop)
			disableButton($("#previous"));
		for (var i = 0; i < $(".images div").length; i++) {
			if ($($(".images div")[i + 1]).is(":visible")) {
				$($(".images div")[i]).show();
				$($(".images div")[i + 1]).hide();
				$("#current").text(parseInt($("#current").text()) - 1);
				break;
			}
		}
	}
});

var regionButton = function regionClick() {
	var region = this.id;
	$(".language").each(function() {
		var current = $(this).attr("for");
		if (region == "us" || region == "eu")
			$(this).text(" " + usCodes[current - 1].name);
		else
			$(this).text(" " + jpCodes[current - 1].name);
	});
	
	$(".checkbox").each(function() {
		if (region == "us" || region == "eu")
			$(this).val(usCodes[this.id - 1].name);
		else
			$(this).val(jpCodes[this.id - 1].name);
	});
	
	$("#textlist span").each(function() {
		var current = $(this).attr("name");
		if (region == "us" || region == "eu")
			$(this).html("<br>" + usCodes[current - 1].name);
		else
			$(this).html("<br>" + jpCodes[current - 1].name);
		
	});		
}
