'use strict';

var gitIr = require('./git-ir');
var Promise = require('promise');

function GitIrDone(options) {
  this.options = options;
}

GitIrDone.prototype.pullChanged = function() {
  var self = this;
  return this.getCurrentBranch()
    .then(function(branch) {
      return self.fetch()
        .then(function() {
          return self.getChangedFiles(branch);
        })
        .then(function(files) {
          if (files.length) {
            return self.getLastCommonCommit(branch)
              .then(function(commit) {
                return self.reset(commit);
              })
              .then(function() {
                return self.pull();
              })
              .then(function() {
                return files;
              });
          }
          return files;
        });
    });
}

GitIrDone.prototype.getCurrentBranch = function() {
  return gitIr('branch',this.options)
    .then(function(data) {
      var branch;
      data.forEach(function(line) {
        var b = line.split(/\s+/g);
        if (b[0] == '*') {
          branch = b[1];
        }
      });
      return branch;
    });
}

GitIrDone.prototype.reset = function(commit) {
  var cmd = 'reset --hard';
  if (commit) {
    cmd += ' '+commit;
  }
  return gitIr(cmd, this.options)
    .then(function(data) {
      var passed = false;
      data.forEach(function(line) {
        if (/^HEAD is now at/.test(line)) {
          passed = true;
        }
      });
      if (!passed) {
        throw new Error("No HEAD");
      }
      return passed;
    });
}

GitIrDone.prototype.fetch = function() {
  return gitIr('fetch', this.options);
}

GitIrDone.prototype.getChangedFiles = function(branch) {
  return gitIr('diff --name-only '+branch+' origin/'+branch, this.options);
}

GitIrDone.prototype.pull = function() {
  return gitIr('pull', this.options)
    .then(function(data) {
      var passed = false;
      var changed = 0;
      data.forEach(function(line) {
        var matched = line.match(/(\d+) files changed/);
        if (matched) {
          changed = matched[1];
          passed = true;
          return;
        }
        if (/Already up-to-date/.test(line)) {
          passed = true;
          return;
        }
      });
      if (!passed) {
        throw new Error("Pull failed");
      }
      return changed;
    });
}

GitIrDone.prototype.getLastCommonCommit = function(branch) {
  return gitIr('merge-base '+branch+' origin/'+branch, this.options);
}

GitIrDone.prototype.getLastCommit = function(branch) {
  var cmd = 'log -n 1 --format=format:%H';
  if (branch) {
    cmd += ' '+branch;
  }
  return gitIr(cmd, this.options);
}

GitIrDone.prototype.isDiverged = function(branch) {
  var self = this;
  return Promise.all([
    function() {
      return self.getLastCommonCommit(branch);
    },
    function() {
      return self.getLastCommit(branch);
    }
    ])
    .then(function(commonCommit, lastCommit) {
      return commonCommit != lastCommit;
    });
}


module.exports = GitIrDone;
