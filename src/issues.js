//Import dependancies
var https = require("https");
var async = require("async");
var prompt = require("prompt");

var DEBUG = false;

//Initialize variables
var gUsername;
var gPassword;
var gUrl;

//Utility functions
var getBasicAuthenticationHeader = function(username, password) {

	return "Basic " + new Buffer(username + ":" + password).toString("base64");
};

var getGithubPathFromUrl = function(url, page_num, issue_status, per_page) {
    
    //assign default values
    issue_status = typeof issue_status !== 'undefined' ? issue_status : "all";
    per_page = typeof per_page !== 'undefined' ? per_page : 100;

    //Regex to extract path
    path_pattern = /\/\/[^\/]*\/(.*)$/; 

    var match = path_pattern.exec(url);
    
    if (match !== null) {
        var path = match.slice(1);
        
        var toReturn = "/repos/" + path + "/issues?status=" + issue_status +
            "&per_page=" + per_page + "&page=" + page_num; 

        if (DEBUG) console.log("Generated path: " + toReturn);

        return toReturn;

    } else {
        console.error("Could not get path from url: " + url);
        return;
    }
 
}


//Async functions
var promptCredentials = function(callback) {

	var properties = [
		{
			name: "username", 
			validator: /^[a-zA-Z\s\-]+$/,
			warning: "Username must be only letters, spaces, or dashes"
		},
		{
			name: "password",
			hidden: true
		},
        {
            name: "url",
            validator: /https?:\/\/github.com\/*/,
            warning: "URL must be to a GitHub repository"
        }
	];
	
	//Init prompt
	prompt.start();

	//Prompt for Github username and password
	prompt.get(properties, function (err, result) {

		if (err) {
			console.error(err);
			return;
		}
		
		gUsername = result.username;
		gPassword = result.password;
        gUrl = result.url;
		
		callback();
	});
};

var issueRequest = function(callback, page_num) {

	var options = {
		host: "api.github.com",
		path: getGithubPathFromUrl(gUrl, page_num),
		headers: {
			"user-agent": "UnitTestBugAnalyzer",
			"Authorization": getBasicAuthenticationHeader(gUsername, gPassword)
		},
	};

	var resp = "";

    console.log("sending issueRequest for page " + page_num + " of 10");	

	https.get(options, function(response) {

        if (DEBUG) {
            console.log("statusCode: ", response.statusCode);
            console.log("headers: ", response.headers);
        }       

		response.on("data", function(response){
			resp += response;
		}); 
		
		response.on("end", function(){
			callback(null, resp);
		});

	}).on("error", function(e) {
		callback(e);
	});
}

var fetchIssues = function(callback) {
    if (DEBUG) console.log("issues.js:fetchIssues+");
	var reqs = [];

    //TODO: implement proper pagination
    //Note: pages are 1-indexed
	for (var i = 1; i < 10; i++) {

		(function(i) {
	
			reqs.push(function (callback) {
		
				issueRequest(callback, i);
			})
		})(i);
	}


	//Run all web API requests in parallel
	async.series(reqs, function (err, result) {
	
		if (err) {
			console.error(err);
			return;
		}
		
        console.log("Done grabbing issues");
		if (DEBUG) console.log(result);
		
		callback();
	});

    if (DEBUG) console.log("issues.js:fetchIssues-");
};

//Run async functions sequentially
async.series([promptCredentials, fetchIssues]);

