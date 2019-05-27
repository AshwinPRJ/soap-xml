/**
 *
 * Container for a set of rules which will be 
 * activated while importing legacy data of prop tax.
 * Multiple rules could be added to this chain and will be 
 * executed one after the other to crete issues.
 *
 **/


var fs = require("fs");
var path = require("path");

const basename = path.basename(module.filename);
var ruleChain = [];

// Read all rule files and build a chain.
fs.readdirSync(__dirname)
  .filter((f) => { return f !== basename && f.indexOf(".") !== 0 && path.extname(f) == ".js"})
  .forEach((i) => { 
    let r = require(path.resolve(path.join(__dirname, i))); 
    ruleChain.push(r);
  })

var exec = function(propNode, propData, ownerNode, ownerData) {
  let commands =[] ;
  ruleChain.map((rule) => { 
    commands = commands.concat(rule.exec(propNode, propData, ownerNode, ownerData)); 
  })
  return commands;
}

module.exports = exec;

