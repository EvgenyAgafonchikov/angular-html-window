'use strict';

(function() {
    'use strict';

    angular.module('ngHtmlWindow', [])
        .directive('ngHtmlWindow', ['$document', ngHtmlWindow]);

    function ngHtmlWindow($document) {

        return {
            templateUrl: function(tElement, tAttrs) {
                return tAttrs.templateUrl || 'src/ngHtmlWindow.html';
            },
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                options: '='
            },
            link: function ($scope, element, attr) {

                // classNames
                var NG_WINDOW = ".ng-window",
                    NG_WINDOW_TITLE = ".ng-window-title",
                    NG_WINDOW_TITLEBAR = ".ng-window-titlebar",
                    NG_WINDOW_CONTENT = ".ng-window-content",
                    NG_WINDOW_RESIZEHANDLES = ".ng-window-resize",
                    NG_WINDOW_MAXIMIZE = ".ng-window-maximize",
                    NG_WINDOW_CLOSE = ".ng-window-close";

                var smoothValue = 3;


                var Window = function (options) {

                    this.options = {
                        title: options.title || 'Untitled Window',
                        width: options.width || 400,
                        height: options.height || 200,
                        x: options.x || 0,
                        y: options.y || 0,
                        minWidth: options.minWidth || 200,
                        maxWidth: options.maxWidth || Infinity,
                        minHeight: options.minHeight || 100,
                        maxHeight: options.maxHeight || Infinity,
                        resizable: options.resizable || true,
                        appendTo: options.appendTo || element.parent(),


                        onOpen: options.onOpen || null,
                        onClose: options.onClose || function() {
                            return true;
                        },
                        onResize: options.onResize || function() {
                            if (options.onResize) { options.onResize() }
                        },
                        onActivate: options.onActivate || null,
                        onDeactivate: options.onDeactivate || null,
                        onDragstart: options.onDragstart ||null,
                        onDragend: options.onDragend || null
                    };


                    // Get references to window elements
                    this.appendTo = this.options.appendTo;
                    this.wndElement = element;
                    this.titleBar = angular.element(element[0].querySelectorAll(NG_WINDOW_TITLEBAR));
                    this.resizeHandles = angular.element(element[0].querySelectorAll(NG_WINDOW_RESIZEHANDLES));
                    this.closeButton = angular.element(element[0].querySelectorAll(NG_WINDOW_CLOSE));

                    // Add event listeners
                    this.appendTo.bind('mousemove', this.events.mousemove.bind(this));
                    this.appendTo.bind('mouseup', this.events.mouseup.bind(this));
                    this.titleBar.bind('mousedown', this.events.title_mousedown.bind(this));
                    this.closeButton.bind('click', this.events.close.bind(this));

                    for (var i = 0; i < this.resizeHandles.length; i++) {
                        angular.element(this.resizeHandles[i])
                            .bind('mousedown', this.events.resize_handler_mousedown.bind(this));
                    }



                    // Dimensions
                    this.width = this.options.width;
                    this.height = this.options.height;

                    this.x = this.options.x;
                    this.y = this.options.y;
                    this.z = 10000;

                    this.title = this.options.title;

                    // State
                    this.active = false;
                    this.maximized = false;
                    this.minimized = false;

                    this._closed = true;
                    this._destroyed = false;

                    // Properties
                    this.resizable = this.options.resizable;

                };

                Window.prototype = {

                    _resizing: null,
                    _moving: null,
                    _restore: null,
                    self: this,

                    events: {
                        resize_handler_mousedown: function(event) {

                            this._resizing = {
                                resizeDirection: event.currentTarget.className.replace("ng-window-resize ng-window-resize-", ""),
                                initialSize: {
                                    width: this.width,
                                    height: this.height
                                },
                                initialPosition: {
                                    top: this.y,
                                    left: this.x
                                }
                            };

                            angular.element($document[0].body).css('cursor', this._resizing.resizeDirection + '-resize');

                            event.preventDefault();

                        },
                        title_mousedown: function(e) {

                            this._moving = this.toLocal({
                                x: event.pageX,
                                y: event.pageY
                            });

                            e.preventDefault();
                        },
                        mousemove: function(event) {

                            // Fix mousemove outside browser
                            if (event.which !== 1) {
                                this._moving && this._stopMove();
                                this._resizing && this._stopResize();
                            }

                            if (this._moving) {
                                this.move(
                                    event.pageX - this._moving.x,
                                    event.pageY - this._moving.y
                                );
                            }

                            if(this._resizing) {

                                var resizeDirection = this._resizing.resizeDirection,
                                    initialPosition = this._resizing.initialPosition,
                                    initialSize = this._resizing.initialSize,
                                    newHeight,
                                    newWidth,
                                    windowRight,
                                    windowBottom,
                                    options = this.options,
                                    x = event.x,
                                    y = event.y;


                                // resizing in east west direction
                                if (resizeDirection.indexOf("e") > -1) {

                                    this.width = this.constrain(x - initialPosition.left + smoothValue, options.minWidth, options.maxWidth);

                                } else if (resizeDirection.indexOf("w") > -1) {

                                    windowRight = initialPosition.left + initialSize.width;
                                    newWidth = this.constrain(windowRight - x - smoothValue, options.minWidth, options.maxWidth);

                                    this.width = newWidth;
                                    this.x = windowRight - newWidth;

                                }


                                // resizing in north south direction
                                if (resizeDirection.indexOf("n") > -1) {

                                    windowBottom = initialPosition.top + initialSize.height;
                                    newHeight = this.constrain(windowBottom - y, options.minHeight, options.maxHeight);

                                    this.y = windowBottom - newHeight;
                                    this.height = newHeight;

                                } else if (resizeDirection.indexOf("s") > -1) {

                                    this.height = this.constrain(y - initialPosition.top, options.minHeight, options.maxHeight);

                                }

                                this.options.onResize();

                            }
                        },
                        mouseup: function(event) {
                            this._moving && this._stopMove();
                            this._resizing && this._stopResize();
                        },
                        close: function(event) {
                            var options = this.options;

                            this.wndElement.remove();
                            $scope.$destroy();

                            options.onClose();

                        }
                    },
                    _stopMove: function() {
                        this._moving = null;
                    },

                    _stopResize: function() {
                        this._restore = null;
                        this._resizing = null;
                        angular.element($document[0].body).css('cursor', '');
                    },
                    set width(value) {
                        this.wndElement.css('width', value + 'px');
                    },

                    get width() {
                        return parseInt(this.wndElement.css('width'), 10);
                    },

                    set height(value) {
                        // This shouldn't be done if flexible box model
                        // worked properly with overflow-y: auto
                        //this.$content.height(value - this.$header.outerHeight());

                        this.wndElement.css('height', value + 'px');
                    },
                    get height() {
                        return parseInt(this.wndElement.css('height'), 10);
                    },
                    set x(value) {
                        this.wndElement.css('left', value + 'px');
                    },

                    set y(value) {
                        this.wndElement.css('top', value + 'px');
                    },

                    get x() {
                        return parseInt(this.wndElement.css('left'), 10);
                    },

                    get y() {
                        return parseInt(this.wndElement.css('top'), 10);
                    },
                    set resizable(value) {
                        this._resizable = !!value;
                    },

                    get resizable() {
                        return this._resizable;
                    },
                    set title(title) {
                        $scope.title = title;
                    },
                    get title() {
                        return this.title;
                    },
                    resize: function(w, h) {
                        this.width = w;
                        this.height = h;
                        return this;
                    },
                    move: function(x, y) {
                        this.x = x;
                        this.y = y;
                        return this;
                    },
                    toLocal: function(coord) {
                        return {
                            x: coord.x - this.x,
                            y: coord.y - this.y
                        };
                    },
                    constrain: function(value, min, max) {
                        return Math.min(max, Math.max(min, value));
                    }

                };

                $scope.window = new Window($scope.options);

            }
        };

    }

})();