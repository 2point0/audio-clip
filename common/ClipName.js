'use strict'

const sprintf = require('sprintf-js').sprintf;

const timeCharReplace = (s) => {
    return s.replace(/[:.]/g, '_')
  },
  fileNameSplitRegExp = /^(.+)\.([^.]+)$/;

class ClipName {
  constructor(fileName) {
    const fileNameMatch = fileNameSplitRegExp.exec(fileName)
    if (!fileNameMatch)
      throw new Error(sprintf('Invalid file name %s', fileName))

    this.fileNameStart = fileNameMatch[1]
    this.fileExtension = fileNameMatch[2]
  }

  getClipName(clipMeta) {
    const startTime = clipMeta.start,
      clipTimeSpan = clipMeta.length,
      safeTimeName = sprintf('%s-%s', timeCharReplace(startTime), timeCharReplace(clipTimeSpan)),
      outputFile = sprintf('%s_%s.%s', this.fileNameStart, safeTimeName, this.fileExtension)
    return outputFile
  }
};

module.exports = ClipName
