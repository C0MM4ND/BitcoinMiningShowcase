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

                sums[blockResult.label] += reward
                sumFiats[blockResult.label] += reward * fiatPriceData[blockResult.date]
                const date = new Date(blockResult.date)
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

            // placeholder
            screen.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", width)
                .attr("height", height)
                .style("opacity", 0)

            // Add X axis
            console.log(minInLines(lines, d => d.block, xLeft, xRight),
                maxInLines(lines, d => d.block, xLeft, xRight))
            const xAxis = d3.scaleLinear()
                .domain([
                    maxBlock * xLeft / width,
                    maxBlock * xRight / width
                ])
                .range([0, width])
                const xAxisText = screen.append("text")
                .text("block id")
                .attr("text-anchor", "end")
                .attr("x", width)
                .attr("y", height+20)
                .attr("fill", "white")
            const xAxisSlider = d3.scaleLinear()
                .domain([0, maxInLines(lines, d => d.block)])
                .range([0, width])
            const x = screen.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xAxis))

            // Add Y axis
            const yAxis = d3.scaleLinear()
                .domain([
                    minInLines(lines, d => d.sumReward, xLeft, xRight),
                    maxInLines(lines, d => d.sumReward, xLeft, xRight)
                ])
                .range([height, 0])
            const y = screen.append("g")
                .call(d3.axisLeft(yAxis))
            const yAxisText = screen.append("text")
                .text(rewardTypeToReadable(rewardType))
                .attr("fill", "white")
            const yAxisSlider = d3.scaleLinear()
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
                        .x(d => xAxis(d.block))
                        .y(d => yAxis(d.sumReward)))
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
            sliderLines = {}
            Object.keys(lines).forEach(label => {
                const data = lines[label]
                sliderLines[label] = slider.append("path")
                    .datum(data)
                    .attr("fill", "none")
                    .attr("stroke", colors(label))
                    .attr("stroke-width", 1.5)
                    .attr("d", d3.line()
                        .x(d => xAxisSlider(d.block))
                        .y(d => yAxisSlider(d.sumReward))
                    )
            })
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

            const popup = d3.select("#page2").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)

            screen
                .on('mousemove', (e, d) => {
                    const ptr = d3.pointer(e);
                    const block = Math.ceil(xAxis.invert(ptr[0])) // let block be int
                    const value = Math.ceil(yAxis.invert(ptr[1])) // let block be int
                    xAxisLine
                        .attr("opacity", 0.5)
                        .attr("x", xAxis(block))

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
                            .style("top", (ptr[1] + 250) + "px");
                    }

                })
                .on('mouseleave', (e, d) => {
                    popup.style("opacity", 0);
                    xAxisLine
                        .attr("opacity", 0)
                });


            // this implement inspired by http://jsfiddle.net/SunboX/vj4jtdg8/
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

                xAxis.domain([
                    maxBlock * xLeft / width,
                    maxBlock * xRight / width
                ])
                if (newLabel == 'all') {
                    yAxis.domain([
                        minInLines(lines, d => d[newRewardType], xLeft, xRight),
                        maxInLines(lines, d => d[newRewardType], xLeft, xRight)
                    ])
                } else {
                    yAxis.domain([
                        minInLines({ newLabel: lines[newLabel] }, d => d[newRewardType], xLeft, xRight),
                        maxInLines({ newLabel: lines[newLabel] }, d => d[newRewardType], xLeft, xRight)
                    ])
                }

                Object.keys(poolLines).forEach(label => {
                    if (newLabel == 'all') {
                        console.log('update for all')
                        const data = lines[label]
                        poolLines[label]
                            .datum(data)
                            .attr("d", d3.line()
                                .x(d => xAxis(d.block))
                                .y(d => yAxis(d[newRewardType])))
                    } else {
                        console.log(`update for ${newLabel}`)
                        const data = lines[newLabel]
                        poolLines[label] // change all lines data to the same data path
                            .datum(data)
                            .attr("d", d3.line()
                                .x(d => xAxis(d.block))
                                .y(d => yAxis(d[newRewardType])))
                    }
                })

                x.call(d3.axisBottom(xAxis))
                y.call(d3.axisLeft(yAxis))
            }
            const updateSlider = (newRewardType, newLabel) => {

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
            })
        })

    loaded()
}