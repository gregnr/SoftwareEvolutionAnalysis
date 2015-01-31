var async = require("async");
var gift = require("gift");
var prompt = require("prompt");
var mkdirp = require("mkdirp");
var yargs = require("yargs")
    .alias("u", "username")
    .alias("p", "password")
    .alias("r", "repo")
    .alias("h", "help")
    .describe("u", "GitHub username")
    .describe("p", "GitHub password")
    .describe("r", "GitHub repository")
    .describe("h", "Show the help menu");

var issues = require("./issues");


var argv = yargs.argv;

//If --help argument present, display help and return
if (argv.help) {
    yargs.showHelp();
    return;
}

//Initialize globals
var gIssues = [];
var gUsername;
var gPassword;
var gUrl;

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

    //If user entered all arguments, return
    if (properties.length === 0) {
        callback();
        return;
    }

    //Init prompt
    prompt.start();

    //Prompt for Github username and password
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

        callback();
    });
};

var loadIssues = function(callback) {
    
    issues.get(

        function (err, result) {
        
            if (err) {
                console.error(err);
                return;
            }            
    
            gIssues = result;
            callback(err, result);

        }, 

        gUsername,
        gPassword,
        gUrl
    );

}

var printIssues = function(callback) {

    for (var j = 0; j < gIssues.length; j++) {
        var issue = gIssues[j];
        //console.log(issue.number + ": " + issue.title);
    }

    return callback();
}

var loadRepoHistory = function (callback) {
   
    //parse string params
    var checkout_url = gUrl + ".git";
    var repo_name = (/^.*\/([^\/]+)\.git$/).exec(checkout_url).slice(1);
    var repo_path = "./.repo_cache/" + repo_name;
    
    
    // create .repo_cache directory if it does not exist
    mkdirp(repo_path, function(err) { 
        
        if (err) {
            console.error(err);
            return;
        }

        console.log("Cloning repository: " + repo_name);
        
        // clone repo to local filesystem using gift module
        gift.clone(checkout_url, repo_path, 
            
            function (err, result) {    
                
                callback(); 

            }
        );

    }); 


}

async.series([promptCredentials, loadIssues, loadRepoHistory, printIssues]);
