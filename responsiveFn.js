// credits: https://brendansudol.com/writing/responsive-d3
// with little modifications for easier multi-svg support and reuse
class responsiveFn {
    constructor() {
        self.resizes = []
    }

    responsivefy(svg) {
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

        self.resizes.push(resize)
        // to register multiple listeners for same event type,
        // you need to add namespace, i.e., 'click.foo'
        // necessary if you call invoke this function for multiple svgs
        // api docs: https://github.com/mbostock/d3/wiki/Selections#on
        d3.select(window).on('resize.' + container.attr('id'), () => {
            self.resizes.forEach(resize => resize())
        })
    }
} 