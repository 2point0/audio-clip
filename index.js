'use strict';

const Hapi = require('hapi')

// Server
Promise.resolve(new Hapi.Server())
    .then(server => {
        server.connection({
            port: process.env.PORT || 4475
        })

        return server
    })
    .then(server => {
        // Plugins
        return new Promise((f, r) => {
            server.register([
                require('inert')
            ], (err) => {
                if (err) {
                    console.error(err)
                    r(err)
                } else {
                    f(server)
                }

            })
        })
    })
    .then(server => {
        // Routes
        var Fs = require('fs')
        server.route([{
            method: 'GET',
            path: '/clip-audio',
            handler: function(request, reply) {
                reply.file('res/clip-audio.html')
            }
        }, {
            method: 'GET',
            path: '/clip/audio',
            handler: function(request, reply) {
                Fs.readdir('audioFile', function(err, files) {
                    if (err)
                        reply(err).code(500)
                    else
                        reply(files)
                })
            }
        }, {
            method: 'GET',
            path: '/clip/audio/{param*}',
            handler: {
                directory: {
                    path: 'audioFile/'
                }
            }
        }, {
            method: 'GET',
            path: '/clip/meta/{param*}',
            handler: {
                directory: {
                    path: 'clipMeta/'
                }
            }
        }, {
            method: 'GET',
            path: '/res/{param*}',
            handler: {
                directory: {
                    path: 'res/'
                }
            }
        }, {
            method: 'GET',
            path: '/node/{param*}',
            handler: {
                directory: {
                    path: 'node_modules/'
                }
            }
        }, {
            method: 'GET',
            path: '/bower_components/{param*}',
            handler: {
                directory: {
                    path: 'bower_components/'
                }
            }
        }])

        return server
    })
    .then(server => {
        return new Promise((f, r) => {
            server.start((err) => {
                if (err)
                    r(err)
                else {
                    console.log('Server:', server.info.uri)
                    f(server)
                }
            })
        })
    })
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
