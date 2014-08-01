	module.exports = function(coordinates) {
		var nodeList = '';
		var lats = [];
		var lons = [];
		var total = 0;
		for(var i = 0; i < coordinates.length-1; ++i) {
		    lats.push(coordinates[i].geometry.location.lat); 
		    lons.push(coordinates[i].geometry.location.lng);
		}

			var finder = new RouteFinder(lats, lons);

			finder.getPairs();

			for(var count = 1; count < lats.length; count++) {
				nodeList += count;
			}

			finder.permutation("", nodeList);
			finder.removeDuplicateRoutes();
			var shortestRoute = finder.getShortestRoute();
			var finalRouteOrder = [];
			shortestRoute.nodeList.forEach(function(node) {
				finalRouteOrder.push(+node);
			});

			return finalRouteOrder;
		function Route() {
		    this.totalWeight = 0;
		    this.nodeList = [];
		}

		function Node() {
		    this.lat = 0;
		    this.lon = 0;
		    this.number = 0;
		}

		function Arc() {
		    this.startNode = new Node();
		    this.endNode = new Node();
		    this.weight = 0;
		}

		function reverseString(initialString) {
			var reversed = '';
			for(var count = initialString.length -1; count > -1; count--) {
				reversed += initialString.charAt(count);
			}
			return reversed;
		}

		function calcDistance(lat1, lng1, lat2, lng2) {
			var earthRadius = 6371;
			var dLat = (lat2 - lat1)/180*Math.PI;
			var dLng = (lng2 - lng1)/180*Math.PI;
			var a  = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1/180*Math.PI) * Math.cos(lat2/180*Math.PI) * Math.sin(dLng/2) * Math.sin(dLng/2);
			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
			var dist = earthRadius * c;
			return dist;
		}

		function RouteFinder(lats, lons) {
			this.latArray = lats;
			this.lonArray = lons;
			this.orders = [];
			this.arcArray = [];
			this.routes = [];
			this.shortestRoute;
			this.numOfPoints = lats.length - 1;
			this.shortestRouteLength = -1;
		    
			this.getPairs = function() {
				var timesLooped = 0;
				for(var count1 = 0; count1 < this.numOfPoints; count1++) {
					for(var count2 = 0; count2 < (this.numOfPoints - count1); count2++) {
						this.arcArray.push(new Arc());
						this.arcArray[timesLooped].startNode = {
							number: count1,
						};
						this.arcArray[timesLooped].endNode = {
							number: this.numOfPoints - count2,
						};
						this.arcArray[timesLooped].weight = calcDistance(this.latArray[count1], this.lonArray[count1], this.latArray[this.numOfPoints - count2], this.lonArray[this.numOfPoints - count2]);
						timesLooped++;
					}
				}
			};
			this.permutation = function(prefix, str) {
				var n = str.length;
				if(n === 0) this.orders.push('0' + prefix + '0');
				else {
					for(var i = 0; i <n; i++) {
						this.permutation(prefix + str.charAt(i), str.substring(0, i) + str.substring(i + 1, n));
					}
				}
			};
			this.removeDuplicateRoutes = function() {
				var numberOfPermutations = this.orders.length -1;
				var temp;
				var size;
				var toRemove = [];
				for(var count1 = 0; count1 < numberOfPermutations; count1++) {
					for(var count2 = 0; count2 < (numberOfPermutations - count1); count2++) {
						if(this.orders[count1] == reverseString(this.orders[numberOfPermutations - count2])) {
							toRemove.push(count1);
						}
					}
				}
				size = toRemove.length;
				for(var count3 = 0; count3 < size; count3++) {
					temp = toRemove[size - 1- count3];
					var index = this.orders.indexOf(temp);
					if(index > -1) {
						temp.splice(index, 1);
					}
				}
			};
			this.getShortestRoute = function() {
				var routesMade = 0;
				for(var routeNumber = 0; routeNumber < (this.orders.length -1); routeNumber++) {
					this.routes.push(new Route());
					this.routes[routesMade].totalWeight = 0;
					for(var count1 = 0; count1 < this.orders[routeNumber].length; count1++) {
						this.routes[routesMade].nodeList.push(+this.orders[routeNumber].charAt(count1));
					}
					for(var count2 = 1; count2 < this.orders[routeNumber].length; count2++) {
						for(var count3 = 0; count3 < this.arcArray.length; count3++) {
							if(this.routes[routesMade].nodeList[count2 - 1] === this.arcArray[count3].startNode.number) {
								if(this.routes[routesMade].nodeList[count2] === this.arcArray[count3].endNode.number) {
									this.routes[routesMade].totalWeight += this.arcArray[count3].weight;
								}
							} else if (this.routes[routesMade].nodeList[count2 - 1] === this.arcArray[count3].endNode.number) {
								if(this.routes[routesMade].nodeList[count2] === this.arcArray[count3].startNode.number) {
									this.routes[routesMade].totalWeight += this.arcArray[count3].weight;
								}
							}
						}
					}
					if(!this.shortestRoute) {
						this.shortestRoute = this.routes[routesMade];
					} else if(this.routes[routesMade].totalWeight < this.shortestRoute.totalWeight) {
						this.shortestRoute = this.routes[routesMade];
					}
		            routesMade++;
				}
		        return this.shortestRoute;
			};
		}
	}