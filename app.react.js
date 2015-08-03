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
				properties: ["openFile"],
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
			var originalRecords = {};
			var currentRecords = {};
			var diffRecords = [];

			if (targetFields.indexOf("身分證字號") == -1) {
				var remote = require("remote"),
						dialog = remote.require("dialog"),
						currentWindow = remote.getCurrentWindow();

				dialog.showMessageBox(
					currentWindow,
					{
						title: "Warning",
						message: "沒有選取身分證字號欄位以供比對",
						type: "warning",
						buttons: ["了解"],
					},
					function(response) {

					}
				);
				return;
			}
			else {
				var pivotIndex = targetFields.indexOf("身分證字號");
				if (pivotIndex != 0) {
					targetFields.splice(pivotIndex, 1);
					// insert 身分證字號 into the first element
					targetFields.unshift("身分證字號")
				}

			}

			originalFile.forEach(function(oRecord) {
				var key = oRecord[ targetFields[0] ];
				var value = [];
				for (var i = 1; i < targetFields.length; i++) {
					value.push(oRecord[ targetFields[i] ].replace(',', ''));
				}
				originalRecords[key] = value;
			});

			currentFile.forEach(function(cRecord) {
				var key = cRecord[ targetFields[0] ];
				var value = [];
				for (var i = 1; i < targetFields.length; i++) {
					value.push(cRecord[ targetFields[i] ].replace(',', ''));
				}

				var record = {};
				record[ targetFields[0] ] = key;
				if (originalRecords[key] == undefined) {
					for (var i = 1; i < targetFields.length; i++){
						record[targetFields[i]] = value[i-1];
					}
					diffRecords.push(record);
				}
				else {
					var originalValue = originalRecords[key];
					value.forEach(function(v) {
						if (-1 === originalValue.indexOf(v)) {
							for (var i = 1; i < targetFields.length; i++){
								record[ targetFields[i] ] = value[i-1];
							}
							diffRecords.push(record);
						}
					});
				}
				console.log(record[ targetFields[0] ] + " " + record[ targetFields[1] ]);

			});


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
