//bind socket
var socket = io();

//get DOM elements
var form = $("form.form-analyze");
var form_div = $("div.app div.form");
var error_div = $("div.app div.error");
var results_div = $("div.app div.result");
var iframe = results_div.find("iframe");
var loader = results_div.find("img.loader");

//TODO: handle request cancellation better
//track if we need to ignore requests
var ignoreNextResponse = false;


//main flow
$(document).ready(function () {

	//attach event handlers
	form.find("button").click(function (event) {
		event.preventDefault();
		submitAnalyzeRepo(form);
	});

	form.find("input#gitHubRepo").blur(function (input) {
		console.log("Validate and get tags for: " + input.target.value);
	});

	$("a.back").click(function (event) {
		event.preventDefault();
		cancelOpenRequestsAndShowForm();
	});


	//socket interactions
	socket.on("AnalyzeRepoResponse", function (msg) {

		if (ignoreNextResponse === true) {
		    ignoreNextResponse = false;
			return;
		}

        //set source of iframe
		iframe.attr("src", "https://plot.ly/~seng371/" + msg.plotlyGraphId + ".embed");

        //show/hide UI elements
		$(".loader").hide();
		iframe.show();

        //scroll to graph
		$("html, body").animate({
			scrollTop: result_div.offset().top + "px"
		}, "fast");
	});
	
	socket.on("Error", function(msg) {
	
		cancelOpenRequestsAndShowForm();
		
		ignoreNextResponse = false;
	
	    var errorSpan = $('<span />').html(msg);
	    
	    error_div.append(errorSpan);
	});
});

function cancelOpenRequestsAndShowForm() {

	ignoreNextResponse = true;

    //show/hide UI elements
	iframe.hide();
	results_div.hide();
	form_div.show();

    //enable submit button
	form.find("button").removeAttr("disabled");
}

function submitAnalyzeRepo(form) {

    console.log("submitAnalyzeRepo");
	var AnalyzeRepo = {};

    //TODO: form validation
	//if (!validateAnalyzeRepo(form)) //fail out
	
	//Clear the error div
	error_div.empty();
	
	//Show loader
	$(".loader").show();

    //build request
	AnalyzeRepo.user = form.find("input#gitHubUsername").val();
	AnalyzeRepo.pass = form.find("input#gitHubPassword").val();
	AnalyzeRepo.repo = form.find("input#gitHubRepo").val();
	AnalyzeRepo.testDir = form.find("input#repoTestDir").val();

    console.log("emit");
    //emit request
	socket.emit("AnalyzeRepoRequest", AnalyzeRepo);
	
	ignoreNextResponse = false;

    //disable form button
	form.find("button").attr("disabled", "disabled");

    //show/hide UI elements
	form_div.hide();
	results_div.show();
}

function validateAnalyzeRepo(form) {
    //TODO: form validation
	return true;
}
