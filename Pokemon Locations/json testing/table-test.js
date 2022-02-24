updateImage();

function updateImage() {
	
	fetch('table-test.json')
		.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			appendIcons(data);
		})
		.catch(function (err) {
			console.log('error: ' + err);
		});
		
		function appendIcons(data) {
      var container = document.getElementById("table-displays");
      for (var i = 0; i < data.length; i++) {
        var full = data[i].full;
        for (var j = 0; j < full.length; j++) {
          container.innerText += full[j].heading;
        }
      }
      
      
      
    }
	
	
}
