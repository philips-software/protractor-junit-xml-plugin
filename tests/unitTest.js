const chai = require('chai');
'use strict'

// var chai = require('chai')
// var expect = require('chai').expect
// var sinon = require('sinon')
// var proxyquire = require('proxyquire');
let rewire = require('rewire');

let protractorJunitXmlPlugin,
    fakeBuilder = {},
    fakeFs = {},
    fakeOs = {},
    fakePath = {},
    fakeParseStringSync = {};

describe('plugin test', function () {
    before(() => {
        protractorJunitXmlPlugin = rewire('../index.js');
        protractorJunitXmlPlugin.__set__({
            fs: fakeFs,
            os: fakeOs,
            path: fakePath,
            builder: fakeBuilder,
            parseStringSync: fakeParseStringSync
        });
        protractorJunitXmlPlugin.__set__('pluginConfig', {
            uniqueName: true
        })
    });

    it('test the config option', function () {
        debugger;
        console.log('here');
        console.log(protractorJunitXmlPlugin);
        // let ab = JUnitXrayPlugin.getBrowserId
        let ab = new protractorJunitXmlPlugin.JUnitXrayPlugin()
        console.timeLog(ab);
    })
});