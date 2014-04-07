
var sys = require('sys');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

function chainCommand(commands, callback) {
	var command = commands.shift();
	if (command) {
		exec(command, function (error, stdout, stderr) {
		  	if (error !== null) {
		  		callback(error);
		    	console.log('exec error: ' + error);
		  		sys.print('stderr: ' + stderr);
		    } else {
				sys.print(stdout);
				chainCommand(commands, callback)
		    }
	  	});
	}
	else {
		callback(null);
	}
}

function incrVersion(version) {
	var versionSplit = version.split('.');
	versionSplit[2] = parseInt(versionSplit[2]) + 1;
	return versionSplit.join('.');
}

var packageJsonPath = path.join(__dirname, 'package.json'),
	packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version,
	version = packageJson,
	tagName = 'v' + version,
	newVersion = incrVersion(version);

chainCommand([
'npm publish',
'git remote add origin https://github.com/KapIT/JsonDB.git',
'git tag -a ' + tagName + ' -m "' + tagName + '"',
'git push origin ' + tagName,
], function (err) {
	if (err) {
		return;
	}
	packageJson.version = newVersion;
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'UTF-8');
	chainCommand([
		'git commit package.json -m "Incrementing version to ' + newVersion +'"',
		'git push origin HEAD:master'
	])
});
