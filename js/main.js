// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1Ijoia2FwY2Fuc2giLCJhIjoiY21rNDRqY3NyMDN6OTNlb2p0MGNoMmt3NyJ9.dJfye3FVRxijxl2_diGcPQ';

// Set up the map for Lab 3
const toronto_map = new mapboxgl.Map({
    container: 'my-map', // map container ID
    style: 'mapbox://styles/mapbox/standard', // style URL, // style URL
    config: {basemap: {
            lightPreset: "morning",
            theme: "faded",
            showRoadLabels: false, showPlaceLabels: false},
        show3dObjects: false}, // map configuration settings
    center: [-79.39, 43.66], // starting position [lng, lat]
    zoom: 12}); // starting zoom level

// Store field names of important field names from ward data
// These fields will be used to generate choropleth maps
// of % bachelor's degree or higher and % youth ages 20-29
const total_pop_field = "Total - Highest certificate, diploma or degree for the population aged 15 years and over in private households - 25% sample data"
const bachelor_deg_field = "    Bachelor’s degree or higher"
const youth_fields = ["  20 to 24 years", "  25 to 29 years"]
const unemployment_field = 'Unemployment rate';

// Store color scheme (for choropleth map and legends)
let color_scheme_unemployment = ['#fd8d3c', '#fc4e2a', '#e31a1c', '#d70b36', '#800026'];
let color_scheme_bachelor = ['#84c4ff', '#8383f3', '#6060ec', '#3f3fff', '#0303a6'];
let color_scheme_youth = ['#c39bd3', '#9b59b6', '#8000ff', '#6a0dad', '#4b0082'];
// Step Intervals for bachelor degree percentage and youth percentage (uses equal interval method)
// Intervals computed in ArcGIS Pro
let bachelor_intervals = [0.27, 0.36, 0.45, 0.54]
let youth_intervals = [0.14, 0.18, 0.21, 0.24]
let unemployment_intervals = [11.4, 13.0, 14.6, 16.2]

// Store legend items for the bachelor classification
const bachelor_legend_items =
    [{'label': '0 - 27%', 'color': color_scheme_bachelor[0]},
        {'label': '27 - 36%', 'color': color_scheme_bachelor[1]},
        {'label': '36 - 45%', 'color': color_scheme_bachelor[2]},
        {'label': '45 - 54%', 'color': color_scheme_bachelor[3]},
        {'label': '>54%', 'color': color_scheme_bachelor[4]}]
// Store legend items for the youth classification (legend can change dynamically)
const youth_legend_items =
    [{'label': '0 - 14%', 'color': color_scheme_youth[0]},
        {'label': '14 - 18%', 'color': color_scheme_youth[1]},
        {'label': '18 - 21%', 'color': color_scheme_youth[2]},
        {'label': '21 - 24%', 'color': color_scheme_youth[3]},
        {'label': '>24%', 'color': color_scheme_youth[4]}]
// Store legend items for the unemployment classification
const unemployment_items =
    [{'label': '9.0 - 11.4%', 'color': color_scheme_unemployment[0]},
        {'label': '11.4 - 13.0%', 'color': color_scheme_unemployment[1]},
        {'label': '13.0 - 14.6%', 'color': color_scheme_unemployment[2]},
        {'label': '14.6 - 16.2%', 'color': color_scheme_unemployment[3]},
        {'label': '>16.2%', 'color': color_scheme_unemployment[4]}]

// Create legend upon initialization (legend can change later)
// For each array item create a row to put the label and colour in
bachelor_legend_items.forEach(({ label, color }) => {
    const row = document.createElement('div');
    const colrect = document.createElement('span');

    colrect.className = 'legend-colrect';
    colrect.style.setProperty('--legendcolor', color);

    const text = document.createElement('span');
    text.className = 'legend-text';
    text.textContent = label;

    console.log(colrect);

    row.append(colrect, text);
    legend.appendChild(row);
});
toronto_map.on('load', () =>
{
    // Add the Toronto neighbourhoods geoJSON dataset
    toronto_map.addSource('tor-wards-data', {type: 'geojson',data: 'data/ward_data.geojson'});

    // Add the Toronto crime data geoJSON dataset
    toronto_map.addSource('tor-crime-data', {type: 'geojson',data: 'data/crimes_2024.geojson'});

    // Visualize the Toronto neighbourhoods dataset on the map
    // % Obtained Bachelor's Degree or Higher Choropleth Map
    toronto_map.addLayer({
        'id': 'tor-wards-polygon',
        'type': 'fill',
        'source': 'tor-wards-data',
        'paint': {
            'fill-color': [
                'step',
                ['/', ['get', bachelor_deg_field], ['get', total_pop_field]],
                color_scheme_bachelor[0],
                bachelor_intervals[0], color_scheme_bachelor[1],
                bachelor_intervals[1], color_scheme_bachelor[2],
                bachelor_intervals[2], color_scheme_bachelor[3],
                bachelor_intervals[3], color_scheme_bachelor[4]
            ], // Test alternative colours and style properties
            'fill-opacity': 1,
            'fill-outline-color': 'black'
        }
    });


    // Visualize the Toronto crime dataset on the map
    // Change the visual size of the points so they are smaller when zoomed out
    // (to reduce visual clutter when lots of points render on the map)
    toronto_map.addLayer({
        'id': 'tor-crime-points',
        'type': 'circle',
        'source': 'tor-crime-data',
        'paint': {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, 1,
                12, 6
            ],
            'circle-color': 'black'
        },
    });

    // Trigger a pop up when the user clicks on a crime point
    toronto_map.addInteraction('crime-points-interaction', {
        type: 'click',
        target: { layerId: 'tor-crime-points'},
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

// Retrieve ward classification dropdown element
let ward_classification = document.getElementById("wards-classification");

// Add event listener for ward classification dropdown element
ward_classification.addEventListener('change', () => {
    // Extract user selected ward classification and ward layer id
    const classify_value = ward_classification.value;
    const ward_layer_id = 'tor-wards-polygon';

    console.log(classify_value);

    // ages 20-29 considered youth
    // we have fields of ages 20-24 and 25-29, so I added them together
    // change the classification choropleth scheme based on user-selected ward classification
    if (classify_value === 'Pop % considered Youth') {
        let youth_classification_scheme = [
            'step',
            ['/', ['+', ['get', youth_fields[0]], ['get', youth_fields[1]]], ['get', total_pop_field]],
            color_scheme_youth[0],
            youth_intervals[0], color_scheme_youth[1],
            youth_intervals[1], color_scheme_youth[2],
            youth_intervals[2], color_scheme_youth[3],
            youth_intervals[3], color_scheme_youth[4]]

        toronto_map.setPaintProperty(ward_layer_id, 'fill-color', youth_classification_scheme);

        // Update legend to fit youth classification scheme
        legend_update(youth_legend_items, "% Youth Population.")

    }
    if (classify_value === 'Pop % with Bachelor Degree or Higher')
    {
        let bach_classification_scheme = [
            'step',
            ['/', ['get', bachelor_deg_field], ['get', total_pop_field]],
            color_scheme_bachelor[0],
            bachelor_intervals[0],  color_scheme_bachelor[1],
            bachelor_intervals[1], color_scheme_bachelor[2],
            bachelor_intervals[2], color_scheme_bachelor[3],
            bachelor_intervals[3], color_scheme_bachelor[4]
        ]

        toronto_map.setPaintProperty(ward_layer_id, 'fill-color', bach_classification_scheme);

        // Update legend to fit bachelor degree classification scheme
        legend_update(bachelor_legend_items, "% of Pop Obtained Bachelor's or Higher.")
    }
    if (classify_value === '% Unemployed')
    {
        let unemployment_classification_scheme = [
            'step',
            ['get', unemployment_field],
            color_scheme_unemployment[0],
            unemployment_intervals[0],  color_scheme_unemployment[1],
            unemployment_intervals[1], color_scheme_unemployment[2],
            unemployment_intervals[2], color_scheme_unemployment[3],
            unemployment_intervals[3], color_scheme_unemployment[4]
        ]

        toronto_map.setPaintProperty(ward_layer_id, 'fill-color', unemployment_classification_scheme);

        // Update legend to fit bachelor degree classification scheme
        legend_update(unemployment_items, "% Unemployed.")
    }
})

// Retrieve crime filter dropdown elements
let crime_filter_month = document.getElementById('month-filter');
let crime_filter_type = document.getElementById('crime-type-classification');

// Add event listeners for when either crime filter changes value
crime_filter_month.addEventListener('change', () => {
    console.log('month-filter change');
    // filter values for crimes (multivariate)
    let month = crime_filter_month.value
    let type = crime_filter_type.value

    filter_crimes(month, type);
})
crime_filter_type.addEventListener('change', () => {
    console.log('crime-type change');
    // filter values for crimes (multivariate)
    let month = crime_filter_month.value
    let type = crime_filter_type.value

    filter_crimes(month, type);
})

// filter crime data based on two variables: month and type
// only display crimes that occurred in the month selected by user and are of the type selected by user
function filter_crimes(month, type)
{
    // compute new data filter
    // // filter for only crimes that are in the user-selected month and type
    // special cases to handle if month or type is all
    let new_filter = undefined
    if (month === 'All' && type === 'All')
    {
        new_filter = undefined
    }
    else if (month === 'All')
    {
        new_filter = ['==', ['get', 'MCI_CATEGORY'], type]
    }
    else if (type === 'All')
    {
        new_filter = ['==', ['get', 'REPORT_MONTH'], month]
    }
    else
    {
        new_filter = ['all', ['==', ['get', 'REPORT_MONTH'], month], ['==', ['get', 'MCI_CATEGORY'], type]]
    }

    // set the filter to the new filter
    toronto_map.setFilter('tor-crime-points', new_filter);
}

// This dynamically updates legend based on current classification scheme
function legend_update(legend_items, title) {
    // Update the legend title
    legend_title = document.getElementById("legend-title");
    legend_title.textContent = title;

    // Retrieve current legend data
    const legend_rows = document.querySelectorAll('.legend-colrect');
    const text_rows = document.querySelectorAll('.legend-text')
    console.log(legend_rows);
    console.log(text_rows);

    let index = 0;

    legend_items.forEach(({label, color}) => {
        // Update both colour and text elements with the new data
        let legend_row = legend_rows[index]
        let text_row = text_rows[index]

        console.log(label);
        console.log(legend_row);

        legend_row.style.setProperty('--legendcolor', color);
        text_row.textContent = label;

        index++;
    })


}


