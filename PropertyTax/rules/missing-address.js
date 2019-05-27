const db = require("../neo4j-helper.js");
const ruleName = "MissingAddress";
//const ruleNode = "i:IssueMissingAddress"
const relation = "MISSING_ADDRESS";

const addressRule = {

  exec: function(propNode, propData, ownerNode, ownerData) {
    console.log("propData.PropertyAddress: ", propData.PropertyAddress);
    if (propData.PropertyAddress === undefined || propData.PropertyAddress === "" || propData.PropertyAddress === "-") {
      console.warn("Missing address for pid:", propData.PID);
      let issueNode = db.upsertNode('i:Issue', ['name'], {name: ruleName});
      let rel = db.setRelation(propNode, issueNode, relation);
      return [issueNode, rel];
    } else {
      return [];
    }
  }
};

module.exports = addressRule;

