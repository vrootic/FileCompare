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
//	mainWindow.openDevTools();

	ipc.on("samefield", function(evt, args) {
		resultWindow = new BrowserWindow({
			width: 800,
			height: 600,
			resizable: true
		});

		var samefields = args.data;
		resultWindow.webContents.on("did-finish-load", function() {
			resultWindow.webContents.send("result-data", {
				data: samefields
			});
		});

		resultWindow.loadUrl("file://" + __dirname + "/result.html");
		// resultWindow.openDevTools();

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
					mainWindow.removeListener("close", closeWindowHandler);
					setTimeout(mainWindow.close.bind(mainWindow), 0);
				}
			}
		);
	};
	mainWindow.on("close", closeWindowHandler);

	mainWindow.on("closed", function() {
		mainWindow = null;
	});
});
