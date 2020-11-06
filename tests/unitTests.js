'use strict';
let expect = require('chai').expect;

let sinon = require('sinon');

// var proxyquire = require('proxyquire');
let rewire = require('rewire');

let common = require('../common.js');

let protractorJunitXmlPlugin,
    fakeBuilder = {},
    fakeOs = {},
    fakePath = {
        resolve: () => '/fake-path'
    },
    fakeParseStringSync = {},
    noop = () => { };

describe('In protractor-junit-xml-plugin', function () {
    const fakeSuite = {
        first: {
            att: (input1, input2) => {
                console.log('suite.att() called with input: ' + input1 + ', ' + input2);
            },
            ele: sinon.spy()
        }
    }

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
        suites: fakeSuite,
        xml: {
            end: () => '<fake-xml><testsuites>' +
            '<testsuite name="chrome 81.0.4044.122" timestamp="2020-04-22T20:16:58" id="0" hostname="Ms-MacBook-Pro" tests="2" failures="0">' + 
            '<testcase name="fake testcase name" time="0" classname="fake classname"/></suite></fake-xml>'
        }
    });

    protractorJunitXmlPlugin.__set__('pluginConfig', {
        parseXrayId: true,
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

        let revert = addGivenKeysToProcessEnv(varToAdd);
        const fakeFs = setupFakefs();

        await protractorJunitXmlPlugin.teardown();

        const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
        expect(metadata).to.exist;
        expect(metadata).to.have.all.keys(['jiraProjectKey', 'envProperties']);
        const envProperties = metadata.envProperties;
        expect(envProperties).to.not.include.keys(testKeys);
        revert();
    });

    describe('When XRAY-ID tag has delimiters in name field:', function () {
        it('The name is not truncated', async function () {
            let splice = await common.findXrayIdAndName(':XRAY-ID:GLADOS-5566:Name with a colon : in it', true);

            expect(splice.xrayId).to.eq('GLADOS-5566');
            expect(splice.name).to.eq('Name with a colon : in it');
        });
    });

    describe('parse XRAY ID tag format :XRAY-ID:[JIRA-ID]:', function () {
        let requirementId;
        const fakeResult = {
            category: 'fake class'
        };

        it('when one JIRA-ID is given, it should be set in requirements', async function () {
            requirementId = 'GLADOS-5565';
            fakeResult.name = ':XRAY-ID:' + requirementId + ': this is a fake unit test',

                await protractorJunitXmlPlugin.postTest(true, fakeResult);
            const createdElement = fakeSuite.first.ele.firstCall.args[1];

            expect(createdElement.requirements).to.exist;
            expect(createdElement.requirements).to.eq(requirementId);
        });

        it('when multiple JIRA-IDs are given, all multiple ids should be set in requirements', async function () {
            requirementId = 'GLADOS-397, GLADOS-5565, GLADOS-5566';
            fakeResult.name = ':XRAY-ID:' + requirementId + ': this is a fake unit test',

                await protractorJunitXmlPlugin.postTest(true, fakeResult);
            const createdElement = fakeSuite.first.ele.secondCall.args[1];

            expect(createdElement.requirements).to.exist;
            expect(createdElement.requirements).to.eq(requirementId);
        });
    });

    describe('if process.env do not have TEAMCITY_BUILDCONF_NAME and BUILD_NUMBER', function () {
        it('and sapphireWebAppConfig has related info then it should try to populate it from sapphireWebAppConfig global', async function () {
            const reqKeys = ['BUILD_NUMBER', 'TEAMCITY_BUILDCONF_NAME'];
            const fakeFs = setupFakefs();

            await protractorJunitXmlPlugin.teardown();

            const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
            const envProperties = metadata.envProperties;
            expect(envProperties).to.include.keys(reqKeys);
        });

        it('and sapphireWebAppConfig is not available then it should use default values from Plugin and user info from process.env', async function () {
            const fakeFs = setupFakefs();

            // setting up sapphireWebAppConfig null
            protractorJunitXmlPlugin.__set__('currentBrowser', {
                baseUrl: 'https://unit-test-fake-url.com',
                executeScript: async function (input) {
                    console.log('fake executeScript is called with input: ' + input)
                    return null;
                }
            });

            await protractorJunitXmlPlugin.teardown();
            const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
            const envProperties = metadata.envProperties;
            expect(envProperties).to.include.keys('TEAMCITY_BUILDCONF_NAME');
        });

        it('and sapphireWebAppConfig does not have that info then it should use default values from Plugin and user info from process.env', async function () {
            const fakeFs = setupFakefs();

            // setting up sapphireWebAppConfig without appName
            protractorJunitXmlPlugin.__set__('currentBrowser', {
                baseUrl: 'https://unit-test-fake-url.com',
                executeScript: async function (input) {
                    console.log('fake executeScript is called with input: ' + input)
                    return {
                        environment: "production",
                        appVersion: "1.28.0-prerelease.46",
                        careOrchestratorBuildNumber: "11493",
                        careOrchestratorLastBuildDate: "NOT_SET",
                        TOGGLES: {
                            STATIC_TOGGLE_RWD: true,
                        },
                        gatewayUrl: "http://nti-sapphiregateway-v1-server.cloud.pcftest.com:80"
                    }
                }
            });

            await protractorJunitXmlPlugin.teardown();

            const metadata = JSON.parse(fakeFs.writeFileSync.firstCall.args[1]);
            const envProperties = metadata.envProperties;
            expect(envProperties).to.include.keys('TEAMCITY_BUILDCONF_NAME');
        });
    });

    describe('if config captureSapphireWebAppContextVar is not set', function () {

        before(function () {
            protractorJunitXmlPlugin.__set__('pluginConfig', {
                path: '../', //path for protractor plugin
                outdir: '_test-reports',
                filename: 'e2e-tests',
                jiraProjectKey: 'CARE',
                timeTillMinuteStamp: (new Date()).toISOString().substr(0, 16).replace(':', '_'),
                uniqueName: true, //default true
                uniqueFolder: true // default false
            });
        })

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
                'environment', 'appName', 'appVersion', 'PR_CARE_ORCHESTRATOR_VERSION',
                'isNewRelicEnabled', 'careOrchestratorVersion', 'careOrchestratorBuildNumber',
                'careOrchestratorLastBuildDate', 'TOGGLES_STATIC_TOGGLE_RWD',
                'TOGGLES_STATIC_TOGGLE_F2482_Business_Reports', 'TOGGLES_STATIC_ENABLE_SAPPHIRE_GATEWAY',
                'gatewayUrl'
            ]);
        });
    });

    describe('if config captureSapphireWebAppContextVar is set to true', function () {

        before(function () {
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
                'environment', 'appName', 'appVersion', 'PR_CARE_ORCHESTRATOR_VERSION',
                'isNewRelicEnabled', 'careOrchestratorVersion', 'careOrchestratorBuildNumber',
                'careOrchestratorLastBuildDate', 'TOGGLES_STATIC_TOGGLE_RWD',
                'TOGGLES_STATIC_TOGGLE_F2482_Business_Reports', 'TOGGLES_STATIC_ENABLE_SAPPHIRE_GATEWAY',
                'gatewayUrl'
            ]);
        });

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
                expect(envProperties).to.not.have.keys(['PR_CARE_ORCHESTRATOR_VERSION', 'TOGGLES_STATIC_TOGGLE_RWD',
                    'TOGGLES_STATIC_TOGGLE_F2482_Business_Reports', 'TOGGLES_STATIC_ENABLE_SAPPHIRE_GATEWAY']);
            }
        );
    });
});
