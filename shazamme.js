$(function() {
    const version = '0.1.1';

    let _s = {}
    let _ps = {}

    function _init() {
        const ActionUrl = 'https://shazamme.io/Job-Listing/src/php/actions';
        const RegionalUrl = 'https://shazamme.io/Job-Listing/src/php/regional/actions';

        this.register = (n, config) => {
            if (n?.length > 0) {
                _s[`${n}-${config.widgetId}`] = config;
                this._sid = this._sid || config.siteId;

                if (!this._site) {
                    this.site().then();
                }

                const sender = this;
                const _sub = {};

                const o = {
                    sub: (msg, on) => {
                        if (_sub[msg]) return;

                        let h = sender.sub(msg, on);
                        _sub[msg] = h;

                        console.log(`${n} listening for message '${msg}' (${h})`, config);

                        return o;
                    },

                    pub: (msg, m) => {
                        console.log(`${n} publishing message '${msg}'`, config);
                        sender.pub(msg, m);

                        return o;
                    },

                    unsub: (msg) => {
                        if (_sub[msg]) {
                            console.log(`${n} stop listening for message '${msg}'`, config);
                            delete _ps[msg][_sub[n]];
                        }

                        return o;
                    },

                    log: (m, ...p) => {
                        sender.log(`got message from ${n}`, config);
                        sender.log(m, ...p);

                        return o;
                    },

                    trace: (m, ...p) => {
                        sender.log(`got message from ${n}`, config);
                        sender.trace(m, ...p);

                        return o;
                    },

                    ex: (m, ...p) => {
                        sender.log(`got message from ${n}`, config);
                        sender.ex(m, ...p);

                        return o;
                    },
                }

                return o;
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
                    e[i](m);
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
                let s = res.status && res.response.items.length > 0 && res.response.items[0];

                if (!s.isLive) {
                    s.ActionUrl = 'https://staging.shazamme.salsa.hosting/Job-Listing/src/php/actions';
                    s.RegionalUrl = 'https://staging.shazamme.salsa.hosting/Job-Listing/src/php/regional/actions';
                }

                this._site = s;
                resolve(this._site);
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
                let sender = this;

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
            $.ajax({
                url: regional ? this._site?.RegionalUrl || RegionalUrl : this._site?.ActionUrl || ActionUrl,
                type: 'POST',
                data: JSON.stringify(d),
            });

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

        this.log = (m, ...p) => {
            console.log(m, ...p);
        }

        this.trace = (m, ...p) => {
            console.trace(m, ...p);
        }

        this.ex = (m, ...p) => {
            console.error(m, ...p);
        }

        this._v = version;

        this.v = (v) => window[`shazamme-${v}`];
    }

    let _i = new _init();

    if (!window.shazamme) {
        window.shazamme = _i;
    }

    if (!window[`shazamme-${_i._v}`]) {
        window[`shazamme-${_i._v}`] = _i;
    }
});