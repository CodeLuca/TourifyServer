$(document).ready(function() {
	/*Event handlers*/

	$('#startTour button').click(getCoordinates);
	$('.modal button').click(dismissModal);

	/*Event handler functions*/

	function getCoordinates() {
		//If the device supports geolocation
		if(navigator.geolocation) {
			//Get locations
			navigator.geolocation.getCurrentPosition(getLocationParams, locationError)
		} else {
			//Show error, and force user to enter location manually
			locationError();
		}
	}

	function dismissModal() {
		$('.modal').fadeOut();
		$('#startTour input[type=text]').slideDown();
	}

	//Show error message
	function locationError() {
		$('#startTour button')
			.unbind('click')
			.click(reverseGeocode);
		$('.modal').fadeIn();
	}

	/*General functions*/

	function reverseGeocode() {
		var val = $('#addressField').val();
		var geocoder = new google.maps.Geocoder();
		geocoder.geocode({address: val}, function(result, status) {
			if(status === 'OK') {
				getLocationParams({
					coords: {
					latitude: result[0].geometry.location.lat(),
					longitude: result[0].geometry.location.lng()
					}
				});
			} else {
				alert('Crap something horrible went wrong')
			}
		});
	}

	function getLocationParams(obj) {
		var lat = obj.coords.latitude;
		var lng = obj.coords.longitude;

		var geocoder = new google.maps.Geocoder();
		geocoder.geocode({
			location: {
				lat: lat,
				lng: lng
			}
		}, function(result, status) {
			if(status === 'OK') {
				var address = results[0].formatted_address;
				getJson({
					address: address,
					lat: lat,
					lng: lng
				})
			}
		});
	}

	/*AJAX requests*/

	function getJson(paramObj) {
		alert(JSON.stringify(paramObj))
	}
	
	/*View changes*/

	function nextPage() {
		var source = $('#locations').html();
		var template = Handlebars.compile(source);
		$('#wrapper').fadeOut(function() {
			$('#wrapper').html(template(data));
			$('#wrapper').fadeIn();
		});
		
	}

	$('.tourItem').each(function(i, el) {
		$(el).attr('id', i);
		$(el).find('.currentItemNumber').html(i+1);
		$(el).find('.totalItemNumbers').html($('.tourItem').length);
	});

	
});