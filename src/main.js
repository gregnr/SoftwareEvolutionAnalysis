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
    .alias("h", "help")
    .alias("k", "keywords")
    .describe("u", "GitHub username")
    .describe("p", "GitHub password")
    .describe("r", "GitHub repository")
    .describe("t", "Unit test directory")
    .describe("z", "Include pull requests (y/n)")
    .describe("l", "Filter issues by given label(s)")
    .describe("h", "Show the help menu")
    .describe("k", "Filter issues by keyword(s) search");

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

//Prompts user for arguments they didn't specify
var promptArguments = function(callback) {

    var usernameConfig = {
        name: "username",
        description: "GitHub Username",
        pattern: /^[a-zA-Z\s\-]+$/,
        message: "Username must be only letters, spaces, or dashes"
    };

    var passwordConfig = {
        name: "password",
        description: "GitHub Password",
        hidden: true
    };

    var repoConfig = {
        name: "url",
        description: "GitHub Repository URL",
        pattern: /https?:\/\/github.com\/*/,
        message: "URL must be to a GitHub repository"
    };

    var testdirConfig = {
        name: "testdir",
        description: "Unit Test Directory",
        message: "Directory containing unit tests to analyze"
    };

    var pullrequestConfig = {
        name: "pullrequest",
        description: "Include pull requests (y/n)",
        pattern: /^(y|n){1}$/,
        message: "Include pull requests in analysis 'y'-yes or 'n'-no" 
    };

    var filterissuesConfig = {
        name: "filterissues",
        description: "Filter issues by given label(s)",
        pattern: /^([a-zA-Z]+)(,\s[a-zA-Z]+)*$/,
        message: "specify labels separated by comma's ex. ('bug, enhancement, UI')"
    };

    var keywordsConfig = {
        name: "keywords",
        description: "Filter issues by keyword(s) search",
        pattern: /^([a-zA-Z]+)(,\s[a-zA-Z]+)*$/,
        message: "specify keywords separated by comma's ex. ('UI, view, heatmap')"
    };
    var properties = [];

    //Prompt user for arguments they didn't specify:

    //Username
    if (argv.username) {
        gUsername = argv.username;
    } else {
        properties.push(usernameConfig);
    }

    //Password
    if (argv.password) {
        gPassword = argv.password;
    } else {
        properties.push(passwordConfig);
    }

    //Repository
    if (argv.repo) {
        gUrl = argv.repo;
    } else {
        properties.push(repoConfig);
    }

    //Test directory
    if (argv.testdir) {
        gTestDirectory = argv.testdir;
    } else {
        properties.push(testdirConfig);
    }
    
    //Pull requests flag
    if (argv.pullrequest) {
        gPullRequestFlag = argv.pullrequest;
    } else {
        properties.push(pullrequestConfig);
    }

    //Filter by label(s) 
    if (argv.filterissues) {
        gFilterIssueLabels = argv.filterissues;
        gFilterIssueLabels = gFilterIssueLabels.toUpperCase();
        gFilterIssueLabels = gFilterIssueLabels.split(", ");
    } else {
        properties.push(filterissuesConfig);
    }

    //Filter by keyword search 
    if (argv.keywords) {
        gKeywords = argv.keywords;
        gKeywords = gKeywords.toUpperCase();
        gKeywords = gKeywords.split(", ");
    } else {
        properties.push(keywordsConfig);
    }
    //If user entered all arguments, return
    if (properties.length === 0) {
        callback();
        return;
    }

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

        if (result.url) {
            gUrl = result.url;
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
