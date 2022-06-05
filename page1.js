const loadPage1 = () => {
    console.log("Page 1 loaded");

    if (document.getElementsByClassName('active')[0]) {
        if (document.getElementsByClassName('active')[0].id == "page1") {
            return
        }

        document.getElementsByClassName('active')[0].classList.remove('active')
    }

    document.getElementById('page1').classList.add('active')

    if (document.getElementById('page1').classList.contains('loaded')) {
        return
    }
    const loaded = () => document.getElementById('page1').classList.add('loaded')

    const resp = new responsiveFn()

    const margin = { top: 50, right: 50, bottom: 50, left: 50 }
    const width = window.innerWidth - margin.left - margin.right // Use the window's width
    const height = window.innerHeight - margin.top * 2 - margin.bottom * 2 - 200 // Use the window's height
    const screen = d3
        .select('#chart')
        .append('svg')
        .attr('id', 'screen')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .call(resp.responsivefy)
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`)

    const slider = d3
        .select('#chart')
        .append('svg')
        .attr('id', 'slider')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', 100 + margin['top'] + margin['bottom'])
        .call(resp.responsivefy)
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`)

    let originalData
    d3.json('hist_prices.json')
        .then(data => {
            const displayData = []
            for (const [date, v] of Object.entries(data)) {
                if (v['market_data'] == null) {
                    continue
                }
                const thedate = new Date(date)
                if (v['market_data']['current_price']['aud'] == null) {
                    console.log("Why AUD zero???")
                }
                displayData.push({
                    date: thedate,
                    value: v['market_data']['current_price']['usd'],
                })
            }
            originalData = data
            displayData.sort((a, b) => a.date - b.date)

            return displayData
        })
        .then(data => {
            let xLeft = width * 7 / 8
            let xRight = width

            // placeholder
            screen.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", width)
                .attr("height", height)
                .style("opacity", 0)

            // Add X axis
            const ext = d3.extent(data, d => d.date)
            const range = Math.ceil((ext[1] - ext[0]) / (1000 * 60 * 60 * 24))

            Date.prototype.addDays = function (days) {
                var date = new Date(this.valueOf())
                date.setDate(date.getDate() + days)
                return date
            }
            let start = new Date(ext[0])
            start = start.addDays(Math.ceil(range * xLeft / width))
            let end = new Date(ext[0])
            end = end.addDays(Math.ceil(range * xRight / width))

            const xAxis = d3.scaleTime()
                .domain([start, end])
                .range([0, width])
            const xAxisSlider = d3.scaleTime()
                .domain(ext)
                .range([0, width])
            const x = screen.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xAxis))

            // Add Y axis
            console.log()
            console.log(d3.max(data, d => d.value))
            const yAxis = d3.scaleLinear()
                .domain([0, d3.max(data.slice(
                    Math.ceil(data.length * xLeft / width),
                    Math.ceil(data.length * xRight / width))
                    , d => d.value)])
                .range([height, 0])
            const y = screen.append("g")
                .call(d3.axisLeft(yAxis))

            const yAxisSlider = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.value)])
                .range([100, 0])

            // Add the lines
            const priceLine = screen.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "green")
                .attr("stroke-width", 3)
                .attr("d", d3.line()
                    .x(d => xAxis(d.date))
                    .y(d => yAxis(d.value)))
            const xAxisLine = screen
                .append("g")
                .append("rect")
                .attr("class", "dotted")
                .attr("stroke-width", "1px")
                .attr("stroke", "yellow")
                .attr("width", "1px")
                .attr("color", "yellow")
                .attr("height", height)
                .attr("opacity", 0)

            const div = d3.select("#page1").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)

            screen
                .on('mousemove', (e, d) => {
                    const ptr = d3.pointer(e);
                    const date = xAxis.invert(ptr[0])
                    div.style("opacity", 1);
                    xAxisLine
                        .attr("opacity", 0.5)
                        .attr("x", xAxis(date))

                    const index = d3.scan(data, (a, b) => Math.abs(a.date - date) - Math.abs(b.date - date))
                    div.html(date + ": " + data[index].value.toFixed(2) + " USD")
                        .style("left", (ptr[0] + 50) + "px")
                        .style("top", (ptr[1] + 250) + "px")
                })
                .on('mouseleave', (e, d) => {
                    div.style("opacity", 0);
                    xAxisLine
                        .attr("opacity", 0)
                });
            slider.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "white")
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(d => xAxisSlider(d.date))
                    .y(d => yAxisSlider(d.value)))

            // implement inspired by http://jsfiddle.net/SunboX/vj4jtdg8/
            const sliderRecCover = slider.append('rect')
                .attr("x", xLeft)
                .attr("y", 0)
                .attr("width", xRight - xLeft)
                .attr("height", 100)
                .attr("fill", "red")
                .attr("opacity", 0.5)
            const sliderLineLeft = slider.append('rect')
                .attr("x", xLeft)
                .attr("y", 0)
                .attr("width", 4)
                .attr("height", 100)
                .attr("fill", "lightgreen")
                .attr("opacity", 0.8)
            const sliderLineRight = slider.append('rect')
                .attr("x", xRight)
                .attr("y", 0)
                .attr("width", 4)
                .attr("height", 100)
                .attr("fill", "lightgreen")
                .attr("opacity", 0.8)

            const updateRect = (left, right) => {
                sliderRecCover
                    .attr("x", left)
                    .attr("width", right - left)
                sliderLineLeft
                    .attr("x", left)
                sliderLineRight
                    .attr("x", right)
                xLeft = left
                xRight = right

                let start = new Date(ext[0])
                start = start.addDays(Math.ceil(range * Math.max(xLeft - 4, 0) / width))
                let end = new Date(ext[0])
                end = end.addDays(Math.ceil(range * Math.min(xRight + 4, width) / width))
                xAxis.domain([start, end])
                yAxis.domain([0, d3.max(data.slice(
                    Math.ceil(data.length * Math.max(xLeft - 4, 0) / width),
                    Math.ceil(data.length * Math.min(xRight + 4, width) / width))
                    , d => d.value)])
                priceLine.attr("d", d3.line()
                    .x(d => xAxis(d.date))
                    .y(d => yAxis(d.value)))
                x.call(d3.axisBottom(xAxis))
                y.call(d3.axisLeft(yAxis))
            }

            // handle moving
            sliderRecCover.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                const prevCenter = (xLeft + xRight) / 2
                const delta = ptr[0] - prevCenter
                if (xLeft + delta > 0 && xRight + delta < width) {
                    updateRect(xLeft + delta, xRight + delta)
                }
            }))

            sliderLineLeft.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                if (ptr[0] < xRight) {
                    updateRect(ptr[0], xRight)
                }
            }))

            sliderLineRight.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                if (ptr[0] > xLeft && ptr[0] < width) {
                    updateRect(xLeft, ptr[0])
                }
            }))

        })

    loaded()
}