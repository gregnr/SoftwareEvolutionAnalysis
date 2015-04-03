var async = require("async");
var nodegit = require("nodegit")
var prompt = require("prompt");
var mkdirp = require("mkdirp");
var moment = require("moment");

//Initialize globals
var gCommits = [];
var gUrl;
var gBranch;

var scrapeCommits = function (firstCommitOnMaster, callback) {
   
    console.log("Scrape commits");
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
    var repo_name = (/^.*\/([^\/]+)$/).exec(gUrl)[1];
    var repo_path = "./.repo_cache/" + repo_name.toLowerCase();
    
    
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
                    return repository.mergeBranches(gBranch, "origin/" + gBranch);
                }, function (err) {console.error(err); return;})

                .then(function () {
                    return repository.getBranchCommit(gBranch);
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
                    return repo.getBranchCommit(gBranch);
                }, function (err) { console.error(err); return;})

                .then(function (firstCommitOnMaster) {
                    scrapeCommits(firstCommitOnMaster, callback); 
                });
        }
    }); 
};


module.exports.loadCommits = function (coms, url, branch, callback) {
    gCommits = coms;
    gUrl = url;
    gBranch = branch;
    loadRepoHistory(callback);
}
