var ipc = require("ipc");
var xlsx = require("xlsx");
var fs = require("fs");
var App = React.createClass({
  getInitialState: function() {
		return {
			sameFields: [],
      targetFields: [],
      diffRecords: [],
		};
	},

  componentDidMount: function() {
    var data = null;

    ipc.on("sameField", function(args) {
      this.setState({sameFields: args.data});
    }.bind(this));

    ipc.on("diffRecords", function(args) {
      console.log("diffRecords received from resultWindow");
      this.setState({diffRecords: args.data, targetFields: args.fields});
      // console.log(args.data);
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
    console.log(csvContent);
    filename = 'export';
    var iconv = require("iconv-lite");
    data = 'data:text/csv;charset=utf-8;base64,' + iconv.encode(csvContent, "utf-8");

    console.log(data);
    link = document.createElement('a');
    link.setAttribute('href', data);
    link.setAttribute('download', filename);
    link.click();

    // fs.writeFile(filename, csvContent, function(err) {
    //   if (err) throw err;
    //   console.log("It's saved.");
    // });

  },

  render: function() {
    return (

      <div>
        <strong>Result Page</strong>
        <div>
          <ul>
            {this.state.sameFields.map(function(field){
              return(<li><input type="checkbox" value={field} onChange={this.handleChange}/>{field}</li>);
            }.bind(this))}
          </ul>
          <button id="goCompare" onClick={this.sendCompareRequest}>Go</button>
          <button id="exportCsv" onClick={this.exportCsv}>Export</button>
          <br/>
          Number of different Records: {this.state.diffRecords.length}
          <table>
            <thead>
              {this.state.targetFields.map(function(field){
                return (
                  <td>{field}</td>
                );
              }.bind(this))}
            </thead>
            <tbody>
              {this.state.diffRecords.map(function(record){
                return (
                  <tr>
                    {this.state.targetFields.map(function(field){
                      return (
                        <td>{record[field]}</td>
                      );
                    })}
                  </tr>
                );
              }.bind(this))}
            </tbody>
          </table>

        </div>
      </div>
    );
  },
});
