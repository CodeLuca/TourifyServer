var express = require('express');
var router = express.Router();
var http = require('http');
var https = require('https')
var yelp = require('yelp');
var keys = require('../keys.js');

var globalRes = '';
var globalReq = '';

//The url's (incl. parameters) for the api's
var apiUrls = {
	weather: function(latLng) {
		var url =
			'http://api.worldweatheronline.com/free/v1/weather.ashx?key=' +
			keys.weather + 
			'&format=json&q=' +
			latLng.lat +
			',' +
			latLng.lng;
		return url;
	},
	google: {
		distance: function(paramObj) {
			var url = 
				'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' +
				paramObj.origin.lat +
				',' +
				paramObj.origin.lng +
				'&destinations=' +
				paramObj.destination.lat +
				',' +
				paramObj.destination.lng +
				'&mode=' +
				paramObj.mode +
				'&key=' +
				keys.google;
			return url;
		}
	}
};

//Boilerplate code for getting JSON response
function httpGet(url, callback) {
	http.get(url, function(res) {
		var chunks = [];
		res.on('data', function(chunk) {
			chunks.push(chunk);
		});
		res.on('end', function() {
			var body = chunks.join('');
			//If it is a string, parse to JSON
			if(typeof body === 'string') {
				body = JSON.parse(body);
			}
			//Pass JSON response to callback
			callback(body);
		});
  });
}
//Boilerplate code for getting JSON response
function httpsGet(url, callback) {
	https.get(url, function(res) {
		var chunks = [];
		res.on('data', function(chunk) {
			chunks.push(chunk);
		});
		res.on('end', function() {
			var body = chunks.join('');
			//If it is a string, parse to JSON
			if(typeof body === 'string') {
				body = JSON.parse(body);
			}
			//Pass JSON response to callback
			callback(body);
		});
  });
}

router.get('/', function(req, res) {
	res.send('yay')
})

/* GET home page. */
router.post('/', function(req, res) {
	globalReq = req;
	globalRes = res;

	if(!req.query.lat || !req.query.lat || !req.query.address) {
		res.json({error: 'Parameters not specificed'})
	} else {
		//Get weather from latitude/longitude in request
		httpGet(apiUrls.weather({
			lat: globalReq.query.lat,
			lng: globalReq.query.lng
		}), getWeather);
	}
});

function getWeather(weather) {
	//These are the only weather codes which are 'good'
	//(i.e. not rain)
	var goodWeatherCodes = [113, 116, 119, 122, 143];
	//All weather Yelp categories to search for
	var yelpCategories = 'aquariums,leisure_centers,galleries,museums,';
	//Weather code from location (`+` converts to number)
	var weatherCode = +weather.data.current_condition[0].weatherCode;
	//If `weatherCode` is not is in `goodWeatherCodes` then add outdoor Yelp categories
	if(goodWeatherCodes.indexOf(weatherCode) !== -1) {
		yelpCategories += 'mini_golf,parks,skatingrinks,zoos';
	}
	getYelp(yelpCategories);
}

function getYelp(yelpCategories) {
	var yelpClient = yelp.createClient(keys.yelp);
	//Search yelp
	yelpClient.search({
		location: globalReq.query.address,
		cll: globalReq.query.lat + ',' + globalReq.query.lng,
		category_filter: yelpCategories
	}, removeYelpDuplicateJSON);	
}

function removeYelpDuplicateJSON(error,data) {
	//Remove duplicate categories
	//Does not remove categories where there are duplicates...
	//...but with an additional different category
	var duplicateCateogryPOIs = data.businesses;
	var categoryArray = [];
	var filteredCateogryPOIs = [];
	duplicateCateogryPOIs.forEach(function(POI) {
		var alreadyExists = false;
		categoryArray.forEach(function(category) {
			//Compare nested arrays by converting to strings
			if(JSON.stringify(POI.categories) === JSON.stringify(category)) {
				//If category already exists set to `true`
				alreadyExists = true;
			}
		});
		//If category does not exist already, and has coordidante field...
		//...add to non-duplicate POI array

		if(!alreadyExists && POI.location.coordinate) {
			categoryArray.push(POI.categories);
			filteredCateogryPOIs.push(POI);
		}
	});
	getDistancesFromOrigin(filteredCateogryPOIs);
}

function getDistancesFromOrigin(POIs) {
	//Loop through all POI's
	//Keep a total to know when requests are done as they're async.
	var total = 1;
	POIs[0].distance = 0;
	var originPOI = POIs[0];
	var finalPOIs = [originPOI];

	function getDistance(POI) {
		httpsGet(apiUrls.google.distance({
				origin: {
					lat: originPOI.location.coordinate.latitude,
					lng: originPOI.location.coordinate.longitude
				},
				destination: {
					lat: POI.location.coordinate.latitude,
					lng: POI.location.coordinate.longitude
				},
				mode: 'walking'
		}), function(json) {
			POI.distance = json.rows[0].elements[0].distance.value;
			finalPOIs.push(POI);
			if(++total === 5) {
				makeLoop(finalPOIs);
			}
		});
	}

	for(var i = 1; i < 6; ++i) {
		getDistance(POIs[i]);
	}
}

//Sort POI's by distance from origin (0)
//Then form them into a 'loop'
function makeLoop(POIs) {
	//Sorts by distance in increasing order
	//(i.e. 3,4,1,2 -> 1,2,3,4)
	function sortByDistance(a, b) {
		if(a.distance < b.distance) {
			return -1;
		} else if(a.distance > b.distance) {
			return 1;
		}
		return 0;
	}

	//Creates 'loop' from sorted values
	//(i.e. 1,2,3,4 -> 14321)
	function formLoop(arr) {
		var b = [arr[arr.length-1]];
		for(var i = arr.length-2; i >= 0; --i) {
			if(!(i % 2)) {
				b.unshift(arr[i]);
			} else {
				b.push(arr[i]);
			}
		}
		b.push(arr[0]);
		return b;
	}

	var sortedPOIs = POIs.sort(sortByDistance);
	var loopedPOIs = formLoop(sortedPOIs);
	globalRes.json(loopedPOIs);
}

module.exports = router;