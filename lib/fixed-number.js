'use strict';

function fixedNumber(value, decimals) {
    const multiplier = Math.pow(10, decimals);

    return Math.round(value * multiplier) / multiplier;
}

module.exports = fixedNumber;
