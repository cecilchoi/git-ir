'use strict';

var gitIr = require('./git-ir');
var Promise = require('bluebird');

function GitIrDone(options) {
  this.options = options;
}

GitIrDone.prototype.run = function(command) {
  return gitIr(command, this.options);
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
  return this.run('branch')
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

GitIrDone.prototype.setBranch = function(branch) {
  return this.run('checkout '+branch)
    .then(function(data) {
      var switched = false;
      data.forEach(function(line) {
        if (line.match('Switched to branch') || line.match('Already on')) {
          switched = true;
        }
      });
      return switched;
    });
}

GitIrDone.prototype.reset = function(params) {
  var cmd = 'reset';
  if (params) {
    cmd += ' '+params;
  }

  return this.run(cmd)
    .then(function(data) {
      var passed = false;
      data.forEach(function(line) {
        passed = passed || /^HEAD is now at/.test(line);
      });
      if (!passed) {
        throw new Error("No HEAD");
      }
      return passed;
    });
}

GitIrDone.prototype.resetToCommit = function(commit) {
  var params = '--hard '+commit;
  return this.reset(params);
}

GitIrDone.prototype.resetToBranch = function(branch) {
  var params = '--hard origin/'+branch;
  return this.reset(params);
}

GitIrDone.prototype.fetch = function() {
  return this.run('fetch');
}

GitIrDone.prototype.getChangedFiles = function(branch) {
  return this.run('diff --name-only '+branch+' origin/'+branch);
}

GitIrDone.prototype.pull = function() {
  return this.run('pull')
    .then(function(data) {
      var passed = false;
      var changed = 0;
      data.forEach(function(line) {
        var matched = line.match(/(\d+) files? changed/);
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
        throw new Error("Pull failed: "+data.join("\n"));
      }
      return changed;
    });
}

GitIrDone.prototype.getLastCommonCommit = function(branch) {
  return this.run('merge-base '+branch+' origin/'+branch)
    .then(function(data) {
      return data[0];
    });
}

GitIrDone.prototype.getLastCommit = function(branch) {
  var cmd = 'log -n 1 --format=format:%H';
  if (branch) {
    cmd += ' '+branch;
  }
  return this.run(cmd)
    .then(function(data) {
      return data[0];
    });
}

GitIrDone.prototype.isDiverged = function(branch) {
  return Promise.all([
    this.getLastCommonCommit(branch),
    this.getLastCommit(branch)
  ])
    .then(function(data) {
      if (data[0] != data[1]) {
        return data[0];
      }
      return;
    });
}


module.exports = GitIrDone;
