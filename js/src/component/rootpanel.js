/**
 * A root panel can hold components. The root panel must be initialized with
 * a DOM element as container.
 * @param {Object} [options]    Available parameters:
 *                              {HTMLElement} container
 *                              {String} [id]
 *                              {String | function} [className]
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {String | Number | function} [height]
 *                              {Boolean | function} [autoResize]
 * @constructor RootPanel
 * @extends Panel
 */
function RootPanel(options) {
    this.id = util.randomUUID();
    this.options = {
        autoResize: true
    };

    this.listeners = {}; // event listeners

    this.setOptions(options);
}

RootPanel.prototype = new Panel();

// TODO: comment
RootPanel.prototype.setOptions = function (options) {
    if ('autoResize' in options) {
        if (util.option.asBoolean(options.autoResize)) {
            this._watch();
        }
        else {
            this._unwatch();
        }
    }

    Component.prototype.setOptions.call(this, options);
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
RootPanel.prototype.repaint = function () {
    var changed = false,
        options = this.options,
        frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'graph panel';

        if (options.className) {
            util.addClassName(frame, util.option.asString(options.className));
        }

        this.frame = frame;
        changed = true;
    }
    if (!frame.parentNode) {
        if (!this.options.container) {
            throw new Error('Cannot repaint root panel: no container attached');
        }
        this.options.container.appendChild(frame);
        changed = true;
    }

    // update top
    var top = util.option.asSize(options.top, '0');
    if (frame.style.top != top) {
        frame.style.top = top;
        changed = true;
    }

    // update left
    var left = util.option.asSize(options.left, '0');
    if (frame.style.left != left) {
        frame.style.left = left;
        changed = true;
    }

    // update width
    var width = util.option.asSize(options.width, '100%');
    if (frame.style.width != width) {
        frame.style.width = width;
        changed = true;
    }

    // update height
    var height = util.option.asSize(options.height, '100%');
    if (frame.style.height != height) {
        frame.style.height = height;
        changed = true;
    }

    this._updateEventEmitters();

    return changed;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
RootPanel.prototype.reflow = function () {
    var resized = false;
    var frame = this.frame;
    if (frame) {
        var top = frame.offsetTop;
        if (top != this.top) {
            this.top = top;
            resized = true;
        }

        var left = frame.offsetLeft;
        if (left != this.left) {
            this.left = left;
            resized = true;
        }

        var width = frame.offsetWidth;
        if (width != this.width) {
            this.width = width;
            resized = true;
        }

        var height = frame.offsetHeight;
        if (height != this.height) {
            this.height = height;
            resized = true;
        }
    }
    else {
        resized = true;
    }

    return resized;
};

/**
 * Watch for changes in the size of the frame. On resize, the Panel will
 * automatically redraw itself.
 * @private
 */
RootPanel.prototype._watch = function () {
    var me = this;

    this._unwatch();

    var checkSize = function () {
        if (!me.options.autoResize) {
            // stop watching when the option autoResize is changed to false
            me._unwatch();
            return;
        }

        if (me.frame) {
            // check whether the frame is resized
            if ((me.frame.clientWidth != me.width) ||
                    (me.frame.clientHeight != me.height)) {
                me.requestReflow();
            }
        }
    };

    // TODO: automatically cleanup the event listener when the frame is deleted
    util.addEventListener(window, 'resize', checkSize);

    this.watchTimer = setInterval(checkSize, 1000);
};

/**
 * Stop watching for a resize of the frame.
 * @private
 */
RootPanel.prototype._unwatch = function () {
    if (this.watchTimer) {
        clearInterval(this.watchTimer);
        this.watchTimer = undefined;
    }

    // TODO: remove event listener on window.resize
};

/**
 * Event handler
 * @param {String} event       name of the event, for example 'click', 'mousemove'
 * @param {function} callback  callback handler, invoked with the raw HTML Event
 *                             as parameter.
 */
RootPanel.prototype.on = function (event, callback) {
    // register the listener at this component
    var arr = this.listeners[event];
    if (!arr) {
        arr = [];
        this.listeners[event] = arr;
    }
    arr.push(callback);

    this._updateEventEmitters();
};

/**
 * Update the event listeners for all event emitters
 * @private
 */
RootPanel.prototype._updateEventEmitters = function () {
    if (this.listeners) {
        var me = this;
        util.forEach(this.listeners, function (listeners, event) {
            if (!me.emitters) {
                me.emitters = {};
            }
            if (!(event in me.emitters)) {
                // create event
                var frame = me.frame;
                if (frame) {
                    //console.log('Created a listener for event ' + event + ' on component ' + me.id); // TODO: cleanup logging
                    var callback = function(event) {
                        listeners.forEach(function (listener) {
                            // TODO: filter on event target!
                            listener(event);
                        });
                    };
                    me.emitters[event] = callback;
                    util.addEventListener(frame, event, callback);
                }
            }
        });

        // TODO: be able to delete event listeners
        // TODO: be able to move event listeners to a parent when available
    }
};