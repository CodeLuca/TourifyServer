$(document).ready(function() {
	var json = '';

	/*Event handlers*/

	$('#startTour button').click(getCoordinates);
	$('.modal button').click(dismissModal);
	$(document).ajaxStart(showAjaxSpinner);
  	$(document).ajaxStop(hideAjaxSpinner);
  	$('body').on('click', '#finalise', getMap)

	/*Event handler functions*/

	function getMap() {
		var source = $('#mapTemplate').html();
		var template = Handlebars.compile(source);
		$('#wrapper').fadeOut(function() {
			$('#wrapper').html(template());
			$('#wrapper').fadeIn();
		});
		setTimeout(function() {
			var directionsService = new google.maps.DirectionsService();
			var directionsDisplay = new google.maps.DirectionsRenderer();

			var waypointsArray = [];
			for(var i = 1; i < json.results.length; ++i) {
				waypointsArray.push({
					location: new google.maps.LatLng(json.results[i].geometry.location.lat, json.results[i].geometry.location.lng)
				})
			}
			directionsService.route({
				origin: new google.maps.LatLng(json.results[0].geometry.location.lat, json.results[0].geometry.location.lng),
				destination: new google.maps.LatLng(json.results[0].geometry.location.lat, json.results[0].geometry.location.lng),
				travelMode: google.maps.TravelMode.WALKING,
				waypoints: waypointsArray
			}, function(result, status) {
				if(status === 'OK') {
					var mapOptions = {
	        			center: new google.maps.LatLng(json.results[0].geometry.location.lat, json.results[0].geometry.location.lng),
	        			zoom: 18
	       			};
	        		var map = new google.maps.Map(document.getElementById("mapCanvas"),mapOptions);
	        		directionsDisplay.setMap(map);
	        		directionsDisplay.setDirections(result)
				} else {
					alert(JSON.stringify(status))
				}
			});
   		}, 1000);
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
			json = data;
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