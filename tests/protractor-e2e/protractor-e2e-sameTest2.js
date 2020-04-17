const { browser, by, element } = require('protractor');
const fs = require('fs');
const rimraf = require('rimraf');

describe('', () => {
    beforeAll(() => {
        rimraf('./_test-reports/browser-based-results*', (err) => {
            if(err) {
                console.error('Deleting dir failed: ' + err);
            } else {
                console.log('Successfully deleted all the dir');
            }
        })
    });

    it(':XRAY-1234: Passing test with xrayId', async () => {
        debugger;
        await browser.waitForAngularEnabled(false);
        await browser.get('http://localhost:3020/');
        await browser.sleep(1000);
        expect(await element(by.cssContainingText('h2','This is node test app for junit-xml-plugin')).isPresent()).toBeTruthy();
    });

    it(':XRAY-1235: Failing test with xrayId', async () => {
        await browser.waitForAngularEnabled(false);
        await browser.get('http://localhost:3020/');
        await browser.sleep(1000);
        expect(await element(by.cssContainingText('h2','This is not a test app for junit-xml-plugin')).isPresent()).toBeFalsy();
    });

    it('Passing test with no xrayId', async () => {
        await browser.waitForAngularEnabled(false);
        await browser.get('http://localhost:3020/');
        await browser.sleep(1000);
        expect(await element(by.cssContainingText('h2','This is node test app for junit-xml-plugin')).isPresent()).toBeTruthy();
    });

});