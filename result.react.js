var ipc = require("ipc");
var App = React.createClass({
  getInitialState: function() {
		return {
			sameFields: []
		};
	},

  componentDidMount: function() {
    var data = null;

    ipc.on("result-data", function(args) {
      this.setState({sameFields: args.data});
    }.bind(this));
  },

  render: function() {
    return (
      <div>
        <strong>Result Page</strong>
        <div>
          <ul>
            {this.state.sameFields.map(function(field){
              return(<li><input type="checkbox" />{field}</li>);
            })}
          </ul>
        </div>
      </div>
    );
  },
});
