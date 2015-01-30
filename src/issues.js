//Import dependancies
var https = require("https");
var async = require("async");
var prompt = require("prompt");

//Initialize variables
var username;
var password;

//Utility functions
var getBasicAuthenticationHeader = function(username, password) {

	return "Basic " + new Buffer(username + ":" + password).toString("base64");
};


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
		
		username = result.username;
		password = result.password;
		
		callback();
	});
};

var issueRequest = function(callback, i) {

	var options = {
		host: "api.github.com",
		path: "/repos/jquery/jquery/issues?status=all&per_page=100&page=" + i,
		headers: {
			"user-agent": "UnitTestBugAnalyzer",
			"Authorization": getBasicAuthenticationHeader(username, password)
		},
	};

	var resp = "";
	console.log(options.path);
	
	https.get(options, function(response) {

		//console.log("statusCode: ", res.statusCode);
		//console.log("headers: ", res.headers);

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

	var reqs = [];

	for (var i = 0; i < 50; i++) {

		(function(i) {
	
			reqs.push(function (callback) {
		
				issueRequest(callback, i);
			})
		})(i);
	}

	//Run all web API requests in parallel
	async.parallel(reqs, function (err, result) {
	
		if (err) {
			console.error(err);
			return;
		}
		
		console.log(result);
		
		callback();
	});
};

//Run async functions sequentially
async.series([promptCredentials, fetchIssues]);

