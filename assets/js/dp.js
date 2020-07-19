/**
 * DomPlus class
 * 
 * @version 0.0.1
 * @author  kodelicious
 */
class DP {
    constructor() {
        // private
        this._queriedParent = null;
        this._queriedData = null;
        this._newData = null;
        this._queriedSelector = null;
        
        // public
        this.collections = {};
        this.models = {};
        this.watchers = [];

        // run scripts
        this._init();
    }
    
    /**
     * Initialize DomPlus and make it globally available
     * 
     * @return void
     */
    _init() {
        window.dp = this;

        // after setting the global dp object, run the script after the dom is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this._collectData();
            this._observeCollectedData();
        });
    }

    /**
     * Get parent by selector (recursively up the tree)
     * 
     * @param  HTMLElement element
     * @param  string selector
     * @return HTMLElement|null
     */
    _parent(element, selector) {
        if (!Element.prototype.matches) {
            Element.prototype.matches =
            Element.prototype.matchesSelector ||
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector ||
            Element.prototype.oMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function(s) {
                var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                    i = matches.length;
                while (--i >= 0 && matches.item(i) !== this) {}
                return i > -1;
            };
        }
    
        // get closest match
        for (; element && element !== document; element = element.parentNode) {
            if (element.matches(selector)) {
                return element;
            }
        }
    
        return;
    }

    /**
     * Reset private queried data
     * 
     * @return void
     */
    _resetQueriedData() {
        this._queriedParent = null;
        this._queriedData = null;
        this._queriedSelector = null;
    }

    /**
     * Reset private new data
     * 
     * @return void
     */
    _resetNewData() {
        this._newData = null;
    }

    /**
     * Get the template of the collection
     * 
     * @param  HTMLElement collection
     * @return Array
     */
    _template(collection) {
        const children = collection.children;
        if (children.length) {
            let template = null;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                // always set the first child as the template
                if (i == 0) {
                    template = [child];
                }
                // when it is indeed a template return it
                if (child.nodeName === 'TEMPLATE') {
                    return child.content.children;
                }
            }
            return template;
        }

        return;
    }

    /**
     * Collect all of the data for every mutation
     * 
     * @return void
     */
    _collectData() {
        const models = document.querySelectorAll('[dp-model],[data-dp-model]');
        if (models.length) {
            for (let i = 0; i < models.length; i++) {
                let oldData = {};
                let collectionRef = null;

                const model = models[i];
                const modelRef = model.getAttribute('dp-model');
                const modelWatcher = model.getAttribute('dp-watcher');
                this._replaceDataAttribute(model, 'model');

                const collection = this._parent(model, '[dp-collection],[data-dp-collection]');
                if (collection) {
                    this._replaceDataAttribute(collection, 'collection');

                    collectionRef = collection.getAttribute('dp-collection');
                    if (collectionRef) {
                        if (!this.collections[collectionRef]) {
                            const template = this._template(collection);
                            this.collections[collectionRef] = {
                                _elements: [collection],
                                _template: template
                            };
                        } else {
                            // add element to the data _elements property
                            if (!this.collections[collectionRef]._elements.includes(collection)) {
                                this.collections[collectionRef]._elements.push(collection);
                            }

                            if (this.collections[collectionRef][modelRef]) {
                                oldData = this.collections[collectionRef][modelRef];
                            }
                        }
                    }
                } else {
                    if (modelRef) {
                        if (!this.models[modelRef]) {
                            this.models[modelRef] = {};
                        } else {
                            oldData = this.models[modelRef];
                        }
                    }
                }

                // add all properties to the model
                const newData = this._collectPropertyData(model);

                // merge old and new data
                let data = {...oldData, ...newData};
                
                // add element to the data _elements property
                if (!data._elements) {
                    data._elements = [];
                }
                data._elements.push(model);

                if (!data._watcher) {
                    data._watcher = modelWatcher;
                }

                // set new data
                if (collection) {
                    this.collections[collectionRef][modelRef] = data;
                } else {
                    this.models[modelRef] = data;
                }
            }
        }
    }

    /**
     * Collect property data and build model object
     * 
     * @param  HTMLElement rootElement
     * @return Object data
     */
    _collectPropertyData(rootElement) {
        const data = {};
        const subject = 'property';
        const dataSelector = `data-dp-${subject}`;
        const elements = rootElement.querySelectorAll(`[dp-${subject}],[${dataSelector}]`);
        
        if (elements.length) {
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                this._replaceDataAttribute(element, subject);

                const reference = element.getAttribute(`dp-${subject}`);
                data[reference] = element.innerText || element.value;
            }
        }

        return data;
    }

    /**
     * Replace data-attribute from passed element for dp-attribute
     * Because in the end we want to query on one specific selector
     * 
     * @param  HTMLElement element
     * @param  string subject
     * @return void
     */
    _replaceDataAttribute(element, subject) {
        const dataSelector = `data-dp-${subject}`;
        const dataAttribute = element.getAttribute(dataSelector);

        if (dataAttribute) {
            element.setAttribute(`dp-${subject}`, dataAttribute);
            element.removeAttribute(dataSelector);
        }
    }

    /**
     * Observe collected data
     * 
     * @return void
     */
    _observeCollectedData() {
        const collectionRefs = Object.keys(this.collections);
        if (collectionRefs.length) {
            for (let i = 0; i < collectionRefs.length; i++) {
                const collectionRef = collectionRefs[i];

                // observe model data in collection
                this._observeModelData(this.collections[collectionRef]);
                
                // observe collection data
                this.collections[collectionRef] = this._observeData(this.collections[collectionRef], this._observeCollectionDataHandler());
            }

            // this.collections = this._observeData(this.collections, this._observeCollectionsDataHandler());
        }
        
        // observe model data in root
        this._observeModelData(this.models);
        // this.models = this._observeData(this.models, this._observeModelDataHandler());
    }

    /**
     * Observe collected model data
     * 
     * @param  Object root
     * @return void
     */
    _observeModelData(root) {
        const refs = Object.keys(root);
        if (refs.length) {
            for (let i = 0; i < refs.length; i++) {
                const ref = refs[i];
                if (ref.substring(1, 0) !== '_') {
                    root[ref] = this._observeData(root[ref], this._observeModelDataHandler());
                }
            }
        }
    }

    /**
     * Observe the passed data object
     * 
     * @param  Object data
     * @param  Object handler
     * @return Proxy
     */
    _observeData(data, handler) {
        return new Proxy(data, handler);
    }

    /**
     * Get the handler for the collections data observer
     * 
     * @return Object
     */
    _observeCollectionsDataHandler() {
        return {
            set(target, key, value) {
                console.log('Setting collections data', target);
                return true;
            },

            deleteProperty(target, key) {
                const elements = target[key]._elements;
                if (elements) {
                    for (let i = 0; i < elements.length; i++) {
                        const element = elements[i];
                        element.parentNode.removeChild(element);
                    }
                }

                // reset queried data
                this._resetQueriedData();

                return delete target[key];
            }
        };
    }

    /**
     * Get the handler for the collection data observer
     * 
     * @return Object
     */
    _observeCollectionDataHandler() {
        const that = this;

        return {
            set(target, key, data) {
                const templateElements = target._template;
                const properties = Object.keys(data);

                if (templateElements.length) {
                    const injectElements = target._elements;

                    if (injectElements.length) {
                        for (let a = 0; a < injectElements.length; a++) {
                            const injectElement = injectElements[a];

                            for (let b = 0; b < templateElements.length; b++) {
                                const templateElement = templateElements[b];
                                const clonedElement = templateElement.cloneNode(true);
                                clonedElement.setAttribute('dp-model', key);
                                if (!data._elements) {
                                    data._elements = [];
                                }
                                data._elements.push(clonedElement);
                                
                                // fill content
                                for (let c = 0; c < properties.length; c++) {
                                    const property = properties[c];
                                    const val = data[property];
                                    const propertyElement = clonedElement.querySelector(`[dp-property="${property}"]`);
                                    if (propertyElement) {
                                        propertyElement.innerText = val;
                                    }
                                }

                                // replace placeholders
                                clonedElement.innerHTML = clonedElement.innerHTML.replace('${reference}', key);

                                // inject in document
                                injectElement.appendChild(clonedElement);
                            }
                        }
                    }
                }

                target[key] = that._observeData(data, that._observeModelDataHandler());
                return true;
            },

            deleteProperty(target, key) {
                const elements = target[key]._elements;
                if (elements) {
                    for (let i = 0; i < elements.length; i++) {
                        const element = elements[i];
                        element.parentNode.removeChild(element);
                    }
                }

                // reset queried data
                that._resetQueriedData();

                return delete target[key];
            }
        };
    }

    /**
     * Get the handler for the model data observer
     * 
     * @return Object
     */
    _observeModelDataHandler() {
        const that = this;

        return {
            set(target, key, value) {
                // here we exclude private properties, started with "_"
                if (key.substring(1, 0) !== '_') {
                    const elements = target._elements;
                    if (elements) {
                        if (that.watchers[target._watcher] && that.watchers[target._watcher][key]) {
                            value = that.watchers[target._watcher][key](value, that._queriedData, that._newData);
                        }

                        target[key] = value;

                        for (let i = 0; i < elements.length; i++) {
                            const element = elements[i];
                            const property = element.querySelector(`[dp-property="${key}"]`);
                            if (property) {
                                property.innerText = value;
                            }
                        }
                    }
                }

                // reset queried data
                // that._resetQueriedData();

                return true;
            },

            deleteProperty(target, key) {
                return true;
            }
        };
    }

    /**
     * Find collection
     * 
     * @param  string selector 
     * @return Object|null model 
     */
    collection(selector) {
        if (selector) {
            if (this.collections[selector]) {
                this._queriedParent = this.collections;
                this._queriedData = this.collections[selector];
                this._queriedSelector = selector;
                return this;
            }
        }

        console.warn(`We couldn't find collection: ${selector}`);
        return;
    }

    /**
     * Find model based on dot-separated string
     * 
     * @param  string selector 
     * @return Object|null model 
     */
    model(selector) {
        if (selector) {
            const parts = selector.split('.');
            const totalParts = parts.length;
            if (totalParts < 3) {
                // model might be in a collection
                if (totalParts === 2) {
                    const collection = this.collections[parts[0]];
                    if (collection && collection[parts[1]]) {
                        this._queriedParent = collection;
                        this._queriedData = collection[parts[1]];
                        this._queriedSelector = parts[1];
                        return this;
                    }
                }
                // model lives in the root
                else {
                    if (this.models[parts[0]]) {
                        this._queriedParent = this.models;
                        this._queriedData = this.models[parts[0]];
                        this._queriedSelector = parts[1];
                        return this;
                    }
                }
            }
        }

        console.warn(`We couldn't find model: ${selector}`);
        return;
    }

    /**
     * Insert a model (in a collection)
     * 
     * @param  string reference
     * @param  Object data
     * @return void 
     */
    insert(reference, data) {
        if (reference && this._queriedData && !this._queriedData[reference] && typeof data === 'object' && Object.keys(data).length) {
            this._queriedData[reference] = data;
        }
    }

    /**
     * Update a model (in a collection)
     * 
     * @param  string selector 
     * @param  Object|string keyOrData
     * @param  string|null value
     * @return void
     */
    update(keyOrData, value = null) {
        if (this._queriedData) {
            if (typeof keyOrData === 'object') {
                const totalKeys = Object.keys(keyOrData).length;
                if (totalKeys) {
                    // we set new data, so you can use it in your watchers
                    this._newData = Object.assign(Object.assign({}, this._queriedData), keyOrData);
                    
                    for (let i = 0; i < totalKeys; i++) {
                        const key = Object.keys(keyOrData)[i];
                        this._queriedData[key] = keyOrData[key];
                    }

                    // reset new data because we don't need it anymore
                    this._resetNewData();
                }
            } else if (typeof keyOrData === 'string') {
                if (this._queriedData[keyOrData]) {
                    this._queriedData[keyOrData] = value;
                }
            }

            // reset queried data
            this._resetQueriedData();
        }
    }

    /**
     * Delete a model (in a collection)
     * 
     * @param  string selector 
     * @return void 
     */
    delete() {
        if (this._queriedParent && this._queriedSelector) {
            delete this._queriedParent[this._queriedSelector];
        }
    }

    /**
	 * Call a native AJAX request.
     * 
     * @param  object options
     * @return void
	 */
	request(options = {})
	{
        const method = options.method ? options.method.toUpperCase() : 'GET';
        const url = options.url;
        const contentType = options.contentType || 'json';
        const dispatcher = options.dispatcher;
        const callback = options.callback;

		if (url) {
			// set a loader class on the dispatcher when passed
			if (dispatcher) {
				dispatcher.classList.add('is-loading');
			}

			const xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.withCredentials = true;
			xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

			if (method == 'GET') {
				switch (contentType) {
					case 'json':
						xhr.setRequestHeader('Content-Type', 'application/json');
					break;

					case 'html':
						xhr.setRequestHeader('Content-Type', 'text/html');
					break;
				}
			}

			// add extra heeader for POST requests
			else if (method == 'POST') {
				// search for csrf token (for laravel applications)
				const $token = document.querySelector('meta[name="csrf-token"]');

				if ($token) {
					xhr.setRequestHeader('X-CSRF-TOKEN', $token.getAttribute('content'));
				}
			}

			xhr.onload = () => {
				// set a loader class on the dispatcher when passed
				if (dispatcher) {
                    dispatcher.classList.remove('is-loading');
                }

				if (callback) {
                    let response;
                    const responseOptions = {
                        dispatcher: dispatcher
                    };

					switch (contentType) {
						case 'json':
							response = JSON.parse(xhr.responseText);
						break;

						case 'html':
							response = xhr.responseText;
						break;
					}

					callback(response, responseOptions);
				}
			};

			xhr.send(this.data);
		} else {
            console.warning('You have to set an URL to make a "'+method+'" request.');
        }
	}

    /**
     * A "GET" request helper
     * 
     * @param  string url 
     * @param  object options 
     * @return void 
     */
    get(url, options = {}) {
		this.request({
            url: url,
            method: 'GET',
            contentType: options.contentType,
            callback: options.callback,
            dispatcher: options.dispatcher
        });
    }

    /**
     * A "POST" request helper
     * 
     * @param  string url 
     * @param  object options 
     * @return void 
     */
    post(url, options = {}) {
		this.request({
            url: url,
            method: 'POST',
            contentType: options.callback,
            callback: options.callback,
            dispatcher: options.dispatcher
        });
    }
}

// always run DomPlus
new DP;