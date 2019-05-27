// 
// Checks if the address is missing in the input data.
// If yes, creates a relation to missing-address node.
//

const db = require("../neo4j-helper.js");
const ruleName = "PaymentDefaults";
//const ruleNode = "i:IssueMissingAddress"
const relation = "NOT_PAID";

const defaulters = {

  exec: function(propNode, propData, ownerNode, ownerData) {
    // check, if address is missing, if yes emit a 
    // relation to missing-address issue type,
    // which should be linked to this property.
    console.log("propData.PropertyAddress: ", propData.PropertyAddress);
    if (propData.Status != 'Filed & Paid') {
      console.warn("Missing address for pid:", propData.PID);
      let issueNode = db.upsertNode('i:Issue', ['name'], {name: ruleName});
      let rel = db.setRelation(propNode, issueNode, relation);
      return [issueNode, rel];
    } else {
      return [];
    }
  }
};

module.exports = defaulters;

