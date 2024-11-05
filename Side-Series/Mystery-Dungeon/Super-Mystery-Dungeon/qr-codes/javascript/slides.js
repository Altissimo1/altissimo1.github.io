var usCodes = [];
var jpCodes = [];
var euCodes = [];

// Handles setting up item names and regions.
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

$(function() {
	
	// Setup.
	
	// Change the border color on the divs depending on dark mode.
	
	setBorderColor();
	
	$("#dark-mode").click(function() {
		if ($(this).is(":checked")) {
			$.each($(".border"), function() {
				$(this).css({"border-width": "1px", "border-style": "solid", "border-color": "#32383e"});
			});
		}
		else {
			$.each($(".border"), function() {
				$(this).css({"border-width": "1px", "border-style": "solid", "border-color": "black"});
			});
		}			
	});
	
	// Set keyup event to move back and forth on the QR codes if enter or backspace is pressed.
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
	
	// Get JSON and push data to the variables.
	$.getJSON("json/codes.json", function(data) {
		$.each(data, function() {
			if (this.region == "US")
				usCodes.push(this);
			else if (this.region == "EU")
				euCodes.push(this);
			else
				jpCodes.push(this);
		});
	});	
	
	// Set change event to add and remove checkbox items.
	$(".checkbox").change(function() {
		addRemoveItem(this);
	});
	
	// Set change event on the "select all" checkboxes to select child checkboxes.
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
	
	// Generate a slide of selected QR codes when generate button is clicked.
	$("#generate").click(function() {
		// Get the selected region.
		var currentRegion = "";
		$('input[name="regions"]').each(function() {
			if ($(this).is(":checked"))
				currentRegion = $(this).attr("id");
		});
		
		var innerText = "";
		
		var display = true;
		if ($("#textlist span").length > 0) {
		
			// For each selected item, create an image for it.
			$("#textlist span").each(function() {
				if (!display)
					innerText += "<div style='margin:auto;width:50%;display:none;'>";
				else {
					innerText += "<div style='margin:auto;width:50%;'>";
					display = false;
				}
				// Create a label for the image.
				innerText += "<span><strong>" + this.textContent + "</strong></span><br>";
				// Get the JSON object associated with the ID of the item.
				var jsonObject;
				if (currentRegion == "us")
					jsonObject = usCodes[parseInt($(this).attr("name")) - 1];
				else if (currentRegion == "eu")
					jsonObject = euCodes[parseInt($(this).attr("name")) - 1];
				else
					jsonObject = jpCodes[parseInt($(this).attr("name")) - 1];
				// Add the object's image data to an image tag
				innerText += '<img src="' + jsonObject.src + '" alt="' + jsonObject.alt + '"></div>';
			});
			// Add the slideshow to the images div
			$(".images").html(innerText);
			$(".generated").show();
			$(this).blur();
			// Set the numbers for displaying x of y
			$("#current").text("1");
			$("#total").text($(".images div").length);			
		}		
	});
	
	// Clears all selected items and resets the page.
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
	
	// Goes to the next item when next button is clicked.
	$("#next").click(function() {
		goToNext(false);
		$(this).blur();
	});
	
	// Goes to the previous item when previous button is clicked.
	$("#previous").click(function() {
		goToPrevious(false);
		$(this).blur();
	});
	
	// Exports a JSON file of selected objects when export is clicked.
	$("#export").click(function() {
		// Get the selected region.
		var region = "";
		$(".regionButton").each(function() {
			if ($(this).is(":checked"))
				region = this.id;
		});
		
		// Create a new object with region and buttons.
		var myData = {
			Region: region,
			AllButtons: [],
			Buttons: [],
		}
		
		// Add "check all" buttons to the object.
		$(".allcheck").each(function() {
			var thisButton = {
				Name: this.id,
				Selected: $(this).is(":checked")
			}
			myData.AllButtons.push(thisButton);
		});
		
		// Add regular checkboxes to the object.
		$(".checkbox").each(function() {
			var thisButton = {
				Name: this.id,
				Selected: $(this).is(":checked")
			}
			myData.Buttons.push(thisButton);
		});
		
		// Download the created JSON.
		$("<a />", {
			"download": "codes.json",
			"href": "data:application/json," + encodeURIComponent(JSON.stringify(myData))
		}).appendTo("body")
		.click(function() {
			$(this).remove()
		})[0].click()
	});
	
	// Upload a file if one is selected with the Browse option.
	$("#submit").click(function(e) {
		let formData = new FormData();
		formData.append("file", fileupload.files[0]);
	});
	
	// When the import button is clicked, get the file contents and initialize the page with them.
	$("#upload-button").click(function(e) {
		if (fileupload.files.length > 0)
		{
			var file = fileupload.files[0];
			var path = (window.URL || window.webkitURL).createObjectURL(file);
			readTextFile(path, function(text) {
				initializePage(JSON.parse(text));
			});
		}
	});
	
	// Functions.
	
	// Adds or removes items to/from the list of items when they are selected.
	function addRemoveItem(checkItem) {
		if (checkItem.checked && $("span[name='" + checkItem.id + "']").length == 0) {
			var textDisplay = "<span name='" + checkItem.id + "'><br>" + checkItem.value + "</span>";
			$("#textlist").html($("#textlist").html() + textDisplay);
		}
		else if (!checkItem.checked) {
			$("span[name='" + checkItem.id + "']").remove();
		}
	}	
	
	// Uploads a provided JSON file.
	async function uploadFile() {
		let formData = newFormData();
		formData.append("file", fileupload.files[0]);
	}	
	
	// Reads an uploaded JSON file.
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

	// Initializes the page with imported JSON data.
	function initializePage(importData) {
		// Set the selected region.
		$(".regionButton").each(function() {
			if (this.id == importData.Region) {
				$(this).prop("checked", true);
				regionButton.call(this);
			}
			else
				$(this).prop("checked", false);
		});
		
		// Set "Check All" buttons if needed and trigger the change event.
		$.each(importData.AllButtons, function() {
			$("#" + this.Name).prop("checked", this.Selected);
			$("#" + this.Name).trigger("change");
		});
		
		// Set regular checkboxes and trigger the change event.
		$.each(importData.Buttons, function() {
			$("#" + this.Name).prop("checked", this.Selected);
			$("#" + this.Name).trigger("change");
		});
	}	
	
	// Disables the next or previous button for a brief period to help avoid the user making multiple quick clicks accidentally.
	function disableButton(button) {
		$(button).prop("disabled", true);
		setTimeout(function() {
			$(button).prop("disabled", false);
		}, 1000);
	}
	
	// Goes to the next image in the slide.
	function goToNext(stop) {
		if (stop)
			disableButton($("#next"));
		var display = false;
		// Updates the slide if the user is not currently looking at the last item in the slide.
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
		//Loops the user around to the first item if they click "next" on the last one.
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
	
	// Goes to the previous image in the slide.
	function goToPrevious(stop) {
		if (stop)
			disableButton($("#previous"));
		var length = $(".images div").length;
		for (var i = 0; i < length; i++) {
			if ($($(".images div")[i]).is(":visible"))  {
				if (i == 0) {
					$($(".images div")[length - 1]).show();
					$("#current").text(length);
				}
				else {
					$($(".images div")[i - 1]).show();
					$("#current").text(parseInt($("#current").text()) - 1);
				}
				$($(".images div")[i]).hide();
				break;
			}
		}
	}
});

function setBorderColor()  {
	if ($("#dark-mode").is(":checked")) {
		$.each($(".border"), function() {
			$(this).css({"border-width": "1px", "border-style": "solid", "border-color": "#32383e"});
		});
	}
	else {
		$.each($(".border"), function() {
			$(this).css({"border-width": "1px", "border-style": "solid", "border-color": "black"});
		});
	}
}