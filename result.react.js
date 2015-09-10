var ipc = require("ipc");
var xlsx = require("xlsx");
var fs = require("fs");
var App = React.createClass({
  getInitialState: function() {
		return {
			sameFields: [],
      targetFields: [],
      diffRecords: [],
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
      // console.log(JSON.stringify(args));
      this.setState({diffRecords: args.data, targetFields: args.fields});
      // console.log(args.data);
    }.bind(this));

    ipc.on("progress", function(args) {
      this.setState({progressBarStyle: {width: args.data}});
    }.bind(this));

  },

  handleChange: function(e) {
    if (e.target.checked) {
      this.state.targetFields.push(e.target.value);
    }
    else {
      if (e.target.value) {
        var index = this.state.targetFields.indexOf(e.target.value);
        if ( index > -1 ) {
          this.state.targetFields.splice(index, 1);
        }
      }
    }
  },

  sendCompareRequest: function() {
    // console.log(this.state.targetFields);
    ipc.send("compareRequest", {
      data: this.state.targetFields
    });
  },

  exportCsv: function() {
    var csvContent = "";
    var fields = this.state.targetFields;
    var data = this.state.diffRecords;

    var columnDelimiter = ",";
    var lineDelimiter = "\n";

    csvContent += fields.join(columnDelimiter);
    csvContent += lineDelimiter;

    data.forEach(function(item){
      ctr = 0;
      fields.forEach(function(field){
        if (ctr > 0) {
          csvContent += columnDelimiter;
        }
        csvContent += item[field];
        ctr++;
      });
      csvContent += lineDelimiter;
    });

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
          <div className="col-md-3">
            <div className="panel panel-info">
              <div className="panel-heading">選取比較欄位</div>
              <div className="panel-body">
              <ul className="list-group">
                {this.state.sameFields.map(function(field){
                  return(<li className="list-group-item">
                    <input type="checkbox" value={field} onChange={this.handleChange}/> {field}</li>);
                }.bind(this))}
              </ul>
              </div>
            </div>
            <div className="pull-right">
            <button className="btn btn-primary btn-sm" id="goCompare" onClick={this.sendCompareRequest}>Go</button>
            </div>
            <button className="btn btn-success btn-sm" id="exportCsv" onClick={this.exportCsv}>Export</button>

          </div>
          <div className="col-md-9">
            <div className="progress">
              <div className="progress-bar" role="progress" aria-valuemax="100" style={this.state.progressBarStyle}>
                {this.state.progressBarStyle}
              </div>
            </div>
            <legend>Total: {this.state.diffRecords.length}</legend>
            <table className="table table-striped table-hover">
              <thead>
                {this.state.targetFields.map(function(field){
                  return (
                    <td>{field}</td>
                  );
                }.bind(this))}
              </thead>
              <tbody>
                {this.state.diffRecords.map(function(record){
                  if (record != null) {
                    return (
                      <tr>
                        {this.state.targetFields.map(function(field){
                          return (
                            <td>{record[field]}</td>
                          );
                        })}
                      </tr>
                    );
                  }
                }.bind(this))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  },
});
