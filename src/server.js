var core = require("./core");

var express = require("express");
var app = express();

var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(express.static(__dirname +  "/../templates"));

io.on("connection", function(socket) {

    console.log("Client connected");
    
    socket.on("AnalyzeRepoRequest", function(data) {
        
        //TODO Sanatize data from HTML form?
      
        
        var labels = data.labels;

        if (labels) {
            labels = labels.toUpperCase();
            labels = labels.split(", ");
        }


        var keywords = data.keywords;

        if (keywords) { 
            keywords = keywords.toUpperCase();
            keywords = keywords.split(", ");
        }

  
        var config = {
            username: data.user,
            password: data.pass,
            repoUrl: data.repo,
            testDirectory: data.testDir,
            pullRequestFlag: data.pullRequest,
            filterIssueLabels: labels,
            filterIssueKeywords: keywords,
            branch: data.branch
        };

        core.analyseRepo(config, function(response) {
            
            console.log("AnalyzeRepoRequest complete");
            console.log("Response:", response);
            
            socket.emit("AnalyzeRepoResponse", response);
            
        }, function(error) {
        
            console.error(error);
            
            socket.emit("Error", error);
        });
    });
});

var server = http.listen(3000, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log("Example app listening at http://%s:%s", host, port);
});
