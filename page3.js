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
}