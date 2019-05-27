const db = require("../neo4j-helper.js");
const ruleName = "MissingOwner";
//const ruleNode = "missingOwner:Issue:MissingOwner"
const relation = "MISSING_OWNER";

const ownerRule = {

  exec: function(propNode, propData, ownerNode, ownerData) {
    if (ownerData.OwnerFirstNameEng === undefined || ownerData.OwnerFirstNameEng === "" || ownerData.OwnerFirstNameEng === "-") {
      console.warn("Missing owner for pid:", propData.PID);
      let issueNode = db.upsertNode('i:Issue', ['name'], {name: ruleName});
      let rel = db.setRelation(propNode, issueNode, relation);
      return [issueNode, rel];
    } else {
      return [];
    }
  }

};

module.exports = ownerRule;


