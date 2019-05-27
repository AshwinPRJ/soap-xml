const db = require("../neo4j-helper.js");
const ruleName = "MissingUtype";
//const ruleNode = "missingOwner:Issue:MissingOwner"
const relation = "MISSING_UTYPE";

const utypeRule = {

  exec: function(propNode, propData, ownerNode, ownerData) {
     if (propData.PropertyUsage === undefined || propData.PropertyUsage === "" || propData.PropertyUsage === "-") {
      console.warn("Missing owner for pid:", propData.pid);
      let issueNode = db.upsertNode('i:Issue', ['name'], {name: ruleName});
      let rel = db.setRelation(propNode, issueNode, relation);
      return [issueNode, rel];
    } else {
      return [];
    }
  }

};

module.exports = utypeRule;


