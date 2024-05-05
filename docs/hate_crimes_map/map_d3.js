// Load the SVG map dynamically from GitHub
d3.text("https://raw.githubusercontent.com/dataout-org/datavis/main/rf_tiled_map/tilemaprf_xy.svg").then(function(svgString) {
  var parser = new DOMParser();
  var xml = parser.parseFromString(svgString, "image/svg+xml");
  var importedNode = document.importNode(xml.documentElement, true);
  document.getElementById("rf_map").appendChild(importedNode);

  var spreadsheetUrl = "https://docs.google.com/spreadsheets/d/18NSZd6RgeSjEW1RzbYY4lQbFYHWaGKIMb8KLGQuZfDc/export?format=csv";

  // loading csv from the spreadsheet
  d3.text(spreadsheetUrl)
    .then(function(csvData) {
      // parsing the csv data
      var data = d3.csvParse(csvData);
    
    // converting string numbers to int
    data.forEach(function(d) {
      d.n_victims = +d.n_victims;
      d.n_fatalities = +d.n_fatalities;
      d.n_crimes = +d.n_crimes;
    });
    

    // group data by region_code and calculate total victims for each region
    var regionData = d3.group(data, d => d.region_code);
    var victimCounts = new Map();

    regionData.forEach(function(value, key) {
      var totalVictims = d3.sum(value, d => d.n_victims);
      victimCounts.set(key, totalVictims);
    });

    // define color scale based on the range of victim counts
    var maxVictims = d3.max(Array.from(victimCounts.values()));
    var colorScale = d3.scaleSequential()
      .domain([0, maxVictims])
      .interpolator(function(t) {
        return d3.interpolateReds(t);
      });

    // select the group containing the tiles
    var tilesContainer = d3.select("#tiles_container");
    var textContainer = d3.select("#names_container");
    
    // select the tooltip element
    var tooltip = d3.select("#tooltip");

    // apply colors to the tiles based on the number of victims
    tilesContainer.selectAll("rect").each(function() {
      var tile = d3.select(this);
      var regionCode = tile.attr("id");
      var regionVictims = victimCounts.get(regionCode);
      var fillColor;
      if (regionVictims !== undefined) {
        fillColor = colorScale(regionVictims);
      } else {
        fillColor = "rgb(244, 244, 244)"; // color tiles with no values
      }
  
      // apply fill color
      tile.style("fill", fillColor);
      
      // determine text color dynamically based on perceived brightness
      var textColor = getContrastColor(fillColor);

      // select text element and change color
      var textElement = d3.select("#name_" + regionCode);
      textElement.style("fill", textColor);
      
      // add hover event listeners for tiles with data
      if (regionVictims !== undefined) {
        tile.on("mouseover", function(event) {
          // get tile dimensions and position
          var tileRect = tile.node().getBoundingClientRect();
          var tileLeft = tileRect.left + window.scrollX;
          var tileTop = tileRect.top + window.scrollY;
          // display tooltip with region name and number of victims
          tooltip.style("visibility", "visible")
                 .html(tile.attr("regionNameEn") + "<br> Victims: " + regionVictims)
                 .style("left", (tileLeft + tileRect.width / 2) + "px")
                 .style("top", (tileTop + (tileRect.height / 2)) + "px");
        })
        .on("mouseout", function() {
          // hide tooltip on mouseout
          tooltip.style("visibility", "hidden");
        })
        .on("click", function() {
            // reset previously selected tiles
            textContainer.selectAll("text").style("font-weight", "normal");

            // highlight the clicked tile's name by making it bold
            textElement.style("font-weight", "bold");
            // filter the CSV data for cases belonging to the clicked region
            var cases = data.filter(function(d) {
              return d.region_code === regionCode;
            });
        
      // generating HTML table dynamically
            var tableHTML = "<thead><tr><th>Case Number</th><th>Region (RU)</th><th>Article</th><th>Fatalities</th><th>Victims</th><th>Crimes</th><th>Crime Type</th><th>Source</th></tr></thead><tbody>";
            cases.forEach(function(d) {
              tableHTML += "<tr><td>" + d.case_number + "</td><td>" + d.region_name_ru + "</td><td>" + d.article + "</td><td>" + d.n_fatalities + "</td><td>" + d.n_victims + "</td><td>" + d.n_crimes + "</td><td>" + d.crime_type + "</td><td>" + d.source + "</td></tr>";
            });
            tableHTML += "</tbody>";

            // fill the table with the generated HTML
            document.querySelector("#data-table").innerHTML = tableHTML;
          });
      }
    });
    
    // generate initial HTML table with all cases
    var initialTableHTML = "<thead><tr><th>Case Number</th><th>Region (RU)</th><th>Article</th><th>Fatalities</th><th>Victims</th><th>Crimes</th><th>Crime Type</th><th>Source</th></tr></thead><tbody>";
    data.forEach(function(d) {
      initialTableHTML += "<tr><td>" + d.case_number + "</td><td>" + d.region_name_ru + "</td><td>" + d.article + "</td><td>" + d.n_fatalities + "</td><td>" + d.n_victims + "</td><td>" + d.n_crimes + "</td><td>" + d.crime_type + "</td><td>" + d.source + "</td></tr>";
    });
    initialTableHTML += "</tbody>";

    // fill the initial table with the generated HTML
    document.querySelector("#data-table").innerHTML = initialTableHTML;
  });
});


// Function to calculate perceived brightness based on HSL color space
function getPerceivedBrightness(color) {
  var rgb = d3.rgb(color);
  var hsl = d3.hsl(rgb);
  return hsl.l;
}

// Function to dynamically determine text color based on perceived brightness
function getContrastColor(bgColor) {
  var brightness = getPerceivedBrightness(bgColor);
  return brightness > 0.5 ? "black" : "white"; // black text for light backgrounds, white text for dark backgrounds
}