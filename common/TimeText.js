'use strict'

if (typeof sprintf === 'undefined') {
    sprintf = require('sprintf-js').sprintf
}

class TimeText {
    constructor() {}

    parse(timeText) {
        const majorParts = timeText.split(':'),
            L = majorParts.length,
            hoursText = L > 1 ? majorParts[L - 3] : '',
            hours = hoursText ? parseInt(hoursText) : 0,
            minutesText = L > 0 ? majorParts[L - 2] : '',
            minutes = minutesText ? parseInt(minutesText) : 0,
            secondsText = majorParts[L - 1],
            seconds = parseFloat(secondsText),
            durationSeconds = seconds + minutes * 60 + hours * 3600

        // Rebuild duration text with significant parts only
        let text = secondsText
        if (hours) {
            text = sprintf('%s:%s:%s', hoursText, minutesText ? minutesText : '00', secondsText)
        } else if (minutes) {
            text = sprintf('%s:%s', minutesText, secondsText)
        }

        return {
            seconds: durationSeconds,
            text: text
        }
    }

    toTimeCode(seconds) {
        const hours = Math.floor(seconds / 3600),
            hourSeconds = hours * 3600,
            minutes = Math.floor((seconds - hourSeconds) / 60),
            minuteSeconds = minutes * 60,
            remainingSeconds = seconds - minuteSeconds

        if (hours) {
            return sprintf('%d:%d:%.3f', hours, minutes ? minutes : '00', remainingSeconds)
        } else if (minutes) {
            return sprintf('%d:%.3f', minutes, remainingSeconds)
        } else {
            return sprintf('%.3f', remainingSeconds)
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeText
}
