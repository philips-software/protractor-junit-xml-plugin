let expect = require('chai').expect;

'use strict'

let sinon = require('sinon')

// var proxyquire = require('proxyquire');
let rewire = require('rewire');

let protractorJunitXmlPlugin,
    fakeBuilder = {},
    fakeOs = {},
    fakePath = {
        resolve: () => '/fake-path'
    },
    fakeParseStringSync = {},
    noop = () => {};

describe('plugin test', function () {
        protractorJunitXmlPlugin = rewire('../index.js');
        protractorJunitXmlPlugin.__set__({
            os: fakeOs,
            path: fakePath,
            builder: fakeBuilder,
            parseStringSync: fakeParseStringSync
        });
    
        const fakeCapabilities = {
            get: function () {
                console.log('Coming in fakeCapabilities.get()');
                return 'first';
            }
        }
        protractorJunitXmlPlugin.__set__({
            currCapabilities: fakeCapabilities,
            suites: {
                first: {
                    att: (input1, input2) => {
                        console.log('suite.att() called with input: ' + input1 + ', ' + input2);
                    }
                }
            },
            xml: {
                end: () => '<fake-xml></fake-xml>'
            }
        });

    describe('if config captureSapphireWebAppContextVar is not set', function() {
        protractorJunitXmlPlugin.__set__('pluginConfig', {
            path: '../', //path for protractor plugin
            outdir: '_test-reports',
            filename: 'e2e-tests',
            jiraProjectKey: 'CARE',
            timeTillMinuteStamp: (new Date()).toISOString().substr(0, 16).replace(':', '_'),
            uniqueName: true, //default true
            uniqueFolder: true // default false
        });

        it('then it should not capture any sapphireWebAppConfig context fields in metadata', async function() {
            const fakeFs = {
                existsSync: () => {
                    return true;
                },
                writeFile: noop,
                writeFileSync: sinon.spy()
            };
            protractorJunitXmlPlugin.__set__('fs', fakeFs);
        
            protractorJunitXmlPlugin.__set__('currentBrowser', {
                baseUrl: 'https://unit-test-fake-url.com',
                executeScript: async function (input) {
                    console.log('fake executeScript is called with input: ' + input)
                    return {
                        environment: "production",
                        appName: "ClientCareOrchestrator",
                        packagedDeps: {
                            'pr.care-orchestrator': "1.28.0-prerelease.42"
                        },
                        TOGGLES: {
                            STATIC_TOGGLE_RWD: true,
                            STATIC_TOGGLE_F2482_Business_Reports: true,
                        },
                        gatewayUrl: "http://nti-sapphiregateway-v1-server.cloud.pcftest.com:80"
                    }
                }
            });
            await protractorJunitXmlPlugin.teardown();

            const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
            expect(metadata).to.exist;
            expect(metadata).to.have.all.keys(['jiraProjectKey', 'envProperties']);
            const envProperties = metadata.envProperties;
            expect(envProperties).to.not.include.keys([
                'environment', 'appName', 'appVersion', 'pr_care_orchestrator_version',
                'isNewRelicEnabled', 'careOrchestratorVersion', 'careOrchestratorBuildNumber',
                'careOrchestratorLastBuildDate', 'TOGGLES_STATIC_TOGGLE_RWD',
                'TOGGLES_STATIC_TOGGLE_F2482_Business_Reports', 'TOGGLES_STATIC_ENABLE_SAPPHIRE_GATEWAY',
                'gatewayUrl'
            ]); 
        })
    });   
     
    describe('if config captureSapphireWebAppContextVar is set to true', function () {
        protractorJunitXmlPlugin.__set__('pluginConfig', {
            path: '../', //path for protractor plugin
            outdir: '_test-reports',
            filename: 'e2e-tests',
            jiraProjectKey: 'CARE',
            timeTillMinuteStamp: (new Date()).toISOString().substr(0, 16).replace(':', '_'),
            uniqueName: true, //default true
            uniqueFolder: true, // default false
            captureSapphireWebAppContextVar: true //default false 
        });

        it('then add available sapphireWebAppConfig context fields in metadata', async function () {
            const fakeFs = {
                existsSync: () => {
                    return true;
                },
                writeFile: noop,
                writeFileSync: sinon.spy()
            };
            protractorJunitXmlPlugin.__set__('fs', fakeFs);
        
            protractorJunitXmlPlugin.__set__('currentBrowser', {
                baseUrl: 'https://unit-test-fake-url.com',
                executeScript: async function (input) {
                    console.log('fake executeScript is called with input: ' + input)
                    return {
                        environment: "production",
                        appName: "ClientCareOrchestrator",
                        appVersion: "1.28.0-prerelease.46",
                        packagedDeps: {
                            'pr.care-orchestrator': "1.28.0-prerelease.42"
                        },
                        isNewRelicEnabled: false,
                        careOrchestratorVersion: "0.0.0",
                        careOrchestratorBuildNumber: "11493",
                        careOrchestratorLastBuildDate: "NOT_SET",
                        TOGGLES: {
                            STATIC_TOGGLE_RWD: true,
                            STATIC_TOGGLE_F2482_Business_Reports: true,
                            STATIC_ENABLE_SAPPHIRE_GATEWAY: true,
                            STATIC_TOGGLE_F888: true
                        },
                        gatewayUrl: "http://nti-sapphiregateway-v1-server.cloud.pcftest.com:80"
                    }
                }
            });
            await protractorJunitXmlPlugin.teardown();

            const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
            expect(metadata).to.exist;
            expect(metadata).to.have.all.keys(['jiraProjectKey', 'envProperties']);
            const envProperties = metadata.envProperties;
            expect(envProperties).to.include.all.keys([
                'environment', 'appName', 'appVersion', 'pr_care_orchestrator_version',
                'isNewRelicEnabled', 'careOrchestratorVersion', 'careOrchestratorBuildNumber',
                'careOrchestratorLastBuildDate', 'TOGGLES_STATIC_TOGGLE_RWD',
                'TOGGLES_STATIC_TOGGLE_F2482_Business_Reports', 'TOGGLES_STATIC_ENABLE_SAPPHIRE_GATEWAY',
                'gatewayUrl'
            ]);
        })
        it('and sapphireWebAppConfig.packagedDeps and sapphireWebAppConfig.TOGGLES are not available then dont add those fields in metadata', 
        async function () {
            const fakeFs = {
                existsSync: () => {
                    return true;
                },
                writeFile: noop,
                writeFileSync: sinon.spy()
            };
            protractorJunitXmlPlugin.__set__('fs', fakeFs);
        
            protractorJunitXmlPlugin.__set__('currentBrowser', {
                baseUrl: 'https://unit-test-fake-url.com',
                executeScript: async function (input) {
                    console.debug('fake executeScript is called with input: ' + input)
                    return {
                        environment: "production",
                        appName: "ClientCareOrchestrator",
                        appVersion: "1.28.0-prerelease.46",
                        isNewRelicEnabled: false,
                        careOrchestratorVersion: "0.0.0",
                        careOrchestratorBuildNumber: "11493",
                        careOrchestratorLastBuildDate: "NOT_SET",
                        gatewayUrl: "http://nti-sapphiregateway-v1-server.cloud.pcftest.com:80"
                    }
                }
            });
            
            await protractorJunitXmlPlugin.teardown();

            const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
            expect(metadata).to.exist;
            expect(metadata).to.have.all.keys(['jiraProjectKey', 'envProperties']);
            const envProperties = metadata.envProperties;

            expect(envProperties).to.include.all.keys([
                'environment', 'appName', 'appVersion', 
                'isNewRelicEnabled', 'careOrchestratorVersion', 'careOrchestratorBuildNumber',
                'careOrchestratorLastBuildDate', 
                'gatewayUrl'
            ])
            expect(envProperties).to.not.have.keys(['pr_care_orchestrator_version', 'TOGGLES_STATIC_TOGGLE_RWD',
            'TOGGLES_STATIC_TOGGLE_F2482_Business_Reports', 'TOGGLES_STATIC_ENABLE_SAPPHIRE_GATEWAY']);
        })
    })
});
