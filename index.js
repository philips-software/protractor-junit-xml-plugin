'use strict'
let os = require('os'),
  path = require('path'),
  fs = require('fs'),
  builder = require('xmlbuilder'),
  parseStringSync = require('xml2js-parser').parseStringSync;

let JUNITXMLPLUGIN = 'JUnitXrayPlugin: ',
  OUTDIR_FINAL,
  currentBrowser,
  outputFile,
  pluginConfig,
  xml,
  suites,
  testCount,
  failCount,
  currCapabilities;

let JUnitXmlPlugin = function () { }

let getBrowserId = async () => {
  if (!currCapabilities) {
    currCapabilities = await currentBrowser.getCapabilities();
  }
  return currCapabilities.get('webdriver.remote.sessionid');
}

let initliazeXmlForBrowser = async function () {
  let timestamp = (new Date()).toISOString().substr(0, 19);
  let name = currCapabilities.get('browserName') + ' ' + currCapabilities.get('browserVersion');
  suites[await getBrowserId()] = xml.ele('testsuite', {
    name: name, timestamp: timestamp, id: 0, hostname: os.hostname()
  });
};

let resolveCompleteFileName = (givenFileName, givenDir, uniqueFolder, givenTimestamp) => {
  // let OUTDIR_FINAL = ''
  if (uniqueFolder) {
    OUTDIR_FINAL = (givenDir || '_test-reports/e2e-test-results') + '/browser-based-results_' + givenTimestamp;
  } else {
    OUTDIR_FINAL = (givenDir || '_test-reports/e2e-test-results') + '/browser-based-results';
  }
  const FILE_NAME = currCapabilities.get('browserName') + '-' + (givenFileName || 'test-results.xml')

  if (!fs.existsSync(OUTDIR_FINAL)) {
    console.info(JUNITXMLPLUGIN + 'CREATING DIR + ' + OUTDIR_FINAL);
    fs.mkdir(OUTDIR_FINAL, { recursive: true }, function () { });
  }

  return path.resolve(OUTDIR_FINAL, FILE_NAME);
}

let addAttr = (attrObj, finalObj) => {
  for (let prop in attrObj) {
    finalObj['@' + prop] = attrObj[prop];
  }
}

let getJsonInXmlBuilderExpectedFormat = (inputFile) => {
  let output = fs.readFileSync(inputFile);
  let xmljsObj = parseStringSync(output);

  // Convert xml object to a sample object
  let convertedObj = {};
  convertedObj.testsuites = {
    testsuite: []
  }

  xmljsObj.testsuites.testsuite.map(testsuiteInput => {

    let testsuiteFinal = {
      testcase: []
    }
    addAttr(testsuiteInput.$, testsuiteFinal)
    // console.log(testsuiteFinal)

    // convert the testcase
    if (testsuiteInput.testcase) {
      testsuiteInput.testcase.map(testcase => {
        let testcaseFinal = {}
        addAttr(testcase.$, testcaseFinal);

        if (testcase.failure) {
          testcase.failure.map(failure => {
            testcaseFinal.failure = [];
            let failureFinal = {};
            addAttr(failure.$, failureFinal);

            testcaseFinal.failure.push(failureFinal);
          });
        }
        testsuiteFinal.testcase.push(testcaseFinal);
      });
    }
    convertedObj.testsuites.testsuite.push(testsuiteFinal);
  });

  return convertedObj;
}

let findXrayIdAndName = (name, parseXrayId) => {
  let finalObj = {};
  if (parseXrayId) {
    let tags = name.split(':', 3);

    if (tags.length > 1) {
      finalObj.xrayId = tags[1];
      finalObj.name = tags[2].trim();
    } else {
      // No xrayId found so just capturing name
      finalObj.name = name;
    }
  } else {
    finalObj.name = name;
  }

  return finalObj;
}

JUnitXmlPlugin.prototype.onPrepare = async function () {
  if (browser) {
    currentBrowser = browser;
  }
  if (!pluginConfig) {
    pluginConfig = this.config;
  }
  if (pluginConfig.uniqueName && pluginConfig.appendToFile || pluginConfig.uniqueFolder && pluginConfig.appendToFile) {
    throw new Error('You can not have a unique name or folder every time as well as appending results to the same file')
  }
  currCapabilities = await currentBrowser.getCapabilities();

  //use uniqueName
  if (pluginConfig.uniqueName === false) {
    outputFile = resolveCompleteFileName(pluginConfig.fileName, pluginConfig.outdir, pluginConfig.uniqueFolder, pluginConfig.timeTillMinuteStamp);
  } else {
    outputFile = resolveCompleteFileName(Math.round((new Date()).getTime() / 1000) + '.xml', pluginConfig.outdir, pluginConfig.uniqueFolder, pluginConfig.timeTillMinuteStamp);
  }
  // console.log('OUTPUT FILE: ' +outputFile);

  suites = Object.create(null);

  if (fs.existsSync(outputFile) && pluginConfig.appendToFile) {
    console.debug('Found existing outputFile and using it for ' + currCapabilities.get('browserName'));

    xml = builder.create(getJsonInXmlBuilderExpectedFormat(outputFile));
  } else {
    console.log('Existing results file not found')
    xml = builder.create('testsuites');
  }
  testCount = 0;
  failCount = 0;
  initliazeXmlForBrowser();
};

JUnitXmlPlugin.prototype.postTest = async function (passed, result) {
  if (!pluginConfig) {
    pluginConfig = this.config;
    console.log('HAMAHAHA: ERROR HERE ')
  }

  let testInfo = findXrayIdAndName(result.name, pluginConfig.parseXrayId);

  if (pluginConfig.xrayIdOnlyTests) {
    if (!testInfo.xrayId) return;
    console.debug('XRAY id tag: ' + testInfo.xrayId);
  }

  testCount++;
  let testcase = {
    name: testInfo.name,
    time: ((result.time || 0) / 1000),
    classname: result.category.replace(/\./g, '_')
  };

  if (pluginConfig.parseXrayId) {
    testcase.requirements = testInfo.xrayId;
  }

  let spec = suites[await getBrowserId()].ele('testcase', testcase);

  if (!passed) {
    spec.ele('failure', { msg: 'testcase failed' });
    failCount++;
  }
};

JUnitXmlPlugin.prototype.teardown = async function () {
  if (!pluginConfig) {
    pluginConfig = this.config;
    console.log('HAMAHAHA: ERROR HERE ')
  }
  let sapphireWebAppConfig = ' ';
  let summary = 'Protractor UI e2e tests against ' + currentBrowser.baseUrl;
  // console.debug('summary: ' + summary);
  // debugger;
  let suite = suites[await getBrowserId()];

  
  // resolving path and creating dir if it doesn't exist
  if (pluginConfig.uniqueName === false) {
    outputFile = resolveCompleteFileName(pluginConfig.fileName, pluginConfig.outdir, pluginConfig.uniqueFolder, pluginConfig.timeTillMinuteStamp);
  } else {
    outputFile = resolveCompleteFileName(Math.round((new Date()).getTime() / 1000) + '.xml', pluginConfig.outdir, pluginConfig.uniqueFolder, pluginConfig.timeTillMinuteStamp);
  }

  let metaDataContents = {
    jiraProjectKey: pluginConfig.jiraProjectKey,
    envProperties: {}
  }
  if (pluginConfig.captureCOContextVar) {
    // add sapphireWebAppConfig app object properties
    sapphireWebAppConfig = await currentBrowser.executeScript('return sapphireWebAppConfig.appVersion');
    console.debug('sapphireWebAppConfig: ' + JSON.stringify(sapphireWebAppConfig))
    const requiredKeys = ['environment', 'appName', 'appVersion', 
    'isNewRelicEnabled', 'careOrchestratorVersion', 'careOrchestratorBuildNumber',
    'careOrchestratorLastBuildDate', 'gatewayUrl']
    
    // start from here in the next session
    requiredKeys.forEach((item) => (metaDataContents.envProperties[item] = sapphireWebAppConfig[item]));
    if(sapphireWebAppConfig.packagedDeps) {
      metaDataContents.envProperties.pr_care_orchestrator_version = sapphireWebAppConfig.packagedDeps['pr.care-orchestrator'];
    }
    // Get toggles and add them using 
    const TOGGLE_PREFIX = 'TOGGLES_'
    for(let toggle in sapphireWebAppConfig.TOGGLES) {
      metaDataContents.envProperties[TOGGLE_PREFIX + toggle] = sapphireWebAppConfig.TOGGLES[toggle]; 
    }  
  }

  fs.writeFileSync(OUTDIR_FINAL + "/metadata.json", JSON.stringify(metaDataContents), function (err) {
    if (err) {
      console.warn('Cannot write metadata file\n\t' + err.message);
    } else {
      console.debug('Metadata file results written to metadata.json');
    }
  });

  suite.att('tests', testCount);
  suite.att('failures', failCount);

  // Fix if dir already exist before uncommenting below line
  fs.writeFile(outputFile, xml.end({ pretty: true }), function (err) {
    if (err) {
      console.warn('Cannot write JUnit xml\n\t' + err.message);
    } else {
      console.debug('JUnit results written to "%s".', outputFile);
    }
  });
}

module.exports = new JUnitXmlPlugin();
module.exports.JUnitXrayPlugin = JUnitXmlPlugin;
