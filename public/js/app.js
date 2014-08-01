$(document).ready(function() {
	$('#startTour button').click(function() {
		if(navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(sendLocation, locationError)
		} else {
			locationError();
		}
	});
	$('.modal button').click(function() {
		$('.modal').fadeOut();
		$('#startTour input[type=text]').slideDown();
	});
	
	function locationError() {
		$('#startTour button').unbind('click');
		$('.modal').fadeIn();
	}
	function sendLocation(obj) {
		var lat = obj.coords.latitude;
		var lng = obj.coords.longitude;
		alert(lat)
	}
	
	$('.tourItem').each(function(i, el) {
		$(el).attr('id', i);
		$(el).find('.currentItemNumber').html(i+1);
		$(el).find('.totalItemNumbers').html($('.tourItem').length);
	});

	
});