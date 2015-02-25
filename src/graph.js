var plotly = require("plotly");
plotly = plotly("seng371", "k66ptaq4eh");

module.exports.graph_me  = function (repo, data, callback) {
	
	var layout = {title: "Change in Test Volume and Open Issues over Time",
			autosize: false,
			width: 1200,
			height: 800,
			xaxis: {
				title: "Week Number"
			},
			yaxis: {
				title: "Lines of Code"
			},
			yaxis2: {
				title: "Issues",
				side: "right",
				overlaying: "y"
			},
		};

	var graphOptions = {layout: layout, 
				filename: repo + " " + new Date(), 
				fileopt: "overwrite"};
	
	plotly.plot(data, graphOptions, function(err, msg){
		console.log("graph complete!");
		callback();	
	});

}



