# Shazamme.JS

#### Change History
| ver       | date     	| change
|:----------|:----------|:--------------------------
| **0.1**   | Mar 2023 	| * Test release
| **0.1.1** | Apr 2023 	| * Added pub / sub support.
|           |          	| * Added state bag support
|           |          	| * Added 3rd party tracing / logging
|           |          	| * Added authentication / session wrappers
| **1.0**   | Jun 2023 	| * First release
| **1.0.1**	| Jan 2024 	| * Added password reset and signout interfaces to the Firebase wrapper.
|			|			| * Added wrappers for Google API
|			|			| * Added support for Open ID OAuth using LinkedIn
|			|			| * Added a wrapper for Able support
|			|			| * Added a system for plugins and script loading
|			|			| * Added web user / client support for authenticated users
|			|			| * Implemented CookieBot support for disabling trackers
|			|			| * Added message toasting support
|			|			| * General bug fixes
*maintained by* [Justin McCullough](https://github.com/cptcretin)

## About

The Shazamme Javascript library for use with [Duda](https://www.duda.co/) websites.
This library is intended to make the coding of custom widgets simple and uniform.
The library supplies wrappers for Duda constructs and wrappers for authentication using [Firebase](https://firebase.google.com/).
Access to Shazamme's discreet web services are also provided through a set of standardized API wrappers.

## Quick Start
To get started developing a custom Shazamme widget, register the widget with the library using the following syntax. The use of a `main()` method is recommended, as this will keep the initialization of the widget grouped in a method when it is known that Shazamme.JS is safely available. Once the widget is registered, any of the methods supported by Shazamme.JS can be called as normal.

When calling `shazamme.ready()`, passing the ID of the current site and the name of the current page will pre-fetch any custom configuration applied to the page level. (See [Shazamme.JSON] for details).

```js
$.getScript(
    'https://sdk.shazamme.io/js/shazamme.min.js',
    function() {
        shazamme.ready(data.siteId, data.page).then( () => {
            main(shazamme.register('my-custom-widget-name', data));
        });
   }
);
```

When calling `shazamme.register()`, be sure to pass an identifiable name for the custom widget being developed. This will help in identifying the widget down the line when testing, debugging, or tracing. See the section [Logging and Tracing](#logging-and-tracing) for details. Also, include the `data` object provided by Duda. This will assist in the initialization of the custom widget and its associated page when calling the various methods of Shazamme.JS.

When `shazamme.register()` is called, a wrapper for the custom widget is returned which includes support for:
* Messaging (pub / sub)
* Logging and tracing (both to the standard console or third-party loggers if supported)
* Default widget configuration (see [Default Widget Configurations] for details)

Use this reference for performing widget-specific tasks, such as subscribing to messages.
```js
function main(w) {
	// Here, w is our widget wrapper

	// Listen for messages from a known widget (message-from-other-widget).
	// The variable m contains the payload of the message.
	w.sub('message-from-other-widget', (m) => {
		console.log('got message!', m);
	});

	// Publish a message for other widgets to listen for.
	// Use a descriptive message name which will likely be unique.
	w.pub('my-test-message', {
		value: 'test',
	});

	// Write to the browser console, which will optionally also output to a supported third-partyy log
	// roller. Optionally, supply additional data to be included in the log output.
	w.log('widget loaded', {
		currentTime: new Date(),
	});
}
```

Besides the methods supported by the custom widget wrapper provided using `shazamme.register()`, Shazamme.JS supports a number of useful functions and features which can be accessed by referring to the library directly. Use the globally avaiable `shazamme` oject to access these methods. This works in custom widget code as well as while using the browser's console.

```js
// Output information about all registerd wiidgets on the current page to the browser's console.
shazamme.about();

// Output information about a single kown widget to the browser's console.
shazamme.about('my-custom-widget-name');

// Output the version of Shazamme.JS being used by the page to the browser's console.
shazamme.version();
```

## Why Shazamme.JS?

Shazamme.JS was written as a means to uniform the basic design and structure of custom widgets designed for the Shazamme company using Duda as a platform. It is also meant as a utility for streamlining some of the more common and repetitive activities which ocur when writing widget code, such as pulling or pushing data to discreet sources, working with collections, and handling user authentication. It also includes a handful of quality-of-life features not currently offered by Duda, such as pub/sub and state bag.

In short, Shazamme.JS is meant to simplify widget development while providing some standards around the widgets which are developed for Shazamme.

## Getting Started

To start, add the Shazamme.JS script to the page of the custom widget. This can be done safely in any number of Shazamme custom widgets because the library is smart enough to detect when a version of itself is already loaded. Shazamme.JS will not remove any prior instances of itself, and it will not create additional instances of itself using the same version.

Using JQuery, a reference to the Shazamme.JS script can be added using the following syntax:
```js
$.getScript(
    'https://sdk.shazamme.io/js/shazamme.min.js',
    function() {
        shazamme.ready(data.siteId, data.page).then( () => {
            main(shazamme.register('my-custom-widget-name', data));
        });
   }
);
```

This adds the appropriate script tag to the overall page, waits for Shazamme.JS to finish loading, and then registers the current widget using a descriptive name. The name used should have some bearing on the actual name of the custom widget. This helps to ensure that the widget can be easily identified during debugging and tracing. See [Debugging and Tracing] for details.

### Versioning

The Shazamme.JS library supports versioning. To reference a specific version of the library, add the
hyphenated major, minor, and patch numbers to the script path.
```js
$.getScript(
    'https://sdk.shazamme.io/js/shazamme-0.1.1.min.js',
    function() {
        shazamme.ready(data.siteId, data.page).then( () => {
            main(shazamme.register('my-custom-widget-name', data));
        });
   }
);
```

To access a method from a specific version of Shazamme.JS (as may be needed for compatability purposes), the version instance can be referenced using the format `window['shazamme-{version-number}'']`. It is recommended to hold this reference once the script is loaded before any interactions with Shazamme.JS are attempted. This includes calling the `register()` method.
```js
$.getScript(
    'https://sdk.shazamme.io/js/shazamme-0.1.1.min.js',
    function() {
		const shazamme = window['shazamme-0.1.1'];
		//Use this specific version from here on...

        shazamme.ready(data.siteId, data.page).then( () => {
            main(shazamme.register('my-custom-widget-name', data));
        });
   }
);
```

Leaving the version number off of the script will always retrieve the latest version of Shazamme.JS.

## The Widget Wrapper (Registering)
Once registered, the custom widget will be given a wrapper with some basic routines for interacting with Shazamme.JS. These routines will allow the widget to perform some basic functions such as:
* Subscribing to messages from other widgets and publishing messages to other widgets (pub / sub).
* Logging and tracing to the standard browser console as well as optionally to a third party log roller.
* Reading and writing to a state bag
* Reading and writing custom widget settings

Calling `shazamme.register()` returns a reference to this wrapper, which should be managed in an initiation routine (typically in `main()`).

```js
function main(w) {
	w.sub('message-from-other-widget', m => console.log('got message!', m));
}

$.getScript(
    'https://sdk.shazamme.io/js/shazamme.min.js',
    function() {
        shazamme.ready(data.siteId, data.page).then( () => {
            main(shazamme.register('application-form', data, true));
        })
    }
);
```

### Messaging (Pub / Sub)

Custom widgets can "talk" to one other by sending messages and optionally supplying data using pub / sub as facilitated by Shazamme.JS. In order to listen for messages, the message name must be known to the subscriber. Message names typically include the name of the widget submitting the message along with an action or routine.

```js
// Publish a message from the job search widget when a search has been performed.
w.pub('job-search-submit', {filters: f});
```

Messages published can be received by any number of listeners on the same page, as long as the listeners supply the correct name to listen for.
```js
// Subscribe to the same message from job search.
w.sub('job-search-submit', m => console.log('got filters:', m.filters));
```

Note that it is not required that a published message have a payload, though it is more common to provide one.
```js
w.pub('this-is-a-plain-message');
```

The messages a widget supports can be communicated to others by using the `supports()` method of the wrapper object and passing one or more message names which can be subscribed to. These can be provided as a single string, an array of strings, or as a simple object. Using the later provides the double benefit of defining the messages in a way which enhances reuse, which is the recommended method. This helps in preventing future typos and mass-edits of message names.

```js
const Message = {
	search: 'job-search-submit',
	clear: 'job-search-clear',
}

// ...

function main(w) {
	w.supports(Message);

// ...

	w.pub(Message.search, {filters: f});
}
```

Using the `supports()` method this way will supply the list of subscribable messages to the console output when `shazamme.about()` is called.

The `pub()` and `sub()` methods can also be called directly from the global `shazamme` instance, which also enables them to use from the browser's console. It should be noted, however, that subscribing to messages directly from `shazamme` does not offer protection from accidentally subscribing multiple times to the same message. Subscriptions made using the widget wrapper offer this protection intrinsically.

```js
shazamme.sub('job-search-submit', m => console.log('this was sub''ed to using the console', m));
shazamme.pub('hello-from-the-console');
```

To stop receiving a message, subscriptions can be halted using the `unsub()` method. When using the widget wrapper, pass the name of the message being unsubscribed from.
```js
w.unsub('job-search-submit');
```

When subscriptions are made using the global `shazamme` object, a handle to the subscription is returned. Messages can be unsubscribed from by supplying this handle to the `shazamme.unsub()` method.
```js
let h = shazamme.sub('job-search-clear', () => {
	// got the message, now unsubscribe ...
	shazamme.unsub(h);
});
```

### State Bag

Objects and simple variables can be saved to a state bag outside of the scope of a custom widget. Data saved this way can be retrieved at any time using the same instance of the widget; that is the same version and instance of the widget on the same page. This can be useful for preserving state between edits of the widget using Duda's widget editor for example.

```js
// Save staate to the state bag
w.bag('state', {
	showButtons: true,
});

// Perform some other actions ...
// ...

// Retrieve state from earlier
let showButtons = w.bag('state').showButtons;
```

To remove values from the state bag, pass `null` as the second argument to the `bag()` method.
```js
w.bag('state', null);
```

There is also a global state bag which allows values to be safelt exchanged between widgets. Use the global `shazamme` object to set or retrieve values meant to be shared between widgets.
```js
// Write a value to the global state bag
shazamme.bag('my-custom-widget-config-show-buttons', true);

// Read a value from the global state bag
let showButtons = shazamme.bag('my-custom-widget-config-show-buttons');
```

When using the global state bag, the name chosen for preserving state should be distinctive. Adding a reference to the custom widget is recommended. It is also a good idea to expose supported state bag names to other developers by using the `supports()` method of the wrapper object.

```js
w.supports('my-custom-widget-config-show-buttons');
```

The name chosen will then be surfaced whenever `shazamme.about()` is called using the browser console from whatever page the widget is on. As with exposing message names, it is recommended that state bag names be collected into an object which can also be used by the custom widget itself.

Adding a mention of "config" or "state" to the name of the state object also helps to add context to what is being supported.

```js
const State = {
	showButtons: 'my-custom-widget-config-show-buttons',
}

function main(w) {
	// ... Perform additional initialization

	w.supports(State);
	shazamme.bag(State.showButtons, true);
}
```

To retrieve a collection of all state values shared on the page, call the `shazamme.bag()` method with no parameters. This can be used from the browser console for some basic debug info.

```js
shazamme.bag();
```

### Custom Configuration

For custom widgets using a custom editor or need support for hybrid configurations, the wdiget wrapper includes methods for setting and retrieving custom configuration data. Confogurations are persisted per widget instnace per pagee, and are not shared between separate widgets or individual instances of the same widget. In order to share data between custom widgets or instances of a custom widget, refer to using the [State Bag].

The `config()` method of the widget wrapper can be used to either save or retrieve the custom configuration of the current widget. The method returns a `Promise`, whichh includes the configuration data when retrieving data.

```js
// Update the custom configuration for the widget
w.config({
	testing: true,
}).then( () console.log('updated configuration') );

// Read the custom configuration for the widget.
w.config().then( c => console.log('got configurtion', c) );
```

### Logging and Tracing {#logging-and-tracing}

The widget wrapper includes logging methods for writing output to the browser console. When outputting to the console using the wrapper, additional data about the widget is implicitly included, such as the widget's version and configuration.

```js
function main(w) {
	w.log('widget ready!')
}
```

There are several logging methods exposed to support the output of warning, error, and trace messages in addition to normal output.

```js
function main(w) {
	// Output a warning
	w.warn('This widget has been deprecated');

	// Output an error
	w.ex('The widget has crashed');

	w.trace('This widget''s main method has been called');
}
```

Each of the logging methods supports a parameter array as the second parameter. Anything provided after the first parameter will also be output to the console. Use this for supplying additional context to the log message supplied.

```js
w.log('This widget was ready at', new Date());
```

Log messages can optionally be supplied to third party services when supported. To enable external logging and tracing, pass `true` as the third parameter to the `shazamme.register()` method.

(At the time of writing, only [Loggly](https://loggly.com/) is supported as a third party logging service.)

```js
$.getScript(
    'https://sdk.shazamme.io/js/shazamme.min.js',
    function() {
        shazamme.ready(data.siteId, data.page).then( () => {
            main(shazamme.register('my-custom-widget-name', data, true));
        });
   }
);
```

## Authentication and Firebase

Shazamme.JS can be used to manage user state and authentication routines, and includes wrappers and handlers for [Firebase](https://firebase.google.com), which is Shazamme's default authentication platform. This includes support for:
* Account creation or sign up
* Password-based authentication
* OAuth authentication

To use these features, which are themselves wrappers for Firebase's `auth` library, create a reference to the wrapper by calling the `shazamme.firebase()` method.

```js
const fb = shazamme.firebase();

// Perform standard authentication routines...
```

Once a reference is created, the `create()` method can be used to sign up new members, and either the `auth()` or `oAuth()` methods can be used to authenticate existing members, with the latter method using an oAuth provider. (Note that is not necessary to create a member when using the `oAuth()` option. These members are created implicitly if they do not already exist).

Each method returns a `Promise` so the caller knows when the execution of the method is complete.

```js
const fb = shazamme.firebase();

// Register an account using an email and password
fb.create(userEmail, userPassword).then( u => {
	console.log('got user account', u);
});

// Authenticate an account using an email and password
fb.auth(userEmail, userPassword)
	.then(u => {
		console.log('user authenticated', u);
	}).catch( ex => {
		console.error('authentication failed', ex);
	});
```

```js
const fb = shazamme.firebase();

// Authenticate an account using oAuth
fb.auth(GoogleProvider)
	.then(u => {
		console.log('user authenticated', u);
	}).catch( ex => {
		console.error('authentication failed', ex);
	});
```

When using oAuth, supply one of Firebase's standard provider constants, such as `GoogleProvider` or `FacebookProvider`, which are made globally available.

Calling the `create()` or `auth()` methods of the Firebase wrapper will return the user ID of the account as it exists in Firebase if authentication is successful. This ID is supplied in the property `uid` of the output object.

Calling `oauth()` will return more details about the user, including email, name, and auth token of the user along with whether or not the account was just created in relation with the last call. These details can be used when adding the account record to Shazamme's data store.

```js
// An example registration following oAuth for a new user.
// See [Making API Calls] for more details on the calls made here.
const fb = shazamme.firebase();

fb.oauth(GoogleProvider).then( u => {
	if (u.isNew) {
		shazamme.submit({
			action: "Register Candidate",
			eMail: u.email,
			firstName: u.firstName,
			surname: u.lastName,
			firebaseUserID: u.uid,
		}).then( () => console.log('successfully registered user') );
	}
})
```

### Current User

Shazamme.JS automatically tracks the state of a user's authentication, and can provide the details of a user's account when needed. To get information on the current user (when available), use the `shazamme.user()` method. If the user is authenticated and is known by Shazamme, an object containing the details of the user's account will be returned. Otherwise, the method will return `undefined`.

This method, like the authemtication methods of the Firebase wrapper, returns a `Promise`.

```js
shazamme.user().then( u => {
	if (u) {
		console.log('user authenticated', u);
	} else {
		console.log('user not authenticated, or not known');
	}
})
```

#### User Reference

If the current user is known, `shazamme.user()` will return an object containing:

| property  			| type     		| description
|:----------------------|:--------------|:--------------------------
| id             		| `string`		| The Shazamme ID of the user
| firebaseUserID 		| `string`		| The Firebase ID of the user (if available)
| email          		| `string`		| The email address of the user
| firstName      		| `string`		| The first name of the user
| lastName       		| `string`		| The last name of the user
| siteID         		| `string`		| The Shazamme ID of the site the user belongs to
| isOAuth        		| `Boolean`		| `true` if the user was authenticated using OAuth during the active session. Otherwise, `false`.
| isNew          		| `Boolean`		| `true` if the user was authenticated using OAuth and has no account with Shazamme. Otherwise, `false`.
| isVerified     		| `Boolean`		| `true` if the user has a Firbebase ID. Otherwise, `false`.
| is             		| `[]string`	| An array of `string` containing a list of roles the user belongs to, which can be none or more of the following:
|						|				| * advertiser
|						|				| * client-portal-client-admin
|						|				| * client-portal
|						|				| * candidate
|						|				| * client-portal-super-admin
|						|				| * client-portal-client-recruiter
| clients        		| `[]string`	| An array of `string` containing one or more Shazamme client ID's the user is subscribed to.
| candidate (optional)	| `Object`		| Contains properties about the user as a candidate if the user belongs to the `candidate` role.

## Making API Calls

Shazamme.JS contains methods to standardized the more common calls made to access collections exposed by Duda, and the calls used to submit information to Shazamme's backend. The `shazamme.fetch()` method can be used to retrieve data either from a Duda collection or directly from the Shazamme backend based on the parameters used. Submitting data to Shazamme can be done using the `shazamme.submit()` method. This typically includes actions such as submitting applications or registering candidates, but can in some instances be also used for retrieving data from Shazamme's backend. The `shazamme.fetch()` and `shazamme.submit()` methods each return a `Promise` containing any response data for successful requests.

The `shazamme.fetch()` and `shazamme.submit()` methods are aware of the publication state of the site the custom widget is deployed to, and will use either sandbox or live endpoints based on whether or not the site is live.

### Fetching Data

The `shazamme.fetch()` method accepts an object which includes the name of the Duda collection (as defined) by the Duda site), and optionally a Boolean for whether or not the collection should be cached by Shazamme.JS. Caching is designed to make subsequent calls to the colleciton faster. Caching only affects requests made by the originating custom widget. A fallback action can optionally be provided in order to request collection data directly from the Shazamme backend in the event the Duda collection is not available. Note that the `shazamme.fetch()` method is a wrapper for Duda's `dmAPI.getCollection()` method. The method returns a `Promise` containing an array of available records.

```js
shazamme.fetch({
    name: 'Jobs', // the name of the collection as defined by the site
    action: 'Get Jobs', // the fallback action name for retrieving the same data from the backend
    useCache: true, // cache this information for the current custom widget
}).then( c => {
	// read the information from the fetched collection ...
	c.forEach( i => console.log('got item', i) );
})
```

For the purposes of debugging and testing, two additional properties can be submitted to the `shazamme.fetch()` method which will override both the `name` and `action` properties to pull data directly from Shazamme's backend. This is intded to streamline the development of custom widgets, and should not be used in a production setting.

```js
shazamme.fetch({
    name: 'Jobs', // the name of the collection as defined by the site
    action: 'Get Jobs', // the fallback action name for retrieving the same data from the backend
    useCache: true, // cache this information for the current custom widget
    debug: true, // Override normal behavior, and use the defined endpoint
    endpoint: 'https://shazamme.io/Job-Listing/src/php/actions?dudaSiteID=f4acdc09&action=Get%20Jobs',
}).then( c => {
	// read the information from the fetched collection ...
	c.forEach( i => console.log('got item', i) );
})
```

### Submitting Data

The `shazamme.submit()` method is used to send data directly to Shazamme's backend. It accepts the standard payload that would be submitted in a **POST** to Shazamme's standard API's. The method returns a `Promise` containing the response from the backend.

```js
shazamme.submit({
    action: "Save Job",
    candidateID: candidateID,
    jobID: jobID,
    isFavorite: true,
}).then( r => console.log('got response', r) );
```

The `shazamme.submit()` method uses the */regional* API endpoints by default. To disable this behavior, pass `false` as the second parameter.

```js
shazamme.submit({
    action: "Save Job",
    candidateID: candidateID,
    jobID: jobID,
    isFavorite: true,
    isSaved: false,
    isAcknowledged: null,
}, false)
.then( r => console.log('got non-regional response', r) );
```

### Fetch the Current Site

The `shazamme.site()` method returns information about the site the custom widget is currently deployed to. This includes Shazamme's site ID (`siteID`), the name of the site owner (`businessName`), and the publication status of the site (`isLive`). Calls to `shazamme.site()` are cached per page, so multiple custom widgets can call the method without an increase in round trips to the Shazamme backend. The method returns a `Promise` containing the site's information.

```js
shazamme.site().then( s => console.log('got site ID', s.siteID) );
```

## Shazamme.JSON

Shazamme.JS supports loading default configurations and settings at a universal, site, or page level for any Shazamme site. When Shazamme.JS is loaded, universal level configurations are pulled in by default. For each widget that is then registered (see [Getting Started]), Shazamme will then search for configurations for the current site and then the current page in that order. These calls are made once per page following the first widget's registration. Configurations are designed to prioritize the most specific layer discovered, such that the configuration for a given widget discovered for an indidivual page will sublant the same widget's configuration discovered universally.

*Default Configuration Prioirity*
`universe < site < page`

Shazamme.JSON files are served by paths using the following format:

```
 /site/shazamme.json -- universal configuration (top-level)
 /site/{duda-site-id}/shazamme.json -- site-level configuration
 /site/{duda-site-id}/{page-name}/shazamme.json -- page-level configuration
```

Shazamme.JS intrisically understands this heirarchy, and will attempt to discover a Shazamme.JSON file at each level the first time it is referenced by a page, and the first time a widget is registered. A widget's default configuration can then be accessed using the `defaults()` method of the widget wrapper returned from the `register()` call. (See [The Widget Wrapper (Registering)] for details). If the widget contains a configuration at any of the three levels described before, it will be returned in the promise.

```js
function main(w) {
	// w contains the widget wrapper created using shazamme.register()
	w.defaults().then( c => {
		// apply any default configuration found to the widget's native configuration
		// here, the native configuration is given preference
		// to prefer the default configuration, the placement of "c" and "data.config" should be altered
		data.config = {
			...c,
			...data.config,
		}
	});
}
```

Shazamme.JSON files have three principle sections:

| section   | description
|:----------|:-----------
| config 	| Default widget configurations
| trace		| Log tracing that can be used to detect specific configurations of widgets based on their native configuration
| run 		| Scripts that can be executed based on the presence of a widget or a widget's native configuration

Each section takes the unique identifier of the widget as supplied to `shazamme.register()` to determine the action to be taken.

```json
{
	"config": {
		"my-custom-widget": {
			"welcomeMessage": "This is my default welcome message" // Define a default propoerty for a custom widget
		}
	},

	"trace": {
		"my-custom-widget": {
			"warn": [
				{
					"myDepractedProperty": true // Send a warning message to the console and optionally to a log roller when the property myDepractedProperty is set to true in Duda
				}
			],
			"error": [
				{
					"myImportantProperty": null // Send an error message to the console and optionally to a log roller when the property myImportantProperty is not set
				}
			]
		}
	},

	"run": {
		"my-custom-widget": [
			"console.log('my-custom-widget is on the page!');" // When the widget "my-custom-widget" is rendered to a page, send a message to the console.
		]
	}
}
```
Each section of a Shazamme.JSON file can contain any number of uniquely identifiable widgets. Shazamme.JSON files can also be placed at any level of a site (as discussed above), and lower levels will supercede any level which came before.

## Migrating Widgets to Shazamme.JS

Converting a Shazamme widget into a Shazamme.JS consumer can be completed in just a few steps at its most basic.

1) Reference Shazamme.JS by adding the script to the current page. This can be safely done using JQuery.

1) Replace any calls to Shazamme's backend using traditional AJAX calls with calls to `shazamme.submit()`. This will ensure that an enviornment appropritate for the active site is used for each call.

1) Replace any references to the active user with calls to `shazamme.user()`. Shazamme.JS handles any active sessions and provides the details of the current user whenever available. If it is necessary for the widget to be aware of a change in the user's session (typically due to a user either signing in or signing out), the widget may also subscribe to the `site-auth` message. This message will provide the same information provided by `shazamme.user( ` when a user is authenticated. Do not rely on the browser's session or storage state when referencing user information. Shazamme.JS will always provide the most accurate data about the user's session.

**Add a reference to the latest version of Shazamme.JS**
```js
$.getScript(
    'https://sdk.shazamme.io/js/shazamme.min.js',

    function() {
        shazamme.ready(data.siteId, data.page).then();
    }
);
```

**A typical AJAX call in a traditional widget**
```js
let request = {
	action: "Apply Job"
	siteID: "537d7bc9-ebdb-40d8-af94-3ed2c83829be",
	candidateID: "7288f4ad-10a8-4d3f-a859-f7cb3033a886",
}

$.ajax({
    url: actionURL,
    method: "POST",
    data: JSON.stringify(request)
}).then( response => {
	// do something with the response ...
})
```

**After integrating Shazamme.JS**
```js
	let request = {
		action: "Apply Job"
		siteID: "537d7bc9-ebdb-40d8-af94-3ed2c83829be",
		candidateID: "7288f4ad-10a8-4d3f-a859-f7cb3033a886",
	}

	shazamme.submit(request).then( r => {
		// do something with the response ...
	});
```

For fetching information about the current site, such as its ID or domain information, Shazamme.JS provides a  site()` method which returns a promise which can be chained. Promise chaining is the recommended pattern for working with properties of a site intended to be used in a requests to the backend. This can be done any number of times on the same page without incurring the cost of a round trip.

The site ID in the previous example could be retrieved and then applied to the final request using a pattern such as this one. The site ID should never be stored or retrieved using the browser's session or storage state. Instead, rely on Shazamme.JS to provide the site's information to the widget.

**Including site information using promise chaining**
```js
shazamme
	.site()
	.then( s => shazamme.submit({
		action: "Apply Job"
		siteID: s.siteID,
		candidateID: "7288f4ad-10a8-4d3f-a859-f7cb3033a886",
	}))
	.then( r => {
		// do something with the response ...
	});
```

**Accessing the currently authenticated user**
*See [User Reference] for details on the user object returned*
```js
shazamme.user().then( u => {
	// do something useful with the user's information ...
});
```

**Subscribing to the authentication message**
```js
//subscribe using the static method shazamme.sub()
let onAuth = shazamme.sub('site-auth', u => {
	if (u) {
		// user is authenticated (signed in)
	} else {
		// user is not authenticated (signed out)
	}
});

//unsubsubscribe from the message
shazamme.unsub(onAuth);

//subscribe using a widget wrapper as created using shazamme.register()
//the wrapper handles subscriptions in a way that ensures that the same instance of a widget can not subscribe to a given message more than once
function main(w) {
	w.sub('site-auth', u => {
		if (u) {
			// user is authenticated (signed in)
		} else {
			// user is not authenticated (signed out)
		}
	});

	//unsubsubscribe from the message
	w.unsub('site-auth');
}
```

Messages published by Shazamme.JS are also added to the state bag when the library is loaded. Subscriptions to the `site-auth` message can be made using:
```js
shazamme.sub(shazamme.bag('shazamme').message.siteAuth, u => {
	// check for user state ...
});
```

