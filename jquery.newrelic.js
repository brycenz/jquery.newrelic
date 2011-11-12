/*
 * jQuery New Relic Plugin
 * Copyright (c) 2011, Bryce Ewing <brycenz@gmail.com>
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * NREUM.inlineHit(request_name, queue_time, app_time, total_be_time, dom_time, fe_time) 
 *     request_name - the "web page" name or service name 
 *     queue_time - the amount of time spent in the app tier queue 
 *     app_time - the amount of time spent in the application code 
 *     total_be_time - the total roundtrip time of the remote service call 
 *     dom_time - the time spent processing the result of the service call (or user defined) 
 *     fe_time - the time spent rendering the result of the service call (or user defined) 
 * 
 */
(function(jQuery) {
    // URL regular expression from jquery.url
    var URL_PARSER = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/;

    var requestMap = {};
    
    jQuery.extend({
        newrelic: {
            addRequestMapping: function(mapping) {
                requestMap[mapping] = new RegExp("^" + mapping.replace(/\*/, "[^/]*") + "$");
            },

            removeRequestMapping: function(mapping) {
                delete requestMap[mapping];
            }
        }
    });

    var map = function(request) {
        for (var name in requestMap) {
            if (requestMap.hasOwnProperty(name)) {
                if (requestMap[name].test(request)) {
                    return name;
                }
            }
        }
        return request;
    };

    var timedParser = function(parser, options) {
        return function(data) {
            var start = new Date().getTime();
            var result = parser(data);
            options.nreumNetworkTime = start - options.nreumSendTime;
            options.nreumProcessingTime = new Date().getTime() - start;
            return result;
        }
    };

    $(document).ajaxSend(function(event, xhr, options) {
        options.nreumSendTime = new Date().getTime();
        options.converters["text json"] = timedParser(jQuery.parseJSON, options);
        options.converters["text xml"] = timedParser(jQuery.parseXML, options);
    });

    $(document).ajaxComplete(function(event, xhr, options) { 
        if (typeof NREUM !== "undefined" && NREUM !== null && options.nreumSendTime && options.url) {
            var requestName = "/" + map(URL_PARSER.exec(decodeURI(options.url))[9]);

            options.nreumNetworkTime = options.nreumNetworkTime || (new Date().getTime() - options.nreumSendTime);
            options.nreumProcessingTime = options.nreumProcessingTime || 0;

            NREUM.inlineHit(requestName, 0, 0, options.nreumNetworkTime, options.nreumProcessingTime, 0);
        }
    });
})(jQuery);
