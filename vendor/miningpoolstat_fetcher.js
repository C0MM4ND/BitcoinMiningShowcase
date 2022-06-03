fs = require('fs');

// sometimes successful
async function main() {
   fetch("https://data.miningpoolstats.stream/data/bitcoin.js?t=1654174208", {
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET",
      headers: {
         'server': 'cloudflare',
         'vary': 'Accept-Encoding',
         'last-modified': new Date(),
         'date': new Date(),
      }
   }).then(res => res.text())
   .then(data=> fs.writeFile('miningpoolstat_raw.json', data.toString(), err => console.log(err)))
}


main()