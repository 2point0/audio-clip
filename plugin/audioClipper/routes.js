'use strict'

const Joi = require('joi'),
    sprintf = require('sprintf-js').sprintf,
    Fs = require('fs'),
    exec = require('child_process').exec,
    ClipName = require('../../common/ClipName')

const audioFileDir = 'audioFile',
    readMetaPromise = key => {
        return new Promise((f, r) => {
            const metaFilePath = sprintf('./clipMeta/%s.json', key)
            Fs.readFile(metaFilePath, 'utf-8', (err, data) => {
                if (err)
                    r(err)
                else {
                    try {
                        f(JSON.parse(data))
                    } catch (e) {
                        r(e)
                    }
                }
            })
        })
    }

module.exports = options => {
    return [{
        method: 'PUT',
        path: '/audio-clip',
        handler: function(request, reply) {
            const key = request.query.key,
                requestMeta = request.payload ? request.payload.meta : ''

            Promise.resolve(requestMeta)
                .then(meta => {
                    return meta ? meta : readMetaPromise(key)
                })
                .then(meta => {
                    if (meta.clipping && meta.audioFile) {
                        return new Promise((f, r) => {
                            const audioFilePath = sprintf('./%s/%s', audioFileDir, meta.audioFile)
                            Fs.stat(audioFilePath, (err, stats) => {
                                if (err)
                                    r(err)
                                else if (stats.isFile())
                                    f(meta)
                                else
                                    r('Invalid audio file')
                            })
                        })
                    }

                    throw new Error('Clipping meta or audio file not specified')
                })
                .then(meta => {
                    const sourceFileName = meta.audioFile,
                        clipName = new ClipName(sourceFileName)
                    return Promise.all(meta.clipping.map(c => {
                        return new Promise((f, r) => {
                            const outputFile = clipName.getClipName(c),
                                clipCmdTemplate = 'ffmpeg -y -ss %s -i %s/%s -t %s ./audioClip/%s',
                                clipCmd = sprintf(clipCmdTemplate, c.start, audioFileDir, sourceFileName, c.length, outputFile)
                            exec(
                                clipCmd,
                                (error, stdout, stderr) => f(outputFile)
                            )
                        })
                    }))
                })
                .then(results => {
                    reply(results.length)
                })
                .catch(err => {
                    console.error(err)
                    reply().code(500)
                })
        },
        config: {
            validate: {
                query: {
                    key: Joi.string().required()
                }
            }
        }
    }, {
        method: 'GET',
        path: '/audio-info',
        handler: function(request, reply) {
            const key = request.query.key
            readMetaPromise(key)
                .then(meta => {
                    if (meta.audioFile) {
                        return new Promise((f, r) => {
                            const fileInfoTemplate = 'ffprobe ./%s/%s',
                                infoCmd = sprintf(fileInfoTemplate, audioFileDir, meta.audioFile)
                            exec(
                                infoCmd,
                                (error, stdout, stderr) => {
                                    f({
                                        key: key,
                                        info: stderr
                                    })
                                }
                            )
                        })
                    }

                    throw new Error('Clipping meta or audio file not specified')
                })
                .then(results => {
                    const durationRegExp = /\bDuration: ([^,]+)/,
                        match = durationRegExp.exec(results.info),
                        duration = match ? match[1] : '0'
                    reply({
                        key: key,
                        duration: duration
                    })
                })
                .catch(err => {
                    console.error(err)
                    reply().code(500)
                })
        },
        config: {
            validate: {
                query: {
                    key: Joi.string().required()
                }
            }
        }
    }]
}
