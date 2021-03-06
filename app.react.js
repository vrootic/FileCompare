var xlsx = require("xlsx");
var fs = require("fs");
var ipc = require("ipc");
var parse = require("csv-parse");
var iconv = require("iconv-lite");


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
		if (file.path.endsWith('.csv')) {
			this.handleCsvFile(stateKey, file);
		}
		else if (file.path.endsWith('.xls') || file.path.endsWith('.xlsx')) {
			this.handleXlsFile(stateKey, file.path);
		}
	},

	handleCsvFile: function(stateKey, filePath) {
		var parsedCsvStr = this.readCsvFile(filePath);
		var output = this.csvParserInit(parsedCsvStr);
		this.setFileNameState(stateKey, filePath);
		
		var keys = output[0];
		var result = [];
		for (var i = 1; i < output.length; i++) {
			var tmpObj = {};
			for (var j = 0; j < keys.length; j++) {
				tmpObj[keys[j]] = output[i][j];
			}
			result.push(tmpObj);
		}

		this.setFileState(stateKey, result, keys);
	},

	readCsvFile: function(filePath) {
		var csvData = fs.readFileSync(filePath, 'binary');
		var buf = new Buffer(csvData, 'binary');
		var decodedBody = iconv.decode(buf, 'cp950');
		decodedBody = decodedBody.replace(/\r/g, '');

		return decodedBody;
	},

	csvParserInit: function(csvStr) {
		var parser = parse({rowDelimiter: '\n'});
		var output = [];

		parser.on('readable', function(){
			while (record = parser.read()) {
				output.push(record);
			}
		});
		parser.on('error', function(err){
			console.log(err.message);
		}); 
		parser.write(csvStr);
		parser.end();

		return output;
	},

	handleXlsFile: function(stateKey, filePath) {
		parsedFile = xlsx.readFile(filePath);
		this.setComparingKeys(parsedFile, stateKey);
		this.setFileNameState(stateKey, filePath);
	},

	setComparingKeys: function(file, stateKey) {
		var result = [];
		var keys = []
		file.SheetNames.forEach(function(sheetName){
			var rawData = xlsx.utils.sheet_to_json(file.Sheets[sheetName]);
			if (rawData.length > 0) {
				result = rawData;
				keys = Object.keys(rawData[0]);
			}
		});
		this.setFileState(stateKey, result, keys);
	},

	setFileNameState: function(stateKey, filePath) {
		var fileNameState = {};
		fileNameState[stateKey] = filePath;
		this.setState(fileNameState);
	},

	setFileState: function(stateKey, result, keys) {
		var state = {};
		if (stateKey == "originalFilePath") {
			state["originalFile"] = result;
			state["originalFileHeaders"] = keys;
		}
		else {
			state["currentFile"] = result;
			state["currentFileHeaders"] = keys;
		}
		// console.log(JSON.stringify(state));
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
					{ name: 'SpreadSheet File', extensions: ['xls', 'xlsx', 'csv']}
				]
			},
			function(file) {
				if (file === undefined) return;
				var fileName = file[0];
				if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
					this.handleXlsFile(stateKey, fileName);
				}
				else if (fileName.endsWith('.csv')) {
					this.handleCsvFile(stateKey, fileName);
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

		this.setState({sameFileHeaders: sFileHeaders});

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
					targetFields.unshift("身分證字號");
				}
				if (targetFields.indexOf("原因") == -1) {
					targetFields.push("原因");
				}
				console.log(targetFields);
			}


			// {ID: [value1, value2, ...]}
			// inputFlag: {0: originalFile, 1: currentFile}
			function buildHash(records, resultRecords, inputFlag) {
				records.forEach(function(record){
					var key = record[ targetFields[0] ];
					var value = [];
					// index 0 is reserved for ID, so it begins with index 1
					for (var i = 1; i < targetFields.length; i++) {
						if (record[ targetFields[i] ]) {
							value.push(record[ targetFields[i] ].replace(',', ''));
						}
					}

					if (!resultRecords[key]) {
						resultRecords[key] = value;
					}
					else {
						var diffRecord = {};
						for (var j = 0; j < records.length; j++) {
							if (records[j][targetFields[0]] == key) {
								diffRecord = records[j];
								break;
							}
						}

						if (inputFlag == 0) {
							diffRecord[targetFields[targetFields.length - 1]] = "原始檔中此筆重複出現";
						}
						else {
							diffRecord[targetFields[targetFields.length - 1]] = "比對檔中此筆重複出現";
						}
						diffRecords.push(diffRecord);
						delete resultRecords[key];
					}
				});
			};

			ipc.send("compareAction", {
				data: "0%"
			});
			ipc.send("buildHash", {
				data: "start"
			});
			buildHash(originalFile, originalRecords, 0); // inputFlag = 0
			buildHash(currentFile, currentRecords, 1); // inputFlag = 1
			ipc.send("buildHash", {
				data: "finish"
			});

			ipc.send("compareAction", {
				data: "25%"
			});
			var copyOfOriginalRecords = originalRecords;
			for (var oRecordKey in originalRecords) {
				if (currentRecords[oRecordKey] == undefined) {
					var record = {};
					// console.log(oRecordKey);
					delete copyOfOriginalRecords[oRecordKey];

					for (var i = 0; i < originalFile.length; i++) {
						if (originalFile[i][targetFields[0]] == oRecordKey) {
							record = originalFile[i];
							record[targetFields[targetFields.length - 1]] = "原始檔中此筆在比對檔中找不到";
							diffRecords.push(record);
							break;
						}
					}
				}
			}

			ipc.send("compareAction", {
				data: "50%"
			});

			for (var cRecordKey in currentRecords) {
				if (originalRecords[cRecordKey] == undefined) {
					var record = {};
					for (var i = 0; i < currentFile.length; i++) {
						if (currentFile[i][targetFields[0]] == cRecordKey) {
							record = currentFile[i];
							record[targetFields[targetFields.length - 1]] = "比對檔中此筆在原始檔中找不到";
							diffRecords.push(record);
							break;
						}
					}
				}
			}
			ipc.send("compareAction", {
				data: "75%"
			});

			for (var key in copyOfOriginalRecords) {
				var record = {};
				var currentValue = currentRecords[key];
				var originalValue = originalRecords[key];

				record[targetFields[0]] = key;
				originalValue.forEach(function(v){
					if ( -1 === currentValue.indexOf(v) ) {
						for (var i = 1; i < targetFields.length - 1; i++) {
							record[targetFields[i]] = JSON.stringify(originalValue[i-1] - currentValue[i-1]);
						}
						record[targetFields[targetFields.length - 1]] = "比對欄位不相同";
						diffRecords.push(record);
					}
				});
			}

			ipc.send("compareAction", {
				data: "100%"
			});


			// diffRecords.forEach(function(record) {
			// 	console.log(JSON.stringify(record));
			// });

			ipc.send("diffRecords", {
				data: diffRecords,
				fields: targetFields
			});

		});
	},

	render: function() {
		return (
			<div>
				<div id="title">
					<h1>File compare</h1>
				</div>
				<div className="container" id="control-button">
					<button className="btn btn-default" onClick={this.handleReset}>Reset</button>
					<div className="pull-right">
					<button className="btn btn-primary" onClick={this.compareFiles}>Next</button>
					</div>
				</div>
				<div className="container">
				<div ref="OriginalFile" id="ogfile">
					<strong>Original File Drag Here</strong><br/>
					{this.state.originalFilePath}
				</div>

				<div ref="CurrentFile" id="crfile">
					<strong>Current File Drag Here</strong><br/>
					{this.state.currentFilePath}
				</div>
				</div>

			</div>
		);
	}

});
