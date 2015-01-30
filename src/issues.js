var https = require('https');
var async = require('async');


console.log('Getting issues');


var all_json = "";
var count = 50;
var count_up = 0;
var i = 0;
var reqs = [];
for (i = 0; i < count; i++) {
	reqs.push(function (callback) {runRequest(callback, k=i);});
}

async.parallel(reqs, function (err, result) {
    process.stdout.write(result);
});

process.stdout.write(all_json);

function runRequest (callback, k) {
	var t = k;
	var options = {
		host: 'api.github.com',
		path: '/repos/jquery/jquery/issues?access_token=db9842477822fb8a9a0aa330a846dcb5f656f9df=&status=all&per_page=100&page=' + t,
		headers: {'user-agent': 'jordan-heemskerk'},
	};

	console.log("send");
	var string = "";
	console.log(options.path);
	https.get(options, function(response) {
		//console.log("statusCode: ", res.statusCode);
		//console.log("headers: ", res.headers);

      response.on('data', function(response){
	      string += response;
	  }); 
	    response.on('end', function(){
	      console.log(string);
	    });  	

	}).on('error', function(e) {
		//handle error
		console.error(e);
	});
}
