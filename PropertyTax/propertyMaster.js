const db = require("./neo4j-helper");
const utils = require('./utils.js');
let api = 'GetMar19Details';
let fromDate = "",
  toDate = "",
  wardNo = "";
async function add2Graph(acc, jsonData, index) {

  if (jsonData["params"] != undefined) {
    fromDate = jsonData["params"]["fromDate"];
    toDate = jsonData["params"]["toDate"];
    wardNo = jsonData["params"]["wardNo"];
    delete jsonData["params"];
  }
  let commandSet = [];
  let propData = jsonData["property_master"];
  let ownerData = jsonData["owner_master"];
  
  let propKEY = Object.keys(propData);
  //console.log("propKEY: ", propKEY);
  let propNode = db.upsertNodeV1('p:Property', propKEY, propData);
  commandSet.push(propNode);
  
  // let propNode = db.insertNode('p:Property', propData);
  // commandSet.push(propNode);
  
  let ownerKEY = Object.keys(ownerData);
  let ownerNode = db.upsertNodeV1('person:Person', ownerKEY, ownerData);
  commandSet.push(ownerNode);
  // let ownerNode = db.insertNode('person:Person', ownerData);
  // commandSet.push(ownerNode);

  let yearData = jsonData["property_master"]["AssessmentInitiatedYear"];
  let yearJson = {
    "name": yearData
  };
  let year = db.upsertNode('y:Year', ['name'], yearJson);
  commandSet.push(year);

  let wardData = jsonData["property_master"]["WardNo"];
  let wardJson = {
    "name": wardData
  }
  let ward = db.upsertNode('w:Ward', ['name'], wardJson);
  commandSet.push(ward);

  commandSet.push(db.setRelation(propNode, ownerNode, "OWNED_BY"));
  commandSet.push(db.setRelation(propNode, ward, "LOCATED_IN"));
  commandSet.push(db.setRelation(propNode, year, "ASSESSMENT_YR"));
  commandSet.push(db.setRelation(propNode, year, "DCB"));
  commandSet.push(db.setRelation(propNode, year, "TAX_PAYMENT"));
  ////////////////////////////////////////////////ISSUE CHECKING////////////////////////////////////////////////////////////////////
  //console.log("propData.TotalArea:>>> ", propData.TotalArea)
  if (propData.TotalArea == "" || propData.TotalArea == "-" || propData.TotalArea == "0") {
    let issue = db.upsertNode('i1:Issue', ['name'], {
      name: "MissingArea"
    });
    commandSet.push(issue);
    commandSet.push(db.setRelation(propNode, issue, "MISSING_AREA"));
  }
  //console.log("propData.PropertyAddress:>>> ", propData.PropertyAddress)
  if (propData.PropertyAddress == "" || propData.PropertyAddress == "-") {
    let issue = db.upsertNode('i2:Issue', ['name'], {
      name: "MissingAddress"
    });
    commandSet.push(issue);
    commandSet.push(db.setRelation(propNode, issue, "MISSING_ADDRESS"));
  }
  //console.log("propData.PropertyUsage:>>> ", propData.PropertyUsage)
  if (propData.PropertyUsage == "" || propData.PropertyUsage == "-") {
    let issue = db.upsertNode('i4:Issue', ['name'], {
      name: "MissingUtype"
    });
    commandSet.push(issue);
    commandSet.push(db.setRelation(propNode, issue, "MISSING_UTYPE"));
  }
  //console.log("ownerData.OwnerFirstNameEng:>>> ", ownerData.OwnerFirstNameEng)
  if (ownerData.OwnerFirstNameEng == "" || ownerData.OwnerFirstNameEng == "-") {
    let issue = db.upsertNode('i5:Issue', ['name'], {
      name: "MissingOwner"
    });
    commandSet.push(issue);
    commandSet.push(db.setRelation(propNode, issue, "MISSING_OWNER"));
  }
  //console.log("propData.AssessmentInitiatedYear:>>> ", propData.AssessmentInitiatedYear)
  if (propData.AssessmentInitiatedYear == "" || propData.AssessmentInitiatedYear == "-") {
    let issue = db.upsertNode('i4:Issue', ['name'], {
      name: "MissingAssessmentyear"
    });
    commandSet.push(issue);
    commandSet.push(db.setRelation(propNode, issue, "MISSING_AYEAR"));
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  debugger;
  try {
    let result = await db.exec(commandSet);
    //console.log("All done.");
    return result;
  } catch (error) {
    console.log("error: ", error);
    let addPID = {
      error: error,
      PID: jsonData["property_master"]["PID"]
    }
    utils.writeToFile(JSON.stringify(addPID), wardNo, fromDate, toDate, api);
    return error;
  }
}
exports.add2Graph = add2Graph;