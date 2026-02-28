// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1Ijoia2FwY2Fuc2giLCJhIjoiY21rNDRqY3NyMDN6OTNlb2p0MGNoMmt3NyJ9.dJfye3FVRxijxl2_diGcPQ';

// Set up the nearest crime map for Lab 3
const toronto_map = new mapboxgl.Map({
    container: 'my-map', // map container ID
    style: 'mapbox://styles/mapbox/standard', // style URL, // style URL
    config: {basemap: {
            lightPreset: "morning",
            theme: "faded",
            showRoadLabels: false},
        show3dObjects: false}, // map configuration settings
    center: [-79.39, 43.66], // starting position [lng, lat]
    zoom: 12}); // starting zoom level

// Store global variables for crime points and user address
let crime_points = null;
let address_point = null;

// Add geocoder to map (so user can search for addresses)
// And place it in the top left corner
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    position: 'top-left',
    countries: "ca",
    flyTo: true,
    marker: true
})
toronto_map.addControl(
    geocoder
);

// React to the searched address by displaying the nearest crimes (distance is user-specified)
geocoder.on("result", function(result)
{

    // Determine coordinates of the address the user searched for, store this info in a turf point
    let coords = result.result.center;
    address_point = turf.point(coords,
        {"marker-color": "#0F0"})

    // Load crime data for turf analysis
    fetch('data/crimes_2024.geojson')
        .then(response => {
            return response.json()})
        .then(data => {
            let crime_data = data.features;

            // Load crime features onto turf
            crime_points = turf.featureCollection(crime_data);

            // Obtain current_dist value
            curr_dist = document.getElementById('crime-dist').value;

            render_crimes(address_point, crime_points, curr_dist);

            // Trigger a pop up when the user clicks on a crime point
            toronto_map.addInteraction('crime-points-interaction', {
                type: 'click',
                target: { layerId: 'nearest_crimes_point'},
                handler: (e) => {
                    // Copy coordinates array.
                    const coordinates = e.feature.geometry.coordinates.slice();
                    const day = e.feature.properties['REPORT_DAY'];
                    const month = e.feature.properties['REPORT_MONTH'];
                    const type = e.feature.properties['MCI_CATEGORY'];
                    console.log(coordinates);

                    new mapboxgl.Popup()
                        .setLngLat(coordinates)
                        .setHTML('Crime: ' + type + '<br>' + 'Date: ' + month + ' ' + day)
                        .addTo(toronto_map);
                }
            })
        })

}
)

// Changes the max search distance for nearest crimes (based on what the user inputted)
function change_search_distance(new_dist)
{
    // Update the map
    render_crimes(address_point, crime_points, new_dist)
}
// Renders all crimes within dist of the specified address on the map
function render_crimes(address, crime_points, dist)
{
    // Find the crime closest to the address the user searched
    let crime_buffer = turf.buffer(address, dist, {units: "metres"})
    let crimes_close = turf.pointsWithinPolygon(crime_points, crime_buffer);

    // Remove previous query data (if it exists)
    if (toronto_map.getLayer('nearest_crimes_point'))
    {
        toronto_map.removeLayer('nearest_crimes_point');
        toronto_map.removeSource('nearest_crimes_data');
    }

    // Add the data from the new user query to the map
    toronto_map.addSource('nearest_crimes_data', {type: 'geojson',data: crimes_close});
    toronto_map.addLayer({
        'id': 'nearest_crimes_point',
        'type': 'circle',
        'source': 'nearest_crimes_data',
        'paint': {
            'circle-radius': 5,
            'circle-color': '#c21b10'
        }
    });
}
