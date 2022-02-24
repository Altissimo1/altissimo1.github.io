fetch('weather.json')
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        appendWeather(data);
    })
    .catch(function (err) {
        console.log('error: ' + err);
    });
		
function appendWeather(data) {
	var mainContainer = document.getElementById("weather-select");
	mainContainer.innerHTML = "<h2>Select a weather condition:</h2>";
	var weatherDiv = document.createElement("div");
	weatherDiv.id = "weather-div";
	
	for (var i = 0; i < data.length; i++) {
		
		var label = document.createElement("label");
		label.value = data[i].value;
		label.textContent = data[i].name + " ";
		
		var input = document.createElement("input");
		input.checked = data[i].check;
		input.type= "radio";
		input.name = "weather";
		input.id = data[i].id;
		input.value = data[i].value;
		input.setAttribute("onclick", "toggleWeatherVisibility(this.value)");
		
		if (i != 0) {
			var image = document.createElement("img");
			image.src= data[i].image;
			image.alt = data[i].name;
			image.className = "weather-icons";
			label.appendChild(image);
		}
		
		label.appendChild(input);
		weatherDiv.appendChild(label);
		weatherDiv.appendChild(document.createElement("br"));
		mainContainer.appendChild(weatherDiv);
			
	}
}
		
		
fetch('time.json')
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
		appendTime(data);
    })
    .catch(function (err) {
        console.log('error: ' + err);
    });
		
function appendTime(data) {
	var mainContainer = document.getElementById("time-select");
	mainContainer.innerHTML = "<h2>Select a time of day:</h2>";
	for (var i = 0; i < data.length; i++) {
		var label = document.createElement("label");
		label.value = data[i].value;
		label.textContent = data[i].name;
		
		var input = document.createElement("input");
		input.checked = data[i].check;
		input.type= "radio";
		input.name = "time";
		input.id = data[i].id;
		input.value = data[i].value;
		input.setAttribute("onclick", "toggleTimeVisibility(this.value)");
		
		label.appendChild(input);
		mainContainer.appendChild(label);
		mainContainer.appendChild(document.createElement("br"));
			
	}
}
		
fetch('filter.json')
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        appendFilter(data);
    })
    .catch(function (err) {
        console.log('error: ' + err);
    });
		
function appendFilter(data) {
	var mainContainer = document.getElementById("filter-select");
	mainContainer.innerHTML = "<h2>Select filters to apply:</h2>";
	
	for (var i = 0; i < data.length; i++) {
		var label = document.createElement("label");
		label.value = data[i].value;
		label.textContent = data[i].name;
		
		var input = document.createElement("input");
		input.checked = data[i].check;
		input.type= "checkbox";
		input.name = "filter";
		input.id = data[i].id;
		input.setAttribute("onclick", "toggleFilterVisibility(this.id)");
		label.appendChild(input);
		
		mainContainer.appendChild(label);
		
		if (i == 2) {
			mainContainer.appendChild(document.createElement("br"));
			mainContainer.appendChild(document.createElement("br"));
		}
			
	}
}
		
fetch('pokemon.json')
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        appendPokemon(data);
    })
    .catch(function (err) {
        console.log('error: ' + err);
    });
		
function appendPokemon(data) {
	var mainContainer = document.getElementById("pokemon-select");
	mainContainer.innerHTML = "<h2>Select a Pokémon to view only spawn points with that Pokémon:</h2>";
	
	var selectel = document.createElement("select");
	selectel.id = "pokemon-dropdown";
	selectel.setAttribute("onchange", "togglePokemonVisibility(this.value)");
	for (var i = 0; i < data.length; i++) {
		var optionel = document.createElement("option");
		optionel.value = data[i].id;
		optionel.textContent = data[i].name;
		selectel.appendChild(optionel);
	}
	mainContainer.appendChild(selectel);
}
