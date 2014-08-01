$(document).ready(function() {
	/*Event handlers*/

	$('#startTour button').click(getCoordinates);
	$('.modal button').click(dismissModal);
	$(document).ajaxStart(showAjaxSpinner);
  	$(document).ajaxStop(hideAjaxSpinner);
  	$('body').on('click', '#finalise', getMap)

	/*Event handler functions*/

	function getMap() {
		var directionsService = new google.maps.DirectionsService();
		var directionsDisplay;
		var source = $('#mapTemplate').html();
		var template = Handlebars.compile(source);
		$('#wrapper').fadeOut(function() {
			$('#wrapper').html(template());
			$('#wrapper').fadeIn();
		});
		$('body').on('ready', '#mapCanvas', function() {
			alert('Ready')
			var mapOptions = {
          		center: new google.maps.LatLng(-34.397, 150.644),
          		zoom: 8
        	};
        	var map = new google.maps.Map(document.getElementById("mapCanvas"),mapOptions);
      	})
      	alert('Hi')
   	}

	function showAjaxSpinner() {
		$('#loader, #overlay').fadeIn()
	}

	function hideAjaxSpinner() {
		$('#loader, #overlay').fadeOut();
	}

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
				var address = result[0].formatted_address;
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
		$.get('/json', paramObj, function(data) {
			data.numberOfResults = data.numberOfResults-1;
			nextPage(data);
		})
	}
	
	/*View changes*/

	function nextPage(data) {
		var source = $('#locations').html();
		var template = Handlebars.compile(source);
		$('#wrapper').fadeOut(function() {
			$('#wrapper').html(template(data));
			$('#wrapper').fadeIn();
		});
		
	}

	
});