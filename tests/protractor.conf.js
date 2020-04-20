const { SpecReporter } = require('jasmine-spec-reporter');
const fs = require('fs');
const tempTimestampForDirFile = 'resultDirName.txt';

exports.config = {
    // seleniumAddress: 'http://127.0.0.1:4444/wd/hub',

    params: {
        metadataFile: {
            buildNumber: 'Default',
            summary: 'Default summary'
        }
    },

    allScriptsTimeout: 110000,
    specs: [
        './protractor-e2e/protractor-e2e-sameTest1.js',
        './protractor-e2e/protractor-e2e-sameTest2.js'
    ],
    SELENIUM_PROMISE_MANAGER: false,
    capabilities: {
        browserName: 'chrome',
        chromeOptions: {
            // "args": ["incognito", "--window-size=1920,1080", "start-maximized", "--test-type=browser"],
            // args: ['disable-extensions'],
            args: ['--headless', 'disable-extensions'],
            prefs: {
                download: {
                    prompt_for_download: false
                }
            }
        },
        shardTestFiles: true,
        maxInstances: 2
    },
    // multiCapabilities: [
    //     {
    //         browserName: 'chrome'
    //         // chromeOptions: {
    //         //     // "args": ["incognito", "--window-size=1920,1080", "start-maximized", "--test-type=browser"],
    //         //     // args: ['disable-extensions'],
    //         //     args: ['--headless', 'disable-extensions'],
    //         //     prefs: {
    //         //         download: {
    //         //             prompt_for_download: false
    //         //         }
    //         //     }
    //         // }
    //     },
    //     { browserName: 'firefox' }
    // ],
    directConnect: true,
    baseUrl: 'http://localhost:3020/',
    framework: 'jasmine',
    jasmineNodeOpts: { 
        showColors: true,
        defaultTimeoutInterval: 120000,
        print: function() {}
    },
    beforeLaunch: () => {
        let currentTimestamp = (new Date()).toISOString().replace(/:/g,'_').replace('\.','');
        // console.log('this: ' + JSON.stringify(this.config));

        fs.writeFileSync(tempTimestampForDirFile, currentTimestamp, function(err) {
            if (err) {
                console.warn('Cannot write resultDirName.txt\n\t' + err.message);
            } else {
                console.debug('name written to resultDirName.txt');
            }
        });
    },

    onPrepare: () => {
        const resultDirName = fs.readFileSync(tempTimestampForDirFile, 'utf8');
        console.debug('resultDirName: ' + resultDirName);
        if (resultDirName) {
            browser.timestampForDir = resultDirName;
        } else {
            console.debug('resultDirName not found');
        }
        jasmine.getEnv().addReporter,(new SpecReporter({ spec: { displayStacktrace: true } }));
    },
    plugins: [
        {
            path: '../', //path for protractor plugin
            outdir: '_test-reports',
            filename: 'e2e-tests',
            parseXrayId: true, //default false
            jiraProjectKey: 'CARE',
            uniqueName: true, //default true
            uniqueFolderPerExecution: true, // default false
            captureSapphireWebAppContextVar: true //default false
        }
    ]
};
