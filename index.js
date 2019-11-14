'use strict'
const os = require('os'),
      path = require('path'),
      fs = require('fs'),
      builder = require('xmlbuilder'),
      parseStringSync = require('xml2js-parser').parseStringSync,
      JUNITXMLPLUGIN = 'JUnitXrayPlugin: ';

let outputFile,
    OUTDIR_FINAL,
    xml,
    suites,
    testCount, 
    failCount,
    currentCapabilities;
    
let JUnitXmlPlugin = function () {}

let getBrowserId = async () => {
  if (!currentCapabilities) {
    currentCapabilities = await browser.getCapabilities();
  }
  return currentCapabilities.get('webdriver.remote.sessionid');
}

let initliazeXmlForBrowser = async function () {
  let timestamp = (new Date()).toISOString().substr(0, 19);
  let name = currentCapabilities.get('browserName') + ' ' + currentCapabilities.get('browserVersion');
  suites[getBrowserId()] = xml.ele('testsuite', {
    name: name, timestamp: timestamp, id: 0, hostname: os.hostname()
  });
};

let resolveCompleteFileName = (givenFileName, givenDir, uniqueFolder) => {
  // let OUTDIR_FINAL = ''
  if(uniqueFolder){ 
    OUTDIR_FINAL = (givenDir || '_test-reports/e2e-test-results') + '/browser-based-results_' + browser.timeTillMinuteStamp;
  } else {
    OUTDIR_FINAL = (givenDir || '_test-reports/e2e-test-results') + '/browser-based-results';
  }
  const FILE_NAME = currentCapabilities.get('browserName') + '-' + (givenFileName || 'test-results.xml')

  if (!fs.existsSync(OUTDIR_FINAL)) {
    fs.mkdirSync(OUTDIR_FINAL, { recursive: true });
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
  var pluginConfig = this.config;
  if(pluginConfig.uniqueName && pluginConfig.appendToFile || pluginConfig.uniqueFolder && pluginConfig.appendToFile) {
    throw new Error('You can not have a unique name or folder every time as well as appending results to the same file')
  }
  currentCapabilities = await browser.getCapabilities();
  //use uniqueName
  if (pluginConfig.uniqueName === false){
    outputFile = resolveCompleteFileName(pluginConfig.filename, pluginConfig.outdir, pluginConfig.uniqueFolder);
  } else {
    outputFile = resolveCompleteFileName(Math.round((new Date()).getTime() / 1000) + '.xml', pluginConfig.outdir, pluginConfig.uniqueFolder);
  }
  // console.log('OUTPUT FILE: ' +outputFile);

  suites = Object.create(null);

  if (fs.existsSync(outputFile) && pluginConfig.appendToFile) {
    console.debug('Found existing outputFile and using it for ' + currentCapabilities.get('browserName'));

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
  let pluginConfig = this.config;

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

  let spec = suites[getBrowserId()].ele('testcase', testcase);

  if (!passed) {
    spec.ele('failure', { msg: 'testcase failed' });
    failCount++;
  }
};

JUnitXmlPlugin.prototype.teardown = async function () {
  let pluginConfig = this.config;
  let vcsVersion = ' ';
  if(pluginConfig.useSapphireVCSBuildNumber) {
    vcsVersion = await browser.executeScript('return sapphireWebAppConfig.appVersion');
    console.log('VCSVersion: ' + vcsVersion)
  } else if (pluginConfig.buildNumber !== 'Default') {
    vcsVersion = plugin.buildNumber;
  }
  let metaDataContents = '{buildNumber: ' + vcsVersion + '},\n{summary + ' + browser.params.metadataFile.summary + '}' 
  fs.writeFile(OUTDIR_FINAL + "/Metadata.properties", metaDataContents, function (err) {
  if (err) {
        console.warn('Cannot write Metadata file xml\n\t' + err.message);
  } else {
        console.debug('Metadata file results written to Metadata.properties');
  }});

  let suite = suites[getBrowserId()];

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