var core = require("./core");
var graph = require("./graph");

var async = require("async");
var prompt = require("prompt");
var yargs = require("yargs")
    .alias("u", "username")
    .alias("p", "password")
    .alias("r", "repo")
    .alias("t", "testdir")
    .alias("z", "pullrequest")
    .alias("l", "filterissues")
    .alias("k", "keywords")
    .alias("h", "help")
    .describe("u", "GitHub username")
    .describe("p", "GitHub password")
    .describe("r", "GitHub repository")
    .describe("t", "Unit test directory")
    .describe("z", "Include pull requests (y/n)")
    .describe("l", "Filter issues by given label(s)")
    .describe("k", "Filter issues by keyword(s) search")
    .describe("h", "Show the help menu");

var argv = yargs.argv;

//If --help argument present, display help and return
if (argv.help) {
    yargs.showHelp();
    return;
}

var gUsername;
var gPassword;
var gUrl;
var gTestDirectory;
var gPullRequestFlag;
var gFilterIssueLabels;
var gKeywords;

var gPlotlyGraphId;

//Prompts user for arguments
var promptArguments = function(callback) {
    
    var properties = [
        {
            name: "username",
            description: "GitHub Username",
            pattern: /^[a-zA-Z\s\-]+$/,
            message: "Username must be only letters, spaces, or dashes"
        },
        {
            name: "password",
            description: "GitHub Password",
            hidden: true
        }, 
        {
            name: "repo",
            description: "GitHub Repository URL",
            pattern: /https?:\/\/github.com\/*/,
            message: "URL must be to a GitHub repository"
        },
        {
            name: "testdir",
            description: "Unit Test Directory",
            message: "Directory containing unit tests to analyze"
        }, 
        {
            name: "pullrequest",
            description: "Include pull requests (y/n)",
            pattern: /^(y|n){1}$/,
            message: "Include pull requests in analysis 'y'-yes or 'n'-no" 
        },
        {
            name: "filterissues",
            description: "Filter issues by given label(s)",
            pattern: /^([a-zA-Z]+)(,\s[a-zA-Z]+)*$/,
            message: "specify labels separated by comma's ex. ('bug, enhancement, UI')"
        },
        {
            name: "keywords",
            description: "Filter issues by keyword(s) search",
            pattern: /^([a-zA-Z]+)(,\s[a-zA-Z]+)*$/,
            message: "specify keywords separated by comma's ex. ('UI, view, heatmap')"
        }
    ];

    //Override prompts for arguments specified in the command line
    prompt.override = argv;

    //Init prompt
    prompt.start();

    //Prompt for arguments
    prompt.get(properties, function (err, result) {

        if (err) {
            console.error(err);
            return;
        }

        if (result.username) {
            gUsername = result.username;
        }

        if (result.password) {
            gPassword = result.password;
        }

        if (result.repo) {
            gUrl = result.repo;
        }

        if (result.testdir) {
            gTestDirectory = result.testdir;
        }
	
    	if (result.pullrequest) {
            gPullRequestFlag = result.pullrequest;
        }

	    if (result.filterissues) {
            gFilterIssueLabels = result.filterissues;
            gFilterIssueLabels = gFilterIssueLabels.toUpperCase();
            gFilterIssueLabels = gFilterIssueLabels.split(", ");
    	}	  
 
	    if (result.keywords) {
            gKeywords = result.keywords;
            gKeywords = gKeywords.toUpperCase();
            gKeywords = gKeywords.split(", ");
	    }
	    
        callback();
    });
};

var analyseRepo = function(callback) {

    var config = {
        username: gUsername,
        password: gPassword,
        repoUrl: gUrl,
        testDirectory: gTestDirectory,
        pullRequestFlag: gPullRequestFlag,
        filterIssueLabels: gFilterIssueLabels,
        filterIssueKeywords: gKeywords
    };

    core.analyseRepo(config, function(response) {
        
        gPlotlyGraphId = response.plotlyGraphId;
        
        callback();
        
    }, function(error) {
        
        callback(error);
    });
};

var generateHtml = function(callback) {

    var repo_name = (/^.*\/([^\/]+)$/).exec(gUrl).slice(1);
    
    graph.generateHtml(repo_name, gPlotlyGraphId, callback);
};

//Main flow
async.series([promptArguments, analyseRepo, generateHtml], function(err) {
    
    if (err) {
        console.error(err);
    }
});
