'use strict';

var gitIr = require('./git-ir');
var Promise = require('bluebird');
var _ = require('lodash');

var syncLoopMap = [
  {field:'branch',   command:'getCurrentBranch',                   message:'Current Branch is <%= result %>'},
  {field:'fetched',  command:'fetch',                              message:'Fetch complete'},
  {field:'changed',  command:'getChangedFiles',  param:'branch',   message:'Changed Files: <%= result %>',                           result:{0:{pulled:'1',diverged:'',matched:'1'}}},
  {field:'diverged', command:'isDiverged',       param:'branch',   message:'Branch is <%= result === "1" ? "" : "not " %>diverged'},
  {field:'modified', command:'getModifiedFiles', param:'diverged', message:'Uncommited Files: <%= result %>'},
  {field:'matched',  command:'reset',            param:'diverged', message:'Reset <%= result === "1" ? "complete" : "failed" %>',    result:{0:{pulled:'0'}}},
  {field:'pulled',   command:'pull',             param:'matched',  message:'Pull <%= result === "1" ? "complete" : "failed" %>'},
  {field:'complete',                             param:'pulled',   message:'Sync <%= result === "1" ? "complete" : "failed" %>'}
];


function GitIrDone(options) {
  this.options = options;
}

GitIrDone.prototype.run = function(command) {
  return gitIr(command, this.options);
}

GitIrDone.prototype.syncLoop = function(data) {
  var run = syncLoopMap.find(function(map) {
    return _.isUndefined(data[map.field]) && (!map.param || !_.isUndefined(data[map.param]));
  });
  var param = run.param ? data[run.param] : '';
  var p = run.command ? this[run.command](param) : Promise.resolve(param);

  return p.then(function(result) {
    var resultString;
    if (_.isArray(result)) {
      resultString = result.length.toString();
    }
    else if (_.isBoolean(result)) {
      resultString = result ? '1' : '0';
    }
    else {
      resultString = result.toString();
    }

    data[run.field] = resultString;
    data.message = _.template(run.message)({result:resultString});

    if (run.result && run.result[resultString]) {
      _.assign(data, run.result[resultString]);
    }
    return data;
  });
}

GitIrDone.prototype.getCurrentBranch = function() {
  return this.run('rev-parse --abbrev-ref HEAD')
    .then(function(data) {
      return data[0];
    });
}

GitIrDone.prototype.setBranch = function(branch) {
  var self = this;
  return this.fetch()
    .then(function() {
      return self.run('checkout '+branch);
    })
    .then(function(data) {
      var switched = false;
      data.forEach(function(line) {
        if (line.match('Your branch is up-to-date with') || line.match(' set up to track remote branch ')) {
          switched = true;
        }
      });
      return switched;
    });
}

GitIrDone.prototype.reset = function(commit) {
  var cmd = 'reset --hard';
  if (commit && commit !== '0') {
    cmd += ' '+commit;
  }
  return this.run(cmd)
    .then(function(data) {
      return _(data).some(function(line) {
        return /HEAD is now at/.test(line);
      });
    });
}

GitIrDone.prototype.fetch = function() {
  return this.run('fetch')
    .then(function() {
      return true;
    })
    .catch(function() {
      return true;
    });
}

GitIrDone.prototype.getChangedFiles = function(branch) {
  return this.run('diff --name-only '+branch+' origin/'+branch);
}

GitIrDone.prototype.getModifiedFiles = function() {
  return this.run('ls-files -m');
}

GitIrDone.prototype.pull = function() {
  return this.run('pull')
    .then(function(data) {
      return _(data).some(function(line) {
        return /\d+ files? changed/.test(line) || /Already up-to-date/.test(line);
      });
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
      return 0;
    });
}

module.exports = GitIrDone;
