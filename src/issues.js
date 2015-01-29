var https = require('https');
var async = require('async');


console.log('Getting issues');


var all_json = "";
var count = 50;
var count_up = 0;
var i = 0;
var reqs = [];
for (i = 0; i < count; i++) {
	console.log("run " + i);
	runRequest(i);
}

while (count_up < count) ;

process.stdout.write(all_json);

function runRequest (callback, i) {
	var options = {
		host: 'api.github.com',
		path: '/repos/jquery/jquery/issues?access_token=ce72f33fa9f02b9a2ecb60b983e6cfbd9dedd4ed&status=all&per_page=100&page=' + i,
		headers: {'user-agent': 'jordan-heemskerk'},
	};

	console.log("send");
	https.get(options, function(res) {
		//console.log("statusCode: ", res.statusCode);
		//console.log("headers: ", res.headers);

		//handle async response
		res.on('data', function(d) {
			//successful request
			process.stdout.write("Response " + i);
			//process.stdout.write(d);

			all_json += d;
			count_up++;
			console.log("Progress: " + (count_up/count) * 100 + "%");
		});

		

	}).on('error', function(e) {
		//handle error
		console.error(e);
	});
}