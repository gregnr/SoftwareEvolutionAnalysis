var core = require("./core");
var graph = require("./graph");

var async = require("async");
var prompt = require("prompt");
var yargs = require("yargs")
    .alias("u", "username")
    .alias("p", "password")
    .alias("r", "repo")
    .alias("t", "testdir")
    .alias("h", "help")
    .describe("u", "GitHub username")
    .describe("p", "GitHub password")
    .describe("r", "GitHub repository")
    .describe("t", "Unit test directory")
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

        callback();
    });
};

var analyseRepo = function(callback) {

    var config = {
        username: gUsername,
        password: gPassword,
        repoUrl: gUrl,
        testDirectory: gTestDirectory
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
