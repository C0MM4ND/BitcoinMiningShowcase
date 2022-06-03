const loadPage2 = () => {
    console.log("Page 2 loaded");

    if (document.getElementsByClassName('active')[0]) {
        if (document.getElementsByClassName('active')[0].id == "page2") {
            return
        }

        document.getElementsByClassName('active')[0].classList.remove('active')
    }

    document.getElementById('page2').classList.add('active')

    if (document.getElementById('page2').classList.contains('loaded')) {
        return
    }
    const loaded = () => document.getElementById('page2').classList.add('loaded')
    // draw map

    // credits: https://brendansudol.com/writing/responsive-d3
    // with little modifications for easier multi-svg support
    let resizes = []
    const responsivefy = svg => {
        // get container + svg aspect ratio
        const container = d3.select(svg.node().parentNode),
            width = parseInt(svg.style('width')),
            height = parseInt(svg.style('height')),
            aspect = width / height

        // get width of container and resize svg to fit it
        const resize = () => {
            var targetWidth = parseInt(container.style('width'))
            svg.attr('width', targetWidth)
            svg.attr('height', Math.round(targetWidth / aspect))
        }

        // add viewBox and preserveAspectRatio properties,
        // and call resize so that svg resizes on inital page load
        svg
            .attr('viewBox', '0 0 ' + width + ' ' + height)
            .attr('perserveAspectRatio', 'xMinYMid')
            .call(resize)

        resizes.push(resize)
        // to register multiple listeners for same event type,
        // you need to add namespace, i.e., 'click.foo'
        // necessary if you call invoke this function for multiple svgs
        // api docs: https://github.com/mbostock/d3/wiki/Selections#on
        d3.select(window).on('resize.' + container.attr('id'), () => {
            resizes.forEach(resize => resize())
        })
    }

    const margin = { top: 50, right: 50, bottom: 50, left: 50 }
    const width = window.innerWidth - margin.left - margin.right // Use the window's width
    const height = window.innerHeight - margin.top * 2 - margin.bottom * 2 - 200 // Use the window's height
    const screen = d3
        .select('#chart2')
        .append('svg')
        .attr('id', 'screen')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .call(responsivefy)
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`)

    const slider = d3
        .select('#chart2')
        .append('svg')
        .attr('id', 'slider')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', 100 + margin['top'] + margin['bottom'])
        .call(responsivefy)
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`)

    Promise.all([
        d3.text("block_reward.csv"),
        d3.csv("btc_diff.csv"),
    ])
        .then(data => {
            let data0 = d3.csvParse("block,reward\n" + data[0])
            let data1 = data[1]

            data0.sort((a, b) => a.block - b.block)

            return data0
        })
        .then(data => {
            console.log(data)
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
            const xAxis = d3.scaleLinear()
                .domain([
                    d3.min(data.slice(
                        Math.ceil(data.length * Math.max(xLeft - 4, 0) / width),
                        Math.ceil(data.length * Math.min(xRight + 4, width) / width))
                        , d => d.block),
                    d3.max(data.slice(
                        Math.ceil(data.length * Math.max(xLeft - 4, 0) / width),
                        Math.ceil(data.length * Math.min(xRight + 4, width) / width))
                        , d => d.block)
                ])
                .range([0, width])
            const xAxisSlider = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.block)])
                .range([0, width])
            const x = screen.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xAxis))

            // Add Y axis
            console.log()
            console.log(d3.max(data, d => d.reward))
            const yAxis = d3.scaleLinear()
                .domain([
                    d3.min(data.slice(
                        Math.ceil(data.length * xLeft / width),
                        Math.ceil(data.length * xRight / width))
                        , d => d.reward),
                    d3.max(data.slice(
                        Math.ceil(data.length * xLeft / width),
                        Math.ceil(data.length * xRight / width))
                        , d => d.reward)])
                .range([height, 0])
            const y = screen.append("g")
                .call(d3.axisLeft(yAxis))

            const yAxisSlider = d3.scaleLinear()
                .domain([d3.min(data, d => d.reward), d3.max(data, d => d.reward)])
                .range([100, 0])

            // Add the lines
            const priceLine = screen.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "green")
                .attr("stroke-width", 1)
                .attr("d", d3.line()
                    .x(d => xAxis(d.block))
                    .y(d => yAxis(d.reward)))
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

            const div = d3.select("#page2").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)

            screen
                .on('mousemove', (e, d) => {
                    const ptr = d3.pointer(e);
                    const block = xAxis.invert(ptr[0])
                    div.style("opacity", 1);
                    xAxisLine
                        .attr("opacity", 0.5)
                        .attr("x", xAxis(block))

                    const index = d3.scan(data, (a, b) => Math.abs(a.block - block) - Math.abs(b.block - block))
                    div.html(block + ": " + data[index].reward + "USD")
                        .style("left", (ptr[0]) + "px")
                        .style("top", (ptr[1]) + "px");
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
                    .x(d => xAxisSlider(d.block))
                    .y(d => yAxisSlider(d.reward)))

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

                xAxis.domain([
                    d3.min(data.slice(
                        Math.ceil(data.length * Math.max(xLeft - 4, 0) / width),
                        Math.ceil(data.length * Math.min(xRight + 4, width) / width))
                        , d => d.block),
                    d3.max(data.slice(
                        Math.ceil(data.length * Math.max(xLeft - 4, 0) / width),
                        Math.ceil(data.length * Math.min(xRight + 4, width) / width))
                        , d => d.block)
                ])
                yAxis.domain([
                    d3.min(data.slice(
                        Math.ceil(data.length * xLeft / width),
                        Math.ceil(data.length * xRight / width))
                        , d => d.reward),
                    d3.max(data.slice(
                        Math.ceil(data.length * Math.max(xLeft - 4, 0) / width),
                        Math.ceil(data.length * Math.min(xRight + 4, width) / width))
                        , d => d.reward)
                ])
                priceLine.attr("d", d3.line()
                    .x(d => xAxis(d.block))
                    .y(d => yAxis(d.reward)))
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