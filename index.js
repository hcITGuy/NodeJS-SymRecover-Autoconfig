// Name: SymRecover Autoconfiguration Script
// Version: 1.0
// Author: Matt G. <matt@hcitguy.io
// Desc: This NodeJS script will start instances of EMC's SymRecover pearl script to monitor, alert and restart suspended SRDF sessions.


const child_process = require('child_process');
const spawn = child_process.spawn;
const exec = child_process.exec;
const execFile = child_process.execFile;
const fs = require('fs');

var sid = '000' // change this to match your Sym's SID
var parser = require('xml2js-parser').parseString;
var util = require("util");
var winston = require('winston');
var logConf = {
                "file": {
                    "level": "debug",
                    "filename": "./logs/symrecover.log",
                    "maxsize": "4194304",
                    "maxFiles": "20",
                    "json": false,
                    "prettyPrint": true,
                    "tailable": true,
                    "zippedArchive": true
                }
            }

    winston.loggers.add("log", logConf);
var logVar = winston.loggers.get("log");
var log = logVar.info;
const execOpts = {
timeout: 30000,
maxBuffer: 4096*1024,
env: {
    SYMCLI_OUTPUT_MODE: 'XML',
    }
}
const spawnOpts = {
    cwd: "c:/scripts/nodejs/symrecover_autoconfig/", // or wherever you keep it

    stdio: [ 'ignore', log, log ]

}
function i(obj) {
    return util.inspect(obj, showHidden = false, depth = 10, colorize = true);
}

function sendExec(cmd, callback) {
    var execResult = null;
    var execRes = null;
    exec(cmd, execOpts, function (error, stdout, stderr) {
        if (stdout != ''){
        parser(stdout, {trim: true, explicitArray: false}, function (err, result) {
            stdout = result;
        })
    }
            callback(error, stdout, stderr);
})};

function checkOutput(error, stdout, stderr) {
    if (stderr != ''){
    var result = 'An error was encountered:' + stderr;
    } else {
    var result = stdout;
    }
    return   result
}
log("LOG INITIALIZED")


sendExec('symcfg -sid '+ sid + ' list -rdfg all', function(error, stdout, stderr) {
// In the next code block there are a couple filters working against the output of the symcfg command we just issued:
//    1. We are only looking at RDFG numbers that are less than 200. This is an easy way to differentiate "real" or "prod" RDF Groups
//        from "test" or "temporary" groups...provided that you ensure your real groups are all numbered less than 200. You should
//        adjust the value in the  if(groupNum < 200) { test as needed.
//
//    2. We are appending the prefix "rdfg_" to the groupNum variable to produce our RDFG name. Again, this works only if your groups
//        are named accordingly and the value here should be adjusted as needed: var group = "rdfg_" + groupNum
//
    var output = checkOutput(error, stdout, stderr);
    for (var index in output.SymCLI_ML.Symmetrix.RdfGroup) {
        var groupNum = output.SymCLI_ML.Symmetrix.RdfGroup[index].ra_group_num;
        if(groupNum < 200) {
            var group = "rdfg_" + groupNum
                      // Default install location on Windows
            var cmd = "cmd.exe /c C:\\PROGRA~1\\EMC\\SYMCLI\\PERL\\bin\\perl C:\\PROGRA~1\\EMC\\SYMCLI\\bin\\SymRecover\\symrecover.pl -options symrecover_runfile -mode async -g " + group
            console.log('Executing: ' + cmd);
            var child = exec(cmd,null, spawnOpts)
            child.stdout.on('data', function (data) {
                  console.log(data);
                  log(data);
               });
               child.stderr.on('data', function (data) {
                   console.log(data);
                   log(data);
               });
               child.on('close', function (code) {
                  console.log('exited with code: ' + code);
                  log('exited with code: ' + code);
               });
        }
    }
});
