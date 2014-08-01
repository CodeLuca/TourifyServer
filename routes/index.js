var express = require('express');
var router = express.Router();
var http = require('http');
var https = require('https');
var keys = require('../keys.js');
var path = require('path');
var yelp = require('yelp')
var salesman = require('../salesman.js');

var globalRes = '';
var globalReq = '';
var globalNumReturnItems = 0;

process.on("uncaughtException", function(error) {
	console.log('ERROR!:\n')
	console.log(error.stack);
});

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
		},
		places: function(paramObj) {
			var url = 
				'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' +
				paramObj.lat +
				',' +
				paramObj.lng +
				'&radius=3000&open&keyword=tourist%20attraction&key=' +
				keys.google;
			return url;
		},
	},
	bingImages: function(paramObj) {
			var url = 
				'/Bing/Search/v1/Image?Query=%27' +
				encodeURIComponent(paramObj.placeName) +
				'%20' +
				encodeURIComponent(paramObj.location) +
				'%27&Latitude=' +
				paramObj.lat +
				'&Longitude=' +
				paramObj.lng +
				'&$top=1&$format=JSON&ImageFilters=%27Aspect%3ATall%27';
			return url;
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
	res.sendfile('index.html')
});
router.get('/webapp', function(req,res) {
	res.sendfile('webapp.html')
})
router.get('/index.html', function(req, res) {
	res.sendfile('index.html')
});
router.get('/contactus.html', function(req, res) {
	res.sendfile('contactus.html')
});
router.get('/theapp.html', function(req, res) {
	res.sendfile('theapp.html')
});

/* GET home page. */
router.get('/json', function(req, res) {
	globalReq = req;
	globalRes = res;

	if(!req.query.lat || !req.query.lat || !req.query.address) {
		console.log('\tWrong parameters')
		res.json({error: 'Parameters not specificed'});
	} else {
		//Get weather from latitude/longitude in request
		httpGet(apiUrls.weather({
			lat: globalReq.query.lat,
			lng: globalReq.query.lng
		}), function(weather) {
			if(weather.data.current_condition) {
				console.log('\tGot weather OK')
				getWeather(weather);
			} else {
				console.log('\tCouldnt get weather')
				globalRes.json(weather);
			}
    	});
	}
});

function getWeather(weather) {
	//These are the only weather codes which are 'good'
	//(i.e. not rain)
	var goodWeatherCodes = [113, 116, 119, 122, 143];
	//All weather categories to search for
	var placeCategories = 'amusement_park|aquarium|art_gallery|church|establishment|museum|place_of_worship';
	//Weather code from location (`+` converts to number)
	var weatherCode = +weather.data.current_condition[0].weatherCode;
	if(typeof weatherCode === 'number')
	//If `weatherCode` is not is in `goodWeatherCodes` then add outdoor categories
	if(goodWeatherCodes.indexOf(weatherCode) !== -1) {
		placeCategories += '|park|zoo';
	}
	getPlaces(placeCategories);
}

function getPlaces() {
	httpsGet(apiUrls.google.places({
		lat: globalReq.query.lat,
		lng: globalReq.query.lng
	}), function(json) {
		if(json.results.length) {
			console.log('Got places')
			removeYeDuplicateTypes(json.results);
		} else {
			console.log('Couldnt get places')
			globalRes.json(json);
		}
	});
}

function removeYeDuplicateTypes(POIs) {
	var types = {};
	var filteredPOIs = [];
	//Go through each of the POIs
	POIs.forEach(function(item) {
		var totalOfTypes = [];
		var addType = true;

		if(item.types) {
			//Then go through each of the 'types' the POI has
			item.types.forEach(function(type) {
				//If it's an 'establishment' don't count to total
				if(type === 'establishment') {
					totalOfTypes.push(0);
				//Otherwise either increase the count or set it to 1
				} else {
					if(types[type]) {
						types[type]++;
					} else {
						types[type] = 1;
					}
					totalOfTypes.push(types[type]);
				}
			});
		} else {
			filteredPOIs.push(item)
		}
		//Now go through all of the totals
		//If any are greater than 2 than reject it
		//(i.e. there are already 2 POIs with the same types)
		totalOfTypes.forEach(function(total) {
			if(total > 2) {
				addType = false;
				}
		});
		if(addType) {
			filteredPOIs.push(item);
		}
	});
	console.log('Removed duplicated OK')
	getBingImages(filteredPOIs);
}

function getBingImages(POIs) {
	var filteredPOIs = [];
	var total = 0;
	function getImage(POI) {
		var options = {
			hostname: 'api.datamarket.azure.com',
			path: apiUrls.bingImages({
				placeName: POI.name,
				location: POI.vicinity.substring(POI.vicinity.lastIndexOf(',')+2),
				lat: POI.geometry.location.lat,
				lng: POI.geometry.location.lat
			}),
			auth: 'username:' + keys.bing
		};

		https.get(options, function(res) {
			var chunks = [];
			res.on('data', function(chunk) {
				chunks.push(chunk);
			}).on('end', function() {
				var searchResults = JSON.parse(chunks.join(''));
				var url = searchResults.d.results[0].MediaUrl;
				POI.image = url;
				filteredPOIs.push(POI);
				if(++total === POIs.length-1) {
					console.log('Got bing images OK')
					getDistancesFromOrigin(filteredPOIs);
				}
			});
		});
	}
	for(var i = 0; i < POIs.length; ++i) {
		getImage(POIs[i]);
	}
}

function getDistancesFromOrigin(POIs) {
	var finalPOIs = [];
	//Use this too set the limit (1 - the number tho)
	for(var i = 0; i < 5; ++i) {
		finalPOIs.push(POIs[i]);
	}
	var order = salesman(finalPOIs);
	var newArr = new Array(order.length);
	order.forEach(function(num) {
		newArr[num] = finalPOIs[num]
	})
	newArr.pop();
	globalRes.json({
		numberOfResults: newArr.length,
		results: newArr
	});
}

module.exports = router;