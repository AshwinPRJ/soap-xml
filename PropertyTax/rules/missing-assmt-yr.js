const db = require("../neo4j-helper.js");
const ruleName = "MissingAssessmentyear";
//const ruleNode = "may:Issue:MissingAssmtYear"
const relation = "MISSING_AYEAR"

const assmntRule = {

  exec: function(propNode, propData, ownerNode, ownerData) {
    if (propData.AssessmentInitiatedYear === undefined || propData.AssessmentInitiatedYear === "" || propData.AssessmentInitiatedYear === "-") {
      console.warn("Missing assessment year for pid:", propData.PID);
      let issueNode = db.upsertNode('i:Issue', ['name'], {name: ruleName});
      let rel = db.setRelation(propNode, issueNode, relation);
      return [issueNode, rel];
    } else {
      return [];
    }
  }

};

module.exports = assmntRule;

