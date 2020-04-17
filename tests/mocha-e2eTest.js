const fs = require('fs');
const process = require('process');
const { spawn, spawnSync } = require('child_process');
const expect = require('chai').expect;

describe('Running protractor e2e test', function () {

    let nodeProcess, 
        protractorProcess;
    before('starting the application', async function () {
        
        nodeProcess = await spawn('node', ['tests/testapp/server.js']);

        // console.log('Server: \n' + nodeProcess.output.toString('utf8'));
        nodeProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        nodeProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        nodeProcess.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    });

    it('Runing test', async function () {
        console.log('MUHAHAHA');
        let deleteFolderRecursive = function(path) {
            if( fs.existsSync(path) ) {
              fs.readdirSync(path).forEach(function(file,index){
                var curPath = path + "/" + file;
                if(fs.lstatSync(curPath).isDirectory()) { // recurse
                  deleteFolderRecursive(curPath);
                } else { // delete file
                  fs.unlinkSync(curPath);
                }
              });
            }
          };

        let runProtractorTests = () => {
            
            protractorProcess = spawnSync('protractor', ['tests/protractor.conf.js']);
            console.log('In before: protractorProcess.status: ' + protractorProcess.status);
            
            console.log('results: \n' + protractorProcess.output.toString('utf8'));

            // protractorProcess.stdout.on('data', (data) => {
            //     console.log(`stdout: ${data}`);
            // });

            // protractorProcess.stderr.on('data', (data) => {
            //     console.error(`stderr: ${data}`);
            // });

            // protractorProcess.on('close', (code) => {
            //     console.log(`child process exited with code ${code}`);
            // });
        }

        let countSubDirs = (folder) => {
    
            console.log(`Coming in countSubDir ${folder} and process.cwd(): ${process.cwd()} __dirname ${__dirname}`);
            
           if (fs.existsSync(folder)) {
             console.log('inside fs.existsSync ');
               
             let files = fs.readdirSync(folder);
             console.log('files.length: ' + files.length);
             return files.length;
           }   
        }

        await setTimeout(function () {
            console.log('Inside main it function');
            const TARGET_DIR = __dirname + '/../_test-reports';
            // console.log(`process.cwd(): ${process.cwd()} __dirname ${__dirname}`);

            deleteFolderRecursive(TARGET_DIR);
            runProtractorTests();
            // console.log(`process.cwd(): ${process.cwd()} __dirname ${__dirname}`);

            const subDirCount = countSubDirs(TARGET_DIR);
            expect(subDirCount).to.equal(1); 
        }, 1000);


    });

    after('Tearing down the application', async function () {

        let shutdown = async () => {
            console.log('Inside Shutdown');
            
            await setTimeout(function() {
                if(protractorProcess) {
                    console.log('In shutdown(): Protractor process status: ' + protractorProcess.status);
                    // console.log(JSON.stringify(protractorProcess));
                    if (protractorProcess.status === 0) {
                        console.log('protractorProcess.status is 0');
                    }
                } else {
                    console.log('In shutdown(): protractorProcess not defined');
                }
                nodeProcess.kill('SIGHUP');

            }, 5000);
        } 

        await shutdown();
    });
})