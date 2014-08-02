$(document).ready(function() {
	var json;
	var params = {};

	/*Event handlers*/

	$('#startTour button').click(getCoordinates);
	$('#locationError button').click(dismissModal);
	$(document).ajaxStart(showAjaxSpinner);
  	$(document).ajaxStop(hideAjaxSpinner);
  	$('body').on('click', '#finalise', getMap);
  	$('#refineResults').click(showOptionsModal);
  	$('#options button').click(hideOptionsModal);
  	$('body').on('click', '.tourItem .delete', deleteTourItem)

	/*Event handler functions*/

	function deleteTourItem() {
		function remove(arr, index) {
    		return arr.splice(index, 1)
		}

		var id = +$(this).parent().find('.currentItemNumber');
		remove(json.results, id);
		$(this).parent().fadeOut();
	}

	function hideOptionsModal() {
		if($('#options').is(':visible')) {
			var transport = $('input[name=transport]:checked', '#options form').val();
			var radius = $('select', '#options form').find(":selected").val();
			var categories = '';
			$('input[name=categories]:checked').each(function(k, el) {
				categories += $(el).val() + ',';
			});

			categories = categories.substring(0, categories.length -1);

			params.transport = transport;
			params.radius = radius;
			params.categories = categories;
		}
		$('#options').fadeOut();
		$('#refineResults').fadeOut();
	}

	function showOptionsModal() {
		$('#options').fadeIn();
	}

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
				});
			}
			directionsService.route({
				origin: new google.maps.LatLng(json.results[0].geometry.location.lat, json.results[0].geometry.location.lng),
				optimizeWaypoints: true ,
				destination: new google.maps.LatLng(json.results[0].geometry.location.lat, json.results[0].geometry.location.lng),
				travelMode: google.maps.TravelMode[params.transport] || 'WALKING',
				waypoints: waypointsArray
			}, function(result, status) {
				if(status === 'OK') {
					var mapOptions = {
	        			center: new google.maps.LatLng(json.results[0].geometry.location.lat, json.results[0].geometry.location.lng),
	        			zoom: 18
	       			};
	        		var map = new google.maps.Map(document.getElementById("mapCanvas"),mapOptions);
	        		directionsDisplay.setMap(map);
	        		directionsDisplay.setDirections(result);
				} else {
					alert(JSON.stringify(status));
				}
			});
   		}, 1000);
   	}

	function showAjaxSpinner() {
		$('#loader, #overlay').fadeIn();
	}

	function hideAjaxSpinner() {
		$('#loader, #overlay').fadeOut();
	}

	function getCoordinates() {
		//If the device supports geolocation
		if(navigator.geolocation) {
			//Get locations
			navigator.geolocation.getCurrentPosition(getLocationParams, locationError);
		} else {
			//Show error, and force user to enter location manually
			locationError();
		}
	}

	function dismissModal() {
		$('#locationError').fadeOut();
		$('#startTour input[type=text]').slideDown();
	}

	//Show error message
	function locationError() {
		$('#startTour button')
			.unbind('click')
			.click(reverseGeocode);
		$('#locationError').fadeIn();
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
				alert('Crap something horrible went wrong');
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
				});
			}
		});
	}

	/*AJAX requests*/

	function getJson(paramObj) {
			paramObj.transport = params.transport;
			paramObj.radius = params.radius;
			paramObj.categories = params.categories;

		$.get('/json', paramObj, function(data) {
			json = data;
			data.numberOfResults = data.numberOfResults-1;
			nextPage(data);
		});
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