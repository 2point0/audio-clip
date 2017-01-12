'use strict';

const Hapi = require('hapi'),
    Joi = require('joi'),
    Fs = require('fs'),
    sprintf = require('sprintf-js').sprintf

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
                require('inert'),
                require('./plugin/audioClipper/plugin')
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
                const audioDir = 'audioFile'
                Fs.readdir(audioDir, function(readErr, files) {
                    if (readErr) {
                        console.error(readErr)
                        reply().code(500)
                    } else {
                        Promise.all(files.map(fileName => {
                                const filePath = sprintf('%s/%s', audioDir, fileName)
                                return new Promise((f, r) => {
                                    Fs.stat(filePath, (err, stats) => {
                                        if (err)
                                            r(err)
                                        else {
                                            const isIgnore = stats.isDirectory() || /^\./.test(fileName)
                                            f(isIgnore ? '' : fileName)
                                        }
                                    })
                                })
                            }))
                            .then(results => {
                                reply(results.filter(result => {
                                    return result
                                }))
                            })
                            .catch(e => {
                                console.error(e)
                                reply().code(500)
                            })
                    }
                })
            }
        }, {
            method: 'PUT',
            path: '/clip/meta',
            handler: function(request, reply) {
                const filePath = sprintf('./clipMeta/%s.json', request.payload.key),
                    contents = JSON.stringify(request.payload.content, null, 2)
                new Promise((f, r) => {
                        Fs.writeFile(filePath, contents, err => {
                            if (err)
                                r(err)
                            else
                                f()
                        })
                    })
                    .then(() => {
                        reply().code(204)
                    })
                    .catch(e => {
                        console.error(e)
                        reply().code(500)
                    })
            },
            config: {
                validate: {
                    payload: {
                        key: Joi.string().required(),
                        content: Joi.object().required()
                    }
                }
            }
        }, {
            method: 'GET',
            path: '/audio/file/{param*}',
            handler: {
                directory: {
                    path: 'audioFile/'
                }
            }
        }, {
            method: 'GET',
            path: '/audio/meta/{param*}',
            handler: {
                directory: {
                    path: 'clipMeta/'
                }
            }
        }, {
            method: 'GET',
            path: '/audio/clip/{param*}',
            handler: {
                directory: {
                    path: 'audioClip/'
                }
            }
        }, {
            method: 'GET',
            path: '/common/{param*}',
            handler: {
                directory: {
                    path: 'common/'
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
