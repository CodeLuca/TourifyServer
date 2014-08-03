$(document).ready(function() {
	var json;
	var params = {};
	var globalLat;
	var globalLng;
	var globalAddress;

	/*Event handlers*/

	$('#getLocation img').click(getCoordinates);
	$('#startTour button').click(function() {
		if(globalLat) {
			getJson({
				address: globalAddress,
				lat: globalLat,
				lng: globalLng
			})
		} else {
			reverseGeocode();
		}
	});
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
	        			zoom: 19
	       			};
	        		var map = new google.maps.Map(document.getElementById("mapCanvas"),mapOptions);
	        		directionsDisplay.setMap(map);
	        		directionsDisplay.setDirections(result);
	        		var source = $('#instructions').html();
	        		var template = Handlebars.compile(source);

	        		var stepObjects = [];
	        		var directionObjs = [];
	        		var context = {};
	        		console.log(result)
	        		result.routes[0].legs.forEach(function(instruction) {
	        			instruction.steps.forEach(function(obj) {
	        				directionObjs.push(obj)
	        				stepObjects.push(obj);
	        			})
	        		});

	        		context.numberOfResults = stepObjects.length - 1;
	        		context.instructions = stepObjects;
	        		var html = template(context);
	        		$('#wrapper').append(html)

	        		$('.directions:first').show()

	        		//Event listeners

	        		map.setZoom(17)

	        		$('.directions .leftArrow').click(function() {
	        			var index = +$(this).parent().find('.instructionIndex').html();
	        			if(index) {
	        				$(this).parent().fadeOut();
	        				var el = $('.directions')[index-1];
	        				$(el).fadeIn();
	        				map.setCenter({
			        			lat: directionObjs[index].start_location.lat(),
			        			lng: directionObjs[index].start_location.lng()
	        				});
	        				map.setZoom(18)
	        			}
	        		});

	        		$('.directions .rightArrow').click(function() {
	        			var index = +$(this).parent().find('.instructionIndex').html();
	        			var total = +$(this).parent().find('.totalInstructions').html();
	        			if(index !== total) {
	        				$(this).parent().fadeOut();
	        				var el = $('.directions')[index+1];
	        				$(el).fadeIn();
	        				console.log(result.routes[0].legs[0])

	        				if(result.routes[0].legs[i])

	        				map.setCenter({
			        			lat: directionObjs[index].start_location.lat(),
			        			lng: directionObjs[index].start_location.lng()
	        				});
	        				map.setZoom(18)
	        			}
	        		});

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
			$('#loader, #overlay').fadeIn();
			$('#overlayMessage').html('Getting your location...').fadeIn();
			navigator.geolocation.getCurrentPosition(getLocationParamsAuto, locationError);
		} else {
			$('#getLocation img').hide();
			$('#startTour input[type=text]').css('padding-right', '3px')
		}
	}

	function dismissModal() {
		$('#locationError').fadeOut();
		$('#startTour input[type=text]').slideDown();
	}

	//Show error message
	function locationError() {
		hideAjaxSpinner();
		$('#getLocation img').hide();
		$('#startTour input[type=text]').css('padding-right', '3px')
		$('#locationError').fadeIn();
	}

	/*General functions*/

	function reverseGeocode() {
		var val = $('#addressField').val();
		var geocoder = new google.maps.Geocoder();
		geocoder.geocode({address: val}, function(result, status) {
			if(status === 'OK') {
				$('#startTour input[type=text]').val(result[0].formatted_address)
				globalLat = result[0].geometry.location.lat();
				globalLng = result[0].geometry.location.lng()
				globalAddress = result[0].formatted_address;
				getJson({
					address: globalAddress,
					lat: globalLat,
					lng: globalLng
				})
			} else {
				alert('Error');
			}
		});
	}

	function getLocationParamsAuto(obj) {
		globalLat = obj.coords.latitude;
		globalLng = obj.coords.longitude;

		var geocoder = new google.maps.Geocoder();
		geocoder.geocode({
			location: {
				lat: globalLat,
				lng: globalLng
			}
		}, function(result, status) {
			if(status === 'OK') {
				$('#startTour input[type=text]').val(result[0].formatted_address)
				globalAddress = result[0].formatted_address;
				$('#loader, #overlay, #overlayMessage').fadeOut();
			}
		});
	}

	/*AJAX requests*/

	function getJson(paramObj) {
			paramObj.transport = params.transport;
			paramObj.radius = params.radius;
			paramObj.categories = params.categories;
			$('#overlayMessage').html('Getting results...').fadeIn();
			setTimeout(function() {
				$('#overlayMessage').fadeOut(function() {
					$('#overlayMessage').html('')
				});
			}, 2000)

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