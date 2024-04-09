import { app } from "../../../scripts/app.js";
import { api } from '../../../scripts/api.js'
import { ComfyWidgets } from "../../../scripts/widgets.js"

function audioUpload(node, inputName, inputData, app) {
    const audioWidget = node.widgets.find((w) => w.name === "audio");
    let uploadWidget;
    /* 
    A method that returns the required style for the html 
    */
    function playAudio(node, name) {
        let url = `/view?filename=${encodeURIComponent(name)}&type=input&subfolder=${app.getPreviewFormatParam()}${app.getRandParam()}`
        
        while (node.widgets.length > 2){
            node.widgets.pop()
        }
        
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

    var default_value = audioWidget.value;
    Object.defineProperty(audioWidget, "value", {
        set : function(value) {
            this._real_value = value;
        },

        get : function() {
            let value = "";
            if (this._real_value) {
                value = this._real_value;
            } else {
                return default_value;
            }

            if (value.filename) {
                let real_value = value;
                value = "";
                if (real_value.subfolder) {
                    value = real_value.subfolder + "/";
                }

                value += real_value.filename;

                if(real_value.type && real_value.type !== "input")
                    value += ` [${real_value.type}]`;
            }
            return value;
        }
    });
    async function uploadFile(file, updateNode, pasted = false) {
        try {
            // Wrap file in formdata so it includes filename
            const body = new FormData();
            body.append("image", file);
            if (pasted) body.append("subfolder", "pasted");
            const resp = await api.fetchApi("/upload/image", {
                method: "POST",
                body,
            });

            if (resp.status === 200) {
                const data = await resp.json();
                // Add the file to the dropdown list and update the widget value
                let path = data.name;
                if (data.subfolder) path = data.subfolder + "/" + path;

                if (!audioWidget.options.values.includes(path)) {
                    audioWidget.options.values.push(path);
                }

                if (updateNode) {
                    audioWidget.value = path;
                    // showAudio(path)
                    playAudio(node, path);
                }
            } else {
                alert(resp.status + " - " + resp.statusText);
            }
        } catch (error) {
            alert(error);
        }
    }

    const fileInput = document.createElement("input");
    Object.assign(fileInput, {
        type: "file",
        accept: "audio/mp3,audio/wav,audio/flac,audio/m4a",
        style: "display: none",
        onchange: async () => {
            if (fileInput.files.length) {
                await uploadFile(fileInput.files[0], true);
            }
        },
    });
    document.body.append(fileInput);

    // Create the button widget for selecting the files
    uploadWidget = node.addWidget("button", "choose audio file to upload", "Audio", () => {
        fileInput.click();
    });

    uploadWidget.serialize = false;
    playAudio(node, audioWidget.value);

    const cb = node.callback;
    audioWidget.callback = function () {
        playAudio(node, audioWidget.value);
        if (cb) {
            return cb.apply(this, arguments);
        }
    };

    return { widget: uploadWidget };
}

ComfyWidgets.AUDIOUPLOAD = audioUpload;

app.registerExtension({
	name: "UVR5.UploadAudio",
	async beforeRegisterNodeDef(nodeType, nodeData, app) {
		if (nodeData?.name == "LoadAudio") {
			nodeData.input.required.upload = ["AUDIOUPLOAD"];
		}
	},
});

