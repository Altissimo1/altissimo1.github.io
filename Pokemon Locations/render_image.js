var weather = "all-weather";
	
var time = "morning";
	
var ground = true;
var water = true;
var air = true;
var alpha = true;
var tree = false;
var ore = false;
	
var pokemon = "all";


updateImage();

		
function toggleWeatherVisibility(id) {
	weather = id;
	updateImage();
}

			
function toggleTimeVisibility(id) {
	time = id;
	updateImage();
}

			
function toggleFilterVisibility(id) {
	var filter = document.getElementById(id);
		switch (id) {
			case "filter-ground":
				ground = filter.checked;
				break;
			case "filter-air":
				air = filter.checked;
				break;
			case "filter-alpha":
				alpha = filter.checked
				break;
			case "filter-water":
				water = filter.checked;
				break;
			case "filter-tree":
				tree = filter.checked;
				break;
			case "filter-ore":
				ore = filter.checked;
				break;
		}	
	updateImage();
}

			
function togglePokemonVisibility(id) {
	pokemon = id;
	updateImage();
}
	
	
function updateImage() {
	
	var allw = false;
	if (weather=="all-weather") {
		allw = true;
	}
				
	var allp = false;
	if (pokemon=="all") {
		allp = true;
	}
				
	var pokearray = document.getElementsByClassName("pokemon");
	Array.from(pokearray).forEach((poke) => {
		poke.classList.remove("show");
		poke.classList.add("hide");
		
		if (
			(allw || (!allw && poke.classList.contains(weather)))
			
			&&
			
			
		
			(poke.classList.contains("all-time") || (poke.classList.contains("all-day") && (time=="morning" ||time=="day" || time=="evening")) ||
				(poke.classList.contains(time)))
			
			&&
		
			((ground && poke.classList.contains("ground")) || (water && poke.classList.contains("water")) ||
				(air && poke.classList.contains("air")) || (alpha && poke.classList.contains("alpha")) ||
				(tree && poke.classList.contains("tree")) || (ore && poke.classList.contains("ore")))
				
			&&
		
			(allp || (!allp &&  poke.classList.contains(pokemon)))
		
		)
		{
			poke.classList.remove("hide");
			poke.classList.add("show");
		
			
		}
	});
}