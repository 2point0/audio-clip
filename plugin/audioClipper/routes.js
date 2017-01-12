'use strict'

const Joi = require('joi'),
    sprintf = require('sprintf-js').sprintf,
    Fs = require('fs'),
    exec = require('child_process').exec,
    ClipName = require('../../common/ClipName')

const audioFileDir = 'audioFile',
    clipFileDir = 'audioClip',
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
    },
    clipAudioPromise = (clipName, sourceFileName, clipMeta) => {
        return new Promise((f, r) => {
            const outputFile = clipName.getClipName(clipMeta),
                clipCmdTemplate = 'ffmpeg -y -ss %s -i %s/%s -t %s ./%s/%s',
                clipCmd = sprintf(
                    clipCmdTemplate,
                    clipMeta.start,
                    audioFileDir,
                    sourceFileName,
                    clipMeta.length,
                    clipFileDir,
                    outputFile
                )
            clipMeta.fileName = outputFile
            exec(
                clipCmd,
                (error, stdout, stderr) => f(clipMeta)
            )
        })
    },
    timeCodeFormatValidation = Joi.string().regex(/^\d+(:\d+){0,2}(\.\d+)?$/)

module.exports = options => {
    return [{
        method: 'PUT',
        path: '/audio-clip',
        handler: function(request, reply) {
            const fileName = request.payload.fileName,
                timeCode = request.payload.timeCode,
                clipName = new ClipName(fileName)

            Promise.resolve(clipName.getClipName(timeCode))
                .then(clipFileName => {
                    return new Promise((f, r) => {
                        Fs.stat(sprintf('%s/%s', clipFileDir, clipFileName), (err, stats) => {
                            if (err) {
                                if (~err.message.indexOf('no such file or directory')) {
                                    f(Promise.resolve(sprintf('./%s/%s', audioFileDir, fileName))
                                        .then(filePath => {
                                            return new Promise((f, r) => {
                                                Fs.stat(filePath, (err, stats) => {
                                                    if (err)
                                                        r(err)
                                                    else if (stats.isFile()) {
                                                        f(filePath)
                                                    } else
                                                        r('Audio file must be a file')
                                                })
                                            })
                                        })
                                        .then(filePath => {
                                            return clipAudioPromise(clipName, fileName, timeCode)
                                        })
                                        .then(clipMeta => {
                                            return clipMeta.fileName
                                        })
                                    )
                                } else
                                    r(err)
                            } else if (stats.isFile())
                                f(clipFileName)
                        })
                    })
                })
                .then(clipFileName => {
                    // Path must be server path, not actual path
                    reply(sprintf('/audio/clip/%s', clipFileName))
                })
                .catch(err => {
                    console.error(err)
                    reply().code(500)
                })
        },
        config: {
            validate: {
                payload: {
                    fileName: Joi.string().required(),
                    timeCode: Joi.object().keys({
                        start: timeCodeFormatValidation.required(),
                        length: timeCodeFormatValidation.required()
                    }).required()
                }
            }
        }
    }, {
        method: 'POST',
        path: '/audio-clip',
        handler: function(request, reply) {
            const key = request.query.key,
                requestMeta = request.payload ? request.payload.meta : ''

            Promise.resolve(requestMeta)
                .then(meta => {
                    return meta ? meta : readMetaPromise(key)
                })
                .then(meta => {
                    if (meta.audioFile) {
                        const audioFilePath = sprintf('./%s/%s', audioFileDir, meta.audioFile)
                        return new Promise((f, r) => {
                            Fs.stat(audioFilePath, (err, stats) => {
                                if (err)
                                    r(err)
                                else if (stats.isFile()) {
                                    if (meta.clipping) {
                                        f(meta)
                                    }
                                } else
                                    r('Audio file must be a file')
                            })
                        })
                    }

                    throw new Error('Clipping meta or audio file not specified')
                })
                .then(meta => {
                    const sourceFileName = meta.audioFile,
                        clipName = new ClipName(sourceFileName)
                    return Promise.all(meta.clipping.map(c => {
                        return clipAudioPromise(clipName, sourceFileName, c)
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
