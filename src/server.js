var core = require("./core");

var express = require("express");
var app = express();

var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(express.static(__dirname +  "/../templates"));

io.on("connection", function(socket) {

    console.log("Client connected");
    
    socket.on("AnalyzeRepoRequest", function(data) {
    
        console.log("Config data: " + data);
        
        //TODO Sanatize data from HTML form?
        
        var config = {
            username: data.user,
            password: data.pass,
            repoUrl: data.repo,
            testDirectory: data.testDir
        };
        
        core.analyseRepo(config, function(response) {
            
            console.log("AnalyzeRepoRequest complete");
            
            socket.emit("AnalyzeRepoResponse", response);
        });
    });
});

var server = http.listen(3000, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log("Example app listening at http://%s:%s", host, port);
});