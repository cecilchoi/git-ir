# Git-Ir
Git InfraRed (like a remote)

Call git commands on a remote Windows machine.
SSH can be a pain to setup for Windows machines, expecially if they are restricted by group/domain policies.
So this uses a winexe/paexec wrapper to make remote calls.

### Prerequisites on Windows machine
1. Git installed and included in PATH
2. Repo cloned
3. Connection to origin does not require password


### Usage
```javascript
// real git commands
var gitIr = require('git-ir');

gitIr('command -options', {
  username: 'USERNAME', // optional (defaults to current user)
  password: 'PASSWORD', // optional
  host: 'HOSTNAME',
  repo: 'GIT/REPO/PATH'
})
  .then(pass, fail);
  
// wrapped/chained commands
var GitIrDone = require('git-ir').Done;

var git = new GitIrDone({
  username: 'USERNAME', // optional (defaults to current user)
  password: 'PASSWORD', // optional
  host: 'HOSTNAME',
  repo: 'GIT/REPO/PATH'
});

git.pullChanged()
  .then(pass, fail);
```

##### Command line
```bash
git-ir -s HOSTNAME -r GIT/REPO/PATH -u USERNAME -p PASSWORD GITCOMMAND
// or
git-ir -s HOSTNAME -r GIT/REPO/PATH -u USERNAME -p PASSWORD -m GITIRDONE.METHOD
```

#### Git-Ir-Done methods
All methods return a Promise(Bluebird for now).
- pullChanged
  - pull changed files and return list of files updated
- getCurrentBranch
- reset(commit)
  - hard reset to commit number
- fetch
- getChangedFiles(branch)
  - diff branch to origin
- pull
- getLastCommonCommit(branch)
  - find the last commit in common with origin
- getLastCommit(branch)
  - last commit number on branch
- isDiverged(branch)
  - checks if local branch and origin have diverged history
