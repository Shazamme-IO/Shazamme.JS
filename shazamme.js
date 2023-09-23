(() => {
    const version = '1.0.1';

    const host = {
        resources: 'https://d1x4k0bobyopcw.cloudfront.net',
    }

    const message = {
        auth: 'site-auth',
    }

    const provider = {
        linkedin:'linkedinProvider',
        seek: 'seekProvider',
    }

    const seekAdvertiser = '20690608';

    let _s = {}
    let _ps = {}
    let _c = {}
    let _tr = {}
    let _b = {}

    function _init() {
        const ActionUrl = 'https://shazamme.io/Job-Listing/src/php/actions';
        const RegionalUrl = 'https://shazamme.io/Job-Listing/src/php/regional/actions';

        const sender = this;

        let _ready = window[`shazamme-${version}-ready`];

        this.ready = (sid, p) => {
            if (_ready) {
                return _ready;
            }

            let _rp = undefined;
            window[`shazamme-${version}-ready`] = _ready = new Promise( r => _rp = r );

            sender._sid = sender._sid || sid;

            Promise.all([
                $.get(`${host.resources}/shazamme.json`)
                    .then( j => {
                        _c = j.config;
                        _tr = j.trace;

                        return Promise.resolve();
                    },
                    () => {
                        return Promise.resolve();
                    }),

                sender.site(),

                sender._pageConfig(sid, p),
            ])
            .then()
            .catch( (ex) => {
                console.error(ex);
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
                        let isOAuth = u.providerData[0].providerId !== "password";
                        let isNew = isOAuth && (new Date() - new Date(parseInt(u.metadata.createdAt)) <= 1 * 60 * 1000);

                        sender.auth(u.email, isOAuth).then( s => {
                            if (s || !isOAuth) {
                                sender.pub(message.auth, s);
                            } else if (isOAuth) {
                                let name = (u.displayName || '').split(' ');

                                sender._session = {
                                    isOAuth: isOAuth,
                                    isNew: !s || isNew,
                                    firebaseUserID: u.uid,
                                    email: u.email,
                                    lastName: name.pop() || '',
                                    firstName: name.join(' '),
                                }

                                sender.pub(message.auth, {...sender._session});
                            }
                        });
                    } else {
                        sender.pub(message.auth);
                    }
                });
            }

            let uri = new URL(window.location.href);
            let oAuthToken = uri.searchParams.get('code');

            if (oAuthToken) {
                switch(sender.cookie('_op')) {
                    case provider.seek : {
                        sender.site().then( s => {
                            let j = JSON.parse(localStorage.getItem('currentJobViewed'));
                            let positionUri = `${uri.origin}${sender.bag('_site:pathJobDetails') || '/job-details'}/${new URL(j.data.jobURL).pathname.split('/').pop()}`;

                            shazamme.submit({
                                action: 'Get Seek',
                                siteID: s.siteID,
                                redirectUri: `${uri.origin}${uri.pathname}`,
                                seekAuthorizationCode: oAuthToken,
                                applicationFormUrl: encodeURIComponent(`${uri.href}`),
                                advertiserId: seekAdvertiser,
                                positionTitle: j.data.jobName,
                                positionUri: positionUri,
                                countryCode: 'AU',
                                postalCode: j.data.postalCode || '2601', //use Canberra as default
                            }).then( k => {
                                if (k.response.isExistingVinylEmail) {
                                    sender.auth(seek.response.applicantInfo.emailAddress, true).then( s => {
                                        if (s) {
                                            sender.pub(message.auth, s);
                                        } else {
                                            sender._session = {
                                                isOAuth: true,
                                                isNew: true,
                                                email: k.response.applicantInfo.emailAddress,
                                                firstName: k.response.applicantInfo.firstName || '',
                                                lastName: k.response.applicantInfo.lastName || '',
                                                cVFileContent: k.response.resumeBinary,
                                                cVFileName: k.response.resumeFileName,
                                                provider: sender.cookie('_op'),
                                            }

                                            sender.pub(message.auth, {...sender._session});
                                            _rp();
                                        }
                                    });
                                } else {
                                    sender._session = {
                                        isOAuth: true,
                                        isNew: true,
                                        email: k.response.applicantInfo.emailAddress,
                                        firstName: k.response.applicantInfo.firstName || '',
                                        lastName: k.response.applicantInfo.lastName || '',
                                        cVFileContent: k.response.resumeBinary,
                                        cVFileName: k.response.resumeFileName,
                                        provider: sender.cookie('_op'),
                                    }

                                    sender.pub(message.auth, {...sender._session});
                                    _rp();
                                }
                            }).catch( () => {
                                _rp();
                            });
                        });

                        break;
                    }

                    case provider.linkedin :
                    default: {
                        sender.site().then( s =>
                            shazamme.submit({
                                action: s?.linkedinOpenID ? 'Get Linkedin OpenID' : 'Get Linkedin',
                                siteID: s?.siteID,
                                linkedIncode: oAuthToken,
                                redirectUri: encodeURIComponent(`${uri.origin}${uri.pathname}`),
                            })
                        ).then( l => {
                            l.status && sender.auth(l.response.email, true).then( s => {
                                if (s) {
                                    sender.pub(message.auth, s);
                                } else {
                                    sender._session = {
                                        isOAuth: true,
                                        isNew: true,
                                        email: l.response.email,
                                        firstName: l.response.firstName || '',
                                        lastName: l.response.lastName || '',
                                        provider: sender.cookie('_op'),
                                    }

                                    sender.pub(message.auth, {...sender._session});
                                }

                                _rp();
                            });
                        }).catch( () => {
                            _rp();
                        });

                        break;
                    }
                }
            } else {
                _rp();
            }

            if (window.clarity) {
                let s = localStorage._clarity;

                if (!s) {
                    s = sender.uuid();

                    localStorage._clarity = s;
                }

                clarity('identify', s);
            }

            return _ready;
        };

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
                            delete _sub[msg];
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
                                pageName: config.page,
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
            if (typeof(on) === 'function') {
                let e = _ps[n] || {}
                let h = this.uuid();

                e[h] = on;

                _ps[n] = e;

                return h;
            }
        }

        this.pub = (n, m) => {
            let e = _ps[n];

            if (e) {
                for (let h in e) {
                    e[h](m, h);
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

                if (s?.isLive) {
                    sender._site = s;
                    resolve(sender._site);

                    return;
                }

                $.ajax({
                    url: 'https://staging.shazamme.salsa.hosting/Job-Listing/src/php/actions',
                    type: 'POST',
                    data: JSON.stringify({
                        action: 'Get Site ID',
                        dudaSiteID: this._sid,
                    })
                }).then( res => {
                    sender._site = (res.status && res.response.items.length > 0 && res.response.items[0]) || {};
                    sender._site.ActionUrl = 'https://staging.shazamme.salsa.hosting/Job-Listing/src/php/actions';
                    sender._site.RegionalUrl = 'https://staging.shazamme.salsa.hosting/Job-Listing/src/php/regional/actions';

                    resolve(sender._site);
                });
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

                    $.ajax(`${c.actionUrl || sender._site?.ActionUrl || ActionUrl}?dudaSiteID=${this._sid}&action=${c.action}`).then( r => {
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
                            resolve(user);
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
                        token: res.credential,
                        firebaseUserID: res.user.uid,
                        email: res.additionalUserInfo.profile.email,
                        lastName: name.pop() || '',
                        firstName: name.join(' '),
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

            const signOut = (end = true) => {
                if (end) {
                    sender.endSession();
                    sender.pub(message.auth);
                }

                firebase.auth().signOut().then();
            }

            const _delete = (secret) => {
                let u = firebase.auth().currentUser;

                if (!u) {
                    return Promise.reject();
                }

                const provider = u.providerData[0].providerId;

                if (provider === 'password') {
                    if (secret?.length > 0) {
                        const cred = firebase.auth.EmailAuthProvider.credential(
                            u.email,
                            secret,
                        );

                        return u.reauthenticateWithCredential(cred).then( r => r.user.delete() );
                    }

                    return Promise.reject();
                }

                const oauth = provider === "google.com" ? googleProvider : facebookProvider;

                return firebase.auth().signInWithPopup(oauth)
                    .then( r => u.reauthenticateWithCredential(r.credential) )
                    .then( (r) => r.user.delete() );
            }

            const user = () => firebase.auth().currentUser;

            const verify = (c) => firebase.auth().checkActionCode(c);

            const reset = (uid) => firebase.auth().sendPasswordResetEmail(uid);

            const verifyReset = (c) => firebase.auth().verifyPasswordResetCode(c);

            const confirmReset = (c, secret) => firebase.auth().confirmPasswordReset(c, secret);

            return {
                create,
                auth,
                oauth,
                signOut,
                user,
                verify,
                reset,
                verifyReset,
                confirmReset,
                delete: _delete,
            }
        }

        this.gapi = (k, v = 'beta') => {
            const maps = (l = [], _v = v) => {
                ( g=> {
                    var h,
                        a,
                        k,
                        p = "The Google Maps JavaScript API",
                        c = "google",
                        l = "importLibrary",
                        q = "__ib__",
                        m = document,
                        b = window;

                    b= b[c] || (b[c]={});

                    var d = b.maps || (b.maps={}),
                        r = new Set,
                        e = new URLSearchParams,
                        u= () => h || (h=new Promise( async(f,n) => {
                            await (a = m.createElement("script"));

                            e.set("libraries", [...r] + "");

                            for (k in g) e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);
                                e.set("callback",c+".maps."+q);

                            a.src=`https://maps.${c}apis.com/maps/api/js?`+e;
                            d[q] = f;

                            a.onerror = () => h = n(Error(p+" could not load."));
                            a.nonce = m.querySelector("script[nonce]")?.nonce || "";
                            m.head.append(a)
                        }));

                    d[l] ? console.warn(p+" only loads once. Ignoring:",g)
                        : d[l] = (f,...n) => r.add(f) && u().then( () => d[l](f,...n))
                }) ( {key: k, v: v,} );

                return Promise.all(l?.filter( i => i?.length > 0 ).map( i => google.maps.importLibrary(i) ) || []);
            }

            return {
                maps: maps
            }
        }

        this.currentUser = (refresh = false) =>
            (this._session && !refresh && Promise.resolve({...this._session}))
            || (localStorage._s && sender.auth(JSON.parse(atob(localStorage._s)).email))
            || Promise.resolve();

        this.currentSession = (refresh = false) => localStorage._s && JSON.parse(atob(localStorage._s));

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

        this.cookie = (n, v, e) => {
            if (v === undefined) {
                let c = new RegExp(`${n}{1}=(.+?)(;|$)`).exec(document.cookie)?.slice(1,2)?.pop();

                return c?.length > 0 && unescape(c);
            }

            if (v === null) {
                document.cookie = `${n}=''; Path=/; Expires=${new Date(0).toUTCString()};`;
                return;
            }

            document.cookie = `${n}=${v}; Path=/; ${e ? `Expires=${e.toUTCString()};` : ''}`;
        }

        this.store = (k, v) => {
            if (v === undefined) {
                return localStorage.getItem(k);
            }

            if (v === null) {
                localStorage.removeItem(k);
                return undefined;
            }

            localStorage.setItem(k, v);

            return v;
        }

        this.auth = (uid, isOAuth = false) => {
            return sender.site().then( s =>
                sender.submit({
                    action: "Verify User",
                    siteID: s.siteID,
                    email: uid,
                }).then( r => {
                    let p = r?.response?.items[0];

                    if (!p) {
                        return Promise.resolve();
                    }

                    sender._session = {
                        id: p.clientUserID,
                        firebaseUserID: p.firebaseID,
                        email: p.email,
                        firstName: p.firstName,
                        lastName: p.lastName,
                        siteID: s.siteID,
                        isOAuth: isOAuth,
                        isNew: false,
                        isVerified: p.firebaseID?.length > 0,
                        is: p.is,
                    }

                    localStorage._s = btoa(JSON.stringify(sender._session));

                    return sender._userRoles(sender._session).then( r => {
                        r?.forEach( x => {
                            if (x) {
                                sender._session = {
                                    ...sender._session,
                                    ...x
                                }
                            }
                        });

                        let c = sender._session.candidate;

                        if (c) {
                            localStorage.vinylResponse = JSON.stringify({response: {
                                ...c,
                                photo: null,
                                photoFileName: null,
                                cVFileContent: null,
                                cVFileName: null,
                                coverLetterContent: null,
                                coverLetterFileName: null,
                            }});
                        }

                        return Promise.resolve({...sender._session});
                    });
                })
            );
        }

        this.oauth = (p) => {
            sender.site().then(s => {
                sender.endSession();

                let uri = new URL(window.location.href);
                let r = `${uri.protocol}//${s.siteDomain}${uri.pathname}`;
                let e = new Date(new Date().getTime + 2 * 60 * 1000);

                switch (p) {
                    case provider.linkedin: {
                        let scope = encodeURIComponent(s.linkedinOpenID ? 'profile email openid' : 'r_liteprofile r_emailaddress');

                        sender.cookie('_op', p, e);
                        window.open(`https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${s.linkedinClientID}&redirect_uri=${encodeURIComponent(r)}&scope=${scope}`, '_self');
                        break;
                    }

                    case provider.seek: {
                        sender.cookie('_op', p, e);
                        window.open(`https://www.seek.com.au/api/iam/oauth2/authorize?client_id=${s.seekClientID}&redirect_uri=${encodeURIComponent(r)}&advertiser_id=${seekAdvertiser}&scope=r_profile_apply&response_type=code`, '_self');
                        break;
                    }

                    default: break;
                }
            });
        }

        this.endSession = () => {
            [
                'authProvider',
                'createAlert',
                'currentJobViewed',
                'jobID',
                'linkedIncode',
                'previousApplicationPage',
                'resumeBinary',
                'resumeFileName',
                'resumeLink',
                'seekAuthorizationCode',
                'vinylResponse',
                '_s',
            ].forEach( k => localStorage.removeItem(k) );

            delete sender._session;
        }

        this.client = () =>
            sender.site().then( s => {
                const uri = s?.isLive
                    ? 'https://shazamme.io/Job-Listing/src/php/client/actions'
                    : 'https://staging.shazamme.salsa.hosting/Job-Listing/src/php/client/actions';

                return Promise.resolve({
                    submit: (d) =>
                        $.ajax({
                            url: uri,
                            type: 'POST',
                            data: JSON.stringify(d),
                        }),

                    fetch: (c) => sender.fetch({
                        ...c,
                        actionUrl: uri,
                    }),
                })
            });


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
            if (!sid || !p) {
                resolve();
                return;
            }

            sender._config = sender._config || {}

            if (sender._config[`${sid}_${p}`]) {
                resolve(sender._config[`${sid}_${p}`]);
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

                    sender._config[`${sid}_${p}`] = c;
                    resolve(c);
                }, err => {
                    if (err.status >= 400 && err.status < 500) {
                        sender._config[`${sid}_${p}`] = {};
                        resolve({});

                        return;
                    }

                    sender.warn(`Error encountered looking for page configuration (${sid} : ${p}`, err);
                });
        });

        this._userRoles = (s) => Promise.all([
            s.is?.indexOf('candidate') >= 0 && sender.submit({
                    action: "Login Candidate",
                    siteID: s.siteID,
                    eMail: s.email,
                }).then( r => {
                    let c = r?.response?.items?.at(0);

                    return Promise.resolve(c && { candidate: {...c} });
                }),
        ]);
    }

    if (!window[`shazamme-${version}`]) {
        let _i = new _init();

        if (!window.shazamme || window.shazamme._v < _i._v) {
            window.shazamme = _i;
        }

        window[`shazamme-${_i._v}`] = _i;
    }
})();