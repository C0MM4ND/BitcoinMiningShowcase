var rangeSliderUpdate = (e) => { }
const loadPage3 = () => {
    console.log("Page 3 loaded");

    if (document.getElementsByClassName('active')[0]) {
        if (document.getElementsByClassName('active')[0].id == "page3") {
            return
        }

        document.getElementsByClassName('active')[0].classList.remove('active')
    }

    document.getElementById('page3').classList.add('active')

    if (document.getElementById('page3').classList.contains('loaded')) {
        return
    }
    const loaded = () => document.getElementById('page3').classList.add('loaded')

    const resp = new responsiveFn()

    const margin = { top: 50, right: 50, bottom: 50, left: 50 }
    const width = window.innerWidth - margin.left - margin.right // Use the window's width
    const height = window.innerHeight - margin.top * 2 - margin.bottom * 2 - 200 // Use the window's height
    const screen = d3
        .select('#chart3')
        .append('svg')
        .attr('id', 'screen')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .call(resp.responsivefy)
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`)

    const tooltip = d3.select("#page3").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)

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
            console.log(fiatPriceData)

            const blocks = {}
            miningData.forEach(blockResult => {
                if (blockResult.block == null || blockResult.block == NaN) {
                    console.error(blockResult.block, reward)
                }
                const reward = rewards[blockResult.block]
                if (reward == null || reward == NaN) {
                    console.error(blockResult.block, reward)
                }

                const date = new Date(blockResult.date)
                console.log((fiatPriceData[date] ? fiatPriceData[date] : fiatPriceData[date.setDate(date.getDate() - 1)]))
                blocks[parseInt(blockResult.block)] = {
                    block: parseInt(blockResult.block),
                    date: date,
                    label: blockResult.label,
                    reward: reward,
                    fiat: reward * (fiatPriceData[date] ? fiatPriceData[date] : fiatPriceData[date.setDate(date.getDate() - 1)]),
                }
            })

            // blocks.sort((a, b) => a.block - b.block)

            return blocks
        }).then(blocks => {
            console.log(blocks) // show the metadata
            // draw the block table
            const labels = new Set()
            for (const [_, b] of Object.entries(blocks)) {
                labels.add(b.label)
            }
            const colorScale = d3.scalePoint()
                .domain(labels).range([0, 1]);
            const colors = (label) => d3.interpolateCool(colorScale(label))

            // universal variables
            const xCount = Math.ceil(width / 25)
            const yCount = Math.ceil(height / 25)
            const maxDisplay = xCount * yCount // 20*20 per block 
            const maxBlock = 729900
            var since = maxBlock - maxBlock % maxDisplay
            console.log(xCount, yCount, maxDisplay, since)

            // init the block map
            const blockMap = screen.append('g').attr('id', `blockMap`)
            const blockMapRects = {}
            for (let index = 0; index < maxDisplay; index++) {
                const x = Math.floor(index / yCount) * 25
                const y = index % yCount * 25

                const block = blockMap.append('rect')
                    .attr('class', `blockMapRect`)
                    .attr('x', x)
                    .attr('y', y)
                    .attr('width', 20)
                    .attr('height', 20)
                    .attr('fill', "none")
                    .attr('stroke', "none")

                blockMapRects[index] = block
            }

            // func for updating the block map
            const updateBlockMap = (since) => {
                let end = since
                for (let index = 0; index < maxDisplay; index++) {
                    const blockID = since + index
                    const miningData = blocks[blockID]

                    const color = blockID <= maxBlock ? (miningData == null ? "#002430" : colors(miningData.label)) : "#00151c"
                    const x = Math.floor(index / yCount) * 25
                    const y = index % yCount * 25

                    const block = blockMapRects[index]
                    block.attr('fill', color)

                    if (blockID < maxBlock) {
                        // add events for the valid blocks
                        block.on('mouseover', (e) => {
                            const ptr = d3.pointer(e);
                            const text = miningData == null ?
                                `block #${blockID} is not mined by any known pool` :
                                [`<strong>block #${blockID}</strong>:`,
                                `date: ${miningData.date.toLocaleDateString()}`,
                                `pool: <label style='color: ${colors(miningData.label)}'>${miningData.label}</label>`,
                                `reward: ${miningData.reward} BTC`,
                                `fiat: ${miningData.fiat == NaN? 'no fiat price at that time': miningData.fiat + ' USD'}`,
                                ].join('<br>')
                            tooltip
                                .html(text)
                                .style("left", (ptr[0] + 50) + "px")
                                .style("top", (ptr[1] + 250) + "px")
                                .style("opacity", 1)
                            block
                                .attr('x', x - 2)
                                .attr('y', y - 2)
                                .attr('width', 24)
                                .attr('height', 24)
                        })
                            .on('mouseout', (e, d) => {
                                tooltip
                                    .style("opacity", 0)
                                block
                                    .attr('x', x)
                                    .attr('y', y)
                                    .attr('width', 20)
                                    .attr('height', 20)
                            })

                        end++
                    } else {
                        // clear events for invalid ones
                        block.on('mouseover', null)
                    }
                }

                const blockRangeDescText = `The block map for #${since} - #${end - 1}`
                const blockRangeDesc = d3.select('#blockRangeDesc')
                blockRangeDesc.text(blockRangeDescText)
            }

            const slider = d3.select("#rangeSlider")
            slider
                .attr("min", 0)
                .attr("max", maxBlock)
                // .attr("value", since) // not working on attr
                .attr("step", maxDisplay)
                .on("change", (e) => {
                    since = parseInt(e.target.value)
                    console.log(`since changed to ${e.target.value}`)
                    updateBlockMap(since)
                })
                .on('input', (e) => {
                    const unsureSince = parseInt(e.target.value) // before the change
                    const text = `display ${maxDisplay} blocks since ${unsureSince}`
                    d3.select("#rangeSliderDesc")
                        .html(text)
                    setTimeout(() => { tooltip.style("opacity", 0) }, 3000)
                })
            slider.node().value = since // set the value via browserJS
            updateBlockMap(since)
        })

    loaded()
}

