var ipc = require("ipc");
var xlsx = require("xlsx");
var fs = require("fs");
var App = React.createClass({
  getInitialState: function() {
		return {
			sameFields: [],
      uniqueKey: "",
      displayFields: [],
      uniqueFields: [],
      diffRecords: [],
      currentDiffRecords: [],
      displayRecords: [],
      progressBarStyle: {width: "0%"},
		};
	},

  componentDidMount: function() {
    var data = null;

    ipc.on("sameField", function(args) {
      this.setState({sameFields: args.data});
    }.bind(this));

    ipc.on("diffRecords", function(args) {
      console.log("diffRecords received from resultWindow");
      
      this.setState({
        diffRecords: args.data["original"], 
        currentDiffRecords: args.data["current"], 
        uniqueKey: args.data["uniqueKey"],
        uniqueFields: args.data["uniqueFields"],
        displayFields: args.fields,
      });
      
      var uniqueKey = this.state.uniqueKey;
      var displayFields = this.state.displayFields;
      var diffRecords = this.state.diffRecords;
      var currentDiffRecords = this.state.currentDiffRecords;
      var uniqueFields = this.state.uniqueFields;
      var displayRecords = {};

      for (var i = 0; i < diffRecords.length; i++) {
        if (displayRecords[diffRecords[i][uniqueKey]] == undefined) {
          var record = [];
          for (var j = 0; j < displayFields.length; j++) {
            record.push(diffRecords[i][displayFields[j]]);
          }
          displayRecords[diffRecords[i][uniqueKey]] = record;
        }
      }

      for (var i = 0; i < currentDiffRecords.length; i++) {
        var record = [];
        if (displayRecords[currentDiffRecords[i][uniqueKey]] == undefined) {
          for (var j = 0; j < displayFields.length; j++) {
            record.push(currentDiffRecords[i][displayFields[j]]);
          }
          displayRecords[currentDiffRecords[i][uniqueKey]] = record;
        }
        else {
          for (var j = 0; j < diffRecords.length; j++) {
            if (currentDiffRecords[i][uniqueKey] == diffRecords[j][uniqueKey]) {
              record.push(currentDiffRecords[i][uniqueKey]);
              for (var k = 1; k < uniqueFields.length - 1; k++) {
                record.push(diffRecords[j][uniqueFields[k]]);
                record.push(currentDiffRecords[i][uniqueFields[k]]);
              }
              
              record.push(currentDiffRecords[i][displayFields[displayFields.length - 1]]);
              displayRecords[currentDiffRecords[i][uniqueKey]] = record;
            }
          }
        }
      }
      var keys = Object.keys(displayRecords);
      var resultRecords = [];
      for (var i = 0; i < keys.length; i++) {
        resultRecords.push(displayRecords[keys[i]]);
      }

      this.setState({displayRecords: resultRecords});
      
      
    }.bind(this));
    
    ipc.on("progress", function(args) {
      this.setState({progressBarStyle: {width: args.data}});
    }.bind(this));
    
  },

  
  primarySelectChange: function(e) {
    if (e.target.checked) {
      this.state.displayFields.push(e.target.value);
    }
    else {
      if (e.target.value) {
        var index = this.state.displayFields.indexOf(e.target.value);
        if ( index > -1 ) {
          this.state.displayFields.splice(index, 1);
        }
      }
    }
    // console.log(this.state.targetFields);
  },

  sendCompareRequest: function() {
    // console.log(this.state.targetFields);
    ipc.send("compareRequest", {
      data: this.state.displayFields
    });
  },

  exportCsv: function() {
    var csvContent = "";
    var fields = this.state.displayFields;
    var data = this.state.diffRecords;

    var columnDelimiter = ",";
    var lineDelimiter = "\n\r";

    csvContent += fields.join(columnDelimiter);
    csvContent += lineDelimiter;

    data.forEach(function(item){
      ctr = 0;
      fields.forEach(function(field){
        if (ctr > 0) {
          csvContent += columnDelimiter;
        }
        cleanItemField = item[field].replace(',', '');
        csvContent += cleanItemField;
        ctr++;
      });
      csvContent += lineDelimiter;
    });
    console.log(csvContent);
    filename = 'export.csv';
    data = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvContent);

    link = document.createElement('a');
    link.setAttribute('href', data);
    link.setAttribute('download', filename);
    link.click();

    ipc.send("exportImage", {});

  },

  render: function() {
    return (

      <div className="container">
        <h1 className="page-header">Result</h1>
        <div className="row">
          <div className="col-md-4">
            <div className="panel panel-info">
              <div className="panel-heading">Select fields</div>
              <div className="panel-body">

              <ul className="list-group">
                {
                  this.state.sameFields.map(function(field){
                  return(
                    <li className="list-group-item">
                      <input type="checkbox" ref="primary" value={field} onChange={this.primarySelectChange}/> {field}
                    </li>
                  );
                }.bind(this))}
              </ul>
              </div>
            </div>
            <div className="pull-right">
            <button className="btn btn-primary btn-sm" id="goCompare" onClick={this.sendCompareRequest}>Go</button>
            </div>
            <button className="btn btn-success btn-sm" id="exportCsv" onClick={this.exportCsv}>Export</button>

          </div>
          <div className="col-md-8">
            <div className="progress">
              <div className="progress-bar" role="progress" aria-valuemax="100" style={this.state.progressBarStyle}>
                {this.state.progressBarStyle}
              </div>
            </div>
            <legend>Total: {this.state.displayRecords.length}</legend>
            <table className="table table-striped table-hover">
              <thead>
                {this.state.displayFields.map(function(field){
                  return (
                    <td>{field}</td>
                  );
                }.bind(this))}
              </thead>
              <tbody>
                {this.state.displayRecords.map(function(record){
                  return(
                    <tr>
                      {record.map(function(attr){
                        return(
                          <td>{attr}</td>
                        );
                      })}
                    </tr>
                  );
                }.bind(this))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  },
});
