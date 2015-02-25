var plotly = require("plotly");
plotly = plotly("seng371", "k66ptaq4eh");

module.exports.graph_me  = function (repo, data, callback) {
	
	var layout = {autosize: false,
			width: 500,
			length: 500,
			yaxis2: {
				title: "Issues",
				side: "right",
				overlaying: "y"
			}
			};

	var graphOptions = {layout: layout, 
				filename: repo + " " + new Date(), 
				fileopt: "overwrite"};
	
	plotly.plot(data, graphOptions, function(err, msg){
		console.log("graph complete!");
		callback();	
	});

}



