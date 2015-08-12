var xlsx = require("xlsx");

var workbook = xlsx.readFile("主計屆退.xls");

var result = xlsx.utils.sheet_to_json(workbook);
if (result) {
  console.log(result);
}
else {
  console.log("not exist");
}
//xlsx.writeFile(result, "out.csv");
