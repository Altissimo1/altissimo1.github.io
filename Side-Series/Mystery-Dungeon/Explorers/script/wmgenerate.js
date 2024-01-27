/*jslint browser: true, devel: true */

/*
	The Wonder Mail S Generator backend code

	This file is placed in the public domain and may be freely used, reproduced, modified, sold or whatever you want.
	However, it may or may not work; use at your own risk.
*/

// Data for the Wonder Mail S generator.
WMSGenData = {
	// Mission type format:
	//
	// name: name of type
	// mainType: struct.mainType field
	// specialType: struct.missionSpecial field
	// clientIsTarget: boolean that sets the target to the client
	// useTargetItem: boolean that enables the targetItem box if set and true; will be disabled if not set or false
	// useTarget2: boolean that enables the secondary target box if set and true; will be disabled if not set or false
	// forceClient: if set and non-zero, sets the client to this number and disables the client box
	// forceTarget: if set and non-zero, sets the target to this number and disables the target box
	// specialFloor: special floor to include in code
	// specialFloorFromList: take a random entry from the named staticList
	// noReward: disable reward boxes
	//
	// Every mission type can have a "subTypes" array which overrides all settings for the parent.
	missionTypes: [
		{name: "Rescue client", mainType: 0, specialType: 0, clientIsTarget: true},
		{name: "Rescue target", mainType: 1, specialType: 0},
		{name: "Escort to target", mainType: 2, specialType: 0},

		{name: "Explore with client", mainType: 3, clientIsTarget: true, subTypes: [
			{name: "Normal", specialType: 0},
			{name: "Sealed Chamber", specialType: 1, specialFloor: 165},
			{name: "Golden Chamber", specialType: 2, specialFloor: 111},
			{name: "New Dungeon (broken?)", specialType: 3}
		]},

		{name: "Prospect with client", mainType: 4, specialType: 0, useTargetItem: true, clientIsTarget: true},
		{name: "Guide client", mainType: 5, specialType: 0, clientIsTarget: true},
		{name: "Find target item", mainType: 6, specialType: 0, useTargetItem: true, clientIsTarget: true},
		{name: "Deliver target item", mainType: 7, specialType: 0, useTargetItem: true, clientIsTarget: true},
		{name: "Search for client", mainType: 8, specialType: 0},

		{name: "Steal from target", mainType: 9, useTargetItem: true, subTypes: [
			{name: "Normal", specialType: 0},
			{name: "Target hidden", specialType: 1},
			{name: "Target runs", specialType: 2}
		]},

		{name: "Arrest client (Magnemite)", advancedOnly: true, mainType: 10, forceClient: 81, subTypes: [
			{name: "Normal", specialType: 0},
			{name: "Escort", specialType: 4},
			{name: "Special Floor (broken)", specialType: 6, useTarget2: true, specialFloorFromList: "thievesden"},
			{name: "Monster House", specialType: 7}
		]},

		// This is the same list as above, just with Magnezone.
		{name: "Arrest client (Magnezone)", advancedOnly: true, mainType: 10, forceClient: 504, subTypes: [
			{name: "Normal", specialType: 0},
			{name: "Escort", specialType: 4},
			{name: "Special Floor (broken)", specialType: 6, useTarget2: true, specialFloorFromList: "thievesden"},
			{name: "Monster House", specialType: 7}
		]},

		{name: "Challenge Request", mainType: 11, subTypes: [
			{name: "Normal (broken)", specialType: 0, useTarget2: true, specialFloorFromList: "challengerequest"},
			{name: "Mewtwo", specialType: 1, forceClient: 150, forceTarget: 150, specialFloor: 145},
			{name: "Entei", specialType: 2, forceClient: 271, forceTarget: 271, specialFloor: 146},
			{name: "Raikou", specialType: 3, forceClient: 270, forceTarget: 270, specialFloor: 147},
			{name: "Suicine", specialType: 4, forceClient: 272, forceTarget: 272, specialFloor: 148},
			{name: "Jirachi", specialType: 5, forceClient: 417, forceTarget: 417, specialFloor: 149}
		]},

		// You can use any client/target but the game prefers them to be the same.
		{name: "Treasure hunt", mainType: 12, specialType: 0, forceClient: 422, forceTarget: 422, specialFloorFromList: "treasurehunt", noReward: true}

		// Let's just use game-generated codes, these are all weird and pointless to generate and stuff.
		//{name: "Unlock seven treasures dungeon (broken)", mainType: 13, specialType: 0}
	],

	validDungeons: [
		0x01, 0x03, 0x04, 0x06, 0x07, 0x08, 0x0A, 0x0C, 0x0E, 0x11, 0x14, 0x15, 0x18,
		0x19, 0x22, 0x23, 0x2C, 0x2E, 0x2F, 0x32, 0x33, 0x3E, 0x40, 0x43, 0x46, 0x48,
		0x49, 0x4B, 0x4D, 0x4F, 0x51, 0x53, 0x55, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C,
		0x5D, 0x5E, 0x5F, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x6B, 0x6C,
		0x6D, 0x6E
	],

	validClients: [
		// Game extracted data
		1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19,
		20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 32, 33, 34, 35, 36, 37,
		38, 39, 41, 42, 43, 44, 45, 46, 48, 49, 52, 53, 54, 55, 56, 57,
		58, 59, 60, 61, 62, 64, 65, 66, 68, 69, 70, 72, 73, 74, 75, 76,
		77, 78, 79, 80, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94,
		95, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
		112, 114, 115, 116, 117, 118, 119, 120, 121, 123, 124, 125, 126, 127, 128, 129,
		132, 133, 134, 135, 136, 138, 139, 140, 141, 142, 143, 147, 148, 149, 152, 153,
		154, 155, 156, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170,
		171, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 184, 185, 186, 187, 188,
		189, 190, 193, 194, 195, 196, 198, 199, 200, 230, 231, 232, 233, 234, 235, 236,
		237, 238, 240, 245, 246, 247, 248, 249, 250, 252, 253, 254, 255, 256, 257, 258,
		259, 261, 262, 263, 265, 266, 267, 268, 269, 273, 274, 275, 283, 284, 287, 288,
		289, 290, 292, 293, 295, 297, 298, 299, 300, 301, 302, 303, 305, 306, 307, 308,
		309, 311, 312, 313, 315, 316, 317, 318, 319, 320, 321, 323, 327, 328, 332, 333,
		334, 335, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 350, 351,
		352, 353, 354, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368,
		370, 371, 372, 373, 374, 375, 377, 385, 386, 387, 388, 389, 391, 393, 394, 395,
		396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 422, 423, 424,
		426, 427, 428, 429, 430, 431, 432, 433, 435, 436, 437, 439, 441, 443, 444, 445,
		446, 447, 448, 450, 451, 452, 453, 454, 455, 457, 458, 459, 460, 462, 463, 464,
		465, 466, 467, 468, 469, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481,
		482, 484, 485, 486, 487, 488, 489, 491, 492, 493, 494, 496, 497, 498, 499, 500,
		501, 502, 503, 505, 507, 508, 509, 511, 512, 513, 514, 515, 518, 521
	],

	// Items that are not valid for use as target item (should be whitelist?)
	badTargetItems: [0, 1, 2, 3, 4, 9],

	// http://bulbapedia.bulbagarden.net/wiki/Category:Male-only_Pok%C3%A9mon
	maleOnly: [0x205, 0x6A, 0x6B, 0x108, 0x19D, 0x1C5, 0x22, 0x21, 0x80, 0x107, 0x155],
	// http://bulbapedia.bulbagarden.net/wiki/Category:Female-only_Pok%C3%A9mon
	femaleOnly: [
		0x10D, 0x71, 0x212, 0x208, 0x1E2, 0x156, 0x7C, 0x73, 0x19C, 0x10C, 0x01F,
		0x01E, 0x109, 0x1C7, 0x1C2, 0x1C3, 0x1C4
	],

	// Very special case... only Female is included in the list now.
	NIDORAN_FEMALE: 0x18,
	NIDORAN_MALE: 0x20,

	staticLists: {
		// Valid floors for treasure hunts.
		treasurehunt: [
			114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129,
			130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144
		],

		// Valid floors for challenge requests.
		// This is from memory, it might be wrong.
		challengerequest: [
			145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160
		],

		// Valid floors for Thieves Den missions.
		// This is from memory, it might be wrong.
		thievesden: [
			161, 162, 163, 164, 165
		]
	}

	// TODO: list of dungeon floor count
};

/**
 * Main WMS gen code class.
 */
WMSGen = {
	// The DOM form we're using
	"form": 0,

	// Last selected mission type (for fillSubTypeList)
	"lastMissionType": 0,

	// Enable advanced mode
	"advanced": false,

	/**
	 * Handle initial page setup.
	 */
	"setup": function(form) {
		this.form = form;

		// Advanced mode is enabled if we have ?advanced in the URL params.
		if(this.advanced) {
			$('advancedOff').style.display = 'none';
			$('advancedMode').style.display = 'block';
			$('advancedModeOnlyStuff').style.display = 'block';
		}

		this.fillDungeonList();
		this.fillTypeList();
		this.fillSubTypeList();

		this.fillItemLists();
		this.fillMonsterLists();

		this.update();
	},

	/**
	 * Fills the dungeon list from sky_dungeon.js.
	 */
	"fillDungeonList": function() {
		var box = this.form.dungeonBox;
		box.style.display = 'none';

		var dungeons = WMSkyDungeon;
		if(this.advanced) {
			for(var key in dungeons) {
				if(dungeons.hasOwnProperty(key)) {
					addOptionToSelect(box, key, dungeons[key]);
				}
			}
		}
		else {
			for(var i = 0; i < WMSGenData.validDungeons.length; ++i) {
				var key = WMSGenData.validDungeons[i];
				addOptionToSelect(box, key, dungeons[key]);
			}
		}

		box.style.display = 'inline';
		add_filter(box);
	},

	/**
	 * Returns the true monster ID for a given ID based on if the female box is checked.
	 *
	 * Both male-only and female-only mons are in the male range and do not allow females.
	 * Otherwise, females are simply +600 from the male one.
	 */
	"getTrueMonID": function(id, femaleChecked) {
		// First, make the id male to start with.
		id = id % 600;

		// Second, the special case. Nidoran doesn't follow the standard +600 convention.
		if(id == WMSGenData.NIDORAN_MALE || id == WMSGenData.NIDORAN_FEMALE) {
			if(femaleChecked) {
				return WMSGenData.NIDORAN_FEMALE;
			}
			else {
				return WMSGenData.NIDORAN_MALE;
			}
		}

		// Third, the actual check.
		var maleOnly = (WMSGenData.maleOnly.indexOf(id) != -1);
		var femaleOnly = (WMSGenData.femaleOnly.indexOf(id) != -1);

		if((maleOnly || femaleOnly) && femaleChecked) {
			//console.info("Prevented %d from being marked as female.", id);
			return id;
		}
		else if(femaleChecked) {
			return id + 600;
		}
		else {
			return id;
		}
	},

	/**
	 * Fills various item lists from sky_item.js.
	 */
	"fillItemLists": function() {
		var box1 = this.form.targetItemBox, box2 = this.form.rewardItemBox;

		// Get Chrome to behave...
		box1.style.display = 'none';
		box2.style.display = 'none';
		var items = WMSkyItem;
		for(var key in items) {
			// For if we use something that extends Object.prototype...
			if(items.hasOwnProperty(key)) {
				addOptionToSelect(box1, key, items[key]);
				addOptionToSelect(box2, key, items[key]);
			}
		}
		box1.style.display = 'inline';
		box2.style.display = 'inline';

		add_filter(box1);
		add_filter(box2);
	},

	/**
	 * Fills various monster lists from sky_poke.js.
	 */
	"fillMonsterLists": function() {
		var box1 = this.form.clientBox, box2 = this.form.targetBox, box3 = this.form.target2Box;

		// Get Chrome to behave...
		// box3 is hidden by default.
		box1.style.display = 'none';
		box2.style.display = 'none';
		var poke = WMSkyPoke;
		if(this.advanced) {
			for(var key in poke) {
				if(poke.hasOwnProperty(key)) {
					addOptionToSelect(box1, key, poke[key]);
					addOptionToSelect(box2, key, poke[key]);
					addOptionToSelect(box3, key, poke[key]);
				}
			}
		}
		else {
			for(var i = 0; i < WMSGenData.validClients.length; ++i) {
				var monsterNum = WMSGenData.validClients[i];
				addOptionToSelect(box1, monsterNum, poke[monsterNum]);
				addOptionToSelect(box2, monsterNum, poke[monsterNum]);
				addOptionToSelect(box3, monsterNum, poke[monsterNum]);
			}
		}
		box1.style.display = 'inline';
		box2.style.display = 'inline';


		add_filter(box1, "Filter...", box1.parentElement);
		add_filter(box2, "Filter...", box2.parentElement);
		add_filter(box3, "Filter...", box3.parentElement);
	},

	/**
	 * Fills the missionType list.
	 */
	"fillTypeList": function() {
		// Get the box.
		var box = this.form.missionTypeBox;
		box.style.display = 'none';

		// Add types!
		var types = WMSGenData.missionTypes;
		for(var i = 0; i < types.length; ++i) {
			if(!types[i].advancedOnly || this.advanced) {
				addOptionToSelect(box, i, types[i].name);
			}
		}

		box.style.display = 'inline';
	},

	/**
	 * Fills the mission subType list based on the currently selected mission. Called multiple times.
	 * Also sets the display property on subType and other things.
	 */
	"fillSubTypeList": function() {
		// Get the currently selected type.
		var typeBox = this.form.missionTypeBox;
		var typeNum = 0;
		if(typeBox.options[typeBox.selectedIndex]) {
			typeNum = parseInt(typeBox.options[typeBox.selectedIndex].value, 10);
		}

		// Make sure that we don't reset the subtype box if the browser annoys us by sending the change multiple times.
		if(typeNum == this.lastMissionType) {
			return;
		}
		this.lastMissionType = typeNum;

		// Get the type data
		var typeData = WMSGenData.missionTypes[typeNum];
		if(typeData && typeData.subTypes) {
			// Empty the subTypeBox (called box from now on).
			var box = this.form.missionSubTypeBox;
			while(box.options.length) {
				box.remove(0);
			}

			// Add subTypes for the mission to the select box, unless they are advancedOnly.
			for(var i = 0; i < typeData.subTypes.length; ++i) {
				var subData = typeData.subTypes[i];
				if(!subData.advancedOnly) {
					addOptionToSelect(box, i, subData.name);
				}
			}
			$('subType').style.display = "inline";
		}
		else {
			$('subType').style.display = "none";
		}
	},

	/**
	 * Returns the value of the currently selected option in a given <select> box (combobox).
	 * @param DOMSelect|String Combobox or string with name for one
	 * @return String|boolean Value or boolean false
	 */
	"getComboBoxValue": function(box) {
		if(typeof box == "string") {
			box = this.form[box];
		}

		if(box && box.options[box.selectedIndex]) {
			return box.options[box.selectedIndex].value;
		}
		else {
			return false;
		}
	},

	/**
	 * Verifies if the input is valid.
	 * @param DOMForm Form to check
	 * @return array Array containing strings of error messages; empty = all good
	 */
	"verify": function() {
		var errors = [];

		var typeData = this.getTypeData();

		// If we don't use a forced client and have validClients, check them.
		if(!typeData.hasOwnProperty("forceClient")) {
			if(typeData.hasOwnProperty("validClients")) {
				var client = parseInt(this.form.clientBox, 10);
				var checkPassed = false;
				for(var i = 0; i < typeData.validClients.length; ++i) {
					if(client == typeData.validClients[i]) {
						checkPassed = true;
					}
				}

				// Build the error.
				if(!checkPassed) {
					var error = "Invalid client selected. You must use one of: ";
					for(var i = 0; i < typeData.validClients.length; ++i) {
						error += (i !== 0 ? ", " : "") + getMonName(typeData.validClients[i]);
					}
					errors[errors.length] = error;
				}
			}
		}

		// Check if we have a valid reward item (if we get a reward item).
		var rewardType = parseInt(this.getComboBoxValue("rewardTypeBox"), 10);
		if(!typeData.noReward && rewardType >= 1 && rewardType <= 4) {
			var rewardItem = parseInt(this.getComboBoxValue("rewardItemBox", 10));
			if(rewardItem == 0) {
				errors[errors.length] = "You must select a reward item!";
			}
		}

		// Check if we have a valid target item.
		if(typeData.useTargetItem) {
			var targetItem = parseInt(this.getComboBoxValue("targetItemBox", 10));
			for(var i = 0; i < WMSGenData.badTargetItems.length; ++i) {
				if(WMSGenData.badTargetItems[i] == targetItem) {
					errors[errors.length] = "The target item you selected is invalid (stackables are not allowed).";
				}
			}
		}

		return errors;
	},

	/**
	 * Returns typeData for the currently selected missionType/subType. typeData is an object with the following keys:
	 * @return object typeData
	 */
	"getTypeData": function() {
		// Mission type
		var typeNum = parseInt(this.getComboBoxValue("missionTypeBox"), 10);
		var typeData = WMSGenData.missionTypes[typeNum];
		if(!typeData) {
			return false;
		}

		// See if this mission has a subtype.
		if(typeData.subTypes) {
			// Get the currently selected subtype.
			var subTypeNum = parseInt(this.getComboBoxValue("missionSubTypeBox"), 10);
			var subTypeData = typeData.subTypes[subTypeNum];
			if(subTypeData) {
				// Create a soft copy of typeData. This allows us to copy subTypeData over typeData without screwing
				// things up in the future. This is generally a good thing.
				var tmp = {};
				var key;
				for(key in typeData) {
					if(typeData.hasOwnProperty(key)) {
						tmp[key] = typeData[key];
					}
				}
				typeData = tmp;

				// Copy subTypeData to typeData.
				for(key in subTypeData) {
					if(subTypeData.hasOwnProperty(key)) {
						typeData[key] = subTypeData[key];
					}
				}
			}
		}

		return typeData;
	},

	/**
	 * Shows or hides things when various items in the form are changed.
	 * @return void
	 */
	"update": function() {
		var typeData = this.getTypeData();

		// Crappy browser syndrome...
		if(!typeData) {
			return;
		}

		this.form.target2Box.disabled = !typeData.useTarget2;
		// HACK: show target2 container by id.
		$('target2').style.display = (typeData.useTarget2 ? 'block' : 'none');

		this.form.targetItemBox.disabled = !typeData.useTargetItem;
		this.form.targetItemBoxFilter.disabled = this.form.targetItemBox.disabled;

		var rewardType = parseInt(this.getComboBoxValue("rewardTypeBox"), 10);
		this.form.rewardTypeBox.disabled = typeData.noReward;
		this.form.rewardItemBox.disabled = typeData.noReward || (rewardType < 1 || rewardType > 4);
		this.form.rewardItemBoxFilter.disabled = this.form.rewardItemBox.disabled;

		this.form.clientBox.disabled = typeData.hasOwnProperty("forceClient");
		this.form.clientF.disabled = this.form.clientBox.disabled;
		this.form.clientBoxFilter.disabled = this.form.clientBox.disabled;

		this.form.targetBox.disabled = typeData.hasOwnProperty("forceTarget");
		this.form.targetF.disabled = this.form.targetBox.disabled;
		this.form.targetBoxFilter.disabled = this.form.targetBox.disabled;

		if(typeData.clientIsTarget) {
			this.form.targetBox.disabled = true;
			this.form.targetF.disabled = true;
			this.form.targetBoxFilter.disabled = true;
		}
	},

	/**
	 * Generates a code and returns it.
	 * @return String|boolean Prettified code or boolean false
	 */
	"generate": function() {
		// Get typeData.
		var typeData = this.getTypeData();

		// Build the base struct.
		var struct = {};

		struct.missionType = typeData.mainType;
		struct.missionSpecial = typeData.specialType;

		struct.nullBits = 0;
		struct.mailType = 4;
		struct.restriction = 0;
		struct.restrictionType = 0;
		struct.rewardType = parseInt(this.getComboBoxValue("rewardTypeBox"), 10);

		// Client
		if(typeData.hasOwnProperty("forceClient")) {
			struct.client = typeData.forceClient;
		}
		else {
			var client = parseInt(this.getComboBoxValue("clientBox"), 10);
			struct.client = this.getTrueMonID(client, this.form.clientF.checked);
		}

		// Target
		if(typeData.hasOwnProperty("forceTarget")) {
			struct.target = typeData.forceTarget;
		}
		else if(typeData.clientIsTarget) {
			struct.target = struct.client;
		}
		else {
			var client = parseInt(this.getComboBoxValue("targetBox"), 10);
			struct.target = this.getTrueMonID(client, this.form.targetF.checked);
		}

		// Target 2
		if(typeData.useTarget2) {
			// See if this works better.
			struct.target2 = struct.target;
		}
		else {
			// Defaults to zero, let's keep it that way.
			struct.target2 = 0;
		}

		// Reward - based on reward type
		if(typeData.noReward) {
			// If we don't use a reward for this mission type, set it to Cash + Apple.
			struct.rewardType = 1;
			struct.reward = 109;
		}
		else if(struct.rewardType >= 1 && struct.rewardType <= 4) {
			struct.reward = parseInt(this.getComboBoxValue("rewardItemBox"), 10);
		}
		else if(struct.rewardType == 5 || struct.rewardType == 6) {
			struct.reward = struct.client;
		}
		else {
			// The game seems to complain about not having a reward, so here's an Apple for you.
			struct.reward = 109;
		}

		// Target item - based on mission type
		if(typeData.useTargetItem) {
			struct.targetItem = parseInt(this.getComboBoxValue("targetItemBox"), 10);
		}
		else {
			// The game also seems to complain about not having a targetItem, so here's an Apple for you.
			struct.targetItem = 109;
		}

		// Dungeon/floor
		var dungeon = parseInt(this.getComboBoxValue("dungeonBox"), 10);
		struct.dungeon = dungeon || 1;
		var floor = parseInt(this.form.floor.value, 10);
		struct.floor = (floor >= 1 && floor <= 99) ? floor : 1;

		// Special floor
		if(this.form.specialFloor.value != "") {
			struct.specialFloor = parseInt(this.form.specialFloor.value, 10);
		}
		else if(typeData.hasOwnProperty("specialFloor")) {
			struct.specialFloor = typeData.specialFloor;
		}
		else if(typeData.hasOwnProperty("specialFloorFromList")) {
			// Check for list existance.
			var listName = typeData.specialFloorFromList;
			var list = WMSGenData.staticLists[listName];
			if(!list) {
				console.error("Static list %s not found.", listName);
			}
			var entry = Math.floor(Math.random() * (list.length - 1));
			//console.info("Picked specialFloor entry %d, value: %d", entry, list[entry]);
			struct.specialFloor = list[entry];
		}
		else {
			struct.specialFloor = 0;
		}

		var decBitStream;

		// Do we have a flavor text override?
		if(/*this.form.flavorText.value != ""*/ false) {
			// Use it.
			struct.flavorText = parseInt(this.form.flavorText.value, 10);
			decBitStream = WMSParser.structureToBits(struct);
		}
		else {
			// If advanced mode is on, don't add a random number (produce predictable codes).
			// Otherwise, pick a random number in between 300000-400000; this value isn't special in any way.
			//struct.flavorText = 300000 + (this.advanced ? 0 : Math.floor(Math.random() * 100000));
			struct.flavorText = Number(iFlavorText) + Number(this.form.flavorText.value);
			//console.log(struct.flavorText);

			decBitStream = WMSParser.structureToBits(struct);
			var checksum = bitsToNum(decBitStream.substr(138));
			var resetByte = WMSParser.getResetByte(checksum);
			//console.info("flavorText %d, checksum %d, reset %d", struct.flavorText, checksum, resetByte);
		}

		// Encrypt the code.
		var encBitStream = WMSParser.encryptBitStream(decBitStream);

		// Bitpack it.
		var bitpacked = WMSParser.bitsToBytes(encBitStream);

		// Scramble it.
		switch(document.getElementById("genRegion").value) {
			case "us":
				var byteSwap = WMSParser.byteSwap;
				break;
			case "eu":
				var byteSwap = WMSParser.byteSwapEU;
				break;
			case "jp":
				var byteSwap = WMSParser.byteSwapJP;
				break;
			default:
				var byteSwap = WMSParser.byteSwap;
		}
		var scrambled = WMSParser.scrambleString(bitpacked, byteSwap);

		// Prettify it.
		var prettified = prettyMailString(scrambled, 2, 7);

		//console.info("enc: %o, packed: %o, scrambled: %o, prettified: %o", encBitStream, bitpacked, scrambled, prettified);

		return prettified;
	},

	/**
	 * Notifies the user of an error.
	 * @param String The error
	 * @FIXME Needs rewrite and a lot of things really
	 */
	"setError": function(text) {
		$('outputbox').innerHTML = text;
	}
};

/**
 * Adds an option to a select box.
 * This function is implemented in this way because IE doesn't accept "null" as a param to box.add().
 * @param DOMSelect Box to add stuff into
 * @param String Value of this option
 * @param String Text to add
 */
addOptionToSelect = function() {
	// This hack is required for Closure Compiler.
	// See http://code.google.com/closure/compiler/docs/limitations.html
	var isMSIE = eval("/*@cc_on 1 + @*/0");
	if(isMSIE) {
		return function(box, value, text) {
			var element = document.createElement('option');
			element.value = value.toString();
			element.text = text;

			box.add(element);
		};
	}
	else {
		return function(box, value, text) {
			var element = document.createElement('option');
			element.value = value.toString();
			element.text = text;

			box.add(element, null);
		};
	}
}();
