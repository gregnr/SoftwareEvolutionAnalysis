//Import dependencies
var https = require("https");
var async = require("async");
var fs = require("fs");
var moment = require("moment");
var mkdirp = require("mkdirp");

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

var getGithubPathFromUrl = function(url, page_num, date, issue_status, per_page) {
    
    //assign default values
    issue_status = typeof issue_status !== "undefined" ? issue_status : "all";
    per_page = typeof per_page !== "undefined" ? per_page : 100;

    //Regex to extract path
    path_pattern = /\/\/[^\/]*\/(.*)$/; 

    var match = path_pattern.exec(url);
    
    if (match !== null) {
        var path = match.slice(1);
        
        var toReturn = "/repos/" + path + "/issues?state=" + issue_status +
            "&per_page=" + per_page + "&page=" + page_num;

        if (date) {
            toReturn += "&since=" + date.format();
        } 

        return toReturn;

    } else {
        console.error("Could not get path from url: " + url);
        return;
    }
 
};

var getLastPageFromHeaders = function (headers) {

    var sLastPage = (/\, <.*page=(.+).*>; rel="last"/).exec(headers["link"]);

    if (!sLastPage) {
        
        return 1;
    }
    
    return parseInt(sLastPage.slice(1));

};

var mergeNewIssues = function (newIssues, cacheIssues) {
    
    for (var i = 0; i < newIssues.length; i++) {
        
        var newIssue = newIssues[i];
        var found = false;
        
        for (var k = 0; k < cacheIssues.length; k++) {
            
            if (newIssue.id == cacheIssues[k].id) {
                //update existing cache entry
                found = true;
                cacheIssues[k] = newIssue   
            }
        }
        
        if (!found) {
            //new cache entry
            cacheIssues.push(newIssue);
        }
        
    }
    
    //return cloned array
    return cacheIssues.slice(0);
}

var getCacheContents = function () {


    var repo_name = (/^.*\/([^\/]+)$/).exec(gUrl).slice(1).toLowerCase();

    try {

    var content = fs.readFileSync(".issue_cache/" + repo_name, "utf8");
    
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('Issue cache not found');
            return {cached: []};
        } else {
            throw e;
        }

    }

    var date = moment(content.split("\n")[0]);

    var parse_content = JSON.parse(content.split("\n")[1]);

    return {date: date, cached: parse_content};
}

var cacheIssues = function (issues, timestamp) {
      
    var repo_name = (/^.*\/([^\/]+)$/).exec(gUrl).slice(1);
    
    mkdirp(".issue_cache", function (err) {
        if (err) console.error(err);

        fs.writeFile(".issue_cache/" + repo_name,
            timestamp.format() + "\n" + JSON.stringify(issues),
            function (err) {
                if (err) console.error(err);
                console.log("cached");
            }
        );
    });

}


var issueRequest = function(callback, page_num, date) {

    var options = {
        host: "api.github.com",
        path: getGithubPathFromUrl(gUrl, page_num, date),
        headers: {
            "user-agent": "UnitTestBugAnalyzer",
            "Authorization": getBasicAuthenticationHeader(gUsername, gPassword)
        }
    };

    // update user of progress
    if (giLastPage != 0) {

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
       
        process.stdout.write("Getting Issues from GitHub. Page " + page_num + " of " +
            giLastPage + " (" + Math.round((page_num/giLastPage) * 100) +
            "%)"); 
   
    } else {
        //we don"t know how many pages if giLastPage not updated
        process.stdout.write("Getting Issues From GitHub. Page " + page_num + " of ?");    
    }

    https.get(options, function(response) {
        
        var data = "";
        
        response.on("data", function(streaming_resp){

            //collect stream
            data += streaming_resp;
        });
        
        response.on("end", function() {
        
            //Check for error status codes
            if (response.statusCode === 401) {
                callback("Failed to authenticate user.");
                return;
            } else if (response.statusCode !== 200) {
                callback("Error loading issues (HTTP status code " + response.statusCode + ").");
                return;
            }

            giLastPage = getLastPageFromHeaders(response.headers);

            //push data on to global gIssues array
            gIssues.push(JSON.parse(data));

            //done this request
            callback(null);
        });

    }).on("error", function(e) {
        callback(e);
    });
};

var fetchIssues = function(callback) {
    
    //pages are 1-indexed
    var page = 1;
    
    //variables for caching
    var timestamp = moment(); //current date
    var cache = getCacheContents(); 


    async.doWhilst(
        
        //repeating function call
        function (callback) {
        
            (function(page) {

                if (cache.date) {
                    issueRequest(callback, page, cache.date);
                } else {
                   issueRequest(callback, page);
                }

            })(page);
            page++;
        },
        
        // async.doWhilst stops itteration when this function returns false
        function() { 
            //Note that giLastPage is dynamically updated based on request results
            return page <= giLastPage;
        },

        //called after itteration stops
        function (err) {
        
            if (err) {
                process.stdout.write("\n");
                callback(err);
                return;
            }

            process.stdout.clearLine();
            process.stdout.cursorTo(0);

            process.stdout.write("Getting Issues from GitHub. Page " + giLastPage + " of " +
            giLastPage + " (100%)"); 
            //write out a \n when done with updating user
            process.stdout.write("\n"); 
            
            //flatten array
            var flatIssues = [];
            flatIssues = flatIssues.concat.apply(flatIssues, gIssues);

            var allIssues = [];

            if (cache) {
                allIssues = mergeNewIssues(flatIssues, cache.cached);
            }            

            (function (issues)  { cacheIssues(issues, timestamp)} )(allIssues);

            return callback(null, allIssues);
        }
    );
};


module.exports.get = function (callback, user, pass, repo) {

    gUsername = user;
    gPassword = pass;
    gUrl = repo;    

    fetchIssues(callback);
};
