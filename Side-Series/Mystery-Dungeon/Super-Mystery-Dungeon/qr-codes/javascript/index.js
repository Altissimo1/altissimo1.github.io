// Shows/hides the regional container when a radio button is clicked.
var regionButton = function regionClick() {
	var region = ($(this).attr("id"));
	
	$(".container").each(function() {
		if ($(this).hasClass(region))
			$(this).show();
		else
			$(this).hide();
	});
}

$(function() {	
	// Setup.
	
	// Get JSON data and push data to the page.
	$.getJSON("json/codes.json", addImages);
	
	// Functions.
	
	function createImage(item) {
		var el = "<div class='img-div'>";
		el += "<h4>" + item.name + "</h4>";
		el += "<img src='" + item.src + "' alt='" + item.alt + "'>";
		el += "</div>";
		return el;
	}
	
	function addImages(data) {
		var usText = "";
		var euText = "";
		var jpText = "";
		$.each(data, function() {
			if (this.region == "US")
			{
				usText += createImage(this);				
			}
			else if (this.region == "EU")
			{
				euText += createImage(this);
			}
			else
			{
				jpText += createImage(this);
			}
		});
		
		$.each($(".container"), function() {
			if ($(this).hasClass("us"))
				$(this).html(usText);
			else if ($(this).hasClass("eu"))
				$(this).html(euText);
			else
				$(this).html(jpText);
		});
	}
	
});
