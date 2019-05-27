const db = require("../neo4j-helper.js");
const ruleName = "MissingArea";
//const ruleNode = "missingArea:Issue:MissingArea";
const relation = "MISSING_AREA";

const areaRule = {

  exec: function(propNode, propData) {
    console.log("propData.TotalArea: ", propData.TotalArea)
    if (propData.TotalArea === undefined || propData.TotalArea === "" || propData.TotalArea === "-") {
      console.warn("Missing areas for pid:", propData.PID);
      let issueNode = db.upsertNode('i:Issue', ['name'], {name:ruleName});
      let rel = db.setRelation(propNode, issueNode, relation);
      return [issueNode, rel];
    } else {
      return [];
    }
  }

};

module.exports = areaRule;


