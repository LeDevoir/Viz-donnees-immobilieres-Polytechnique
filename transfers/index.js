d3.csv('donn_transf_prop_reqst.csv').then((data) => {
    const regionNames = {
        1: "Bas-Saint-Laurent",
        2: "Saguenay-Lac-Saint-Jean",
        3: "Capitale-Nationale",
        4: "Mauricie",
        5: "Estrie",
        6: "Montréal",
        7: "Outaouais",
        8: "Abitibi-Témiscamingue",
        9: "Côte-Nord",
        10: "Nord-du-Québec",
        11: "Gaspésie-Îles-de-la-Madeleine",
        12: "Chaudière-Appalaches",
        13: "Laval",
        14: "Lanaudière",
        15: "Laurentides",
        16: "Montérégie",
        17: "Centre-du-Québec",
    };

    data.forEach((d) => {
        d.Month = d3.timeParse("%Y-%m-%d")(d.DT_DEBUT_MOIS);
        d.Year = d3.timeFormat("%Y")(d.Month);
        d.MonthFormatted = d3.timeFormat("%Y-%m")(d.Month);
        d.NB_REQST = +d.NB_REQST;
        d.Region = regionNames[+d.ID_REGN_ADMIN];
    });

    const minDate = d3.min(data, d => d.Month);
    const maxDate = d3.max(data, d => d.Month);
    let zMax = d3.max(data, d => d.NB_REQST); 
    let colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([0, zMax]);
    d3.select("#startDate").attr("min", d3.timeFormat("%Y-%m-%d")(minDate)).attr("max", d3.timeFormat("%Y-%m-%d")(maxDate));
    d3.select("#endDate").attr("min", d3.timeFormat("%Y-%m-%d")(minDate)).attr("max", d3.timeFormat("%Y-%m-%d")(maxDate));
    
    const regionSelector = d3.select("#regionSelector");
    regionSelector.selectAll("option").remove(); 
    const aggregateData = (data, timeUnit) => {
        return d3.rollups(
            data,
            (v) => d3.sum(v, (d) => d.NB_REQST),
            (d) => (timeUnit === "month" ? d.MonthFormatted : d.Year),
            (d) => d.Region
        );
    };

    const createPivotTable = (aggregatedData) => {
        const pivotData = {};
        aggregatedData.forEach(([time, regions]) => {
            regions.forEach(([region, sum]) => {
                if (!pivotData[region]) pivotData[region] = {};
                pivotData[region][time] = sum;
            });
        });
        return pivotData;
    };

    let aggregatedData = aggregateData(data, "month");
    let pivotData = createPivotTable(aggregatedData);

    const margin = { top: 50, right: 100, bottom: 150, left: 200 };
    const width = 800 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    const transMarginLeft=margin.left+100;
    const svg = d3
        .select("#heatmap")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + transMarginLeft + "," + margin.top + ")");

    const x = d3.scaleBand().range([0, width]).padding(0.01);
    const y = d3.scaleBand().range([height, 0]).padding(0.01);

    let color = d3.scaleSequential(d3.interpolateCool)
        .domain([0, d3.max(Object.values(pivotData).flatMap((d) => Object.values(d)))]);

    const times = Array.from(new Set(data.map((d) => d.MonthFormatted)));
    const regions = Object.keys(pivotData);

    x.domain(times);
    y.domain(regions);

    // Add X Axis
    const xAxis = svg
        .append("g")
        .attr("class", "x axis text-sm")
        .attr("transform", "translate(0," + height + ")");

    xAxis
        .call(
            d3.axisBottom(x).tickValues(
                x.domain().filter(function (d, i) {
                    return !(i % 3);
                })
            )
        )
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
    // Add Y Axis
    svg.append("g").attr("class", "y axis text-sm").call(d3.axisLeft(y));
    function getAxisLabel(timeUnit) {
    return timeUnit === "month" ? "Mois" : "Année";
}
    // Add X Axis Label
    svg.append("text")
    .attr("class", "axis-label text-xl font-semibold")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 88) // Adjust this value as needed
    .text(getAxisLabel(initialTimeUnit));

    // Add Y Axis Label
    svg.append("text")
        .attr("class", "axis-label text-xl font-semibold")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left -30)
        .attr("x", 0 - height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Régions");

    const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip p-2 bg-white border rounded-md shadow-lg")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("pointer-events", "none");

    const updateHeatmap = (pivotData, timeUnit, selectedRegions) => {
       const xAxisLabel = timeUnit === "month" ? "Mois" : "Année";

    // Update the text of the X-axis label
      d3.select(".axis-label")
      .text(xAxisLabel);
        const times = Array.from(new Set(data.map((d) => timeUnit === "month" ? d.MonthFormatted : d.Year)));
        x.domain(times);
        xAxis
            .call(
                d3.axisBottom(x).tickValues(
                    x.domain().filter(function (d, i) {
                        return !(i % (timeUnit === "month" ? 3 : 1));
                    })
                )
            )
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.selectAll("rect").remove();

        if (selectedRegions.includes("Tout")) {
            selectedRegions = regions;
        }

        selectedRegions.forEach((region) => {
            x.domain().forEach((time) => {
                svg
                    .append("rect")
                    .attr("x", x(time))
                    .attr("y", y(region))
                    .attr("width", x.bandwidth())
                    .attr("height", y.bandwidth())
                    .attr("rx", 4) // Rounded corners
                    .attr("ry", 4) // Rounded corners
                    .style("fill", color(pivotData[region][time] || 0))
                    .style("stroke-width", 2)
                    .style("stroke", "#e2e8f0")
                    .style("opacity", 0.8)
                   .on("mouseover", function (event, d) {
                        tooltip.transition().duration(200).style("opacity", 0.9);
                        tooltip
                            .html(`Region: ${region}<br>${timeUnit.charAt(0).toUpperCase() + timeUnit.slice(1)}: ${time}<br>Requete: ${pivotData[region][time] }`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function (d) {
                        tooltip.transition().duration(500).style("opacity", 0);
                    });
            });
        });
        
    };

    updateHeatmap(pivotData, "month", regions);
   

    const colorSelector = d3
        .select("#colorSelector")
        .append("select")
        .attr("class", "p-2 border rounded-md");

    const colorOptions = [
        { name: "Cool", scale: d3.interpolateCool },
    ];

    colorOptions.forEach((option) => {
        colorSelector
            .append("option")
            .attr("value", option.name)
            .text(option.name);
    });

    colorSelector.on("change", function (event) {
        const selectedOption = colorOptions.find(
            (option) => option.name === this.value
        );
        color = d3
            .scaleSequential(selectedOption.scale)
            .domain([0, zMax]);
        svg.selectAll("rect").style("fill", function (d) {
            const region = d3.select(this).attr("y");
            const time = d3.select(this).attr("x");
            return color(pivotData[region][time] || 0);
        });
        updateLegend(color);
    });

    const legendWidth = 40,
        legendHeight = height;

    const legendSvg = d3
        .select("#legend")
        .append("svg")
                .attr("width", legendWidth + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", translate(10, ${margin.top}));

    const legendScale = d3
        .scaleLinear()
        .domain([0, zMax])
        .range([legendHeight, 0]);

    const legendAxis = d3
        .axisRight(legendScale)
        .ticks(20)
        .tickFormat(d3.format(".0f"));
    
    const gradient = legendSvg.select("defs")
    .select("linearGradient")
    .selectAll("stop")
    .data([
        {offset: "0%", color: colorScale(0), opacity: 0.2},
        {offset: "50%", color: colorScale((0 + zMax) / 2), opacity: 0.6},
        {offset: "100%", color: colorScale(zMax), opacity: 1}
    ])
    .join("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color)
    .attr("stop-opacity", d => d.opacity);
   const legendGradient = legendSvg.append("defs")
    .append("svg:linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%")
    .attr("spreadMethod", "pad");

legendGradient.selectAll("stop")
    .data([
        {offset: "0%", color: colorScale(0), opacity: 0.2},
        {offset: "33%", color: colorScale(zMax * 0.33), opacity: 0.5},
        {offset: "67%", color: colorScale(zMax * 0.67), opacity: 0.7},
        {offset: "100%", color: colorScale(zMax), opacity: 1}
    ])
    .enter()
    .append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color)
    .attr("stop-opacity", d => d.opacity);

    legendSvg
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#gradient)");

    legendSvg
        .append("g")
        .attr("class", "axis text-sm")
        .attr("transform", translate(${legendWidth}, 0))
        .call(legendAxis);

    legendSvg
        .append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("class", "text-sm font-semibold text-gray-700")
        .text("Requests");

    function updateLegend(color) {
        const legendGradient = legendSvg.select("defs linearGradient");
        legendGradient
            .selectAll("stop")
            .data([
                { offset: "0%", color: color(0) },
                { offset: "100%", color: color(zMax) },
            ])
            .join("stop")
            .attr("offset", (d) => d.offset)
            .attr("stop-color", (d) => d.color);
    }
        function updateGradient(data) {
       
        let zMaxq = d3.max(data, d => d.NB_REQST); 
        colorScale.domain([0, zMax]); 

        
        const gradient = legendSvg.select("defs")
            .select("linearGradient")
            .selectAll("stop")
            .data([
                {offset: "0%", color: colorScale(0), opacity: 0.2},
                {offset: "50%", color: colorScale(zMaxq * 0.5), opacity: 0.6},
                {offset: "100%", color: colorScale(zMaxq), opacity: 1}
            ])
            .join("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color)
            .attr("stop-opacity", d => d.opacity);
    }

    
  regionSelector
        .append("option")
        .attr("value", "Tout")
        .text("Tout");
   

regionSelector.selectAll(null)
        .data(regions)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);
       

    // Add the "All" option for region selection
    


    const filterDataByDate = (data, startDate, endDate) => {
        return data.filter(d => {
            const date = new Date(d.DT_DEBUT_MOIS);
            return (!startDate || date >= startDate) && (!endDate || date <= endDate);
            
        });
    };

    // Update heatmap on region selection change
    regionSelector.on("change", function() {
        const selectedRegions = Array.from(this.selectedOptions, option => option.value);
        const selectedTimeUnit = d3.select(this).property("value");
        d3.select(".axis-label").text(getAxisLabel(selectedTimeUnit));
        updateHeatmap(pivotData, d3.select("#timeSelector").property("value"), selectedRegions);
        updateGradient(data); 
    });

    // Update heatmap on time period selection change
    d3.select("#timeSelector").on("change", function () {
        const timeUnit = this.value;
        aggregatedData = aggregateData(data, timeUnit);
        pivotData = createPivotTable(aggregatedData);
        const selectedRegions = Array.from(regionSelector.node().selectedOptions, option => option.value);
        updateHeatmap(pivotData, timeUnit, selectedRegions);
        updateGradient(data); 
    });

    d3.select("#applyFilters").on("click", function () {
        const startDate = new Date(d3.select("#startDate").property("value"));
        const endDate = new Date(d3.select("#endDate").property("value"));
        const filteredData = filterDataByDate(data, startDate, endDate);
        const timeUnit = d3.select("#timeSelector").property("value");
        aggregatedData = aggregateData(filteredData, timeUnit);
        pivotData = createPivotTable(aggregatedData);
        const selectedRegions = Array.from(regionSelector.node().selectedOptions, option => option.value);
        updateHeatmap(pivotData, timeUnit, selectedRegions);
        updateGradient(data); 
  });
});
