/*

	Numark Mixtrack II Mapping Script Functions

	v0.1 - 05/13/15 
	patchtheuniform

	based of Numark Mixtrack mappings by Matteo <matteo@magm3.com>
	
	******************* TO DO *******************************
	
	
	******************* TO DO *******************************
	Channel 1
		- fx knobs along top of pads
		- pads 1 - 4 > shift mode
		- page 5 - loop / reloop / must satisfy shift mode changes
		- jogwheel & scratch button
		- cue / play / pause agreement
		- stutter functionality
		
	Master
		- file browser
		- back button
		
 */

function NumarkMixTrackII() {}

NumarkMixTrackII.init = function(id) {	// called when the MIDI device is opened & set up
	
NumarkMixTrackII.id = id;	// Store the ID of this device for later use
NumarkMixTrackII.scratchMode = [false, false];
NumarkMixTrackII.scratching = [false, false];
NumarkMixTrackII.KeyIsLocked = [false,false];
NumarkMixTrackII.manualLooping = [false, false];	
NumarkMixTrackII.monitorMode = [false, false];
NumarkMixTrackII.shift = [0, 0];
	 
NumarkMixTrackII.leds = [
		// Common
		{ 
			"directory": 0x34, 
			"file": 0x4B,
			"all": 0x75
		},
		// Deck 1                      
		{ 
			"pitchCenter": 0x28,
			"pad1": 0x59,
			"pad2": 0x5A,
			"pad3": 0x5B,
			"pad4": 0x5C,
			"pad5": 0x53,
			"hiKill": 0x54,
			"midKill": 0x55,
			"loKill": 0x63,
			"padLoop": 0x1E,
			"padSample": 0x1F,
			"padCue": 0x20,
			"sync": 0x40,
			"cue": 0x33,
			"playPause": 0x3B,
			"stutter": 0x4A,
			"scratchMode": 0x48, 
			"monitor": 0x51
		},
		// Deck 2
		{
			"pitchCenter": 0x29,
			"pad1": 0x5D,
			"pad2": 0x5E,
			"pad3": 0x5F,
			"pad4": 0x60,
			"loKill": 0x56,
			"midKill": 0x57,
			"hiKill": 0x58,
			"pad8": 0x64,			
			"sync": 0x47,
			"padLoop": 0x21,
			"padSample": 0x22,
			"padCue": 0x23,
			"sync": 0x47,
			"cue": 0x3C,
			"playPause": 0x42,
			"stutter": 0x4C,
			"scratchMode": 0x50, 
			"monitor": 0x52
		}
	];
	
	// LEDs at startup
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[0]["all"], false);
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[0]["file"], true);
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[1]["pitchCenter"], true);
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[2]["pitchCenter"], true);
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[1]["cue"], true);
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[2]["cue"], true);
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[1]["padLoop"], true);
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[2]["padLoop"], true);
	
	// default control setting override
	engine.setValue("[Channel1]", "volume", 0.6);
	engine.setValue("[Channel2]", "volume", 0.6);
	engine.setValue("[Master]", "volume", 1.55);
	
	engine.setValue("[Channel1]", "keylock", 1);
	engine.setValue("[Channel2]", "keylock", 1);
	engine.setValue("[Channel1]", "quantize", 1);
	engine.setValue("[Channel2]", "quantize", 1);
	
	// soft takeover for pitch sliders
	engine.softTakeover("[Channel1]", "rate", true);
	engine.softTakeover("[Channel2]", "rate", true);
	
	//NumarkMixTrackII.setLED(NumarkMixTrackII.leds[0]["all"], true);
	
}


// called on shutdown, turns off all lights on the device
NumarkMixTrackII.shutdown = function(id) {	
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[0]["all"], false);	
}


NumarkMixTrackII.groupToDeck = function(group) {
	var matches = group.match(/^\[Channel(\d+)\]$/);
	if (matches == null) {
		return -1;
	} else {
		return matches[1];
	} 
} 

NumarkMixTrackII.center = function(channel, control, value, status, group) {
	var deck = NumarkMixTrackII.groupToDeck(group);
	
	if (value == 0x40) {
		NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["pitchCenter"], true);
	} else {
		NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["pitchCenter"], false);
	}
	
	var pitch_value = 0;
	
	if (value < 64) pitch_value = (value-64) /64;
	if (value > 64) pitch_value = (value-64) /63;
	
	engine.setValue(group, "rate", pitch_value);
}

NumarkMixTrackII.monitor = function(channel, control, value, status, group) {
	var deck = NumarkMixTrackII.groupToDeck(group);
	// toggle setting and light
	if (value) {
		NumarkMixTrackII.monitorMode[deck-1] = !NumarkMixTrackII.monitorMode[deck-1];
	}
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["monitor"], NumarkMixTrackII.monitorMode[deck-1]);
	engine.setValue(group, "pfl", NumarkMixTrackII.monitorMode[deck-1]);
}

NumarkMixTrackII.setLED = function(value, status) {  
	if (status) {
		status = 0x64;
	} else {
		status = 0x00;
	}
	midi.sendShortMsg(0x90, value, status);
} 

NumarkMixTrackII.padShift = function(channel, control, value, status, group) {
	if (!value) return; 	// ignore control val 0x00

	deck = NumarkMixTrackII.groupToDeck(group);
	

	if (NumarkMixTrackII.shift[deck-1] == 0) {
		NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["padLoop"], false);  
		NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["padSample"], true);
		NumarkMixTrackII.ledPadLoop(deck, group, 1);		
	} else if (NumarkMixTrackII.shift[deck-1] == 1) {
		NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["padSample"], false);  
		NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["padCue"], true);  
		NumarkMixTrackII.ledPadLoop(deck, group, 2);		
	} else {
		NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["padCue"], false);  
		NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["padLoop"], true);  
		NumarkMixTrackII.ledPadLoop(deck, group, 0);		
	}
	
	// increment shift by 1 to track 
	NumarkMixTrackII.shift[deck-1] += 1;

	if (NumarkMixTrackII.shift[deck-1] > 2) { 
		NumarkMixTrackII.shift[deck-1] = 0;
	}
}

NumarkMixTrackII.padControl = function(channel, control, value, status, group) {
	if (!value) return;		// ignore control val 0x00

	// get the deck & shift value
	var deck = NumarkMixTrackII.groupToDeck(group);
	var deckShift = NumarkMixTrackII.shift[deck - 1];
	
	// set sampler value  if shift set to 1
	if (deckShift == 1) {
		if (group == '[Channel1]') sampler = '[Sampler1]';
		else sampler = '[Sampler2]';
	}
	 
	// route the request based on the shift value and button pushed (loop, sampler, cue)
	if (control == 0x59 || control == 0x5D) { // pad 1
		// get the shift value of the deck
		// if shift val = 0 then toggle 2 beat loop on deck
		// toggle led of pad 1
		if (deckShift == 0) { 	
			NumarkMixTrackII.toggleBeatloop(group, deck, "2", "pad1");
		} else if (deckShift == 1) {
			engine.setValue(sampler, "hotcue_1_activate", 1);
		} else if (deckShift == 2) { 
			engine.setValue(group, "hotcue_1_activate", 1);		
		}		
	} else if (control == 0x5A || control == 0x5E) { // pad 2
		if (deckShift == 0 ) {
			NumarkMixTrackII.toggleBeatloop(group, deck, "4", "pad2");
		} else if (deckShift == 1) {
			engine.setValue(sampler, "hotcue_2_activate", 1);
		} else if (deckShift == 2) {
			engine.setValue(group, "hotcue_2_activate", 1); 
		}
	} else if (control == 0x5B || control == 0x5F) { // pad 3
		if (deckShift == 0) {
			NumarkMixTrackII.toggleBeatloop(group, deck, "8", "pad3");
		} else if (deckShift == 1) { 
		engine.setValue(sampler, "hotcue_3_activate", 1);
		} else if (deckShift == 2) {
			engine.setValue(group, "hotcue_3_activate", 1);
		}		
	} else if (control == 0x5C || control == 0x60) { // pad 4
		if (deckShift == 0) {
			NumarkMixTrackII.toggleBeatloop(group, deck, "16", "pad4"); 
		} else if (deckShift == 1) { 
			engine.setValue(sampler, "hotcue_4_activate", 1);
		} else if (deckShift == 2) {
			engine.setValue(group, "hotcue_4_activate", 1);
		}
	}

}

NumarkMixTrackII.toggleBeatloop = function(group, deck, beats, padLed) {
	controlValue = !engine.getValue(group, "beatloop_" + beats + "_enabled");
	if (controlValue == 1) {
		//NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck][padLed], controlValue); 
		engine.setValue(group, "beatloop_" + beats + "_enabled", controlValue); 
		engine.setValue(group, "beatloop_" + beats + "_activate", controlValue); 	
	} else {
		//NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck][padLed], controlValue); 	
		engine.setValue(group, "beatloop_" + beats + "_enabled", controlValue); 
		engine.setValue(group, "reloop_exit", 1);
	}
	NumarkMixTrackII.ledPadLoop(deck, group, 0);
}

NumarkMixTrackII.ledPadLoop = function(deck, group, shift) {
	//NumarkMixTrackII.setLED(NumarkMixTrackII.leds[0]["all"], true);
	var engineValues = [];
	if (shift == 0) {
		engineValues = [
			"beatloop_2_enabled",
			"beatloop_4_enabled",
			"beatloop_8_enabled",
			"beatloop_16_enabled"
		];
	} else if (shift == 1) {
		engineValues = [
			"hotcue_1_enabled",
			"hotcue_2_enabled",
			"hotcue_3_enabled",
			"hotcue_4_enabled" 
			]
		if (deck == 1) group = "[Sampler1]";
		else group = "[Sampler2]";
	} else {
		engineValues = [
			"hotcue_1_enabled",
			"hotcue_2_enabled",
			"hotcue_3_enabled",
			"hotcue_4_enabled"
		]
	}
	
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["pad1"], engine.getValue(group, engineValues[0]));
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["pad2"], engine.getValue(group, engineValues[1]));
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["pad3"], engine.getValue(group, engineValues[2]));
	NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["pad4"], engine.getValue(group, engineValues[3]));
	
	
}

NumarkMixTrackII.filterKill = function(channel, control, value, status, group) {
	deck = NumarkMixTrackII.groupToDeck(group)
	var controlValue;
	if (value) {
		if (control == 0x54 || control == 0x58) { 
			controlValue = !engine.getValue(group, "filterHighKill");
			NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["hiKill"], controlValue); 
			engine.setValue(group, "filterHighKill", controlValue); 
		} else if (control == 0x55 || control == 0x57) {
			controlValue = !engine.getValue(group, "filterMidKill");
			NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["midKill"], controlValue); 
			engine.setValue(group, "filterMidKill", controlValue); 
		} else if (control == 0x63 || control == 0x56) {
			controlValue = !engine.getValue(group, "filterLowKill");
			NumarkMixTrackII.setLED(NumarkMixTrackII.leds[deck]["loKill"], controlValue); 
			engine.setValue(group, "filterLowKill", controlValue); 
		}
	}
}

	
/*
TO DO:

*/


NumarkMixTrackII.wheelTouch = function(channel, control, value, status, group) {
	// scrub when cueing
	var deck = NumarkMixTrackII.groupToDeck(group);
	var adjustedJog = parseFloat(value);
	var posNeg = 1;
	if (adjustedJog > 63) {	// Counter-clockwise
		posNeg = -1;
		adjustedJog = value - 128;
	}
	if (engine.getValue(group, "play") == 0) {
		var gammaInputRange = 23;	// Max jog speed
		var maxOutFraction = 0.5;	// Where on the curve it should peak; 0.5 is half-way
		var sensitivity = 0.3;		// Adjustment gamma
		var gammaOutputRange = 3;	// Max rate change
		//engine.scratchTick(deck, adjustedJog);
		engine.setValue(group, "jog", adjustedJog);

	} else {
		//NumarkMixTrackII.setLED(NumarkMixTrackII.leds[0]["all"], false);	

        // Keep track of whether we're scratching on this virtual deck - for v1.10.x or below
        // MyController.scratching[MyController.currentDeck] = true;	
	}
			
	/*
	// scratch when enabled
	// do nothing when playing & scratch not enabled
	if (NumarkMixTrack.scratching[deck-1])
	{
	}
	else 
	{
		*/
	//}	
}

NumarkMixTrackII.selectKnob = function(channel, control, value, status, group) {
	if (value > 63) {
		value = value - 128;
	}
	engine.setValue(group, "SelectTrackKnob", value);
}


NumarkMixTrackII.loopControl = function(channel, control, value, status, group) {
	// exit loop or reloop depending on state
	// using pad 5 - ch.1 or pad 8 - ch. 2
	// rename the LED setting
}


	// NumarkMixTrackII.setLED(NumarkMixTrackII.leds[0]["all"], true);  	