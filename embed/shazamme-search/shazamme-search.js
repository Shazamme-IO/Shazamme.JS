const Collection = {
    jobResults: {
        name: 'Jobs',
        action: 'Get Jobs',
        endpoint: '',
        useCache: true,
        debug: true,
    },
}

function ShApi(){
    this.getJobs = (
        c
        , pageNumber
        , pageSize
        , filters={}
        , sort={
            field: 'changedOnUTC',
            direction: 'desc',
        }) => new Promise( (resolve, reject) => {
            shazamme.fetch(Collection.jobResults).then( jobs => {
                let filtered = [];

                if (filters) {
                    filtered = jobs.filter( j => {
                        let ok = true;

                        let isMatch = (v) => {
                            if (typeof(v) !== 'string') {
                                return false;
                            }

                            return filters[f]
                                .map( i => i?.toLowerCase() )
                                .filter( i => i.indexOf(v.toLowerCase() )).length > 0;
                        }

                        for (f in filters) {
                            switch (f) {
                                case 'salaryFrom': ok = ok && j.data[f] >= filters[f]; break;

                                case 'salaryTo': ok = ok && j.data[f] <= filters[f]; break;

                                case 'keyword': {
                                    ok = ok && (
                                        (c.keywordSearch.category === true && isMatch(j.data.category))
                                        || (c.keywordSearch.subCategory === true && isMatch(j.data.subCategory))
                                        || (c.keywordSearch.contact === true && isMatch(j.data.contactName))
                                        || isMatch(j.data.contactEmail)
                                        || isMatch(j.data.contactPhone)
                                        || (c.keywordSearch.location === true && isMatch(j.data.location))
                                        || (c.keywordSearch.area === true && isMatch(j.data.city))
                                        || (c.keywordSearch.country === true && isMatch(j.data.country))
                                        || (c.keywordSearch.description === true && isMatch(j.data.fullDescription))
                                        || (c.keywordSearch.referenceNumber === true && isMatch(j.data.referenceNumber))
                                        || (c.keywordSearch.jobName === true && isMatch(j.data.jobName))
                                        || isMatch(j.data.tags)
                                    );

                                    break;
                                }

                                case 'location': {
                                    ok = ok && isMatch(j.data.fullAddress);
                                    break;
                                }

                                default: ok = ok && (filters[f].length === 0 || filters[f].indexOf(j.data[f]) >= 0); break;
                            }
                        }

                        return ok;
                    });
                } else {
                    filtered.push(...jobs);
                }

                resolve({
                    values: filtered.sort( (x, y) => {
                        if (x.data[sort.field] > y.data[sort.field]) {
                            if (sort.direction === 'asc') {
                                return 1;
                            } else {
                                return -1;
                            }
                        }

                        if (x.data[sort.field] < y.data[sort.field]) {
                            if (sort.direction === 'asc') {
                                return -1;
                            } else {
                                return 1;
                            }
                        }

                        return 0;
                    }).slice(pageNumber * pageSize, pageNumber * pageSize + pageSize),
                    page: {
                        pageNumber: pageNumber,
                        totalPages: parseInt(Math.ceil(filtered.length / pageSize)),
                        totalItems: filtered.length,
                    }
                });
            });
    });
}

function UX() {
    this.el = $('<div />', {
        "class": 'shazame-search-bar'
    });

    this.uri = new URL(window.location.href);

    this.fieldEl = (f) => {
    	return `
    		<div class='search-field'>
    			<label class='search-field-label'>
    				${f.label || ''}
    				${f.autocomplete ? 
    					`
                        <input class="search-field-value" type="text" autocomplete="off" data-autocomplete="${f.autocomplete}" placeholder="${f.placeholder || ''}" data-submit />
                        <div class="predictionResult" data-prediction></div>
                        `
    					: `
    						<select data-filter="${f.name}">
    						${`<option value="">${f.placeholder || `Any ${f.label}`}</option>`}
    						</select>
						`
					}
    			</label>
    		</div>
    	`
    }

    this.showLoading = (showing = true) => {
        if (showing) {
            $(element).find(".client-answers-loading").show();
        } else {
            $(element).find(".client-answers-loading").hide();
        }
    }

    this.loadScript = (src) => {
        return new Promise( (res, rej) => {
            $.getScript(
                src,
                function() { res() },
                function() { rej() }
            );
        });
    }
}

let main = () => {
    const shApi = new ShApi();
    const ux = new UX();

    let t = $('script[shaz-embed-search]');
    const c = JSON.parse(atob(t.attr('shaz-embed-search')));

    Collection.jobResults.endpoint = `https://shazamme.io/Job-Listing/src/php/actions?dudaSiteID=${c.sid}&action=Get%20Jobs`;

    t.after(
        ux.el.append(`
            <div class="section-field-set">
                ${c.fields?.map( f => ux.fieldEl(f) )?.join('')}

                <button class="button-submit" data-rel="action-submit">${c.submitText}</button>
            </div>

            ${c.showBrand ?
            `
                <div class="section-tag-line">
                    <div class="logo">
                        <span class="brand">powered by</span>
                        <a href="https://shazamme.com" target="_blank">
                            <img class="logo" src="https://irt-cdn.multiscreensite.com/f4acdc09/dms3rep/multi/Shazamme+5+stars.svg" />
                        </a>
                    </div>
                </div>
            ` : ''
            }
        `)
    );

    let activeFilter = {}

    let fuseSettings = {
        default: {
            caseSensitive: false,
            shouldSort: true,
            threshold: 0.2,
            tokenize: true,
            matchAllTokens: true,
            location: 0,
            distance: 1000,
            maxPatternLength: 32,
            minMatchCharLength: 2,
            includeMatches: true,
        },

        keys: {
            keyword: [
                c.keywordPrediction.jobName ? 'jobName' : undefined,
                c.keywordPrediction.category ? 'category' : undefined,
                c.keywordPrediction.subCategory ? 'subCategory' : undefined,
                c.keywordPrediction.contact ? 'contactName' : undefined,
                c.keywordPrediction.location ? 'location' : undefined,
                c.keywordPrediction.location ? 'city' : undefined,
                c.keywordPrediction.description ? 'shortDescription' : undefined,
                c.keywordPrediction.referenceNumber ? 'referenceNumber' : undefined,
                c.keywordPrediction.country === true ? 'country' : undefined
            ],

            location: [
                'country',
                'state',
                'city',
                'postalCode'
            ],

            city: [
                'city',
            ],
        },
    }

    ux.el.find('[data-rel=action-submit]').click(function() {
        submitSearch();
    });

    ux.el.find('[data-filter]').on('change', function() {
        let field = $(this);

        if (field.val()?.length > 0) {
            activeFilter[field.attr('data-filter')] = [field.val()];
        } else {
            delete activeFilter[field.attr('data-filter')];

        }

        fetchValues();
    });

    ux.el.find('[data-gapi]').on('keyup', function() {
        let field = $(this);
        let range = field.siblings('[data-filter=geoRange]');

        clearTimeout(this._debounce);
        field.siblings('[data-prediction]').hide();

        this._debounce = setTimeout( () => {
            let value = field.val();

            delete activeFilter[field.attr('data-gapi')];
            delete activeFilter[range.attr('data-filter')];
            delete activeFilter[field.attr('data-gapi-text')];

            field.attr('_last', '');

            if (value.length == 0) {
                fetchValues();
                return;
            }

            $.ajax(`https://maps.googleapis.com/maps/api/geocode/json?address=${value}&key=${c.googleApiKey}`)
                .then( r => {
                    let matches = r.results.map( a => `<a href="javascript: void(0);" class="resultText" data-value="${a.geometry.location.lat},${a.geometry.location.lng}">${a.formatted_address}</a>`)

                    if (matches.length > 0) {
                        field.siblings('[data-prediction]')
                            .empty()
                            .append(`<a href="javascript: void(0);" class="resultText close" data-value="">x</a>`)
                            .append(matches.join(''))
                            .show()
                            .on('click', '[data-value]', function() {
                                let opt = $(this);
                                let value = opt.attr('data-value');

                                field.val(opt.text());
                                opt.parents('[data-prediction]').hide();

                                if (value.length > 0) {
                                    activeFilter[field.attr('data-gapi')] = [value];
                                    activeFilter[field.attr('data-gapi-text')] = [opt.text()];
                                    activeFilter[range.attr('data-filter')] = [range.val()];
                                    field.attr('_last', opt.text());
                                }

                                fetchValues();
                            });
                    }
                });
        }, 500);

    })
    .on('blur', function() {
        let field = $(this);

        setTimeout( () => {
            field
                .val(field.attr('_last'))
                .siblings('[data-prediction]')
                .hide();

            fetchValues();
        }, 300);
    });

    ux.el.find('[data-autocomplete]').on('keyup', function() {
        let field = $(this);
        let filter = field.attr('data-autocomplete');

        if (field.val().length == 0) {
            delete activeFilter[filter];
            fetchValues();

            return;
        }

        let keys = fuseSettings.keys[filter];
        let unique = (value, index, self) => self.indexOf(value) === index;
        let settings = {
            ...fuseSettings.default,
            keys: keys.filter( k => k?.length > 0 ),
        }

        let matches = [];

        new Fuse(jobs.map( j => j.data ), settings).search(field.val()).forEach( m => {
            matches.push(...m.matches.map( i => {
                let last = 0;
                let v = [];

                i.indices.forEach( x => {
                    v.push(i.value.slice(last, x[0]));
                    v.push(`<b>${i.value.slice(x[0], x[1])}</b>`);

                    last = x[1];
                });

                v.push(i.value.slice(last));

                return `<a href="javascript: void(0);" class="resultText" data-value="${i.value}">${v.join('')}</a>`;
            }));
        });

        if (matches.length > 0) {
            field.siblings('[data-prediction]')
                .empty()
                .append(`<a href="javascript: void(0);" class="resultText close" data-value="">x</a>`)
                .append(matches.filter(unique).join(''))
                .show()
                .on('click', '[data-value]', function() {
                    let opt = $(this);
                    let value = opt.attr('data-value');

                    field.val(value);
                    opt.parents('[data-prediction]').hide();
                });
        } else {
            field.siblings('[data-prediction]').hide();
        }
    }).on('blur', function() {
        let field = $(this);

        setTimeout( () => {
            field
                .siblings('[data-prediction]')
                .hide();

            let value = field.val();

            if (value.length > 0) {
                activeFilter[field.attr('data-autocomplete')] = value.split(',');
            } else {
                delete activeFilter[field.attr('data-autocomplete')];
            }

            fetchValues();
        }, 250);
    }).on('change', function() {
        let field = $(this);

        if (field.val().length > 0) {
            activeFilter[field.attr('data-autocomplete')] = field.val().split(',');
        } else {
            delete activeFilter[field.attr('data-autocomplete')];

        }

        fetchValues();
    });

    ux.el.find('input[data-submit]')
        .on('keypress', function(e) {
            switch (e.which) {
                case 13 : // Enter key
                    let field = $(this);
                    let filter = field.attr('data-autocomplete') || field.attr('data-filter');
                    let value = field.val();

                    if (value.length > 0) {
                        activeFilter[filter] = value.split(',');
                    } else {
                        delete activeFilter[filter];
                    }

                    field.blur();
                    field.siblings('[data-prediction]').hide();

                    submitSearch();
                    break;
            }
        })

    let fetchValues = () => new Promise( (resolve, reject) => {
        let values = {
            professionID: [],
            roleID: [],
            workTypeID: [],
            state: [],
            city: [],
            country: [],

            category: [],
            subCategory: [],
            workType: [],
        }

        let unique = (value, index, self) => self.indexOf(value) === index;
        let sort = (x, y) => x.text.toLowerCase() < y.text.toLowerCase() ? -1 : 1;

        let push = (l, vl) => {

            vl
                .map( i => i.id )
                .filter( i => i )
                .filter(unique)
                .forEach( id => {
                    l[id] = {
                        text: vl.find( i => i.id === id ).text,
                        count: (l[id]?.count || 0)  + vl.filter( i => i.id === id ).length
                    };
                });
        }

        jobs = [];

        let fetch = (pageNumber) => {
            shApi.getJobs(c, pageNumber, 100, activeFilter).then( j => {
                push(values.professionID, j.values.map( i => new Object({ id: i.data.professionID, text: i.data.category })));
                push(values.roleID, j.values.map( i => new Object({ id: i.data.roleID, text: i.data.subCategory })));
                push(values.workTypeID, j.values.map( i => new Object({ id: i.data.workTypeID, text: i.data.workType })));
                push(values.state, j.values.map( i => new Object({ id: i.data.state, text: i.data.state })));
                push(values.city, j.values.map( i => new Object({ id: i.data.city, text: i.data.city })));
                push(values.country, j.values.map( i => new Object({ id: i.data.country, text: i.data.country })));

                jobs.push(...j.values);

                if (pageNumber + 1 < j.page.totalPages) {
                    fetch(pageNumber + 1);
                } else {
                    for (let v in values) {
                        let l = values[v];
                        let opt = [];

                        for (let i in l) {
                            if (typeof(l[i]) === 'object') {
                                opt.push({
                                    id: i,
                                    text: l[i].text,
                                    count: l[i].count,
                                });
                            }
                        }

                        ux.el.find(`[data-filter=${v}] option:gt(0)`).remove();

                        ux.el.find(`[data-filter=${v}]`)
                            .append(opt.sort(sort).map( o => `<option value="${o.id}">${o.text} (${o.count})`))
                            .val(activeFilter[v] || '');
                    }

                    for (let i in fuseSettings.keys) {
                        jobs.forEach( j => fuseSettings.keys[i].forEach( k => j.data[k] = j.data[k] || '' ));
                    }

                    resolve();
                }
            });
        }

        fetch(0);
    });

    let submitSearch = () => {
        let push = (p, n, v) => {
            if (v?.length > 0) {
                p.push(`${n}=${encodeURIComponent(v)}`);
            }
        }

        let params = [];

        for (let i in activeFilter) {
            push(params, i, activeFilter[i]);
        }

        push(params, 'auth', c.auth);

        window.location = `${c.resultsPath}?${params.join('&')}`;
    }

    let jobs = [];

    return {
        fetchValues,
    }
}

let ready = () => {
    let ux = new UX();
    ux.loadScript('https://cdn.jsdelivr.net/npm/fuse.js@6.4.0').then();

    ux.loadScript('https://d1x4k0bobyopcw.cloudfront.net/shazamme-0.1.1.min.js')
        .then( () => {
            let i = setInterval( () =>{
                if (window.shazamme) {
                    clearInterval(i);
                    main().fetchValues();
                }
            }
            , 500);
        });

    $('head')
        .append($('<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Muli:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Raleway:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Spartan:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Be+Vietnam:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Rock+Salt:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Barlow:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Roboto:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Poppins:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Montserrat:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Lato:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Quicksand:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Oswald:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Dancing+Script:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic|Open+Sans:100,200,300,400,500,600,700,800,900,100italic,200italic,300italic,400italic,500italic,600italic,700italic,800italic,900italic&amp;subset=latin-ext&amp;display=swap" crossorigin="anonymous" />'))
        .append($('<link rel="stylesheet" type="text/css" href="https://d1x4k0bobyopcw.cloudfront.net/embed/shazamme-search/shazamme-search-0.0.1.min.css" crossorigin="anonymous" />'));
}

if (window.jQuery) {
    ready();
} else {
    let jq = document.createElement("script");

    jq.type = 'text/javascript';
    jq.src = 'https://code.jquery.com/jquery-3.6.4.min.js';
    jq.onreadystatechange = ready;
    jq.onload = ready;

    document.body.append(jq);
}

