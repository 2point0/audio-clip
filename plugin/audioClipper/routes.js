'use strict'

const Joi = require('joi'),
    sprintf = require('sprintf-js').sprintf,
    nodeCmd = require('node-cmd'),
    Fs = require('fs')

const timeCharReplace = (s) => {
    return s.replace(/[:.]/, '_')
}

module.exports = function routes(options) {
    return [{
        method: 'PUT',
        path: '/audio-clip',
        handler: function(request, reply) {
            const key = request.query.key,
                requestMeta = request.payload ? request.payload.meta : ''

            Promise.resolve(requestMeta)
                .then(meta => {
                    if (meta)
                        return meta
                    else {
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
                })
                .then(meta => {
                    for (const key in meta) {
                        const value = meta[key]
                        if (value.clipping && value.audioFile) {
                            return new Promise((f, r) => {
                                const audioFilePath = sprintf('./audioFile/%s', value.audioFile)
                                Fs.stat(audioFilePath, (err, stats) => {
                                    if (err)
                                        r(err)
                                    else if (stats.isFile())
                                        f(value)
                                    else
                                        r('Invalid audio file')
                                })
                            })
                        }
                    }

                    throw new Error('Clipping meta or audio file not specified')
                })
                .then(meta => {
                    const sourceFileName = meta.audioFile,
                        fileNameSplitRegExp = /^(.+)\.([^.]+)$/,
                        fileNameMatch = fileNameSplitRegExp.exec(sourceFileName)
                    if (!fileNameMatch)
                        throw new Error(sprintf('Invalid file name %s', sourceFileName))

                    const fileNameStart = fileNameMatch[1],
                        fileExtension = fileNameMatch[2]
                    return Promise.all(meta.clipping.map(c => {
                        return new Promise((f, r) => {
                            const startTime = c.start,
                                clipTimeSpan = c.length,
                                safeTimeName = sprintf('%s-%s', timeCharReplace(startTime), timeCharReplace(clipTimeSpan)),
                                outputFile = sprintf('%s_%s.%s', fileNameStart, safeTimeName, fileExtension),
                                clipCmdTemplate = 'ffmpeg -y -ss %s -i audioFile/%s -t %s ./audioClip/%s',
                                clipCmd = sprintf(clipCmdTemplate, startTime, sourceFileName, clipTimeSpan, outputFile)
                            nodeCmd.get(
                                clipCmd,
                                (output) => {
                                    f(outputFile)
                                }
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
    }]
}
