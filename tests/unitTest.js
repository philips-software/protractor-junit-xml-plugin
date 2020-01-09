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
    noop = () => { };

describe('In protractor-junit-xml-plugin', function () {
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

    let addGivenKeysToProcessEnv = (strKeys) => {
        const TEST_VALUE = 'TEST_VALUE_';
        let finalEnv = {};
        strKeys.forEach((key, index) => {
            finalEnv[key] = TEST_VALUE + index;
        });
        let revert = protractorJunitXmlPlugin.__set__('process.env', finalEnv);
        return revert;
    }

    let setupFakefs = () => {
        const fakeFs = {
            existsSync: () => {
                return true;
            },
            writeFile: noop,
            writeFileSync: sinon.spy()
        };
        protractorJunitXmlPlugin.__set__('fs', fakeFs); 
        return fakeFs;
    }
    it('if process.env has the following variables then it should add them in envProperties', async function () {
        const reqKeys = ['BUILD_NUMBER', 'TEAMCITY_BUILDCONF_NAME', 'USER', 'LANG', 'PWD'];
        const fakeFs = setupFakefs();

        let revert = addGivenKeysToProcessEnv(reqKeys);

        await protractorJunitXmlPlugin.teardown();

        const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
        expect(metadata).to.exist;
        expect(metadata).to.have.all.keys(['jiraProjectKey', 'envProperties']);
        const envProperties = metadata.envProperties;
        expect(envProperties).to.include.keys(reqKeys);
        revert();
    });

    it('if process.env do not have the following variables then it should not add them in envProperties', async function () {
        const testKeys = ['USER', 'LANG', 'PWD'];
        const varToAdd = ['BUILD_NUMBER', 'TEAMCITY_BUILDCONF_NAME'];

        let revert = addGivenKeysToProcessEnv(reqKeys);
        const fakeFs = setupFakefs();

        await protractorJunitXmlPlugin.teardown();

        const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
        expect(metadata).to.exist;
        expect(metadata).to.have.all.keys(['jiraProjectKey', 'envProperties']);
        const envProperties = metadata.envProperties;
        expect(envProperties).to.not.include.keys(testKeys);
        revert();
    });

    describe('if process.env do not have TEAMCITY_BUILDCONF_NAME and BUILD_NUMBER', function () {
        it('and sapphireWebAppConfig has related info then it should try to populate it from sapphireWebAppConfig global', async function() {
            const reqKeys = ['BUILD_NUMBER', 'TEAMCITY_BUILDCONF_NAME'];
            const fakeFs = setupFakefs();

            await protractorJunitXmlPlugin.teardown();
    
            const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
            const envProperties = metadata.envProperties;
            expect(envProperties).to.include.keys(reqKeys); 
        });

        it('and sapphireWebAppConfig is not available then it should use default values from Plugin and user info from process.env');

        it('and sapphireWebAppConfig does not have that info then it should use default values from Plugin and user info from process.env')

    })


    // TODO: Fix the following test
    describe('if config captureSapphireWebAppContextVar is not set', function () {
        protractorJunitXmlPlugin.__set__('pluginConfig', {
            path: '../', //path for protractor plugin
            outdir: '_test-reports',
            filename: 'e2e-tests',
            jiraProjectKey: 'CARE',
            timeTillMinuteStamp: (new Date()).toISOString().substr(0, 16).replace(':', '_'),
            uniqueName: true, //default true
            uniqueFolder: true // default false
        });

        it('then it should not capture any sapphireWebAppConfig context fields in metadata', async function () {
            const fakeFs = setupFakefs();

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
            const fakeFs = setupFakefs();

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
                const fakeFs2 = setupFakefs();

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

                const metadata = JSON.parse(fakeFs2.writeFileSync.firstCall.args[1]);
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
