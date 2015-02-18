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
    .alias("h", "help")
    .describe("u", "GitHub username")
    .describe("p", "GitHub password")
    .describe("r", "GitHub repository")
    .describe("t", "Unit test directory")
    .describe("h", "Show the help menu");

var issues = require("./issues");
var graph = require("./graph");

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

var getLineSum = function(commit, callback) {

    //Get the directory tree for an entry
    var getTreeByEntry = function(entry, callback) {
        
        //Entry is a directory
    
        var repo = commit.owner();
        var oid = entry.oid();
        
        repo.getTree(oid).then(function(tree) {
        
            callback(null, tree);
            
        }, function(error) {
            
            callback(error);
        });
    };
    
    //Count the lines in a single file
    var countLinesInFile = function(entry, callback) {
        
        entry.getBlob().then(function(blob) {
        
            var numberLines = blob.content().toString().split("\n").length - 1;

            callback(null, numberLines);
            
        }, function(error) {
            
            callback(error);
        });
    };

    //Recursively sum up the lines within a directory
    var countLinesInDirectory = function(tree, callback) {
    
        //Get entries (files/directories) within directory tree
        var entries = tree.entries();
        
        var asyncFunctions = [];
    
        for (var i = 0; i < entries.length; i++) {
            
            var entry = entries[i];
        
            //Wrap in a self-invoking function to preserve scope
            (function(entry) {
            
                asyncFunctions.push(function(callback) {
        
                    if (entry.isTree()) {
                    
                        //Entry is a directory. Recursively call countLinesInDirectory()
                        
                        getTreeByEntry(entry, function(error, tree) {
                        
                            countLinesInDirectory(tree, callback);
                        });
                    
                    } else {
            
                        //Entry is a file
                        
                        countLinesInFile(entry, callback);
                    }
                });
                
            })(entry);
        }
        
        async.series(asyncFunctions, function(error, fileLines) {
        
            if (error) {
                
                callback(error);
                return;
            }
            
            if (fileLines) {
            
                var lineSum = 0;
                
                for (var i = 0; i < fileLines.length; i++) {
                    
                    lineSum += fileLines[i];
                }

                callback(null, lineSum);
                
            } else {
                
                //No lines returned - directory tree is empty
                callback(null, 0);
            }
        });
    };

    //Get repo root tree
    var rootTree = commit.getTree().then(function(rootTree) {

        //Get the tree entry for the test directory specified
        return rootTree.entryByPath(gTestDirectory);
        
    }).then(function(entry) {
    
        //Test directory specified exists
        
        if (entry.isTree()) {
            
            //Test directory specified is indeed a directory
        
            getTreeByEntry(entry, function(error, tree) {
        
                countLinesInDirectory(tree, function(error, lines) {
                
                    if (error) {
                        console.error(error);
                    }
                
                    callback({
                        moment: commit.moment,
                        lines: lines
                    });
                });
            });
            
        } else {
            
            //Test directory specified is really a file
            //Right now returning 0 lines - need to come up with a better way to handle this case (ie. return error)
        
            callback({
                moment: commit.moment,
                lines: 0
            });
        }
        
    }, function(error) {

        //Test directory specified doesn't exist in this commit. This is common if the repo didn't have tests in early commits
        
        callback({
            moment: commit.moment,
            lines: 0
        });
    });
};

var incrementDataSet = function (dataset, x) { 
   
    if (dataset[x] == undefined) {
        dataset[x] = 1;
    } else {
        dataset[x]++;
    }

}

var countIssuesForWeek = function (currentWeek, weekCounter, openIssues) {
   
    for (var j = 0; j < gIssues.length; j++) {
        
        var issue = gIssues[j];
        var issue_opened = moment(issue.created_at);
        
        //disregard all pull requests
        //if (issue.pull_request !== undefined) continue;
        if (issue_opened < currentWeek.clone().add(1, "week")  && 
            issue_opened > currentWeek) {
            incrementDataSet(openIssues, weekCounter);
        }
    }

}

var printIssues = function(callback) {


    for (var i = 0; i < gCommits.length; i++) {
        
        var format = "MMM DD YYYY HH:mm:ss";
        gCommits[i].moment = moment((/.{4}(.{20}).*/).exec(gCommits[i].date()).slice(1), format);

    }

    gCommits.sort(function (a,b) {
        
        if (a.moment > b.moment) return 1;
        else if (a.moment < b.moment) return -1;
        else return 0;

    });

    var currentWeek  = gCommits[0].moment.clone();
    var finalWeek = gCommits[gCommits.length-1].moment.clone();

    //data points
    var openIssues = []; 
    var linesOfCode = [];
    var linesOfCodeDerivative = [];

    var lineSumReq = [];

    var weekCounter = 0;
    var commitCounter = 0; 
   
    while (currentWeek < finalWeek) {

        //count issues for current week
        countIssuesForWeek(currentWeek, weekCounter, openIssues);

        //count line of code for current week
        //call gregs function
        (function (commit, weekCounter) { 
            lineSumReq.push(function (callback) {
                getLineSum(commit, function (obj) {
                    linesOfCode[weekCounter] = obj.lines;
                    callback();
                });

            });

        })(gCommits[commitCounter], weekCounter);        

        //increment counters
        currentWeek.add(1, "week");
        weekCounter++;
        while (gCommits[commitCounter] &&  gCommits[commitCounter].moment < currentWeek) {
            commitCounter++;
        }
    }
    
    async.parallel(lineSumReq, function () {
    
        //Get change in LOC
        
        var prevLineCount = 0;
        for (var i = 0; i < linesOfCode.length; i++) {
        
            lineCount = linesOfCode[i];
            
            linesOfCodeDerivative.push(lineCount - prevLineCount);
            
            prevLineCount = lineCount;
        }
    
        // prints all data points

	var time = [];
	var numberIssues = [];
	var deltaVolumeTests = [];
	
        for (var k = 0; k < weekCounter; k++) {
           
            var output = k + ",";    
	    time.push(k);

            if (openIssues[k] == undefined) {
                output += "0,";
		numberIssues.push(0);
            } else {
                output += openIssues[k] + ",";
            	numberIssues.push(openIssues[k]);
	    }

            if (linesOfCode[k] == undefined) {
                output += "0,";
            } else {
                output += linesOfCode[k] + ",";
            }
            
            if (linesOfCodeDerivative[k] == undefined) {
                output += "0";
		deltaVolumeTests.push(0);
            } else {
                output += linesOfCodeDerivative[k];
		deltaVolumeTests.push(linesOfCodeDerivative[k]);
            }
        
            console.log(output);
        }
	
    	var repo_name = (/^.*\/([^\/]+)$/).exec(gUrl).slice(1);
	
	var o_numberIssues = {
		x: time,
		y: numberIssues,
		type: "scatter",
		yaxis: "y2"
	};

	var o_deltaVolumeTests = {
		x: time,
		y: deltaVolumeTests,
		type: "scatter"
	};

	var data = [o_numberIssues, o_deltaVolumeTests];

	console.log("call graph");

	graph.graph_me(repo_name, data, callback);

    });
};


var scrapeCommits = function (firstCommitOnMaster, callback) {
   
    var history = firstCommitOnMaster.history();
    
    history.on("commit", function (commit) { 
        gCommits.push(commit);
    });
    
    history.on("end", function (commit) {
        return callback();
    });

    history.start();
};

var loadRepoHistory = function (callback) {
   
    //parse string params
    var repo_name = (/^.*\/([^\/]+)$/).exec(gUrl).slice(1);
    var repo_path = "./.repo_cache/" + repo_name;
    
    
    // create .repo_cache directory if it does not exist
    mkdirp(repo_path, function(err, created_dir) { 
        
        if (err) {
            console.error(err);
            return;
        }

        //TODO: prompt whether to overwrite cache
        if (created_dir == undefined) {

            console.log("Syncing cached repository: " + repo_name);
            
            var repository;

            nodegit.Repository.open(repo_path)

                .then(function (repo) {
                    repository = repo;
                    return repository.fetchAll({}, true);
                }, function (err) { console.error(err); return;})

                .then(function () {
                    return repository.mergeBranches("master", "origin/master");
                }, function (err) {console.error(err); return;})

                .then(function () {
                    return repository.getMasterCommit();
                })

                .then(function (firstCommitOnMaster) {
                    scrapeCommits(firstCommitOnMaster, callback);
                });


        } else {

            console.log("Cloning repository: " + repo_name);     
            
            // clone repo to local filesystem using nodegit module
            // ignore https cert errors due to https://github.com/nodegit/nodegit/issues/322
            nodegit.Clone.clone(gUrl, repo_path, { ignoreCertErrors: 1})

                .then(function (repo) {
                    return repo.getMasterCommit();
                }, function (err) { console.error(err); return;})

                .then(function (firstCommitOnMaster) {
                    scrapeCommits(firstCommitOnMaster, callback); 
                });
        }
    }); 
};

async.series([promptCredentials, loadIssues, loadRepoHistory, printIssues], function(err) {
    
    if (err) {
        console.error(err);
    }
});
