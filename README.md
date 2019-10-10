# protractor-junit-xml-plugin
[![NPM](https://img.shields.io/npm/v/protractor-junit-xml-plugin.svg)](https://www.npmjs.com/package/protractor-junit-xml-plugin)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://scm.sapphirepri.com/arsalan.siddiqui/protractor-junit-xml-plugin.git)
 
**Description**: This plugin is a protractor reporter plugin that reports the test results in JUnit XML file so if you are looking for a plugin to export JUnit XML results you are at the right place. 
This plugin also has an additional option to parse and extract Xray Id (A JIRA plugin to identify requirements) from a test name and put it in a separate attribute in the output exported XML. This can help in exporting test results with xrayId and link the test to a requirement in Xray Jira (Continuous Integration). It also has an option to just use tests with an xrayId and ignore the tests that don't have an XrayId. By default these additional options are turned off. Please see the configuration section for the option details

- **Technology stack**: This is a protractor plugin written in Javascript. It is a node module and can be imported using npm  
- **Status**:  This is the first functional version of this plugin. We are planning to add a change log starting from the next version  

## Dependencies
This plugin is dependent on the node modules "xmlbuilder currently 12.0.1" and "xml2js-parser currently v1.1.1"". Although these dependencies should be install automatically when this plugin would be installed using npm

## Installation

The easiest way is to keep `protractor-junit-xml-plugin` as a dependency in your `package.json` pointing to its current repo 

```bash
npm install protractor-junit-xml-plugin --save-dev
```

To update to the latest version
```bash
npm update protractor-junit-xml-plugin
```

## Configuration

For an example of a protractor config file for this plugin, please see plugin section of [protractor.conf.js](tests/protractor.conf.js) located in the tests folder of this plugin

The following are the configurable options
```   
outdir: output directory of the test results, if not specified it defaults the directory name to "_test-reports"

filename: the filename starting of output result file, if not specified it defaults the file name to "test-results.xml" 

parseXrayId: If set to true it will try to extract Xray Jira id from the test name and put it in the attribute "requirement" in testcase result xml. The id should be in between two colons e.g ":XRAY-1234: test to check report graphs". The result testcase element would be like <testcase name="Failing test with xrayId" ... requirements="XRAY-1234">. This is helpful if this tet is attached to a jira requirement and you want to report back the result(Continuous Integration). 
if not specified it defaults to "false"

xrayIdOnlyTests: If set to true, it will only consider the tests that have Xray Jira Id in their name. If not specified it defaults to "false"

uniqueName: If set to true, it will generate a unique name for the filename. Default is true. This can not be true if appendToFile is also true.

appendToFile: If set to true, it will append xml data to the bottom of the file instead of creating a new file or overwriting the file. This can not be true if uniqueName is set to true. Default is false
```

## Usage

After setting the plugin config in the protractor config file (usually named as protractor.conf.js). This plugin would run everytime you run the tests. It will generate the junit output xml in the specified output directory. For each browser there will be a seapate junit out xml file. For e.g if we have set two browsers in our protractor config lets say firefox and chrome and we gave filename option in plugin cofig as `e2e-tests` then the file names will be
- chrome-e2e-tests.xml
- firefox-e2e-tests.xml

*If the result file already exist then the plugin will not overwrite it but it will append the current test results in a new `testsuite` element with a timestamp*

## How to test the software

This module includes a tests folder that contains a simple node test app and end to end(e2e) tests of the plugin. The e2e tests are in [protractor](https://www.protractortest.org/#/). To run the tests 
1. Firstly, install all the dependencies by `npm install`.
2. Install protractor as a global dependency `npm i -g protractor`
3. Start the node test app `node tests/testapp/server.js` (tested on node v10).
4. Run the tests `protractor tests/protractor.conf.js`

## Known issues

We are actively using this plugin for our protractor e2e tests and have not seen any issues so for. Please contact us if you run into any issues.

## Contact / Getting help

You can contact any of us if you run into any issues 
- Arsalan Siddiqui <<Arsalan.Siddiqui@philips.com>>
- Marcus Beacon <<Marcus.Beacon@philips.com>>

## License

[MIT License](LICENSE.md) 

## Credits and references

We needed a protractor plugin to export our test results to a JUnit XML file with XRay Ids so we wrote this plugin. We have tried to make it general with the configurable options so that it can be as useful as possible. 
We thank you to "Philips Health Solutions" in general to give us opportunity to write this plugin. We are also very thankful to [Ryan Gatto](mailto:Ryan.Gatto@philips.com) for his positive and supportive efforts all along.
