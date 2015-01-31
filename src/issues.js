//Import dependancies
var https = require("https");
var async = require("async");
var prompt = require("prompt");

//Initialize variables
var gUsername;
var gPassword;
var gUrl;
var giLastPage = 0;
var gIssues = [];

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
        
        var toReturn = "/repos/" + path + "/issues?state=" + issue_status +
            "&per_page=" + per_page + "&page=" + page_num; 

        return toReturn;

    } else {
        console.error("Could not get path from url: " + url);
        return;
    }
 
}

var getLastPageFromHeaders = function (headers) {

    var sLastPage = (/\, <.*page=(.+).*>; rel="last"/).exec(headers["link"]).slice(1);
    
    return parseInt(sLastPage);

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
        }
    };

    // update user of progress
    if (giLastPage != 0) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("sending issueRequest for page " + page_num + " of " + giLastPage + " (" + Math.round((page_num/giLastPage) * 100) + "%)");    
    } else {
        //we don't know how many pages if giLastPage not updated
        process.stdout.write("sending issueRequest for page " + page_num + " of ?");    
    }

    https.get(options, function(response) {

        giLastPage = getLastPageFromHeaders(response.headers);

        var data = ""; 
        response.on("data", function(streaming_resp){

            //collect stream
            data += streaming_resp;

        }); 
        
        response.on("end", function(){

            //push data on to global gIssues array
            gIssues.push(JSON.parse(data));

            //done this request
            callback(null);
        });

    }).on("error", function(e) {
        callback(e);
    });
}

var fetchIssues = function(callback) {
    
    //pages are 1-indexed
    var page = 1;
    
    async.doWhilst(
        
        //repeating function call
        function (callback) {
            (function(page) {
                issueRequest(callback, page);
            })(page);
            page++;
        },
        
        // async.doWhilst stops itteration when this function returns false
        function() { 
            //Note that giLastPage is dynamically updated based on request results
            return page < giLastPage;  
        },

        //called after itteration stops
        function (err) { 

            //write out a \n when done with updating user
            process.stdout.write("\n"); 
            
            //flatten array
            var flatIssues = [];
            flatIssues = flatIssues.concat.apply(flatIssues, gIssues);

            //just write the number a title of issues to stdout for now            
            for (var j = 0; j < flatIssues.length; j++) {
                var issue = flatIssues[j];
                console.log(issue.number + ": " + issue.title);
            } 
            callback();
        }
    );
};

//Run async functions sequentially
async.series([promptCredentials, fetchIssues]);

