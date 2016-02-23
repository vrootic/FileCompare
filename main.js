var app = require("app"),
		BrowserWindow = require("browser-window");


app.on("window-all-closed", function() {
	app.quit();
});

var mainWindow = null;
var resultWindow = null;
var dialog = require("dialog");
var ipc = require("ipc");

app.on("ready", function() {
	mainWindow = new BrowserWindow({
		width: 700,
		height: 400,
		center: true,
		resizable: false,
		frame: true,
	});

	mainWindow.setMenu(null);
	var homepageUrl = "file://" + __dirname + "/index.html";
	mainWindow.loadUrl(homepageUrl);
	//mainWindow.openDevTools();


	ipc.on("sameField", function(evt, args) {

		if (!resultWindow) {
			resultWindow = new BrowserWindow({
				width: 1050,
				height: 600,
				resizable: false,
			});
		}

		var samefields = args.data;

		resultWindow.webContents.on("did-finish-load", function() {
			resultWindow.webContents.send("sameField", {
				data: samefields
			});
		});

		resultWindow.loadUrl("file://" + __dirname + "/result.html");
		resultWindow.openDevTools();

		resultWindow.on("closed", function() {
			console.log("resultWindow has been closed.");
			resultWindow = null;
		});
	});

	ipc.on("compareRequest", function(evt, args) {
		mainWindow.webContents.send("compareRequest", {
			data: args.data
		});
	});

	ipc.on("buildHash", function(evt, args) {
		console.log("buildHash " + args.data);
	});

	ipc.on("compareAction", function(evt, args) {
		resultWindow.webContents.send("progress", {
			data: args.data
		});
	});

	ipc.on("exportImage", function(evt, args) {
		resultWindow.capturePage(function(image){
			var fs = require("fs");

			dialog.showSaveDialog(
				resultWindow,
				{
					title: "Export to PNG",
			    filters: [{
			       name: "screenshot.png",
			       extensions: ["png"]
			    }]
				},
				function(pathname) {
					if (!pathname) return;
					fs.writeFileSync(pathname, image.toPng());
				}
			);
		});
	});

	ipc.on("diffRecords", function(evt, args) {
		var diffRecords = args.data;
		var targetFields = args.fields;

		resultWindow.webContents.send("diffRecords", {
			data: diffRecords,
			fields: targetFields
		});

	});

	var closeWindowHandler = function(e) {
		e.preventDefault();
		dialog.showMessageBox(
			mainWindow,
			{
				type: "warning",
				title: "Close window",
				message: "Do you want to close the window?",
				buttons: ["Yes", "No"]
			},
			function(response) {
				if (response == 0) {
					if (resultWindow) {
						resultWindow.close();
					}
					mainWindow.removeListener("close", closeWindowHandler);
					setTimeout(mainWindow.close.bind(mainWindow), 0);
				}
			}
		);
	};
	mainWindow.on("close", closeWindowHandler);


	mainWindow.on("closed", function() {
		mainWindow = null;
		resultWindow = null;
	});
});
