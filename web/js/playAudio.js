/**
 * File: playAudio.js
 * Project: comfyui_jags_audiotools
 * Author: jags111
 *
 * Copyright (c) 2023 jags111
 *
 */
import { app } from "../../../scripts/app.js";
import { api } from '../../../scripts/api.js'
import { ComfyWidgets } from "../../../scripts/widgets.js"


/* 
A method that returns the required style for the html 
*/
function addPlaybackWidget(node, name, root) {
	
	try {
		while (node.widgets.length > 0){
			node.widgets.pop()
		}
	} catch (error) {
		//console.log(error);
	}
	let url = `/view?filename=${encodeURIComponent(name)}&type=${root}&subfolder=${app.getPreviewFormatParam()}${app.getRandParam()}`;
	let isTick = true;
	const audio = new Audio(url);
	const slider = node.addWidget(
		"slider",
		"loading",
		0,
		(v) => {
			if (!isTick) {
				audio.currentTime = v;
			}
			isTick = false;
		},
		{
			min: 0,
			max: 0,
		}
	);

	const button = node.addWidget("button", `Play ${name}`, "play", () => {
		try {
			if (audio.paused) {
				audio.play();
				button.name = `Pause ${name}`;
			} else {
				audio.pause();
				button.name = `Play ${name}`;
			}
		} catch (error) {
			alert(error);
		}
		app.canvas.setDirty(true);
	});

	audio.addEventListener("timeupdate", () => {
		isTick = true;
		slider.value = audio.currentTime;
		app.canvas.setDirty(true);
	});
	audio.addEventListener("ended", () => {
		button.name = `Play ${name}`;
		app.canvas.setDirty(true);
	});
	audio.addEventListener("loadedmetadata", () => {
		slider.options.max = audio.duration;
		slider.name = `(${audio.duration})`;
		app.canvas.setDirty(true);
	});
}

app.registerExtension({
	name: "UVR5.AudioPlayer",
	async beforeRegisterNodeDef(nodeType, nodeData, app) {
		if (nodeData?.name == "PlayAudio") {
			nodeType.prototype.onExecuted = function (data) {
				addPlaybackWidget(this, data.audio[0], data.audio[1]);
			}
		}
	}
});
