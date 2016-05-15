'use strict';

const qs = require('querystring');

module.exports = {
    get debugMode () {
        const query = qs.parse(window.location.search.replace('?', ''));

        return query.debug ? true : false;
    }
};
