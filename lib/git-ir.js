'use strict';

var Promise = require('promise');
var WinExe = require('winexe');

function gitIr(gitCmd, options) {
  var cmd = 'git ';
  if (options.repo) {
    cmd += '-C "'+options.repo+'" ';
  }
  cmd += gitCmd;

  var winexe = new WinExe(options);

  var p = new Promise(function(resolve, reject) {
    winexe.run(cmd, function(err, stdout, stderr) {
      if (err) reject(parseToArray(stderr));
      else resolve(parseToArray(stdout));
    });
  });
  return p;
}

function parseToArray(data) {
  var lines = data.split("\n");
  while (lines.length && !lines[lines.length-1]) {
    lines.pop();
  }
  return lines;
}

module.exports = gitIr;
