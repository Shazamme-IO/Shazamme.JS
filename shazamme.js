$(function() {
	const version = '0.1.0';

    let _s = {}

    function _init() {
        this.register = (n, config) => {
            if (n?.length > 0) {
                _s[n] = config;
            } else {
                console.warn('No name provided for object', config);
            }
        }

        this.about = (n) => {
            if (n?.length > 0) {
                let i = _s[n];

                if (i) {
                    console.log(`${n}:`, i);
                } else {
                    console.warn(`No object available: ${n}`);
                }
            } else {
                for (let i in _s) {
                    console.log(`${i}:`, _s[i]);
                }
            }
        }

        this.collection = (c) => {
            dmAPI.getCollection({ collectionName: c })
                .then( r => {
                    if (r?.length > 0) {
                    	console.log(`Collection ${c}`, r);
                    } else {
                        console.warn(`Unable to fetch collection for ${c}`);
                    }
                })
                .catch( () => {
                    console.error(`Unable to fetch collection for ${c}`);
                });
        }

        this.help = () => {
        	console.log(`
        		Shazamme.JS © - ${version} - Shazamme, Inc

        		This is a proprietary API and scripting library for widgets and data
        		consuming and providing data provided by Shazamme. This library can be used
        		for providing basic information about the widgets available on the current page.

    			The following methods are currently available.


    			* version()
    			- Output the version number of the this script library (Shazamme.JS)

    			. Example: shazamme.version() // Show Shazamme.JS version number


    			* about([widget-name {optional}])
    			- Output the version numbers and configurations of any widgets available
    			  on the current page. Optionally, provide the known-name of widget to
    			  see its version number and configuration.

    			  Note: Widgets are lazy loaded by default. To achieve the best effect,
    			  make sure to scroll to the bottom of the page before using the about()
    			  function. This will ensure that all widgets are loaded and present().

    			. Example: shazamme.about() // Show all widgets
    			. Example: shazamme.about('job-search') // Show the known widget 'job-search'


    			* collection([collection-name])
    			- Output the data of a given, known collection. Supply the name of a
    			  collection as it is defined for the current site.

    			. Example: shazamme.collection('Jobs') // Output the Jobs collection


    			* help()
    			- Output basic information about methods supported by this version
    			  of Shazamme.JS.

    			. Example: shazamme.help()
    		`);
        }

        this.version = () => {
        	console.log('Shazamme.JS ©', version);
        }
    }

    if (!window.shazamme) {
        window.shazamme = new _init();
    }
});