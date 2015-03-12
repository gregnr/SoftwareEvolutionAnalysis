var async = require("async");
var nodegit = require("nodegit")
var prompt = require("prompt");
var mkdirp = require("mkdirp");
var moment = require("moment");
var yargs = require("yargs")
    .alias("u", "username")
    .alias("p", "password")
    .alias("r", "repo")
    .alias("t", "testdir")
    .alias("z", "pullrequest")
    .alias("l", "filterissues")
    .alias("h", "help")
    .describe("u", "GitHub username")
    .describe("p", "GitHub password")
    .describe("r", "GitHub repository")
    .describe("t", "Unit test directory")
    .describe("z", "Include pull requests (y/n)")
    .describe("l", "Filter issues by given label(s)")
    .describe("h", "Show the help menu");

var analyser = require("./analyser");
var issues = require("./issues");
var sync = require("./sync");

var argv = yargs.argv;

//If --help argument present, display help and return
if (argv.help) {
    yargs.showHelp();
    return;
}

//Initialize globals
var gIssues = [];
var gCommits = [];
var gUsername;
var gPassword;
var gUrl;
var gTestDirectory;
var pullRequestFlag;
var filterIssueLabels;

//Async functions
var promptCredentials = function(callback) {

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
	pattern: /y|n/,
	message: "Include pull requests in analysis 'y'-yes or 'n'-no" 
    };
    var filterissuesConfig = {
	name: "filterissues",
	description: "Filter issues by given label(s)",
	pattern: /^[a-zA-Z\,]/,
	message: "specify labels separated by comma's ex. ('bug,enhancement,UI')"
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
	pullRequestFlag = argv.pullrequest;
    } else {
	properties.push(pullrequestConfig);
    }

    //Filter by label(s) 
    if (argv.filterissues) {
	filterIssueLabels = argv.filterissues;
    } else {
	properties.push(filterissuesConfig);
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
	    pullRequestFlag = result.pullrequest;
        }
	if (result.filterissues) {
	    filterIssueLabels = result.filterissues
	}	   
	callback();
    });
};

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


var analyseRepo = function (callback) {

    console.log("Beginning analysis");
    analyser.analyse(gTestDirectory, gIssues, gCommits, gUrl,  callback);

}


var loadCommits = function (callback) {

    sync.loadCommits(gCommits, gUrl, callback);

}

//main flow

async.series([promptCredentials, loadIssues, loadCommits, analyseRepo], function(err) {
    
    if (err) {
        console.error(err);
    }
});

//Testing command line additions
/*
async.series([promptCredentials], function(err) {
    
    if (err) {
        console.error(err);
    }
});
*/
