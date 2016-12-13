'use strict'

exports.register = function(server, options, next) {
    const routes = require('./routes')
    server.route(routes(options))
    next()
}

exports.register.attributes = {
    pkg: require('./package.json')
}
