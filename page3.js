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
}