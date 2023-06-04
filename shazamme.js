(() => {
    const version = '1.0';

    const host = {
        resources: 'https://d1x4k0bobyopcw.cloudfront.net',
    }

    let _s = {}
    let _ps = {}
    let _c = {}
    let _tr = {}
    let _b = {}

    function _init() {
        const ActionUrl = 'https://shazamme.io/Job-Listing/src/php/actions';
        const RegionalUrl = 'https://shazamme.io/Job-Listing/src/php/regional/actions';

        const sender = this;

        let _ready = false;

        this.ready = () => new Promise( (resolve) => {
            if (_ready) {
                resolve();
                return;
            }

            $.get(`${host.resources}/shazamme.json`)
                .then( j => {
                    _c = j.config;
                    _tr = j.trace;

                    _ready = true;

                    resolve();
                },
                () => {
                    _ready = true;

                    resolve();
                });
        })

        this.register = (n, config, tracing = false) => {
            if (n?.length > 0) {
                let c = {
                    _name: n,
                    ...config,
                }

                _s[`${n}-${config.widgetId}`] = c;
                this._sid = this._sid || c.siteId;

                if (!this._site) {
                    this.site().then();
                }

                const _sub = {};

                let _tracer = undefined;

                if (tracing) {
                    sender.tracer().then( t => _tracer = t );
                }

                sender._cTrace(c);

                const o = {
                    supports: (s) => {
                        c.supports = {
                            ...c.supports,
                            ...s,
                        };
                    },

                    sub: (msg, on) => {
                        if (_sub[msg]) return;

                        let h = sender.sub(msg, (m, h) => {
                            if (_sub[msg] === h) {
                                on(m);
                            }
                        });

                        _sub[msg] = h;

                        console.log(`${n} listening for message '${msg}' (${h})`, c);

                        return o;
                    },

                    pub: (msg, m) => {
                        console.log(`${n} publishing message '${msg}'`, c);
                        sender.pub(msg, m);

                        return o;
                    },

                    unsub: (msg) => {
                        if (_sub[msg]) {
                            console.log(`${n} stop listening for message '${msg}'`, c);
                            delete _ps[msg][_sub[n]];
                        }

                        return o;
                    },

                    defaults: () => new Promise( (resolve, reject) => {
                        sender._pageConfig(config.siteId, config.page).then( c => {
                            resolve({
                                ..._c[n],
                                ...c[n],
                            });
                        });
                    }),

                    bag: (k, v) => {
                        return sender.bag(`${n}:${config.widgetId}:${k}`, v);
                    },

                    config: (c) =>
                        c === undefined ?
                            sender.submit({
                                action: "Get Widget Configuration",
                                siteID: config.siteId,
                                accountID: config.accountId,
                                elementID: config.elementId,
                            }, false).then( c => Promise.resolve(JSON.parse(c.configuration || null)) )
                            :
                            sender.submit({
                                action: "Set Widget Configuration",
                                siteID: config.siteId,
                                accountID: config.accountId,
                                elementID: config.elementId,
                                pageName: config.page,
                                widgetName: n,
                                configuration: JSON.stringify(c),
                            }, false),

                    log: (m, ...p) => {
                        sender.log(`got message from ${n}`, c);
                        sender.log(m, ...p);

                        _tracer?.trace({
                            from: n,
                            widget: config,
                            message: m,
                            params: p,
                            ua: window.navigator?.userAgent,
                            level: 'log',
                        });

                        return o;
                    },

                    warn: (m, ...p) => {
                        sender.warn(`got message from ${n}`, config);
                        sender.warn(m, ...p);

                        _tracer?.trace({
                            from: n,
                            widget: config,
                            message: m,
                            params: p,
                            ua: window.navigator?.userAgent,
                            level: 'warn',
                        });

                        return o;
                    },

                    trace: (m, ...p) => {
                        sender.log(`got message from ${n}`, c);
                        sender.trace(m, ...p);

                        _tracer?.trace({
                            from: n,
                            widget: config,
                            message: m,
                            params: p,
                            ua: window.navigator?.userAgent,
                            level: 'trace',
                        });

                        return o;
                    },

                    ex: (m, ...p) => {
                        sender.log(`got message from ${n}`, c);
                        sender.ex(m, ...p);

                        _tracer?.trace({
                            from: n,
                            widget: config,
                            message: m,
                            params: p,
                            ua: window.navigator?.userAgent,
                            level: 'ex',
                        });

                        return o;
                    },
                }

                sender._pageConfig(config.siteId, config.page).then( () => {
                    for (let l in _tr[n]) {
                        for (let t in _tr[n][l]) {
                            if (config[t] === _tr[n][l][t]) {
                                let m = `discovered widget with configuration ${t}: ${config[t]} on page ${config.page}`;

                                switch (l) {
                                    case 'warn': sender.warn(m); break;
                                    case 'error': sender.ex(m); break;
                                    case 'trace': sender.trace(m, n, config); break;
                                    default: sender.log(m);
                                }
                            }
                        }
                    }
                })

                return o;
            } else {
                console.warn('No name provided for object', c);
            }
        }

        this.about = (n) => {
            if (n?.length > 0) {
                let i = _s[n];

                for (let i in _s) {
                    let w = _s[i];

                    if (w._name === n) {
                        console.log(`${i}:`, w);
                    }
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

        this.uuid = () =>
            'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

        this.sub = (n, on) => {
            let e = _ps[n] || {}
            let h = this.uuid();

            e[h] = on;

            _ps[n] = e;

            return h;
        }

        this.pub = (n, m) => {
            let e = _ps[n];

            if (e) {
                for (let i in e) {
                    e[i](m, i);
                }
            }
        }

        this.unsub = (h) => {
            for (let e in _ps) {
                delete _ps[e][h];
            }
        }

        this.site = () => new Promise( (resolve, reject) => {
            if (this._site) {
                resolve(this._site);
                return;
            }

            $.ajax({
                url: ActionUrl,
                type: 'POST',
                data: JSON.stringify({
                    action: 'Get Site ID',
                    dudaSiteID: this._sid,
                })
            }).then( res => {
                let s = (res.status && res.response.items.length > 0 && res.response.items[0]) || {};

                if (!s.isLive) {
                    s.ActionUrl = 'https://staging.shazamme.salsa.hosting/Job-Listing/src/php/actions';
                    s.RegionalUrl = 'https://staging.shazamme.salsa.hosting/Job-Listing/src/php/regional/actions';
                }

                sender._site = s;
                resolve(sender._site);
            });
        });

        this.fetch = (c) => new Promise( (resolve, reject) => {
            if (c.useCache && c._cache) {
                resolve(c._cache);
            } else if (c.debug) {
                $.ajax({url: c.endpoint}).then( r => {
                    if (c.useCache) {
                        c._cache = r;
                    }

                    resolve(r);
                });
            } else {
                let fail = () => {
                    console.warn(`Unable to fetch collection for ${c.name} (${this._sid})`);

                    $.ajax(`${sender._site?.ActionUrl || ActionUrl}?dudaSiteID=${this._sid}&action=${c.action}`).then( r => {
                        if (c.useCache) {
                            c._cache = r;
                        }

                        resolve(r);
                    });
                }

                dmAPI.getCollection({ collectionName: c.name })
                    .then(r => {
                        if (r?.length > 0) {
                            if (c.useCache) {
                                c._cache = r;
                            }

                            resolve(r);
                        } else {
                            fail();
                        }
                    })
                    .catch( () => {
                        fail();
                    });
            }
        });

        this.submit = (d, regional = true) =>
            this.site().then( s =>
                $.ajax({
                    url: (regional && (s?.RegionalUrl || RegionalUrl)) || s?.ActionUrl || ActionUrl,
                    type: 'POST',
                    data: JSON.stringify(d),
                })
            );

        this.firebase = () => {
            const create = (uname, secret) => new Promise( (resolve, reject) => {
                firebase.auth().createUserWithEmailAndPassword(uname, secret).then( res => {
                    resolve({
                        uid: res.user.uid,
                    });
                }).catch(err => {
                    console.error(err);

                    reject({
                        code: err && err.code,
                        msg: err && err.message || 'We ran into an issue. Plase try again.'
                    });
                });
            });

            const auth = (uname, secret) => new Promise( (resolve, reject) => {
                firebase.auth().signInWithEmailAndPassword(uname, secret).then( res => {
                    firebase.auth().onAuthStateChanged(user => {
                        if (user) {
                            resolve({
                                uid: res.user.uid,
                                email: user.email,
                            })
                        } else {
                            reject({
                                msg: 'The user does not exist or the credentials used were incorrect.'
                            });
                        }
                    });
                }).catch(err => {
                    console.error(err);

                    reject({
                        code: err && err.code,
                        msg: err && err.message || 'We ran into an issue. Plase try again.'
                    });
                });
            });

            const oauth = (provider) => new Promise( (resolve, reject) => {
                firebase.auth().signInWithPopup(provider).then( res => {
                    let name = (res.additionalUserInfo.profile.name || '').split(' ');

                    resolve({
                        token: JSON.stringify(res.credential),
                        uid: res.user.uid,
                        email: res.additionalUserInfo.profile.email,
                        lastName: name.length > 1 ? name.pop() : '',
                        firstName: name.length > 0 ? name.join(' ') : '',
                        isNew: res.additionalUserInfo.isNewUser,
                    });
                }).catch(err => {
                    console.error(err);

                    reject({
                        code: err && err.code,
                        msg: err && err.message || 'We ran into an issue. Plase try again.'
                    });
                });
            });

            return {
                create,
                auth,
                oauth,
            }
        }

        this.currentUser = () => new Promise( (resolve, reject) => {
            if (this._session) {
                resolve({...this._session});
                return;
            }

            if (localStorage._sHandle?.length > 0) {
                this.site()
                    .then( s =>
                        this.submit({
                            action: 'Get Candidate By ID',
                            candidateID: localStorage._sHandle,
                            siteID: s.siteID,
                        })
                    ).then( r => {
                        let c = r?.response?.items[0];

                        if (c) {
                            sender._session = c;
                            resolve(c);
                        }
                    });

            } else {
                resolve();
            }
        });

        this.bag = (k, v) => {
            if (k === undefined) {
                return _b;
            }

            if (v === undefined) {
                return _b[k];
            }

            if (v === null) {
                delete _b[k];
                return undefined;
            }

            _b[k] = v;

            return v;
        }

        this.log = (m, ...p) => {
            console.log(m, ...p);
        }

        this.trace = (m, ...p) => {
            console.trace(m, ...p);
        }

        this.warn = (m, ...p) => {
            console.warn(m, ...p);
        }

        this.ex = (m, ...p) => {
            console.error(m, ...p);
        }

        this.tracer = () => new Promise( (resolve, reject) => {
            const o = {
                trace: (m) => sender._tracer?.push(m),
            }

            if (sender._tracer) {
                resolve(o);
            } else {
                $.getScript("https://cloudfront.loggly.com/js/loggly.tracker-2.2.4.min.js",
                    function() {
                        sender._tracer = _LTracker;

                        sender._tracer.push({
                            'logglyKey': '70c3ea33-de10-495b-bb9d-574e90489d69',
                            'sendConsoleErrors': false,
                            'tag': 'loggly-jslogger',
                        });

                        resolve(o);
                    },

                    function() {
                        reject();
                    }
                );
            }
        });

        this._v = version;

        this.v = (v) => window[`shazamme-${v}`];

        this._cTrace = (c) => {
            if (!_tr) return;

            this.tracer().then( t => {
                let match = w => {
                    let found = true;

                    for (let i in w) {
                        found = found && c.config[i] === w[i];
                    }

                    if (found) {
                        return c.config;
                    }
                }

                for (let l in _tr[c._name]) {
                    _tr[c._name][l].forEach( w => {
                        let p = match(w);

                        if (p) {
                            t?.trace({
                                from: c._name,
                                widget: c,
                                message: `Found widget ${c._name} on page ${c.page}`,
                                params: p,
                                level: l,
                                messageType: 'widget-tracing',
                            });
                        }
                    });
                }
            });
        }

        this._pageConfig = (sid, p) => new Promise( (resolve, reject) => {
            this._config = this._config || {}

            if (this._config[`${sid}_${p}`]) {
                resolve(this._config[`${sid}_${p}`]);
                return;
            }

            Promise
                .allSettled([
                    $.get(`${host.resources}/${sid}/shazamme.json`),
                    $.get(`${host.resources}/${sid}/${p}/shazamme.json`),
                ])
                .then( r => {
                    let c = {};

                    r.forEach( j => {
                        for (let w in j.value?.config) {
                            c[w] = {
                                ...c[w],
                                ...j.value?.config[w],
                            }
                        }

                        for (let w in j.value?.trace) {
                            _tr[w] = _tr[w] || {}

                            for (let l in j.value.trace[w]) {
                                _tr[w][l] = Array.concat(j.value.trace[w][l], _tr[w][l] || [])
                            }
                        }
                    });

                    this._config[`${sid}_${p}`] = c;
                    resolve(c);
                });

        });

        addEventListener('CookiebotOnConsentReady', function() {
            if (!Cookiebot.consent.marketing) {
                localStorage.removeItem('referralSource');
                localStorage.removeItem('referralMedium');
                localStorage.removeItem('referralTerm');
                localStorage.removeItem('referralCampaign');
                localStorage.removeItem('referralContent');
            } else {
                let uri = new URL(window.location.href);

                let referrer = uri.searchParams.get('utm_source');
                let campaignMedium = uri.searchParams.get('utm_medium');
                let campaignKeyword = uri.searchParams.get('utm_term');
                let campaignName = uri.searchParams.get('utm_campaign');
                let campaignContent = uri.searchParams.get('utm_content');

                if (referrer?.length > 0) localStorage.referralSource = referrer;
                if (campaignMedium?.length > 0) localStorage.referralMedium = campaignMedium;
                if (campaignKeyword?.length > 0) localStorage.referralTerm = campaignKeyword;
                if (campaignName?.length > 0) localStorage.referralCampaign = campaignName;
                if (campaignContent?.length > 0) localStorage.referralContent = campaignContent;
            }
        });

        if (window.Cookiebot && !Cookiebot.consent.marketing) {
            localStorage.removeItem('referralSource');
            localStorage.removeItem('referralMedium');
            localStorage.removeItem('referralTerm');
            localStorage.removeItem('referralCampaign');
            localStorage.removeItem('referralContent');
        }

        if (window.firebase) {
            firebase.auth().onAuthStateChanged( u => {
                if (u) {
                    sender.site()
                        .then( s =>
                            sender.submit({
                                action: "Login Candidate",
                                siteID: s.siteID,
                                eMail: u.email,
                            })
                        ).then( r => {
                            let c = r?.response?.items[0];

                            if (c) {
                                localStorage._sHandle = c.candidateID;
                                sender._session = c;

                                sender.pub('site-auth', c);
                            }
                        })
                } else {
                    localStorage.removeItem('_sHandle');
                    delete sender._session;
                    sender.pub('site-auth');
                }
            });
        }
    }

    if (!window[`shazamme-${version}`]) {
        let _i = new _init();

        if (!window.shazamme || window.shazamme._v < _i._v) {
            window.shazamme = _i;
        }

        window[`shazamme-${_i._v}`] = _i;
    }
})();