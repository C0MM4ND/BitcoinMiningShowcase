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


    let resizes = []


    const rewardTypeToReadable = (type) => {
        switch (type) {
            case "reward": return "BTC Reward"
            case "fiat": return "Reward in Fiat(USD)"
            case "sumReward": return "Total BTC Reward"
            case "sumFiat": return "Total Reward in Fiat(USD)"
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

                sums[blockResult.label] += reward
                sumFiats[blockResult.label] += reward * fiatPriceData[date]

                lines[blockResult.label].push({
                    block: parseInt(blockResult.block),
                    date: date,
                    label: blockResult.label,
                    reward: reward,
                    fiat: reward * fiatPriceData[date] ? fiatPriceData[date] : fiatPriceData[date.setDate(date.getDate() - 1)],
                    sumReward: sums[blockResult.label],
                    sumFiat: sumFiats[blockResult.label]
                })
            })

            Object.keys(lines).forEach(label => lines[label].sort((a, b) => a.block - b.block))

            return lines
        })
        .then(lines => {
            console.log(lines)
            const colorScale = d3.scalePoint()
                .domain(Object.keys(lines)).range([0, 1]);
            const colors = (label) => d3.interpolateCool(colorScale(label))

            // universal variables
            var xLeft = width * 7 / 8
            var xRight = width
            var rewardType = "sumReward"
            var label = "all"

            const maxBlock = 729900

            const maxInLines = (lines, vFn, left = 0, right = width) =>
                Math.max(...Object.keys(lines).map(label => d3.max(
                    lines[label].filter(d =>
                        d.block >= Math.ceil(maxBlock * Math.max(left - 4, 0) / width) &&
                        d.block <= Math.ceil(maxBlock * Math.min(right + 4, width) / width)
                    ), vFn)).filter(result => result != null))

            const minInLines = (lines, vFn, left = 0, right = width) =>
                Math.min(...Object.keys(lines).map(label => d3.min(
                    lines[label].filter(d =>
                        d.block >= Math.ceil(maxBlock * Math.max(left - 4, 0) / width) &&
                        d.block <= Math.ceil(maxBlock * Math.min(right + 4, width) / width)
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
                    maxBlock * xLeft / width,
                    maxBlock * xRight / width
                ])
                .range([0, width])
            const xAxisText = screen.append("text")
                .text("block id")
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
                .domain([minInLines(lines, d => d.block), maxInLines(lines, d => d.block)])
                .range([0, width])
            const yAxisSliderScale = d3.scaleLinear()
                .domain([minInLines(lines, d => d.sumReward), maxInLines(lines, d => d.sumReward)])
                .range([100, 0])

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
                        .x(d => xAxisScale(d.block))
                        .y(d => yAxisScale(d.sumReward)))
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
                        .x(d => xAxisSliderScale(d.block))
                        .y(d => yAxisSliderScale(d.sumReward))
                    )
            }

            // TODO: line label for screen
            const lineLabel = screen
                .append("text")
                .text("Line Label")
                .attr("text-anchor", "end")
                .attr("x", width)
                .attr("y", height + 20)
                .attr("fill", "white")
                .attr("opacity", 0)

            // create vertical line marker
            const xAxisLine = screen
                .append("rect")
                .attr("stroke-width", "1px")
                .attr("stroke", "yellow")
                .attr("width", "1px")
                .attr("height", height)
                .attr("opacity", 0)

            // create the popup for info display
            const popup = d3.select("#page2").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)

            // mouse hover events
            screen
                .on('mousemove', (e, d) => {
                    const ptr = d3.pointer(e);
                    const block = Math.ceil(xAxisScale.invert(ptr[0])) // let block be int
                    const value = Math.ceil(yAxisScale.invert(ptr[1])) // let block be int
                    xAxisLine
                        .attr("opacity", 0.5)
                        .attr("x", xAxisScale(block))

                    const indexes = {}
                    for (const [label, line] of Object.entries(lines)) {
                        const index = d3.scan(line, (a, b) => Math.abs(a.block - block) - Math.abs(b.block - block))
                        if (line[index].block == block) {
                            indexes[label] = index
                        }
                    }
                    const miners = Object.entries(indexes).map(([label, index]) => JSON.stringify(lines[label][index])).join()
                    if (miners.length > 0) {
                        const miner = JSON.parse(miners) // miners must takes only one member: block can be mined by only one man 
                        const text = `Block #${block} is mined by <b>${miner.label}</b> at ${miner.date}; received ${miner.reward}, in total ${miner.sumReward}`
                        // console.log(indexes)
                        popup.html(text)
                            .style("opacity", 1)
                            .style("left", (ptr[0] + 50) + "px")
                            .style("top", (ptr[1] + 250) + "px")
                    }

                })
                .on('mouseleave', (e, d) => {
                    popup.style("opacity", 0);
                    xAxisLine
                        .attr("opacity", 0)
                });

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
            const updateScreen = (left, right, newRewardType, newLabel) => {
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
                    maxBlock * xLeft / width,
                    maxBlock * xRight / width
                ])
                if (newLabel == 'all') {
                    yAxisScale.domain([
                        minInLines(lines, d => d[newRewardType], xLeft, xRight),
                        maxInLines(lines, d => d[newRewardType], xLeft, xRight)
                    ])
                } else {
                    yAxisScale.domain([
                        minInLines({ newLabel: lines[newLabel] }, d => d[newRewardType], xLeft, xRight),
                        maxInLines({ newLabel: lines[newLabel] }, d => d[newRewardType], xLeft, xRight)
                    ])
                }

                // update lines
                for (const [label, data] of Object.entries(lines)) {
                    if (newLabel == 'all') {
                        console.log('update for all')
                        poolLines[label]
                            .datum(data)
                            .attr("d", d3.line()
                                .x(d => xAxisScale(d.block))
                                .y(d => yAxisScale(d[newRewardType])))
                    } else {
                        console.log(`update for ${newLabel}`)
                        if (label != newLabel) {
                            poolLines[label]
                                .datum(data)
                                .attr("d", d3.line())
                        } else {
                            poolLines[label]
                                .datum(data)
                                .attr("d", d3.line()
                                    .x(d => xAxisScale(d.block))
                                    .y(d => yAxisScale(d[newRewardType])))
                        }
                    }
                }

                // update axis
                xAxis.call(d3.axisBottom(xAxisScale))
                yAxis.call(d3.axisLeft(yAxisScale))
                yAxisText.text(rewardTypeToReadable(newRewardType))
            }
            const updateSlider = (newRewardType, newLabel) => {
                if (newLabel == 'all') {
                    yAxisSliderScale.domain([
                        minInLines(lines, d => d[newRewardType], xLeft, xRight),
                        maxInLines(lines, d => d[newRewardType], xLeft, xRight)
                    ])
                } else {
                    yAxisSliderScale.domain([
                        minInLines({ newLabel: lines[newLabel] }, d => d[newRewardType], xLeft, xRight),
                        maxInLines({ newLabel: lines[newLabel] }, d => d[newRewardType], xLeft, xRight)
                    ])
                }

                for (const [label, data] of Object.entries(lines)) {
                    if (newLabel == 'all') {
                        console.log('update for all')
                        sliderLines[label]
                            .datum(data)
                            .attr("d", d3.line()
                                .x(d => xAxisSliderScale(d.block))
                                .y(d => yAxisSliderScale(d[newRewardType])))
                    } else {
                        console.log(`update for ${newLabel}`)
                        sliderLines[label] // change all lines data to the same data path
                            .datum(data)
                            .attr("d", d3.line()
                                .x(d => xAxisSliderScale(d.block))
                                .y(d => yAxisSliderScale(d[newRewardType])))
                    }
                }
            }
            // handle dragging on slider
            sliderRecCover.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                const prevCenter = (xLeft + xRight) / 2
                const delta = ptr[0] - prevCenter
                if (xLeft + delta > 0 && xRight + delta < width) {
                    updateScreen(xLeft + delta, xRight + delta, rewardType, label)
                }
            }))

            sliderLineLeft.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                if (ptr[0] < xRight) {
                    updateScreen(ptr[0], xRight, rewardType, label)
                }
            }))

            sliderLineRight.call(d3.drag().on('drag', e => {
                let ptr = d3.pointer(e)
                if (ptr[0] > xLeft && ptr[0] < width) {
                    updateScreen(xLeft, ptr[0], rewardType, label)
                }
            }))

            // bind change type
            d3.select("#rewardType").on("change", (event) => {
                rewardType = event.target.value
                console.log(`rewardType changed to ${rewardType}`)
                updateScreen(xLeft, xRight, rewardType, label)
                updateSlider(rewardType, label)
            })

            // bind change pool label
            Object.keys(lines).forEach(label => {
                d3.select("#label").append('option')
                    .attr('value', label).html(label.replace(label[0], label[0].toUpperCase()))
            })
            d3.select("#label").on("change", (event) => {
                label = event.target.value
                console.log(`label changed to ${label}`)
                updateScreen(xLeft, xRight, rewardType, label)
                updateSlider(rewardType, label)
            })

            // bind change granularity
            d3.select("#label").on("change", (event) => {
                label = event.target.value
                console.log(`label changed to ${label}`)
                updateScreen(xLeft, xRight, rewardType, label)
                updateSlider(rewardType, label)
            })
        })

    loaded()
}