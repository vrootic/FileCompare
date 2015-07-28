var xlsx = require("xlsx");
var fs = require("fs");
var ipc = require("ipc");

var App = React.createClass({
	getInitialState: function() {
		return {
			originalFilePath: "",
			// originalFilePath: "/Users/vic/rdss/file-diff/tests/權益組屆退.xls",
			originalFileHeaders: [],
			currentFilePath: "",
			// currentFilePath: "/Users/vic/rdss/file-diff/tests/主計屆退.xls",
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
		OriginalFileNode = React.findDOMNode(this.refs.OriginalFile);
		CurrentFileNode = React.findDOMNode(this.refs.CurrentFile);

		OriginalFileNode.addEventListener("dragover", this.handleDragOver);
		CurrentFileNode.addEventListener("dragover", this.handleDragOver);

		OriginalFileNode.addEventListener("drop", this.handleOnDrop.bind(this, "originalFilePath"));
		CurrentFileNode.addEventListener("drop", this.handleOnDrop.bind(this, "currentFilePath"));

		OriginalFileNode.addEventListener("click", this.handleSelectCurrentFile.bind(this, "originalFilePath"));
		CurrentFileNode.addEventListener("click", this.handleSelectCurrentFile.bind(this, "currentFilePath"));
	},

	handleReset: function() {
		this.setState({
			originalFilePath: "",
			originalFileHeaders: [],
			currentFilePath: "",
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

		oFileHeaders.forEach(function(oHeader) {
			cFileHeaders.forEach(function(cHeader){
				if (oHeader == cHeader) {
					sFileHeaders.push(oHeader);
					return;
				}
			});
		});

		ipc.send("samefield", {
			signal: "openNewWindow",
			data: sFileHeaders
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
