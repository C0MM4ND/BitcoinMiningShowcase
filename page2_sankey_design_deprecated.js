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

    var sankey = Sankey()
        .nodeWidth(40)
        .nodePadding(60)
        .size([width, height]);

    var path = sankey.links();

    Promise.all([
        d3.text("block_pools_cleaned_cleaned_ordered.csv"),
        d3.text("block_reward.csv"),
    ])
        .then(texts => {
            const labelValues = {}
            const nodeSet = new Set(["coinbase"])
            const nodeList = ["coinbase" ]
            const sankeyDataNodes = [{ node: 0, name: "coinbase" }]
            const sankeyDataLinks = []
            const miningData = d3.csvParse("block,date,label\n" + texts[0])
            const rewardData = d3.csvParse("block,reward\n" + texts[1])
            const rewards = {}
            rewardData.forEach(r => {
                rewards[Number(r.block)] = Number(r.reward)
            })
            let range = [578929, 720000]
            miningData.forEach(d => {
                if (labelValues[d.label] == null) labelValues[d.label] = 0
                const blockReward = rewards[d.block]
                labelValues[d.label] += blockReward
            })
            Object.keys(labelValues).forEach(label => {
                if (!nodeSet.has(label)) {
                    nodeSet.add(label)
                    nodeList.push(label)
                    sankeyDataNodes.push({
                        node: sankeyDataNodes.length,
                        name: label,
                    })
                }
                sankeyDataLinks.push({
                    source: 0,
                    target: nodeList.indexOf(label),
                    value: labelValues[label]
                })
            })
            console.log(sankeyDataLinks)
            return { nodes: sankeyDataNodes, links: sankeyDataLinks }
        })
        .then(sankeydata => {
            graph = sankey(sankeydata);

            // add in the links
            var link = screen.append("g").selectAll(".link")
                .data(graph.links)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", sankeyLinkHorizontal())
                .attr("stroke-width", function (d) { return d.width; });

            // add the link titles
            link.append("title")
                .text(function (d) {
                    return d.source.name + " → " +
                        d.target.name + "\n" + format(d.value);
                });

            // add in the nodes
            var node = screen.append("g").selectAll(".node")
                .data(graph.nodes)
                .enter().append("g")
                .attr("class", "node");

            // add the rectangles for the nodes
            node.append("rect")
                .attr("x", function (d) { return d.x0; })
                .attr("y", function (d) { return d.y0; })
                .attr("height", function (d) { return d.y1 - d.y0; })
                .attr("width", sankey.nodeWidth())
                .style("fill", function (d) {
                    return d.color = color(d.name.replace(/ .*/, ""));
                })
                .style("stroke", function (d) {
                    return d3.rgb(d.color).darker(2);
                })
                .append("title")
                .text(function (d) {
                    return d.name + "\n" + format(d.value);
                });

            // add in the title for the nodes
            node.append("text")
                .attr("x", function (d) { return d.x0 - 6; })
                .attr("y", function (d) { return (d.y1 + d.y0) / 2; })
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .text(function (d) { return d.name; })
                .filter(function (d) { return d.x0 < width / 2; })
                .attr("x", function (d) { return d.x1 + 6; })
                .attr("text-anchor", "start");

        })

    loaded()
}