var async = require("async");

var analyser = require("./analyser")
var issues = require("./issues");
var sync = require("./sync");
var graph = require("./graph");

//Initialize globals
var gIssues = [];
var gCommits = [];
var gTimeData = [];
var gNumberIssuesData = [];
var gDeltaVolumeTestsData = [];
var gPlotlyGraphId;

var gUsername;
var gPassword;
var gUrl;
var gTestDirectory;
var gPullRequestFlag;
var gFilterIssueLabels;
var gKeywords;
var gBranch;

var loadIssues = function(callback) {
    
    issues.get(

        function (err, result) {         
    
            gIssues = result;
            callback(err, result);
            return;
        }, 

        gUsername,
        gPassword,
        gUrl
    );

};

var loadCommits = function (callback) {

    sync.loadCommits(gCommits, gUrl, gBranch, callback);
};

var analyseRepo = function (callback) {

    console.log("Beginning analysis");
    
    analyser.analyse(gTestDirectory, gIssues, gCommits, gUrl, gPullRequestFlag, gFilterIssueLabels, gKeywords, function(data) {
    
        gTimeData = data.time;
        gNumberIssuesData = data.numberIssues;
        gDeltaVolumeTestsData = data.deltaVolumeTests;
        
        callback();
    });
};

var generateGraph = function(callback) {

    var repo_name = (/^.*\/([^\/]+)$/).exec(gUrl).slice(1);

    var o_numberIssues = {
	    x: gTimeData,
	    y: gNumberIssuesData,
	    type: "scatter",
	    yaxis: "y2",
	    name: "Number of Open Issues"
    };

    var o_deltaVolumeTests = {
	    x: gTimeData,
	    y: gDeltaVolumeTestsData,
	    type: "scatter",
	    name: "Change in Test Volume"
    };

    var data = [o_numberIssues, o_deltaVolumeTests];

    graph.generateGraph(repo_name, data, function(response) {
    
        gPlotlyGraphId = response.plotlyGraphId;
        
        callback();
    });
};

module.exports.analyseRepo = function (config, callback, errback) {

    gUsername = config.username;
    gPassword = config.password;
    gUrl = config.repoUrl;
    gTestDirectory = config.testDirectory;
    gPullRequestFlag = config.pullRequestFlag;
    gFilterIssueLabels = config.filterIssueLabels;
    gKeywords = config.filterIssueKeywords;

    if (config.branch == undefined) {
        gBranch = "master";
    } else {
        gBranch = config.branch;
    }


    async.series([loadIssues, loadCommits, analyseRepo, generateGraph], function(err) {
        
        if (err) {
            errback(err);
            return;
        }
        
        callback({
            plotlyGraphId: gPlotlyGraphId
        });
    });
};
