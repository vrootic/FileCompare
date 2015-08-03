var ipc = require("ipc");
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
      this.setState({diffRecords: args.data});
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
          <br/>
          <table>
            <thead>
              {this.state.sameFields.map(function(field){
                return (
                  <td>{field}</td>
                );
              }.bind(this))}
            </thead>
            <tbody>
              {this.state.diffRecords.map(function(record){
                return (
                  <tr>
                    {this.state.sameFields.map(function(field){
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