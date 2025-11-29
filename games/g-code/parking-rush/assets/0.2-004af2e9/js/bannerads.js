"use strict";

const BANNERADS = (

	function () {

		const version = "v1.0.0";
		const searchParams = new URL(window.location.href).searchParams;
		const isDebug = ["1", "true"].includes(searchParams.get("debug"));
		const isAutoInit = true;

		const gptUrl = "//securepubads.g.doubleclick.net/tag/js/gpt.js";

		// whitelist
		const hostnames = [
			"html5games.com",
			"de.html5games.com",
			"tr.html5games.com",
			"de.html5games.staging.gc.famobi.com",
			"tr.html5games.staging.gc.famobi.com",
			"html5games.staging.gc.famobi.com",
			"play.staging.gc.famobi.com",
			"play.famobi.com"
		];

		const supportedSizes = { // width, height
			"leaderboard": [[300, 100], [300, 75], [300, 50], [320, 50], [320, 100], [468, 60], [728, 90]],
			"sticky-vertical": [[160, 600], [120, 600], [120, 240]],
			"sticky-horizontal": [[300, 100], [300, 75], [300, 50], [320, 50], [320, 100], [468, 60], [728, 90]]
		}

		// refresh
		let refreshInterval = null;
		const refreshRate = 40;

		const adContainers = {
			"div-gpt-ad-content": {
				id: "div-gpt-ad-content",
				adUnitPath: "/37336410/OnPage//A1000-10//GamePage//Leaderboard",
				element: null,
				type: "leaderboard",
				slot: null,
				sizes: []
			},
			"div-gpt-ad-button": {
				id: "div-gpt-ad-button",
				adUnitPath: "/37336410/OnPage//A1000-10//GamePage//Leaderboard",
				element: null,
				type: "leaderboard",
				slot: null,
				sizes: []
			},
			"div-gpt-ad-footer": {
				id: "div-gpt-ad-footer",
				adUnitPath: "/37336410/OnPage//A1000-10//GamePage//Leaderboard",
				element: null,
				type: "leaderboard",
				slot: null,
				sizes: []
			},
			"div-gpt-ad-banner-top": {
				id: "div-gpt-ad-banner-top",
				adUnitPath: "/37336410/OnPage//A1000-10//GamePage//Sticky",
				element: null,
				type: "sticky-horizontal",
				slot: null,
				sizes: []
			},
			"div-gpt-ad-banner-bottom": {
				id: "div-gpt-ad-banner-bottom",
				adUnitPath: "/37336410/OnPage//A1000-10//GamePage//Sticky",
				element: null,
				type: "sticky-horizontal",
				slot: null,
				sizes: []
			},
			"div-gpt-ad-banner-left": {
				id: "div-gpt-ad-banner-left",
				adUnitPath: "/37336410/OnPage//A1000-10//GamePage//Sticky",
				element: null,
				type: "sticky-vertical",
				slot: null,
				sizes: []
			},
			"div-gpt-ad-banner-right": {
				id: "div-gpt-ad-banner-right",
				adUnitPath: "/37336410/OnPage//A1000-10//GamePage//Sticky",
				element: null,
				type: "sticky-vertical",
				slot: null,
				sizes: []
			},
		};

		const observer = new ResizeObserver(function(entries) {
			entries.forEach(function(entry) {
				if (entry.contentRect) {
					const id = entry.target.id;
					if(JSON.stringify(getSizes(id)) !== JSON.stringify(adContainers[id].sizes)) {
						adContainers[id].sizes = getSizes(id);
						defineSlot(id);
					}
				}
			});
		});

		function getSizes(id) {
			const adContainer = adContainers[id];
			return supportedSizes[adContainer.type].filter(function(size) {

				if(typeof adContainer.element === "undefined") {
					return false;
				}

				switch(adContainer.type) {
					case "leaderboard":
						return size[0] <= adContainer.element.offsetWidth;
					case "sticky-horizontal":
					case "sticky-vertical":
						return size[0] <= adContainer.element.offsetWidth && size[1] <= adContainer.element.offsetHeight;
				}
			});
		};

		function setContainerDivs() {

			for(let index in Object.keys(adContainers)) {
				let adContainer = adContainers[Object.keys(adContainers)[index]];
				const containerDiv = document.querySelector("#" + adContainer.id);
				if(containerDiv) {
					adContainer.element = containerDiv;
					observer.observe(containerDiv);
				}
			}
			isDebug && console.log(adContainers);
		};

		function defineSlots() {
			for(let index in Object.keys(adContainers)) {
				defineSlot(adContainers[Object.keys(adContainers)[index]].id);
			}
		}

		function defineSlot(id) {

			if(adContainers[id].element === null) {
				return;
			}

			window.googletag = window.googletag || {cmd: []};

			if(adContainers[id].slot) {
				isDebug && console.log("destroy %s", id);
				googletag.cmd.push(function() {
			    	// googletag.pubads().clear([adContainers[id].slot]);
			    	googletag.destroySlots([adContainers[id].slot]);
			    });
			    adContainers[id].slot = null;
			}

			adContainers[id].sizes = getSizes(id);

			if(!adContainers[id].sizes.length) {
				isDebug && console.log("no sizes available", id);
				return;
			}

			isDebug && console.log("defineSlot %s", id, adContainers[id].sizes);

			googletag.cmd.push(function() {
				adContainers[id].slot = googletag.defineSlot(
					adContainers[id].adUnitPath,
					adContainers[id].sizes,
					id
				).addService(googletag.pubads())
				.setTargeting("rt", "adxfcb")
				.setTargeting("a", "A1000-1");
				googletag.pubads().enableSingleRequest();
				googletag.enableServices();
			});

			googletag.cmd.push(function() {
		    	googletag.display(id);
		    });
		};

		function refresh() {
			for(let index in Object.keys(adContainers)) {
				let adContainer = adContainers[Object.keys(adContainers)[index]];
				if(adContainer.slot) {
					isDebug && console.log("refresh %s", adContainer.id);
					googletag.cmd.push(function() {
				    	googletag.pubads().refresh([adContainer.slot]);
				    });
				}
			}
		};

		function loadFile(src) {
			return new Promise(function(resolve, reject) {
			    const s = document.createElement('script');
			    let r = false;
			    s.type = 'text/javascript';
			    s.src = src;
			    s.async = false;
			    s.onerror = function(err) {
			        isDebug && console.log("loading %s... FAILED", src);
			        reject(err, s);
			    };
			    s.onload = s.onreadystatechange = function() {
			        if (!r && (!this.readyState || this.readyState == 'complete')) {
			            r = true;
			            isDebug && console.log("loading %s... OK", src);
			            resolve();
			        }
			    };
			    const t = document.getElementsByTagName('script')[0];
			    t.parentElement.insertBefore(s, t);
			});
		};

		function init() {
			isDebug && console.log("init...");

			if(!hostnames.includes(window.location.hostname)) {
				isDebug && console.log("invalid hostname");
				return;
			}

			// get divs

			window.addEventListener("resize", (event) => {
				resized();
			});

			loadFile(gptUrl).then(() => {

				setContainerDivs();
				defineSlots();

				refreshInterval = setInterval(refresh, refreshRate * 1000);

			}, () => {
				isDebug && console.log("ABORTED");
			});
		};

		function resized() {

		};

		if(isAutoInit) {
			init();
		}
	
		return {
			init: init
		};
	}
)();
