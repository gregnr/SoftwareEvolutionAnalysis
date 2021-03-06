var plotly = require("plotly");
plotly = plotly("seng371", "k66ptaq4eh");
var swig = require("swig");
var mkdirp = require("mkdirp");
var fs = require("fs");

var templates = "templates/";

//TODO configure via command line?
var templateName = "default.html";



var renderHtml = function (repo_name, plotlyGraphId, callback) {

    var template = swig.compileFile(templates + templateName);

    var now = new Date();

    mkdirp("out", function (err) {
        
        if (err) {

            console.err("Couldn't create out directory: " + err);
            callback(err);

        } else {

            var html_data = {
                plotlyid: plotlyGraphId,             
                repo: repo_name,
                date: now.toString()    
            }

            //output html file
            fs.writeFile("out/" + repo_name + " " + now + ".html", template(html_data), function (err) {
                if (err) {
                    console.error(err);
                    callback(err);
                } else {
                    console.log("Results available at: out/" + repo_name+ " " + now + ".html");
                    callback();
                }
            });
        }
    });
}

module.exports.generateGraph = function(repo, data, callback) {

	var layout = {
	
        title: "Change in Test Volume and Open Issues over Time",
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

    var graphOptions = {
        layout: layout, 
        filename: repo + " " + new Date(), 
        fileopt: "overwrite"
    };
	
	plotly.plot(data, graphOptions, function(err, msg) {
	    
		console.log("graph generated");
		
		callback({
		    plotlyUrl: msg.url,
		    plotlyGraphId: msg.url.split("/").slice(-1)[0]
		});
	});
};

module.exports.generateHtml = function (repo, plotlyGraphId, callback) {

    renderHtml(repo, plotlyGraphId, callback);
};



