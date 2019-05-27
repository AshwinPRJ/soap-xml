const db = require("./neo4j-helper");
let jsonData = require('./data_file.json');
const api = 'GetModifiedPropertyDetails';
let fromDate = "",
    toDate = "",
    wardNo = "no ward for update";
async function add2Graph(acc, jsonData, index) {
    let commandSet = [];
    if (jsonData["params"] != undefined) {
        fromDate = jsonData["params"]["fromDate"];
        toDate = jsonData["params"]["toDate"];
    }
    let propData = jsonData["property_master"];
    let ownerData = jsonData["owner_master"];

    let pid = {
        "PID": propData["PID"]
    };
    let propNode = db.updateNodeWithRel(propData, ownerData, pid);
    commandSet.push(propNode);
    ////////////////////////////////////////////////ISSUE CHECKING && DELETE////////////////////////////////////////////////////////////////////
    //console.log("propData.TotalArea:>>> ", propData.TotalArea)
    if (propData.TotalArea != "" && propData.TotalArea != "-" && propData.TotalArea != "0") {
        let deleteRel = db.deleteRel(pid, 'MISSING_AREA');
        await db.exec([deleteRel]);
    }
    //console.log("propData.PropertyAddress:>>> ", propData.PropertyAddress)
    if (propData.PropertyAddress != "" && propData.PropertyAddress != "-") {
        let deleteRel = db.deleteRel(pid, 'MISSING_ADDRESS');
        await db.exec([deleteRel]);
    }
    //console.log("propData.PropertyUsage:>>> ", propData.PropertyUsage)
    if (propData.PropertyUsage != "" && propData.PropertyUsage != "-") {
        let deleteRel = db.deleteRel(pid, 'MISSING_UTYPE');
        await db.exec([deleteRel]);
    }
    //console.log("ownerData.OwnerFirstNameEng:>>> ", ownerData.OwnerFirstNameEng)
    if (ownerData.OwnerFirstNameEng != "" && ownerData.OwnerFirstNameEng != "-") {
        let deleteRel = db.deleteRel(pid, 'MISSING_OWNER');
        await db.exec([deleteRel]);
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
        utils.writeToFile(addPID, wardNo, fromDate, toDate, api);
        return error;
    }
}

exports.add2Graph = add2Graph;