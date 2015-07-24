var xlsx = require("xlsx");

var originalFile = xlsx.readFile("104年5月份第2階段期滿役男薪資發放明細.xls");

var result = xlsx.utils.sheet_to_json(originalFile.Sheets[originalFile.SheetNames[0]]);

result.map(function(row) {
  console.log(row["身分證字號"]);
});
