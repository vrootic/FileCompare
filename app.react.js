var xlsx = require("xlsx");
var fs = require("fs");

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
		var state = {}
		state[stateKey] = file.path;
		file = xlsx.readFile(file.path);
		this.toJson(file, stateKey);
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

		console.log(sFileHeaders);
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
