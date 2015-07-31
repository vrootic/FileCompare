var xlsx = require("xlsx");
var fs = require("fs");
var ipc = require("ipc");


var App = React.createClass({
	getInitialState: function() {
		return {
			originalFilePath: "",
			originalFile: [],
			originalFileHeaders: [],
			currentFilePath: "",
			currentFile: [],
			currentFileHeaders: [],
			sameFileHeaders: []
		};
	},

	handleDragOver: function(e) {
		e.preventDefault();
	},

	handleOnDrop: function(stateKey, e) {
		e.preventDefault();
		var file = e.dataTransfer.files[0];

		this.handleReadFile(stateKey, file.path);
	},

	handleReadFile: function(stateKey, file_path) {
		var state = {};
		state[stateKey] = file_path;
		parsedFile = xlsx.readFile(file_path);
		this.toJson(parsedFile, stateKey);
		this.setState(state);
	},

	toJson: function(file, stateKey) {
		var result = [];
		var keys = []
		file.SheetNames.forEach(function(sheetName){
			var rawData = xlsx.utils.sheet_to_json(file.Sheets[sheetName]);
			if (rawData.length > 0) {
				result = rawData;
				keys = Object.keys(rawData[0]);
			}
		});

		var state = {};
		if (stateKey == "originalFilePath") {
			state["originalFile"] = result;
			state["originalFileHeaders"] = keys;
		}
		else {
			state["currentFile"] = result;
			state["currentFileHeaders"] = keys;
		}

		this.setState(state);
	},

	componentDidMount: function() {
		originalFileNode = React.findDOMNode(this.refs.OriginalFile);
		currentFileNode = React.findDOMNode(this.refs.CurrentFile);

		originalFileNode.addEventListener("dragover", this.handleDragOver);
		currentFileNode.addEventListener("dragover", this.handleDragOver);

		originalFileNode.addEventListener("drop", this.handleOnDrop.bind(this, "originalFilePath"));
		currentFileNode.addEventListener("drop", this.handleOnDrop.bind(this, "currentFilePath"));

		originalFileNode.addEventListener("click", this.handleSelectCurrentFile.bind(this, "originalFilePath"));
		currentFileNode.addEventListener("click", this.handleSelectCurrentFile.bind(this, "currentFilePath"));
	},

	handleReset: function() {
		this.setState({
			originalFilePath: "",
			originalFile: [],
			originalFileHeaders: [],
			currentFilePath: "",
			currentFile: [],
			currentFileHeaders: [],
			sameFileHeaders: []
		});
	},

	handleSelectCurrentFile: function(stateKey, e) {
		var remote = require("remote"),
				dialog = remote.require("dialog"),
				currentWindow = remote.getCurrentWindow();

		dialog.showOpenDialog(
			currentWindow,
			{
				title: "Navigate to file",
				properties: ["openDirectory", "openFile"],
				filters: [
					{ name: 'SpreadSheet File', extensions: ['xls', 'xlsx']}
				]
			},
			function(filename) {
				if (filename) {
					this.handleReadFile(stateKey, filename[0]);
				}
			}.bind(this)
		);
	},

	compareFiles: function() {
		var oFileHeaders = this.state.originalFileHeaders;
		var cFileHeaders = this.state.currentFileHeaders;
		var sFileHeaders = [];
		var originalFile = this.state.originalFile;
		var currentFile = this.state.currentFile;

		oFileHeaders.forEach(function(oHeader) {
			cFileHeaders.forEach(function(cHeader){
				if (oHeader == cHeader) {
					sFileHeaders.push(oHeader);
					return;
				}
			});
		});

		ipc.send("sameField", {
			signal: "openNewWindow",
			data: sFileHeaders,
		});

		ipc.once("compareRequest", function(args) {
			var targetFields = args.data;
			var originalRecords = [];
			var currentRecords = [];

			if (targetFields.indexOf("身分證字號") == -1) {
				var remote = require("remote"),
						dialog = remote.require("dialog"),
						currentWindow = remote.getCurrentWindow();

				dialog.showMessageBox(
					currentWindow,
					{
						title: "Warnging",
						message: "沒有選取身分證字號欄位以供比對",
						type: "warning",
						buttons: ["了解"],
					},
					function(response) {

					}
				);
				// return;
			}
			else {
				var pivotIndex = targetFields.indexOf("身分證字號");
				if (pivotIndex != 0) {
					targetFields.splice(pivotIndex, 1);
					targetFields.unshift("身分證字號")
				}

			}

			originalFile.forEach(function(oRecord) {
				var record = {};
				targetFields.forEach(function(field) {
					if (oRecord[field]) {
						record[field] = oRecord[field].replace(',', '');
					}
					else {
						console.log(oRecord + " " + field);
					}
				});
				originalRecords.push(record);
			});

			currentFile.forEach(function(cRecord) {
				var record = {};
				targetFields.forEach(function(field) {
					if (cRecord[field]) {
						record[field] = cRecord[field].replace(',', '');
					}
					else {
						console.log(cRecord + " " + field);
					}
				});
				currentRecords.push(record);
			});


			var i = 0;
			var diffRecords = [];
			var recordLen = originalRecords.length < currentRecords.length ? originalRecords.length : currentRecords.length;
			for (i = 0; i < recordLen; i++) {
				for (var j = 0; j < recordLen; j++) {
					if (originalRecords[i][targetFields[0]] == currentRecords[j][targetFields[0]]) {
						console.log(originalRecords[i][targetFields[0]]
							+ " " + originalRecords[i][targetFields[1]]
							+ " " + currentRecords[j][targetFields[0]]
							+ " " + currentRecords[j][targetFields[1]]
						);

						for (var k = 1; k < targetFields.length; k++) {
							if (originalRecords[i][targetFields[k]] != currentRecords[j][targetFields[k]]) {
								diffRecords.push(originalRecords[i]);
							}
						}
					}
				}

			}
			if (recordLen == originalRecords.length) {
				for(var j = i; j < currentRecords.length; j++) {
					diffRecords.push(currentRecords[j]);
				}
			}
			else {
				for(var j = i; j < originalRecords.length; j++) {
					diffRecords.push(originalRecords[j]);
				}
			}

			ipc.send("diffRecords", {
				data: diffRecords
			});

		});

		this.setState({sameFileHeaders: sFileHeaders});
	},

	render: function() {
		return (
			<div>
				<div id="title">
					<h1>File compare</h1>
				</div>
				<div id="control-button">
					<button id="myButton1" onClick={this.handleReset}>Reset</button>
					<button id="myButton" onClick={this.compareFiles}>Compare</button>
				</div>

				<div ref="OriginalFile" id="ogfile">
					<strong>Original File Drag Here</strong><br/>
					{this.state.originalFilePath}
				</div>

				<div ref="CurrentFile" id="crfile">
					<strong>Current File Drag Here</strong><br/>
					{this.state.currentFilePath}
				</div>

			</div>
		);
	}

});
