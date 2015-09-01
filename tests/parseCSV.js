var xlsx = require("xlsx");
var fs = require("fs");

var workbook = xlsx.readFile("主計屆退.xls");

var result = {};
workbook.SheetNames.forEach(function(sheetName) {
  var roa = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
  if(roa.length > 0){
    result[sheetName] = roa;
  }
});

// console.log(result);
var wb = {};
wb['SheetNames'] = ['Sheet1'];
wb['Sheets'] = {};

Object.defineProperty(wb, 'SheetNames', {
  value: ['Sheet1'],
});

var sheets = {};
var first = 65, last = 91;

lines = result['工作表1'].split("\n");
for (var i = 1; i <= lines.length; i++){
  cells = lines[i-1].split(',');
  for (var j = first; j < first + cells.length; j++){
    sheets[String.fromCharCode(j) + i] = cells[j-first];
  }
}
Object.defineProperty(wb, "Sheets", {
  value: sheets,
});

// console.log(wb.SheetNames.length);
xlsx.writeFile(result, "export.xlsx");
// fs.writeFile("export.csv", result, function(err){
//   if (err) throw err;
// });
