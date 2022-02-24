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
	var test = parseInt("0");
	var spawn = data[test].full;
	for (var i = 0; i < spawn.length; i++) {
		container.innerHTML += spawn[i].heading;
	}
      
      
      
    }
	
	
}
