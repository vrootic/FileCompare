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
		width: 650,
		height: 350,
		center: true,
		resizable: false,
		frame: true,
	});

	mainWindow.setMenu(null);
	var homepageUrl = "file://" + __dirname + "/index.html";
	mainWindow.loadUrl(homepageUrl);
	// mainWindow.openDevTools();


	ipc.on("sameField", function(evt, args) {

		if (!resultWindow) {
			resultWindow = new BrowserWindow({
				width: 1000,
				height: 600,
				resizable: true,
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

	ipc.on("diffRecords", function(evt, args) {
		var diffRecords = args.data;

		resultWindow.webContents.send("diffRecords", {
			data: diffRecords
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
