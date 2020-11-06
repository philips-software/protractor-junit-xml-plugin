'use strict';

function positionOfDelimiters(name, delim) {
    let positions = [];

    let n = name.length;
    for (let at = 0; at < n;) {
        let col = name.indexOf(delim, at);

        if (col < 0) {
            break;
        }

        positions.push(col);

        at = col + 1;
    }

    return positions;
}

function findXrayIdAndName(name, parseXrayId) {
    let inNameOnly = {};
    inNameOnly.name = name;

    if (!parseXrayId) {
        return inNameOnly;
    }

    // Example: [ 0, 8, 20]
    let dPos = positionOfDelimiters(name, ':');
    if (dPos.length < 3) {
        return inNameOnly;
    }

    // ID tag is missing?
    let marker = name.substring(dPos[0] + 1, dPos[1]);
    if (marker.indexOf('XRAY-ID') < 0) {
        return inNameOnly;
    }

    let result = {};

    result.xrayId = name.substring(dPos[1] + 1, dPos[2]).trim();
    result.name = name.substring(dPos[2] + 1).trim();

    return result;
}

module.exports = { findXrayIdAndName };
