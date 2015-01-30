var https = require('https');
var async = require('async');


console.log('Getting issues');


var i = 0;
var reqs = [];
for (i = 0; i < 50; i++) {

	(function(i) {reqs.push(function (callback) {issueRequest(callback, k=i);}) })(i);
}

async.parallel(reqs, function (err, result) {
    console.log(result);
});


function issueRequest (callback, i) {
	var options = {
		host: 'api.github.com',
		path: '/repos/jquery/jquery/issues?access_token=db9842477822fb8a9a0aa330a846dcb5f656f9df=&status=all&per_page=100&page=' + i,
		headers: {'user-agent': 'jordan-heemskerk'},
	};

	var resp = "";
	console.log(options.path);
	https.get(options, function(response) {
		//console.log("statusCode: ", res.statusCode);
		//console.log("headers: ", res.headers);

      response.on('data', function(response){
	      resp += response;
	  }); 
	  response.on('end', function(){
	      callback(null, resp);
	  });  	

	}).on('error', function(e) {
		//handle error
		console.error(e);
	});
}
