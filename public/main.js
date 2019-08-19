console.log("hello");

// let zillowApiKey = require('../config/zillowApiKey.js')
// console.log("zillowApiKey.zillowApiKey",zillowApiKey.zillowApiKey);


// Hardcoded Newton Coordinates
mapboxgl.accessToken = 'pk.eyJ1IjoiY29tcGxleGFwaWNlbnN1c2FuZG1hcCIsImEiOiJjanh6ZnBlYWEwMmptM2RvYW02ZTIwODk0In0.m4zyrwu_-34qVZNFVbKtCQ';
var map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
  center: [-71.184769, 42.291881], // starting position [lng, lat]
  pitch: 30, // pitch in degrees
  bearing: -20, // bearing in degrees
  zoom: 11 // starting zoom
});

// *********************************************************************************
//3D Buildings https://docs.mapbox.com/mapbox-gl-js/example/3d-buildings/
// *********************************************************************************
map.on('load', function() {
  // Insert the layer beneath any symbol layer.
  var layers = map.getStyle().layers;
  var labelLayerId;
  for (var i = 0; i < layers.length; i++) {
    if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
      labelLayerId = layers[i].id;
      break;
    }
  }
  map.addLayer({
    'id': '3d-buildings',
    'source': 'composite',
    'source-layer': 'building',
    'filter': ['==', 'extrude', 'true'],
    'type': 'fill-extrusion',
    'minzoom': 15,
    'paint': {
      'fill-extrusion-color': '#aaa',
      // use an 'interpolate' expression to add a smooth transition effect to the
      // buildings as the user zooms in
      'fill-extrusion-height': [
        'interpolate', ['linear'],
        ['zoom'],
        15, 0,
        15.05, ['get', 'height']
      ],
      'fill-extrusion-base': [
        'interpolate', ['linear'],
        ['zoom'],
        15, 0,
        15.05, ['get', 'min_height']
      ],
      'fill-extrusion-opacity': .6
    }
  }, labelLayerId);
});
// *********************************************************************************
//End: 3D Buildings https://docs.mapbox.com/mapbox-gl-js/example/3d-buildings/
// *********************************************************************************

let streetAddress = ''
let city = ''
let state = ''
let zip = ''
let rawAddress = ''
let latitude = 0
let longitude = 0
let ZestimateAmt = 0
let yearBuilt, purpose, liveSqFt, lotSqFt, bedRoom, bathRoom, totalRoom, soldDate, soldPrice, comps, neighValue, moreInfo
// let zillowApiKey = require('../config/zillowApiKey.js')
// console.log("zillowApiKey.zillowApiKey",zillowApiKey.zillowApiKey);


// https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
function geoFindMe() {
  console.log("findLatLongAddress clicked");
  document.querySelector("#where").style.color = "#f82249"

  const findMeStatus = document.querySelector('#findMeStatus');
  //LINK TO EXTERNAL MAP 2 OF 3
  // const mapLink = document.querySelector('#map-link');
  // mapLink.href = '';
  // mapLink.textContent = '';

  function success(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    findMeStatus.textContent = '';
    //LINK TO EXTERNAL MAP 3 OF 3
    // mapLink.href = `https://www.openstreetmap.org/#map=18/${latitude}/${longitude}`;
    // mapLink.textContent = `Latitude: ${latitude} °, Longitude: ${longitude} °`;

    // *********************************************************************************
    // TEMPORARY HARD-CODED LAT & LON COORDINATES
    // Newton Coordinates
    // latitude = 42.291881
    // longitude = -71.184769

    // Gallivan Blvd
    // latitude = 42.278241
    // longitude = -71.070810

    // West Roxbury
    // latitude = 42.261375
    // longitude = -71.151051

    // Melrose
    // latitude = 42.444334
    // longitude = -71.031010

    // Roslindale
    // latitude = 42.278579
    // longitude = -71.129557

    // Noon Meridian Sandwich Shop - Boston
    // latitude = 42.357811
    // longitude = -71.058137

    // Providence Coordinates
    // latitude = 41.8240
    // longitude = -71.4128

    // *********************************************************************************

    map.flyTo({
      center: [longitude, latitude],
      speed: .2
    });





    // Reverse Geocoding (Mapbox)
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=pk.eyJ1IjoiY29tcGxleGFwaWNlbnN1c2FuZG1hcCIsImEiOiJjanh6ZnBlYWEwMmptM2RvYW02ZTIwODk0In0.m4zyrwu_-34qVZNFVbKtCQ`)
      .then(response => response.json())
      .then(response => {
        document.querySelector("#where").style.fontSize = "22px"
        console.log(response)
        console.log(response.features[0].place_name)
        rawAddress = response.features[0].place_name
        console.log('length', rawAddress.split(', ').length)
        document.querySelector('#rawAddress').textContent = rawAddress

        //gets Address values to next put into Zillow API
        parseAddressByLength(rawAddress)

      })
      .catch(error => {
        console.log(`error ${error}`)
        alert('Sorry, unable to obtain Address from Mapbox')
      })
  }

  function error() {
    findMeStatus.textContent = 'Unable to retrieve your location';
  }

  if (!navigator.geolocation) {
    findMeStatus.textContent = 'Geolocation is not supported by your browser';
  } else {
    findMeStatus.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(success, error);
  }

}

// fetch('https://cors-anywhere.herokuapp.com/http://www.zillow.com/webservice/GetDeepSearchResults.htm?zws-id=X1-ZWz17qrfs9kp3f_17jma&address=2114+Bigelow+Ave&citystatezip=Seattle%2C+WA')
// fetch('https://cors-anywhere.herokuapp.com/http://www.zillow.com/webservice/GetDeepSearchResults.htm?zws-id=X1-ZWz17qrfs9kp3f_17jma&address=34 Goldcliff Rd&citystatezip=Malden%2C+MA')
function getZestimate() {
  console.log('#getZestimate');
  document.querySelector("#price").style.color = "#f82249"

  // Zoom In - LIVE
  map.zoomTo(18, {
    duration: 16000
  })
  // fetch(`https://cors-anywhere.herokuapp.com/http://www.zillow.com/webservice/GetDeepSearchResults.htm?zws-id=X1-ZWz17qrfs9kp3f_17jma&address=138 Cherry Street&citystatezip=Malden%2C+Massachusetts`)
  fetch(`https://cors-anywhere.herokuapp.com/http://www.zillow.com/webservice/GetDeepSearchResults.htm?zws-id=X1-ZWz17qrfs9kp3f_17jma&address=${streetAddress}&citystatezip=${city}%2C+${state}`)
    .then(response => response.text())
    .then(response => {
      document.querySelector("#price").style.fontSize = "22px"
      document.querySelector("#searchResults").innerHTML = "Explore the Details Link in the Favorite's List Below"
      document.querySelector("#searchResults").classList.add("pulsateTemp")

      // DOMParser constructor
      let parser = new DOMParser()
      let xml = parser.parseFromString(response, 'application/xml')


      console.log('Year Built', xml.querySelector('yearBuilt').innerHTML);
      yearBuilt = xml.querySelector('yearBuilt').innerHTML
      console.log('yearBuilt', yearBuilt)


      console.log('Purpose', xml.querySelector('useCode').innerHTML);
      purpose = xml.querySelector('useCode').innerHTML
      console.log('Living Space Square Footage', xml.querySelector('finishedSqFt').innerHTML);
      liveSqFt = xml.querySelector('finishedSqFt').innerHTML
      console.log('Lot Size Square Footage', xml.querySelector('lotSizeSqFt').innerHTML);
      lotSqFt = xml.querySelector('lotSizeSqFt').innerHTML
      console.log('Bedrooms', xml.querySelector('bedrooms').innerHTML);
      bedRoom = xml.querySelector('bedrooms').innerHTML
      console.log('Bathrooms', xml.querySelector('bathrooms').innerHTML);
      bathRoom = xml.querySelector('bathrooms').innerHTML
      console.log('Total Rooms', xml.querySelector('totalRooms').innerHTML);
      totalRoom = xml.querySelector('totalRooms').innerHTML
      console.log('Last Sold', xml.querySelector('lastSoldDate').innerHTML, xml.querySelector('lastSoldPrice').innerHTML);
      soldDate = xml.querySelector('lastSoldDate').innerHTML
      soldPrice = xml.querySelector('lastSoldPrice').innerHTML
      console.log('Comparables', xml.querySelector('comparables').innerHTML);
      comps = xml.querySelector('comparables').innerHTML
      console.log('Neighborhood Home Value Analysis', xml.querySelector('overview').innerHTML);
      neighValue = xml.querySelector('overview').innerHTML
      console.log('More Info', xml.querySelector('homedetails').innerHTML);
      moreInfo = xml.querySelector('homedetails').innerHTML
      // let yearBuilt, purpose, liveSqFt, lotSqFt, bedRoom, bathRoom, totalRoom, soldDate, soldPrice, comps, neighValue, moreInfo

      console.log('ZestimateAmt and Address', xml)
      ZestimateAmt = xml.querySelector('amount').innerHTML
      // Convert to Number
      ZestimateAmt = Number.parseInt(ZestimateAmt)
      // Round to 10,000
      ZestimateAmt = Math.round(ZestimateAmt / 10000) * 10000
      // ADD COMMAS AT EVERY THOUSAND
      ZestimateAmt = ZestimateAmt.toLocaleString()
      console.log(`ZestimateAmt $${ZestimateAmt}`)
      ZestimateAmt = `$${ZestimateAmt} Zestimate®`
      document.querySelector('#zestimate').textContent = ZestimateAmt
    })
    .catch(error => {
      console.log(`Zillow API error ${error}`)
      document.querySelector("#zestimate").innerText = 'Sorry, Unable To Retrieve Estimate at this time'
    })
}

function parseAddressByLength(rawAddress) {
  if (rawAddress.split(', ').length === 4) {
    streetAddress = rawAddress.split(', ')[0]
    console.log('streetAddress', streetAddress)
    city = rawAddress.split(', ')[1]
    console.log('city', city)
    state = rawAddress.split(', ')[2].split(' ')[0]
    console.log('state', state)
    zip = rawAddress.split(', ')[2].split(' ')[1]
    console.log('zip', zip);
  } else {
    streetAddress = rawAddress.split(', ')[1]
    console.log('streetAddress', streetAddress)
    city = rawAddress.split(', ')[2]
    console.log('city', city)
    state = rawAddress.split(', ')[3].split(' ')[0]
    console.log('state', state)
    zip = rawAddress.split(', ')[3].split(' ')[1]
    console.log('zip', zip);
  }
}

// console.log(document.querySelector("#currentUser").innerHTML, "currentUser")
function saveHouse() {
  document.querySelector("#where").style.color = "white"
  document.querySelector("#price").style.color = "white"
  document.querySelector("#searchResults").style.color = "white"

  console.log('#saveHouse');
  console.log('zip', zip)


  fetch('saveHouse', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // 'user' : document.querySelector("#currentUser").innerHTML,
        'rawAddress': rawAddress,
        'zip': zip,
        'latitude': latitude,
        'longitude': longitude,
        'ZestimateAmt': ZestimateAmt,
        'yearBuilt': yearBuilt,
        'purpose': purpose,
        'liveSqFt': liveSqFt,
        'lotSqFt': lotSqFt,
        'bedRoom': bedRoom,
        'bathRoom': bathRoom,
        'totalRoom': totalRoom,
        'soldDate': soldDate,
        'soldPrice': soldPrice,
        'comps': comps,
        'neighValue': neighValue,
        'moreInfo': moreInfo

        // let yearBuilt, purpose, liveSqFt, lotSqFt, bedRoom, bathRoom, totalRoom, soldDate, soldPrice, comps, neighValue, moreInfo

      })
    })
    .then(data => {
      console.log(data)
      window.location.reload(true)
    })
}

document.querySelector('#findLatLongAddress').addEventListener('click', geoFindMe)

document.querySelector('#getZestimate').addEventListener('click', getZestimate)

document.querySelector('#saveHouse').addEventListener('click', saveHouse)


let trash = document.querySelectorAll(".fa-trash")
trash.forEach((element) => {
  element.addEventListener('click', function() {
    const rawAddress = this.parentNode.parentNode.childNodes[7].innerText
    console.log("rawAddress", rawAddress)
    fetch('removeHouse', {
        method: 'delete',
        headers: {
          'Content-Type': 'application/json'
        },
        //changing to JSON format to send from client to server
        body: JSON.stringify({
          'rawAddress': rawAddress
        })
      })
      .then(function(response) {
        window.location.reload()
      })
  });
});

let star = document.querySelectorAll(".fa-star")
star.forEach((element) => {
  element.addEventListener('click', function() {
    const rawAddress = this.parentNode.parentNode.childNodes[7].innerText
    console.log(rawAddress)
    fetch('starHouse', {
        method: 'put',
        headers: {
          'Content-Type': 'application/json'
        },
        //changing to JSON format to send from client to server
        body: JSON.stringify({
          'rawAddress': rawAddress
        })
      })
      .then(function(response) {
        window.location.reload()
      })
  });
});






//
