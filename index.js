'use strict'
const os = require('os'),
  path = require('path'),
  fs = require('fs'),
  builder = require('xmlbuilder'),
  parseStringSync = require('xml2js-parser').parseStringSync;

let common = require('./common.js');

let JUNITXMLPLUGIN = 'JUnitXrayPlugin: ',
  OUTDIR_FINAL,
  PR_CARE_ORCHESTRATOR_VERSION = 'PR_CARE_ORCHESTRATOR_VERSION',
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
  // console.info('Curr Capabilities: ' + JSON.stringify(currCapabilities));
  let name = currCapabilities.get('browserName') + ' ' + currCapabilities.get('browserVersion');
  let browserPlatform = currCapabilities.get('platformName');
  let browserPlatformVersion = currCapabilities.get('platformVersion');

  suites[await getBrowserId()] = xml.ele('testsuite', {
    browser: name,
    browserPlatform: browserPlatform,
    browserPlatformVersion: browserPlatformVersion, 
    hostname: os.hostname(),
    timestamp: timestamp, 
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
};

const addSapphireWebAppConfigProperties = async (envProperties) => {
  try {
  let sapphireWebAppConfig = await currentBrowser.executeScript('return sapphireWebAppConfig');

  // if sapphireWebAppConfig global var not present then quit
  if (!sapphireWebAppConfig) return;
  console.debug('sapphireWebAppConfig: ' + JSON.stringify(sapphireWebAppConfig));
  const requiredKeys = ['environment', 'appName', 'appVersion',
    'isNewRelicEnabled', 'careOrchestratorVersion', 'careOrchestratorBuildNumber',
    'careOrchestratorLastBuildDate', 'gatewayUrl'];
  const PR_CARE_ORCH_KEY = 'pr.care-orchestrator',
    TOGGLES_KEY = 'TOGGLES',
    PACKAGED_DEPS_KEY = 'packagedDeps';

  requiredKeys.forEach((item) => (envProperties[item] = sapphireWebAppConfig[item]));

  if (sapphireWebAppConfig[PACKAGED_DEPS_KEY]) {
    envProperties[PR_CARE_ORCHESTRATOR_VERSION] = sapphireWebAppConfig.packagedDeps[PR_CARE_ORCH_KEY];
  }
  // Get toggles and add them in metadata 
  const TOGGLE_PREFIX = 'TOGGLES_'
  for (let toggle in sapphireWebAppConfig[TOGGLES_KEY]) {
    envProperties[TOGGLE_PREFIX + toggle] = sapphireWebAppConfig.TOGGLES[toggle];
  }
  } catch (err) {
    console.error('sapphireWebAppConfig not found. Here is the err: ' + err);
  }
}

const addReqProcessEnvProp = (envProperties) => {
  const reqKeys = ['BUILD_NUMBER', 'TEAMCITY_BUILDCONF_NAME', 'USER', 'LANG', 'PWD'];
  reqKeys.forEach((key) => (envProperties[key] = process.env[key]));
}

JUnitXmlPlugin.prototype.onPrepare = async function () {
  if (browser) {
    currentBrowser = browser;
  }
  if (!pluginConfig) {
    pluginConfig = this.config;
  }
  if (pluginConfig.uniqueName && pluginConfig.appendToFile || pluginConfig.uniqueFolderPerExecution && pluginConfig.appendToFile) {
    throw new Error('You can not have a unique name or folder every time as well as appending results to the same file')
  }
  currCapabilities = await currentBrowser.getCapabilities();

  //use uniqueName
  if (pluginConfig.uniqueName === false) {
    outputFile = resolveCompleteFileName(pluginConfig.fileName, pluginConfig.outdir, false);
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
    console.warn('Plugin config not initialized so initializing it after test: ' + result.name);
  }
  
  let testInfo = common.findXrayIdAndName(result.name, pluginConfig.parseXrayId);

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
  if(!currentBrowser) {
    currentBrowser = browser;
  }
  if (!pluginConfig) {
    pluginConfig = this.config;
  }

  let suite = suites[await getBrowserId()];

  suite.att('tests', testCount);
  suite.att('failures', failCount);
  const finalXml = xml.end({ pretty: true });
  // console.log('xml object:\n' + JSON.stringify(xml));

  // console.log('finalXml: \n' + finalXml);
  if (finalXml.indexOf('testcase') < 0) {
    console.log('No testcase recorded so no need to write the result xml file');
    return 0;
  }

  // resolving path and creating dir if it doesn't exist
  if (pluginConfig.uniqueName === false) {
    outputFile = resolveCompleteFileName(pluginConfig.fileName, pluginConfig.outdir, false);
  } else {
    console.debug('Inside plugin: browser.timestampForDir: ' + currentBrowser.timestampForDir);
    const uniqueNumber = (new Date()).getTime() + Math.floor((Math.random() * 1000) + 1);;
    
    outputFile = resolveCompleteFileName( uniqueNumber + '.xml', pluginConfig.outdir, pluginConfig.uniqueFolderPerExecution, currentBrowser.timestampForDir);
  }

  // Fix if dir already exist before uncommenting below line
  fs.writeFile(outputFile, finalXml, function (err) {
    if (err) {
      console.warn('Cannot write JUnit xml\n\t' + err.message);
    } else {
      console.debug('JUnit results written to "%s".', outputFile);
    }
  });


  let metaDataContents = {
    jiraProjectKey: pluginConfig.jiraProjectKey,
    envProperties: {}
  }

  // add process.env useful properties
  addReqProcessEnvProp(metaDataContents.envProperties);

  if (pluginConfig.captureSapphireWebAppContextVar) {
    // add sapphireWebAppConfig app object properties
    await addSapphireWebAppConfigProperties(metaDataContents.envProperties);

    // if BUILD_NUMBER & TEAMCITY_BUILDCONF_NAME not found then populate them using sapphireWebAppConfig
    if (!metaDataContents.envProperties.BUILD_NUMBER) {
      if (metaDataContents.envProperties[PR_CARE_ORCHESTRATOR_VERSION]) {
        metaDataContents.envProperties.BUILD_NUMBER = metaDataContents.envProperties[PR_CARE_ORCHESTRATOR_VERSION];
      }
    }

    if (!metaDataContents.envProperties.TEAMCITY_BUILDCONF_NAME) {
      if (metaDataContents.envProperties.appName) {
        metaDataContents.envProperties.TEAMCITY_BUILDCONF_NAME = metaDataContents.envProperties.appName;
      } else {
        metaDataContents.envProperties.TEAMCITY_BUILDCONF_NAME = 'Local Run by User ' + process.env.USER; 
      }
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
