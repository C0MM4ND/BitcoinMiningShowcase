fs = require('fs');

// clean the raw json
fs.readFile('./miningpoolstat_raw.json', (err, data) => {
    if (err) {
        console.error(err)
        return
    }

    raw = JSON.parse(data)
    console.log()
    pools = []
    raw.data.forEach(pool => {
        pools.push({
            url: pool.url,
            id: pool.pool_id,
            country: pool.country.split(',').map(country=>country.trim()),
        })
    })

    console.log(pools)
})