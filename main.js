var app = require("app"),
		BrowserWindow = require("browser-window");


app.on("window-all-closed", function() {
	app.quit();
});

var mainWindow = null;
var dialog = require("dialog");

app.on("ready", function() {
	mainWindow = new BrowserWindow({
		width: 650,
		height: 350,
		center: true,
		resizable: true,
		frame: true,
	});

	mainWindow.setMenu(null);
	var homepageUrl = "file://" + __dirname + "/index.html";
	mainWindow.loadUrl(homepageUrl);
//	mainWindow.openDevTools();

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
