const loadPage2 = () => {
    console.log("Page 2 loaded, plan for sum reward");

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
    // draw line chart
    const rewardTypeToReadable = (type) => {
        switch (type) {
            case "reward": return "BTC Reward"
            case "fiat": return "Reward in Fiat(USD)"
            case "sumReward": return "Total BTC Reward"
            case "sumFiat": return "Total Reward in Fiat(USD)"
            default: throw new Error("Unknown reward type: " + type)
        }
    }

    const granularityToReadable = (type) => {
        switch (type) {
            case "block": return "Block ID"
            case "epoch": return "Difficulty Epoch"
            // TODO: takes difficulties
            // case "day": return "Day"
            // case "month": return "Month"
            default: throw new Error("Unknown granularity: " + type)
        }
    }

    const margin = { top: 50, right: 50, bottom: 50, left: 50 }
    const width = window.innerWidth - margin.left - margin.right // Use the window's width
    const height = window.innerHeight - margin.top * 2 - margin.bottom * 2 - 200 // Use the window's height
    const resp = new responsiveFn()
    const screen = d3
        .select('#chart2')
        .append('svg')
        .attr('id', 'screen')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .call(resp.responsivefy)
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`)

    const slider = d3
        .select('#chart2')
        .append('svg')
        .attr('id', 'slider')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', 100 + margin['top'] + margin['bottom'])
        .call(resp.responsivefy)
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`)

    Promise.all([
        d3.text("block_pools_cleaned_cleaned_ordered.csv"),
        d3.text("block_reward.csv"),
        d3.json("hist_prices.json"),
    ])
        .then(texts => {
            // getting data ready
            const miningData = d3.csvParse("block,date,label\n" + texts[0])
            const rewardData = d3.csvParse("block,reward\n" + texts[1])
            const rewards = {}
            rewardData.forEach(r => {
                rewards[r.block] = parseFloat(r.reward)
            })

            const fiatPriceData = {}
            for (const [date, v] of Object.entries(texts[2])) {
                if (v['market_data'] == null) {
                    continue
                }
                const thedate = new Date(date)
                if (v['market_data']['current_price']['aud'] == null) {
                    console.log("Why AUD zero???")
                }
                fiatPriceData[thedate] = v['market_data']['current_price']['usd']
            }

            const lines = {}, sums = {}, sumFiats = {}
            miningData.forEach(blockResult => {
                if (!Object.keys(lines).includes(blockResult.label)) {
                    lines[blockResult.label] = []
                    sums[blockResult.label] = 0
                    sumFiats[blockResult.label] = 0
                }
                if (blockResult.block == null || blockResult.block == NaN) {
                    console.error(blockResult.block, reward)
                }
                const reward = rewards[blockResult.block]
                if (reward == null || reward == NaN) {
                    console.error(blockResult.block, reward)
                }

                const date = new Date(blockResult.date)

                sums[blockResult.label] = (sums[blockResult.label] || 0) + reward
                sumFiats[blockResult.label] = (sumFiats[blockResult.label] || 0) + reward * (fiatPriceData[date] ? fiatPriceData[date] : fiatPriceData[date.setDate(date.getDate() - 1)])

                const blockID = parseInt(blockResult.block)
                lines[blockResult.label].push({
                    block: blockID,
                    epoch: Math.floor(blockID / 2016),
                    date: date,
                    label: blockResult.label,
                    reward: reward,
                    fiat: reward * (fiatPriceData[date] ? fiatPriceData[date] : fiatPriceData[date.setDate(date.getDate() - 1)]),
                    sumReward: sums[blockResult.label] || 0,
                    sumFiat: sumFiats[blockResult.label] || 0
                })
            })

            Object.keys(lines).forEach(label => lines[label].sort((a, b) => a[granularity] - b[granularity]))

            const colorScale = d3.scalePoint()
                .domain(Object.keys(lines)).range([0, 1]);
            const colors = (label) => d3.interpolateCool(colorScale(label))

            // universal variables with default values
            var xLeft = width * 7 / 8
            var xRight = width
            var rewardType = "sumReward"
            var poolLabel = "all"
            var granularity = "block"
            var getGranularityRange = () => {
                switch (granularity) {
                    case "block": return { min: 153343, max: 729900, range: 729900 - 153343 }
                    case "epoch": return { min: Math.floor(153343 / 2016) - 1, max: Math.ceil(729900 / 2016), range: Math.ceil(729900 / 2016) - Math.floor(153343 / 2016) }
                    // TODO: takes difficulties
                    // case "day": return { 
                    //     min: new Date(miningData[0].date), 
                    //     max: new Date(miningData[miningData.length - 1].date), 
                    //     range: new Date(miningData[miningData.length - 1].date) - new Date(miningData[0].date) 
                    // }
                    // case "month": return {}
                }
            }

            const maxInLines = (lines, vFn, left = 0, right = width) =>
                Math.max(...Object.keys(lines).map(label => d3.max(
                    lines[label].filter(d =>
                        d[granularity] >= getGranularityRange().min + Math.ceil(getGranularityRange().range * Math.max(left - 4, 0) / width) &&
                        d[granularity] <= getGranularityRange().min + Math.ceil(getGranularityRange().range * Math.min(right + 4, width) / width)
                    ), vFn)).filter(result => result != null))

            const minInLines = (lines, vFn, left = 0, right = width) =>
                Math.min(...Object.keys(lines).map(label => d3.min(
                    lines[label].filter(d =>
                        d[granularity] >= getGranularityRange().min + Math.ceil(getGranularityRange().range * Math.max(left - 4, 0) / width) &&
                        d[granularity] <= getGranularityRange().min + Math.ceil(getGranularityRange().range * Math.min(right + 4, width) / width)
                    ), vFn)).filter(result => result != null))

            // background placeholder
            screen.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", width)
                .attr("height", height)
                .style("opacity", 0)

            // Add X axis
            const xAxisScale = d3.scaleLinear()
                .domain([
                    minInLines(lines, d => d[granularity], xLeft, xRight),
                    maxInLines(lines, d => d[granularity], xLeft, xRight),
                ])
                .range([0, width])
            const xAxisText = screen.append("text")
                .text(granularityToReadable(granularity))
                .attr("text-anchor", "end")
                .attr("x", width)
                .attr("y", height + 20)
                .attr("fill", "white")

            const xAxis = screen.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xAxisScale))

            // Add Y axis
            const yAxisScale = d3.scaleLinear()
                .domain([
                    minInLines(lines, d => d.sumReward, xLeft, xRight),
                    maxInLines(lines, d => d.sumReward, xLeft, xRight)
                ])
                .range([height, 0])
            const yAxisText = screen.append("text")
                .text(rewardTypeToReadable(rewardType))
                .attr("fill", "white")
            const yAxis = screen.append("g")
                .call(d3.axisLeft(yAxisScale))

            // create slider scales
            const xAxisSliderScale = d3.scaleLinear()
                .domain([minInLines(lines, d => d[granularity]), maxInLines(lines, d => d[granularity])])
                .range([0, width])
            const yAxisSliderScale = d3.scaleLinear()
                .domain([minInLines(lines, d => d[rewardType]), maxInLines(lines, d => d[rewardType])])
                .range([100, 0])

            // TODO: line label for screen
            const lineLabel = screen
                .append("text")
                .text("Line Label")
                .attr("text-anchor", "end")
                .attr("x", width)
                .attr("y", height + 20)
                .attr("fill", "white")
                .attr("opacity", 0)

            // create the lines on screen
            const poolLines = {}
            Object.keys(lines).forEach(label => {
                const data = lines[label]
                poolLines[label] = screen.append("path")
                    .datum(data)
                    .attr("fill", "none")
                    .attr("stroke", colors(label))
                    .attr("stroke-width", 3)
                    .attr("d", d3.line()
                        .x(d => xAxisScale(d[granularity]))
                        .y(d => yAxisScale(d.sumReward)))
                    .on('mouseover', function (e) {
                        const ptr = d3.pointer(e);
                        poolLines[label].attr("stroke-width", 5)

                        lineLabel.html(`this line is ${label}`)
                            .attr("opacity", 1)
                            .attr("fill", colors(label))
                            .attr("x", ptr[0] - 10 + 'px')
                            .attr("y", ptr[1] - 10 + 'px')
                    })
                    .on('mouseout', function (d) {
                        poolLines[label].attr("stroke-width", 3)
                        setTimeout(() => lineLabel.attr("opacity", 0), 5000)
                    })
            })
            // const areaGenerator= d3.area()
            //     .x(function (d,i) {
            //         return scale_x(i);
            //     })
            //     .y0(g_height)
            //     .y1(function (d) {
            //         return scale_y(d);
            //     })
            //     .curve(d3.curveMonotoneX)

            // create lines for the slider
            const sliderLines = {}
            for (const [label, data] of Object.entries(lines)) {
                sliderLines[label] = slider.append("path")
                    .datum(data)
                    .attr("fill", "none")
                    .attr("stroke", colors(label))
                    .attr("stroke-width", 1.5)
                    .attr("d", d3.line()
                        .x(d => xAxisSliderScale(d[granularity]))
                        .y(d => yAxisSliderScale(d[rewardType]))
                    )
            }

            // create vertical line marker
            const xAxisLine = screen
                .append("rect")
                .attr("stroke-width", "1px")
                .attr("stroke", "yellow")
                .attr("width", "1px")
                .attr("height", height)
                .attr("opacity", 0)

            // create the popup for info display
            const tooltip = d3.select("#page2").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)

            // mouse hover events
            screen
                .on('mousemove', (e) => {
                    const ptr = d3.pointer(e);
                    const xAxisValue = Math.ceil(xAxisScale.invert(ptr[0])) // let block be int
                    xAxisLine
                        .attr("opacity", 0.5)
                        .attr("x", xAxisScale(xAxisValue))

                    switch (granularity) {
                        case "block":
                            let ok = false
                            // pool must takes only one member: block can be mined by only one man 
                            for (const [_, line] of Object.entries(lines)) {
                                for (const [_, d] of line.entries()) {
                                    if (d.block == xAxisValue) {
                                        const text = `Block #${xAxisValue}(${d.reward} BTC) is mined by <b style='color: ${colors(d.label)};'>${d.label}</b> at ${d3.timeFormat("%Y-%m-%d")(d.date)
                                            }, equals to ${d.fiat.toFixed(2)} USD; this pool had mined ${d.sumReward} BTC in total, around ${d.sumFiat.toFixed(2)} USD then`
                                        tooltip.html(text)
                                            .style("opacity", 1)
                                            .style("left", (ptr[0] + 50) + "px")
                                            .style("top", (ptr[1] + 250) + "px")

                                        ok = true
                                        break
                                    }
                                }
                                if (ok) break
                            }

                            break;
                        case "epoch":
                            // const epochRange = { min: xAxisValue * 2016, max: (xAxisValue + 1) * 2016, range: 2016 }
                            // const epochData = {
                            //     "block": {},
                            //     "sumReward": {}
                            // }
                            // let startDate, endDate
                            // for (const [label, line] of Object.entries(lines)) {
                            //     line.forEach(d => {
                            //         if (d.block >= epochRange.min && d.block < epochRange.max) {
                            //             epochData.block[label] = (epochData.block[label] || 0) + 1
                            //             epochData.sumReward[label] = (epochData.sumReward[label] || 0) + d.reward

                            //             if (d.date < startDate) {
                            //                 startDate = d.date 
                            //             }

                            //             if (d.date > endDate) {
                            //                 endDate = d.date 
                            //             }
                            //         }
                            //     })
                            // }
                            // const totalReward = d3.sum(epochData.sumReward, d => d)
                            // const labels = Object.keys(epochData.block).join(', ')
                            // const text = `Epoch #${xAxisValue}'s blocks are mined by <b style='color: ${colors(d.label)};'>${labels}</b> since ${startDate} to ${endDate}, received ${totalReward} USD mining rewards in total`
                            tooltip.html("click to view more about epoch #" + xAxisValue)
                                .style("opacity", 1)
                                .style("left", (ptr[0] + 50) + "px")
                                .style("top", (ptr[1] + 250) + "px")
                            break;
                    }

                })
                .on('mouseleave', (e) => {
                    tooltip.style("opacity", 0);
                    xAxisLine
                        .attr("opacity", 0)
                })
                .on('click', (e) => {
                    const ptr = d3.pointer(e);
                    const xAxisValue = Math.ceil(xAxisScale.invert(ptr[0])) // let block be int

                    if (granularity != "epoch") return

                    const epochRange = { min: xAxisValue * 2016, max: (xAxisValue + 1) * 2016, range: 2016 }
                    const epochData = {
                        "block": {},
                        "sumReward": {},
                        "sumFiat": {}
                    }
                    for (const [label, line] of Object.entries(lines)) {
                        line.forEach(d => {
                            if (d.block >= epochRange.min && d.block < epochRange.max) {
                                epochData.block[label] = (epochData.block[label] || 0) + 1
                                epochData.sumReward[label] = (epochData.sumReward[label] || 0) + d.reward
                                epochData.sumFiat[label] = (epochData.sumFiat[label] || 0) + d.fiat
                            }
                        })
                    }
                    const pie = d3.pie()
                        .value((d) => d[1])
                    const pieData = pie(Object.entries(epochData[rewardType]))
                    const popup = d3.select("#popup")
                    if (popup.node().classList.contains("active")) return
                    popup.node().classList.add("active")
                    popup.style("left", (width - 500) / 2 + "px")
                        .style("top", height / 2 + "px")
                    setTimeout(() => {popup.node().classList.remove("active")}, 5000)
                    const popupTitle = popup.select("#popupTitle")
                    popupTitle.html(`<h4>Epoch #${xAxisValue} mining pool rewards</h4><p><strong>${rewardTypeToReadable(rewardType)} pie chart</strong></p><p>autoclose in 5 seconds</p>`)
                    const popupContent = popup.select("#popupContent")
                    popupContent.html(null)

                    const pieSVG = popupContent.append("svg")
                        .attr("width", 500)
                        .attr("height", 500)
                        .append("g")
                        .attr("transform", `translate(${250}, ${250})`)

                    const radius = 200
                    const arcGenerator = d3.arc()
                        .innerRadius(0)
                        .outerRadius(radius)

                    pieSVG.selectAll('pieSlices')
                        .data(pieData)
                        .join("path")
                        .attr('d', arcGenerator)
                        .attr('fill', (d) => colors(d.data[0]))
                        .attr("stroke", "black")
                        .style("stroke-width", "2px")
                        .style("opacity", 0.7)
                    // const getAngle = function (d) {
                    //     return (180 / Math.PI * (d.startAngle + d.endAngle) / 2 - 90);
                    // }
                    pieSVG.selectAll('pieSlices')
                        .data(pieData)
                        .join("text")
                        .text(d => d.data[0])
                        // .attr("transform", (d) => `translate(${arcGenerator.centroid(d)}) rotate(${getAngle(d)})`)
                        .attr("transform", (d) => `translate(${arcGenerator.centroid(d)})`)
                        .style("text-anchor", "middle")
                        .style("font-size", 12)
                })

            // create slider cover layer with 3 rectangles
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

            // updateScreen changes the screen content
            const updateScreen = (left, right) => {
                sliderRecCover
                    .attr("x", left)
                    .attr("width", right - left)
                sliderLineLeft
                    .attr("x", left)
                sliderLineRight
                    .attr("x", right)
                xLeft = left
                xRight = right

                xAxisScale.domain([
                    getGranularityRange().min + Math.ceil(getGranularityRange().range * Math.max(xLeft - 4, 0) / width),
                    getGranularityRange().min + Math.ceil(getGranularityRange().range * Math.min(xRight + 4, width) / width),
                ])

                if (poolLabel == 'all') {
                    yAxisScale.domain([
                        minInLines(lines, d => d[rewardType], xLeft, xRight),
                        maxInLines(lines, d => d[rewardType], xLeft, xRight)
                    ])
                } else {
                    yAxisScale.domain([
                        minInLines({ newLabel: lines[poolLabel] }, d => d[rewardType], xLeft, xRight),
                        maxInLines({ newLabel: lines[poolLabel] }, d => d[rewardType], xLeft, xRight)
                    ])
                }

                // update lines
                for (const [label, data] of Object.entries(lines)) {
                    if (poolLabel == 'all') {
                        console.log('update for all')
                        poolLines[label]
                            .datum(data)
                            .attr("d", d3.line()
                                .x(d => xAxisScale(d[granularity]))
                                .y(d => yAxisScale(d[rewardType])))
                    } else {
                        console.log(`update for ${poolLabel}`)
                        if (label != poolLabel) {
                            poolLines[label]
                                .datum(data)
                                .attr("d", d3.line())
                        } else {
                            poolLines[label]
                                .datum(data)
                                .attr("d", d3.line()
                                    .x(d => xAxisScale(d[granularity]))
                                    .y(d => yAxisScale(d[rewardType])))
                        }
                    }
                }

                // update axis
                xAxis.call(d3.axisBottom(xAxisScale))
                yAxis.call(d3.axisLeft(yAxisScale))
                // modify x. y axis labels
                yAxisText.text(rewardTypeToReadable(rewardType))
                xAxisText.text(granularityToReadable(granularity))
            }

            // update sliders on need
            const updateSlider = () => {
                xAxisSliderScale.domain([minInLines(lines, d => d[granularity]), maxInLines(lines, d => d[granularity])])
                if (poolLabel == 'all') {
                    yAxisSliderScale.domain([
                        minInLines(lines, d => d[rewardType]),
                        maxInLines(lines, d => d[rewardType])
                    ])
                } else {
                    yAxisSliderScale.domain([
                        minInLines({ newLabel: lines[poolLabel] }, d => d[rewardType]),
                        maxInLines({ newLabel: lines[poolLabel] }, d => d[rewardType])
                    ])
                }

                for (const [label, data] of Object.entries(lines)) {
                    if (poolLabel == 'all') {
                        console.log('update for all')
                        sliderLines[label]
                            .datum(data)
                            .attr("d", d3.line()
                                .x(d => xAxisSliderScale(d[granularity]))
                                .y(d => yAxisSliderScale(d[rewardType])))
                    } else {
                        console.log(`update for ${poolLabel}`)
                        if (label != poolLabel) {
                            sliderLines[label].attr("d", null)
                        } else {
                            sliderLines[label] // change all lines data to the same data path
                                .datum(data)
                                .attr("d", d3.line()
                                    .x(d => xAxisSliderScale(d[granularity]))
                                    .y(d => yAxisSliderScale(d[rewardType])))
                        }
                    }
                }
            }
            // handle dragging on slider
            sliderRecCover.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                const prevCenter = (xLeft + xRight) / 2
                const delta = ptr[0] - prevCenter
                if (xLeft + delta > 0 && xRight + delta < width) {
                    updateScreen(xLeft + delta, xRight + delta)
                }
            }))

            sliderLineLeft.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                if (ptr[0] < xRight) {
                    updateScreen(ptr[0], xRight)
                }
            }))

            sliderLineRight.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                if (ptr[0] > xLeft && ptr[0] < width) {
                    updateScreen(xLeft, ptr[0])
                }
            }))

            // bind change type
            d3.select("#rewardType").on("change", (event) => {
                rewardType = event.target.value
                console.log(`rewardType changed to ${rewardType}`)
                updateScreen(xLeft, xRight)
                updateSlider()
            })

            // bind change pool label
            Object.keys(lines).forEach(label => {
                d3.select("#label").append('option')
                    .attr('value', label).html(label.replace(label[0], label[0].toUpperCase()))
            })
            d3.select("#label").on("change", (event) => {
                poolLabel = event.target.value
                console.log(`label changed to ${poolLabel}`)
                updateScreen(xLeft, xRight, rewardType, poolLabel)
                updateSlider()
            })

            // bind change granularity
            d3.select("#granularity").on("change", (event) => {
                granularity = event.target.value
                console.log(`granularity changed to ${granularity}`)
                updateScreen(xLeft, xRight) // TODO: update granularity
                updateSlider()
            })

            document.getElementById('chart2Desc').innerHTML = ""
        })

    loaded()
}