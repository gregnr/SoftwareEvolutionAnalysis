var async = require("async");
var nodegit = require("nodegit")
var moment = require("moment");


//Initialize globals
var gIssues = [];
var gCommits = [];
var gUrl;
var gTestDirectory;
var gPullRequestFlag;
var gFilterIssueLabels;
var gKeywords;

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
        
            //Only include entries that are directories or files (ie. exclude Git submodules)
            if (entry.isTree() || entry.isFile()) {
        
                //Wrap in a self-invoking function to preserve scope
                (function(entry) {
                
                    asyncFunctions.push(function(callback) {
            
                        if (entry.isTree()) {
                        
                            //Entry is a directory. Recursively call countLinesInDirectory()
                            
                            getTreeByEntry(entry, function(error, tree) {
                            
                                countLinesInDirectory(tree, callback);
                            });
                        
                        } else if (entry.isFile()) {
                
                            //Entry is a file
                            
                            countLinesInFile(entry, callback);
                        }
                    });
                    
                })(entry);
            }
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
    var issueLabels;
    var issueTitle;
    var issueBody;

    for (var j = 0; j < gIssues.length; j++) {
    
        var issue = gIssues[j];
        var issue_opened = moment(issue.created_at);
        var counted = false;
 
        //Check gPullRequestFlag if 'y' skip issue
        if(gPullRequestFlag == 'n'){
            if (issue.pull_request !== undefined){ 
                continue;
            }
        }
        //Check gFilterIssueLabels
        if(gFilterIssueLabels && issue.labels !== undefined){
            issueLabels = issue.labels;
            for (x in issueLabels) {
                if(gFilterIssueLabels.indexOf(issueLabels[x].name.toUpperCase()) > -1){
                    if (issue_opened < currentWeek.clone().add(1, "week")  && 
                            issue_opened > currentWeek) {
                        incrementDataSet(openIssues, weekCounter);
                        counted = true;
                    }
                }
            }
        }
        //Check gKeywords
        if(gKeywords && issue.title !== undefined && !counted){
            issueTitle = issue.title.toUpperCase();
            if (issue.body !== undefined){
                issueBody = issue.body.toUpperCase();
                for(x in gKeywords && !counted){
                    if(issueBody.indexOf(gKeywords[x]) > -1){    
                        if (issue_opened < currentWeek.clone().add(1, "week")  && 
                                issue_opened > currentWeek) {
                            incrementDataSet(openIssues, weekCounter);
                            counted = true;
                        }
                    }
                }
            }
            for (x in gKeywords) {
                if(issueTitle.indexOf(gKeywords[x]) > -1 && !counted){
                    if (issue_opened < currentWeek.clone().add(1, "week")  && 
                            issue_opened > currentWeek) {
                        incrementDataSet(openIssues, weekCounter);
                        counted = true;
                    }
                }
            }
        }
        //If keywords or labels specified continue here and do not count this issue
        if (gKeywords || gFilterIssueLabels || counted){
        continue;
        }
        //Otherwise, count all issues
        if (issue_opened < currentWeek.clone().add(1, "week")  && 
                issue_opened > currentWeek) {
            incrementDataSet(openIssues, weekCounter);
        }     
    }
}

var processData = function(callback) {


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
        
        callback({
            time: time,
            numberIssues: numberIssues,
            deltaVolumeTests: deltaVolumeTests
        });
    });
};

module.exports.analyse = function (test, issues, commits, url, prFlag, labels, keywords, callback) {

    gCommits = commits;
    gUrl = url;
    gIssues = issues;
    gTestDirectory = test;
    gPullRequestFlag = prFlag;
    gFilterIssueLabels = labels; 
    gKeywords = keywords;

    processData(callback);
}
