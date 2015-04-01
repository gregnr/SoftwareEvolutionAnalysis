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
        var repo =  form.find("input#gitHubRepo").val();
        if (repo == "") {
            $(".labels").empty();
            return;
        }
        repo = repo.split("github.com/")[1];
        $.ajax({
            url: "https://api.github.com/repos/" + repo + "/labels",
            headers: {
                Origin: "http://localhost/"
            },
            success:  function (data) {

                $(".labels").empty();
                $(".labels").append("<h4>Filter by labels</h4><a id='label-selectall' href='#'>Select All</a><br />");
                $.each(data, function (index, labelobj) {
                    var textColor = getTextColorFromBackground(labelobj.color);
                    $(".labels").append("<div style='display: inline-block;'><input type='checkbox' data-label-name='" + labelobj.name + "' name='label' /><span class='github-label' style='background-color: #" + labelobj.color +"; color: #" + textColor + "'>" + labelobj.name + "</span></div>"); 
                    $("#label-selectall").click(function (event) {
                        event.preventDefault();
                        $("input[type='checkbox'][name='label']").attr('checked', true);
                    })
                });
            }
        });
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
    AnalyzeRepo.labels = getLabels();
    AnalyzeRepo.keywords =  form.find("input#keywords").val();
    AnalyzeRepo.pullRequest = getPullRequest();    


    if (AnalyzeRepo.labels == "") AnalyzeRepo.labels = undefined;
    if (AnalyzeRepo.keywords == "") AnalyzeRepo.keywords = undefined;

    

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

function getTextColorFromBackground(background) {
    var rgb = hexToRgb(background);

    var brightness  =  Math.sqrt( (0.241*rgb.r*rgb.r) + 
                                  (0.691*rgb.g*rgb.g) + 
                                  (0.068*rgb.b*rgb.b) );

    if (brightness > 130) {
        return "000000";
    } else {
        return "FFFFFF";
    }


}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function getLabels() {    
    var labels = "";
    
    $("input[type='checkbox'][name='label']:checked").each(function () {
        labels += $(this).attr("data-label-name") + ", ";
    });

    if (labels != "") {
        return labels.slice(0, -2); //remove last comma and space
    } else {
        return "";
    }   

}

function getPullRequest() {
    if ($("input#pullRequest").is(':checked')) {
        return "y";
    } else {
        return "n";
    }
}
