(function() {
    'use strict';

    /**
     * @ngdoc overview
     * @name ngStorage
     */

    angular.module('ngStorage', []).

    /**
     * @ngdoc object
     * @name ngStorage.$localStorage
     * @requires $rootScope
     * @requires $window
     */

    provider('$localStorage', _storageProvider('localStorage')).

    /**
     * @ngdoc object
     * @name ngStorage.$sessionStorage
     * @requires $rootScope
     * @requires $window
     */

    provider('$sessionStorage', _storageProvider('sessionStorage'));

    function _storageProvider(storageType) {
        var settings = {
            prefix       : 'ngStorage-',
            prefixLength : 10
        };

        return {
            setPrefix: function(prefix) {
                settings.prefix = prefix;
                settings.prefixLength = prefix.length;
            },
            $get: [
                '$rootScope',
                '$window',
                '$log',
                '$timeout',
                function(
                    $rootScope,
                    $window,
                    $log,
                    $timeout
                ){
                    var webStorage,
                      $storage = {
                            $default: function(items) {
                                for (var k in items) {
                                    angular.isDefined($storage[k]) || ($storage[k] = items[k]);
                                }

                                return $storage;
                            },
                            $reset: function(items) {
                                for (var k in $storage) {
                                    '$' === k[0] || delete $storage[k];
                                }

                                return $storage.$default(items);
                            },
                            $save: function() {
                                $timeout.cancel(_debounce);
                                if (!angular.equals($storage, _last$storage)) {
                                    angular.forEach($storage, function(v, k) {
                                        angular.isDefined(v) && '$' !== k[0] && webStorage.setItem(settings.prefix + k, angular.toJson(v));

                                        delete _last$storage[k];
                                    });

                                    for (var k in _last$storage) {
                                        webStorage.removeItem(settings.prefix + k);
                                    }

                                    _last$storage = angular.copy($storage);
                                }
                            }
                        },
                        _last$storage,
                        _debounce;

                    // #9: Assign a placeholder object if Web Storage is unavailable to prevent breaking the entire AngularJS app
                    try {
                        webStorage = $window[storageType];
                        // Checking webStorage.length is necessary here because Firefox allows webStorage = $window[storageType];
                        // for sessionStorage, even if the user has blocked all cookies/storage. However, security error then shows up when
                        // webStorage.length is called
                        webStorage.length;
                    } catch (e) {
                        $log.warn('This browser does not support Web Storage!');

                        var data = {},
                            undef;
                        webStorage = {
                            setItem: function(id, val) {
                                return data[id] = String(val);
                            },
                            getItem: function(id) {
                                return data.hasOwnProperty(id) ? data[id] : undef;
                            },
                            removeItem: function(id) {
                                return delete data[id];
                            },
                            clear: function() {
                                return data = {};
                            },
                            // This is only a shim and not meant to be updated. It avoids webStorage.length == undefined in the loop below.
                            length: 0
                        };
                    }

                    for (var i = 0, k, storageLength = webStorage.length; i < storageLength; i++) {
                        // #8, #10: `webStorage.key(i)` may be an empty string (or throw an exception in IE9 if `webStorage` is empty)
                        (k = webStorage.key(i)) && settings.prefix === k.slice(0, settings.prefixLength) && ($storage[k.slice(settings.prefixLength)] = angular.fromJson(webStorage.getItem(k)));
                    }

                    _last$storage = angular.copy($storage);

                    $rootScope.$watch(function() {
                        _debounce || (_debounce = $timeout(function() {
                            $storage.$save();
                        }, 100));
                    });

                    // #6: Use `$window.addEventListener` instead of `angular.element` to avoid the jQuery-specific `event.originalEvent`
                    'localStorage' === storageType && $window.addEventListener && $window.addEventListener('storage', function(event) {
                        if (settings.prefix === event.key.slice(0, settings.prefixLength)) {
                            event.newValue ? $storage[event.key.slice(settings.prefixLength)] = angular.fromJson(event.newValue) : delete $storage[event.key.slice(settings.prefixLength)];

                            _last$storage = angular.copy($storage);

                            $rootScope.$apply();
                        }
                    });

                    return $storage;
                }
            ]
        }
    }

})();
