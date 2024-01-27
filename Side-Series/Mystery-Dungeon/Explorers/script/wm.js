/*jslint browser: true, devel: true */

/*
	The WMSParser object
	
	This file is placed in the public domain and may be freely used, reproduced, modified, sold or whatever you want.
	However, it may or may not work; use at your own risk.
*/

// Wonder Mail S Structure data
var WMSStruct = [
	{"name": "nullBits", "note": "Null bits", "size": 8},
	{"name": "specialFloor", "note": "Special floor marker", "size": 8},
	{"name": "floor", "note": "Floor", "size": 8},
	{"name": "dungeon", "note": "Dungeon", "size": 8},
	{"name": "flavorText", "note": "Modifies the flavor text", "size": 24},
	{"name": "restriction", "note": "Restriction data", "size": 11},
	{"name": "restrictionType", "note": "Restriction type; mon = 1, type = 0", "size": 1},
	{"name": "reward", "note": "Reward", "size": 11},
	{"name": "rewardType", "note": "Reward type", "size": 4},
	{"name": "targetItem", "note": "Target item", "size": 10},
	{"name": "target2", "note": "Additional target Poke for certain mission types", "size": 11},
	{"name": "target", "note": "Target Poke", "size": 11},
	{"name": "client", "note": "Client Poke", "size": 11},
	{"name": "missionSpecial", "note": "Mission special texts", "size": 4},
	{"name": "missionType", "note": "Mission type", "size": 4},
	{"name": "mailType", "note": "Mail type marker (must be 0100 = 4)", "size": 4},
	{"name": "checksum", "note": "checksum", "size": 32, "noinclude": true}
];

/* types of data we handle:
- scrambled wondermail (as given by game)
- unscrambled wondermail
- encrypted bitstring (final result data)
- decrypted bitstring (parseable data)
- raw bitstream (no leading bits, no checksum)
- wmstruct data parse
*/

var WMSParser = {
	// Byte-swap patterns
	// 07 1B 0D 1F 15 1A 06 01 17 1C 09 1E 0A 20 10 21 0F 08 1D 11 14 00 13 16 05 12 0E 04 03 18 02 0B 0C 19
	// http://www.gamefaqs.com/boards/detail.php?board=955859&topic=51920426&message=571612360
	"byteSwap": [
		0x07, 0x1B, 0x0D, 0x1F, 0x15, 0x1A, 0x06, 0x01,
		0x17, 0x1C, 0x09, 0x1E, 0x0A, 0x20, 0x10, 0x21,
		0x0F, 0x08, 0x1D, 0x11, 0x14, 0x00, 0x13, 0x16,
		0x05, 0x12, 0x0E, 0x04, 0x03, 0x18, 0x02, 0x0B,
		0x0C, 0x19
	],
	
	"byteSwapEU": [
		0x0E, 0x04, 0x03, 0x18, 0x09, 0x1E, 0x0A, 0x20,
		0x10, 0x21, 0x14, 0x00, 0x13, 0x16, 0x05, 0x12,
		0x06, 0x01, 0x17, 0x1C, 0x07, 0x1B, 0x0D, 0x1F,
		0x15, 0x1A, 0x02, 0x0B, 0x0C, 0x19, 0x0F, 0x08,
		0x1D, 0x11
	],

	"byteSwapJP": [
		0x14, 0x00, 0x13, 0x16, 0x05, 0x12, 0x02, 0x0B
		, 0x0C, 0x19, 0x21, 0x0F, 0x08, 0x1D, 0x11, 0x1A
		, 0x06, 0x01, 0x17, 0x1C, 0x07, 0x1B, 0x0D, 0x1F
		, 0x15, 0x09, 0x1E, 0x0A, 0x20, 0x10, 0x0E, 0x04
		, 0x03, 0x18
	],
	
	// Each WM byte maps to these bit values
	// http://www.gamefaqs.com/boards/genmessage.php?board=938931&topic=42726909&page=9
	// http://www.gamefaqs.com/boards/genmessage.php?board=938931&topic=42949038
	bitValues: "&67NPR89F0+#STXY45MCHJ-K12=%3Q@W",
	
	// Encryption data from:
	// http://docs.google.com/Doc?id=ddpvsk95_17fr7qpmgc
	"encryptionData": [
		// Listed vertical: first part of the 2-character hex code range
		// Listed horizontal: second part of the 2-character hex code
		// 0     1     2     3     4     5     6     7     8     9     A     B     C     D     E     F
		0x2E, 0x75, 0x3F, 0x99, 0x09, 0x6C, 0xBC, 0x61, 0x7C, 0x2A, 0x96, 0x4A, 0xF4, 0x6D, 0x29, 0xFA, // 00-0F
		0x90, 0x14, 0x9D, 0x33, 0x6F, 0xCB, 0x49, 0x3C, 0x48, 0x80, 0x7B, 0x46, 0x67, 0x01, 0x17, 0x59, // 10-1F
		0xB8, 0xFA, 0x70, 0xC0, 0x44, 0x78, 0x48, 0xFB, 0x26, 0x80, 0x81, 0xFC, 0xFD, 0x61, 0x70, 0xC7, // 20-2F
		0xFE, 0xA8, 0x70, 0x28, 0x6C, 0x9C, 0x07, 0xA4, 0xCB, 0x3F, 0x70, 0xA3, 0x8C, 0xD6, 0xFF, 0xB0, // 30-3F
		0x7A, 0x3A, 0x35, 0x54, 0xE9, 0x9A, 0x3B, 0x61, 0x16, 0x41, 0xE9, 0xA3, 0x90, 0xA3, 0xE9, 0xEE, // 40-4F
		0x0E, 0xFA, 0xDC, 0x9B, 0xD6, 0xFB, 0x24, 0xB5, 0x41, 0x9A, 0x20, 0xBA, 0xB3, 0x51, 0x7A, 0x36, // 50-5F
		0x3E, 0x60, 0x0E, 0x3D, 0x02, 0xB0, 0x34, 0x57, 0x69, 0x81, 0xEB, 0x67, 0xF3, 0xEB, 0x8C, 0x47, // 60-6F
		0x93, 0xCE, 0x2A, 0xAF, 0x35, 0xF4, 0x74, 0x87, 0x50, 0x2C, 0x39, 0x68, 0xBB, 0x47, 0x1A, 0x02, // 70-7F
		0xA3, 0x93, 0x64, 0x2E, 0x8C, 0xAD, 0xB1, 0xC4, 0x61, 0x04, 0x5F, 0xBD, 0x59, 0x21, 0x1C, 0xE7, // 80-8F
		0x0E, 0x29, 0x26, 0x97, 0x70, 0xA9, 0xCD, 0x18, 0xA3, 0x7B, 0x74, 0x70, 0x96, 0xDE, 0xA6, 0x72, // 90-9F
		0xDD, 0x13, 0x93, 0xAA, 0x90, 0x6C, 0xA7, 0xB5, 0x76, 0x2F, 0xA8, 0x7A, 0xC8, 0x81, 0x06, 0xBB, // A0-AF
		0x85, 0x75, 0x11, 0x0C, 0xD2, 0xD1, 0xC9, 0xF8, 0x81, 0x70, 0xEE, 0xC8, 0x71, 0x53, 0x3D, 0xAF, // B0-BF
		0x76, 0xCB, 0x0D, 0xC1, 0x56, 0x28, 0xE8, 0x3C, 0x61, 0x64, 0x4B, 0xB8, 0xEF, 0x3B, 0x41, 0x09, // C0-CF
		0x72, 0x07, 0x50, 0xAD, 0xF3, 0x2E, 0x5C, 0x43, 0xFF, 0xC3, 0xB3, 0x32, 0x7A, 0x3E, 0x9C, 0xA3, // D0-DF
		0xC2, 0xAB, 0x10, 0x60, 0x99, 0xFB, 0x08, 0x8A, 0x90, 0x57, 0x8A, 0x7F, 0x61, 0x90, 0x21, 0x88, // E0-EF
		0x55, 0xE8, 0xFC, 0x4B, 0x0D, 0x4A, 0x7A, 0x48, 0xC9, 0xB0, 0xC7, 0xA6, 0xD0, 0x04, 0x7E, 0x05  // F0-FF
	],
	
	// Data used when calculating a checksum in Sky. Calculated below.
	skyChecksumData: [],
	
	// Sanitizes a WonderMail S string by removing all unknown characters.
	"sanitize": function(wmString) {
		// If dontSanitize is there and is checked, return our input.
		if(getOption("dontSanitize")) {
			return wmString;
		}
		
		wmString = wmString.toUpperCase();
		var outString = "";
		for(var i = 0; i < wmString.length; ++i) {
			if(this.bitValues.indexOf(wmString.charAt(i)) != -1) {
				outString += wmString.charAt(i);
			}
		}
		
		// Check if the length's ok.
		if(outString.length != 34) {
			////console.info("sanitized WMS code is %d chars long, should be 34", outString.length);
		}
		
		return outString;
	},
	
	// Unscrambles a scrambled WMS string.
	// @param string Scrambled WMS string
	// @returns string Unscrambled WMS string
	"unscrambleString": function(wmString, swapArray) {
		swapArray = swapArray || this.byteSwap;
		var outString = "";
		for(var i = 0; i < swapArray.length; ++i) {
			var source = swapArray[i];
			outString += wmString.charAt(source);
		}
		
		return outString;
	},
	
	// Scrambles a unscrambled WMS string.
	// @param string Unscrambled WMS string
	// @param array Swap Array (optional)
	// @returns string Scrambled WMS string
	"scrambleString": function(wmString, swapArray) {
		swapArray = swapArray || this.byteSwap;
		var outArray = [];
		var i;
		for(i = 0; i < swapArray.length; ++i) {
			outArray[i] = "";
		}
		
		for(i = 0; i < swapArray.length; ++i) {
			var target = swapArray[i];
			outArray[target] += wmString.charAt(i);
		}
		
		return outArray.join("");
	},
	
	/**
	 * Returns the encryption entries for a given checksum.
	 * @param number Checksum to get bytes for
	 * @return array Array with encryption entries
	 */
	"getEncryptionEntries": function(checksum) {
		var amount = 17;
		var entries = [];
		var encPointer = checksum;
		var backwards = !(checksum & 0x01);
		for(var i = 0; i < amount; ++i) {
			entries[entries.length] = this.encryptionData[encPointer];
			if(backwards) {
				encPointer--;
				if(encPointer < 0) {
					encPointer = this.encryptionData.length - 1;
				}
			}
			else {
				encPointer++;
				if(encPointer >= this.encryptionData.length) {
					encPointer = 0;
				}
			}
		}
		return entries;
	},
	
	// Converts the unscrambled representation of a mail string to an encrypted bitstream.
	// In Sky, this is reversed.
	// @param string Unscrambled mail string
	// @returns string Encrypted bitStream
	"bytesToBits": function(wmIntString) {
		var outString = "";
		for(var i = wmIntString.length - 1; i >= 0; --i) {
			var curChar = wmIntString.charAt(i);
			var index = this.bitValues.indexOf(curChar);
			if(index != -1) {
				outString += numToBits(index, 5);
			}
			else {
				console.error("bytesToBits: unknown character %s at pos %d!", curChar, i);
			}
		}
		return outString;
	},
	
	// Converts an encrypted bitStream to an unscrambled mail.
	// @param string Encrypted bitStream
	// @returns string Unscrambled mail
	"bitsToBytes": function(bitStream) {
		var blocks = bitStream.length / 5; // 34
		var outString = "";
		for(var i = 0; i < blocks; i++) {
			// (34 - 0 - 1) * 5 = (33) * 5 = 165, 5
			// (34 - 33 - 1) * 5 = (0) * 5 = 0, 5
			var curChars = bitStream.substr((blocks - i - 1) * 5, 5);
			var num = bitsToNum(curChars);
			if(num >= 0 && num < 32) {
				outString += this.bitValues.charAt(num);
			}
			else {
				console.error("bitsToBytes: Could not find %s in the reversed table", curChars);
			}
		}
		return outString;
	},
	
	/**
	 * Returns the resetByte for a given checksum.
	 * @param Number checksum
	 * @return Number Reset byte or -1
	 */
	"getResetByte": function(checksum) {
		var checksumByte = checksum % 256;
		var resetByte = Math.floor((checksumByte / 16) + 8 + (checksumByte % 16));
		// The resetByte must be under 17. If not, the code doesn't use a resetByte.
		return (resetByte < 17) ? resetByte : -1;
	},
	
	/**
	 * Decrypts or encrypts a bitstream according to the encryption data.
	 * @param String current bitstream
	 * @param boolean if given and true, encrypt; else decrypt
	 * @return String decrypted or encrypted bitstream
	 */
	"decryptBitStream": function(curBitStream, encrypt) {
		if(typeof encrypt == "undefined") {
			encrypt = false;
		}
		var bitPtr = 0;
		
		// This will contain the 8-bit blocks as numbers (0-255), each representing one byte.
		// The checksum byte is NOT included in these blocks.
		// The first block in the array is the last block in the bitstream (we work backwards).
		var blocks = [];
		var origBlocks = [];
		
		// Checksum data
		var checksumByte = 0;
		var checksumBits = "";
		var skyChecksumBits = "";
		var fullChecksum;
		
		// Go 8 bits back from the end. We'll read the next 8 bits as our checksum.
		bitPtr = curBitStream.length - 8;
		checksumBits = curBitStream.substr(bitPtr, 8);
		checksumByte = bitsToNum(checksumBits);
		
		// The Sky Checksum is 24 bits.
		bitPtr -= 24;
		skyChecksumBits = curBitStream.substr(bitPtr, 24);
		fullChecksum = bitsToNum(skyChecksumBits.toString() + checksumBits.toString());
		
		// http://www.gamefaqs.com/boards/genmessage.php?board=938931&topic=42949038&page=6
		// "At the moment, I figured out what the game is doing with the other half of the encryption. 
		// Apparently, if you have an even checksum, you go backwards through the encryption bytes.
		// With an odd checksum, you go forwards through the encryption bytes."
		var backwards = !(checksumByte & 0x01);
		
		//console.info("CHECKSUM: %d, encPtr goes backwards: %d", checksumByte, backwards);
		
		// Parse everything into blocks.
		// Sky: 1 2-bit block + 16 8-bit blocks + 24-bit skyChecksum + 8-bit checksum.
		while(bitPtr > 7) {
			bitPtr -= 8;
			var data = bitsToNum(curBitStream.substr(bitPtr, 8));
			blocks[blocks.length] = data;
			origBlocks[origBlocks.length] = data;
		}

		// Handle the 2-bit block at the beginning (should always be 00?)
		var twoBitsStart = curBitStream.substr(0, 2);
		bitPtr -= 2;
		
		// Get our encryption entries.
		var entries = this.getEncryptionEntries(checksumByte);
		
		// Figure out the resetByte.
		var resetByte = 255;
		resetByte = this.getResetByte(fullChecksum);
		//console.info("resetByte used for this code: %d", resetByte);
		
		// Do the decryption.
		var bwMode = false;
		var tblPtr = 0;
		var encPtr = 0;
		for(var i = 0; i < blocks.length; i++) {
			if(encPtr == resetByte) {
				var remaining = blocks.length - i;
				//console.info("Resetting at %d. %d blocks remain for decryption.", encPtr, remaining);
				encPtr = 0;
			}
			
			var inputByte = blocks[tblPtr];
			
			// Add or subtract the number in the encryption entry from it.
			var result;
			if(encrypt) {
				result = (inputByte + entries[encPtr]) & 0xFF;
			}
			else {
				result = (inputByte - entries[encPtr]) & 0xFF;
			}
			
			//console.info("pos %d, value %d (0x%s), encbyte %d, result is %d", tblPtr, inputByte, numToHex(inputByte), entries[encPtr], result);
			
			// Update the data in the block.
			blocks[i] = result;
			
			// Update blockPtr.
			++tblPtr;
			++encPtr;
		}
		
		// String everything together. If we use twoBitsStart, that will be our base point.
		var outString = twoBitsStart;
		
		// We start at the end and work backwards; the last encryption block is the first 8 bits in the bitstream.
		// That's just how it works.
		for(var blockPtr = blocks.length - 1; blockPtr >= 0; blockPtr--) {
			outString += numToBits(blocks[blockPtr], 8);
		}
		
		// Re-add the checksums to the data.
		outString += skyChecksumBits + checksumBits;
		
		return outString;
	},
	
	/**
	 * Encrypts a bitstream according to the encryption data by calling
	 * <code>decryptBitStream(stream, true)</code>
	 * @param String decrypted bitstream
	 * @return String encrypted bitstream
	 */
	"encryptBitStream": function(curBitStream) {
		return this.decryptBitStream(curBitStream, true);
	},
	
	// Converts a bit string to our internal structure.
	// @param string Unencrypted bitStream
	// @returns object WMSStruct data
	"bitsToStructure": function(bitString) {
		// Where to start reading in the bitString
		var bitPtr = 0;
		
		// Our eventual output structure
		var outputStruct = {};
		
		// Contains the bit streams rather than integers - for debug use
		var outputStructBit = {};
		
		for(var structPtr = 0; structPtr < WMSStruct.length; structPtr++) {
			// structInfo contains the name, the size and a note which we'll add at some point somehow.
			var structInfo = WMSStruct[structPtr];
			
			// Read "size" bits from the bitString and increment the bitPtr by the same amount
			var bitData = bitString.substr(bitPtr, structInfo.size);
			bitPtr += structInfo.size;
			
			// Convert our bit data to a number
			var numData = bitsToNum(bitData, 8);
			
			// Add it to the outputStruct
			outputStruct[structInfo.name] = numData;
			outputStructBit[structInfo.name] = bitData;
		}
		
		// We should be at the end now
		if(bitPtr != bitString.length) {
			console.warn("WARNING: Not all available data was parsed into struct. Final bitPtr is %d, length is %d", bitPtr, bitString.length);
		}
		
		//console.info("outStruct: %o, bitStruct: %o", outputStruct, outputStructBit);
		return outputStruct;
	},
	
	/**
	 * Calculates the checksum for a given bitStream.
	 * @param String bitStream in 136-bit raw format or 170-bit full format
	 * @return Number Checksum as decimal number
	 */
	"calculateChecksum": function(bitStream) {
		// Calculate the checksum - Sky. This is simple CRC32.
		// http://www.gamefaqs.com/boards/detail.php?board=955859&topic=51920426&message=582176885
		//console.info("Sky Checksum calculation - bitStream of length %d.", bitStream.length);
		
		if(bitStream.length == 170) {
			//console.info("Truncating the 170-long bitStream for you. By golly, I'm so nice.");
			bitStream = bitStream.substr(2, 136);
		}
		
		if(bitStream.length != 136) {
			console.warn("WARNING: bitStream should be 136 bits long!");
		}
		
		// Start with 0xFFFFFFFF.
		var checksum = 0xFFFFFFFF;
		
		// We have 17 blocks of 8 bits in the bitStream (136 bits).
		var data = "";
		for(var i = 16; i >= 0; --i) {
			// Grab 8 bits from the stream and convert it to a number.
			var bits = bitStream.substr(i * 8, 8);
			var num = bitsToNum(bits);
			data += String.fromCharCode(num);
			
			// Grab a entry from the data table. The entry gotten is equal to 
			var entry = this.skyChecksumData[(checksum ^ num) & 0xFF];
			
			// The entry is NOT'ed with our current checksum rsl'd 8 times. The result of this will be the new checksum
			// for this round.
			checksum = (checksum >>> 8) ^ entry;
		}
		
		// Our final checksum is NOT'ed with 0xFFFFFFFF.
		checksum = checksum ^ 0xFFFFFFFF;
		
		// Make the checksum positive (WHY MUST YOU DO THIS TO ME JAVASCRIPT!?!?!?)
		if(checksum < 0) {
			checksum += 4294967296;
		}
		
		//console.info("Generated a Sky checksum of %d (%s).", checksum, numToHex(checksum, 8));
		
		return checksum;
	},
	
	// Converts an object to an unencrypted bitstream.
	// @param object Object containing a key for each key in WMSStruct.
	// @returns string Unencrypted bitStream
	"structureToBits": function(inputStruct) {
		var bitStream = "";
		var totalSize = 0;
		for(var i = 0; i < WMSStruct.length; ++i) {
			var key = WMSStruct[i];
			if(key.noinclude) {
				continue;
			}
			
			if(typeof inputStruct[key.name] == "undefined") {
				console.error("The key %s was not defined in inputStruct %o.", key.name, inputStruct);
			}
			
			var data = inputStruct[key.name];
			var binData = numToBits(data, key.size);
			bitStream += binData;
			totalSize += key.size;
		}
		
		// For Sky, our "null" byte is 8 bits in length. However, 2 of those bits aren't encrypted. To make it easier on ourselves,
		// we chop those two off here and re-add them later. These will always be zero so it's ok.
		bitStream = bitStream.substr(2);
		
		//console.info("Generated a %d-length bitStream: %s.", bitStream.length, bitStream);
		
		var checksum = this.calculateChecksum(bitStream);
		
		// Add the two chopped-off zero bits and the checksum.
		bitStream = "00" + bitStream + numToBits(checksum, 32);
		
		return bitStream;
	}
};

/**
 * This code generates a CRC32 table.
 * http://www.gamefaqs.com/boards/detail.php?board=955859&topic=51920426&message=582176885
 */
(function() {
	for(var i = 0; i < 256; i++) {
		var entry = i;

		for(var j = 0; j < 8; j++) {
			if(!(entry & 1)) {
				entry = entry >>> 1;
			}
			else {
				entry = 0xEDB88320 ^ (entry >>> 1);
			}

			WMSParser.skyChecksumData[i] = entry;
		}
	}
})();

/**
 * Convert a set of bits to a number.
 * @param String Bits
 * @returns Number Number
 */
function bitsToNum(bits) {
	return parseInt(bits, 2);
}

/**
 * Converts a number to a hex string.
 * @param Number Number to convert
 * @param Number Minimum size of the hex string
 * @returns String Hex string
 */
function numToHex(num, minSize) {
	var hex = num.toString(16).toUpperCase();
	while(hex.length < minSize) {
		hex = "0" + hex;
	}
	return hex;
}

/**
 * @param number Number
 * @returns string Bits
 */
function numToBits(num, outputSize) {
	var bits = num.toString(2) + "";
	while(bits.length < outputSize) {
		bits = "0" + bits;
	}
	
	return bits;
}
