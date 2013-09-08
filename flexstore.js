/* 
 * A Javascript library to transparently handle different types of local storage and
 *  remote synchronization.
 */

function FlexStore(parameters){
	var storeObject = null;
	this.store = null;
	if(typeof parameters != "object"){
		throw (new FlexStoreParameterError("Must pass an object hash as the argument."));
	}
	if(parameters['storeName'] == null){
		throw (new FlexStoreParameterError("Required parameter 'storeName' missing."));
	}
	if(parameters['storeName'] == ''){
		throw (new FlexStoreParameterError("'storeName' cannot be an empty string."));
	}
	// Find the appropriate store, given the capabilities of the browser
	// and the user preferences of the parameters object.
	if(typeof parameters['storeSelector'] == "function"){
		this.storeSelector = parameters['storeSelector'];
	} else {
		this.storeSelector = function() {
			if(window.globalStorage){// the order is important
				return 'dom';
			} else if(userDataAvailable()){
				return 'userdata';
			} else if(cookiesEnabled()){
				return 'cookie';
			} else if(hasAJAXStore(parameters)){
				return 'ajaxonly';
			}
			return '';
		}
	}
	switch(this.storeSelector()){
	case 'dom':
		storeObject = new FlexStoreDOMStore(parameters);
     	break;
	case 'cookie':
		storeObject = new FlexStoreCookieStore(parameters);
     	break;
	case 'userdata':
		storeObject = new FlexStoreUserDataStore(parameters);
     	break;
	case 'ajaxonly':
		storeObject = new FlexStoreAJAXOnlyStore(parameters);
     	break;
	}
	if(storeObject == null) {
		throw (new FlexStoreRuntimeError("No store available."));
	}
	this.store = storeObject;
}

// Create a specific type of store object
/* 
FlexStore.prototype.createStore = function(parameters){

}
*/

// Remove the current store object

FlexStore.prototype.destroy = function(){
    this.store.destroy();
	this.store = undefined;
}


// Returns the value given a key

FlexStore.prototype.getItem = function(key) {
    return this.store.get(key);
}

// Sets the value to the key given in the store
FlexStore.prototype.setItem = function(key, value) {
    return this.store.put(key, value);
}

// Removes a key/value pair from the store.
FlexStore.prototype.removeItem = function(key) {
	return this.store.remove(key);
}

FlexStore.prototype.getKeys = function() {
	return this.store.keys();
}

FlexStore.prototype.getValues = function(){
	return this.store.values();
}

function FlexStoreDOMStore(parameters){
 	var dom_store_domain = parameters['storeDomain']; 
 	//throw an exception if domain is not passed in. 
 	if(parameters['storeDomain'] == null){ 
 		throw (new FlexStoreParameterError("Required parameter 'storeDomain' missing for DOM Store."));
 	} 
 	var dom_store_name = parameters['storeName']; 
 	this._store = window.globalStorage[dom_store_domain]; 
	var store_val = this._store[dom_store_name];
 	if(store_val != null){
		if(unescape(store_val).search(/&|=/) > 0){
			this._store[dom_store_name] = store_val;
		} else {
			if(parameters['clobberBadStore'] == true){
				this._store[dom_store_name] = '';
			} else {
				throw("Previous DOM Storage entry had a Non-FlexStore value");
			}
		}
	} else {
		this._store[dom_store_name] = '';
	}
	this.put = function(key, value){
		var domStoreString = this._store[dom_store_name];
		var domStoreHash = escaped_string_to_hash(domStoreString);
		domStoreHash[key] = value;
		domStoreString = hash_to_escaped_string(domStoreHash);
		this._store[dom_store_name] = domStoreString;
	}
	this.get = function(key){
		var domStoreString = this._store[dom_store_name];
		var domStoreHash = escaped_string_to_hash(domStoreString);
		var value = domStoreHash[key];
		return value;		
	}
	this.remove = function(key){
		var domStoreString = this._store[dom_store_name];
		var domStoreHash = escaped_string_to_hash(domStoreString);
		var newDOMStoreHash = new Object();
		var count = 0;
		for(var i in domStoreHash){
			if(i == key){
			} else {
				newDOMStoreHash[i] = domStoreHash[i];
				count++;
			}
		}
		domStoreString = hash_to_escaped_string(newDOMStoreHash);
		this._store[dom_store_name] = domStoreString;
	}
	this.destroy = function(){
		// It needs both of these, for some reason:
		this._store[dom_store_name] = undefined;
		this._store.removeItem(dom_store_name);
	}
	this.keys = function(){
 		var domStoreString = this._store[dom_store_name];
 		var domStoreHash = escaped_string_to_hash(domStoreString);
 		var keys = new Array();
 		for(var i in domStoreHash){
 			keys.push(i);
 		}
 		return keys;
	}
	this.values = function(){
 		var domStoreString = this._store[dom_store_name];
 		var domStoreHash = escaped_string_to_hash(domStoreString);
 		var values = new Array();
 		for(var i in domStoreHash){
 			values.push(domStoreHash[i]);
 		}
 		return values;
 	}
}

/** Example JSDoc comment */
function FlexStoreCookieStore(parameters){
	// get the cookie store name
	// create the cookie
	var cookie_store_name = parameters['storeName'];
	// Should verify that the old cookie has the proper format though:
	// Not just verify it's existance
	var cookie_val = readCookie(cookie_store_name);
	if(cookie_val != null){
		if(unescape(cookie_val).search(/&|=/) > 0){
			createCookie(cookie_store_name, cookie_val, 7);
		} else {
			if(parameters['clobberBadStore'] == true){
				createCookie(cookie_store_name, '', 7);
			} else {
				throw (new FlexStoreRuntimeError("Previous cookie had a non-FlexStore value"));
			}
		}
	} else {
		createCookie(cookie_store_name, '', 7);
	}
	this.put = function(key, value){
		var cookieStoreString = readCookie(cookie_store_name);
		var cookieStoreHash = escaped_string_to_hash(cookieStoreString);
		cookieStoreHash[key] = value;
		cookieStoreString = hash_to_escaped_string(cookieStoreHash);
		createCookie(cookie_store_name, cookieStoreString, 7);
	}
	this.get = function(key){
		var cookieStoreString = readCookie(cookie_store_name);
		var cookieStoreHash = escaped_string_to_hash(cookieStoreString);
		var value = cookieStoreHash[key];
		return value;
	}
	this.remove = function(key){
		var cookieStoreString = readCookie(cookie_store_name);
		var cookieStoreHash = escaped_string_to_hash(cookieStoreString);
		var newCookieStoreHash = new Object();
		var count = 0;
		for(var i in cookieStoreHash){
			if(i == key){
			} else {
				newCookieStoreHash[i] = cookieStoreHash[i];
				count++;
			}
		}
		cookieStoreString = hash_to_escaped_string(newCookieStoreHash);
		createCookie(cookie_store_name, cookieStoreString, 7);
	}
	this.destroy = function(){
		eraseCookie(cookie_store_name);
	}
	this.keys = function(){
		var cookieStoreString = readCookie(cookie_store_name);
		var cookieStoreHash = escaped_string_to_hash(cookieStoreString);
		var keys = new Array();
		for(var i in cookieStoreHash){
			keys.push(i);
		}
		return keys;
	}
	this.values = function(){
		var cookieStoreString = readCookie(cookie_store_name);
		var cookieStoreHash = escaped_string_to_hash(cookieStoreString);
		var values = new Array();
		for(var i in cookieStoreHash){
			values.push(cookieStoreHash[i]);
		}
		return values;
	}
}

function escaped_string_to_hash(string){
	var my_string = new String(unescape(string));
	var hash = new Object();
	if(my_string != ''){
		var pairs_array = my_string.split('&');
		for(i in pairs_array){
			var item = pairs_array[i] || '';
			if(typeof(item) == 'string'){
				var something_ar = item.split('=');
				var key = unescape(something_ar[0]);
				var value = unescape(something_ar[1]);
				hash[key] = value
		   	}
		}
	}
	return hash;
}

function hash_to_escaped_string(hash){
	var pairs_array = new Array();
	for(key in hash){
		if((key != null) && (key != '')){
			pairs_array.push(escape(key) + '=' + escape(hash[key]));
		}
	}
	var string = pairs_array.join('&');
	return new String(escape(string));
}

function FlexStoreUserDataStore(parameters){}
function FlexStoreAJAXOnlyStore(parameters){}

function FlexStoreParameterError(message){
	this.type = 'FlexStoreParameterError';
	this.message = message;
}

function FlexStoreRuntimeError(message){
	this.type = 'FlexStoreRuntimeError';
	this.message = message;
}

function cookiesEnabled(){
	var tmpcookie = new Date();
	var cookies_enabled = false;
	var cookie_name = 'cookiecheckcheck';
	createCookie(cookie_name, 'checkone', 1);
    var cookie_value = readCookie(cookie_name);
	if(cookie_value == 'checkone'){
		cookies_enabled = true;
        eraseCookie(cookie_name);
	} else {
		cookies_enabled = false;
	}
	return cookies_enabled;
}

function userDataAvailable(){
	var userData_enabled = false;
	if(document.all && window.ActiveXObject){
		userData_enabled = true;
	}
	return userData_enabled;
}

function hasAJAXStore(parameters){
	var hasAJAXStore = false;
	if((parameters['AJAXStoreURL'] != null) && (parameters['AJAXStoreURL'] != '')){
		if((parameters['AJAXGetURL'] != null) && (parameters['AJAXGetURL'] != '')){
			if((parameters['AJAXRemoveURL'] != null) && (parameters['AJAXRemoveURL'] != '')){
				hasAJAXStore = true;
			}
		}
	}
	return hasAJAXStore;
}

// stolen from http://www.quirksmode.org/js/cookies.html
function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}
