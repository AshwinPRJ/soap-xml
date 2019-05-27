const db = require("./neo4j-helper");
let jsonData = require('./data_file.json');
const api = 'GetPropertyTaxDCBDetails';

let fromYear = "",
    toYear = "",
    wardNo = "";
async function add2Graph(acc, jsonData, index) {

    if (jsonData["params"] != undefined) {
        //console.log("fromDate: ", fromDate);
        fromYear = jsonData["params"]["fromYear"];
        toYear = jsonData["params"]["toYear"];
        wardNo = jsonData["params"]["wardNo"];
        delete jsonData["params"];
    }
    let commandSet = [];
    let propData = jsonData["PID"];
    let pid = {
        "PID": propData
    };
    let propNode = db.findNode('p:Property', pid);
    commandSet.push(propNode);

    let yearData = jsonData["AssessmentYear"];
    let yearJson = {
        "name": yearData
    };
    let year = db.upsertNode('y:Year', ['name'], yearJson);
    commandSet.push(year);
    commandSet.push(db.setRelation(propNode, year, "DCB", jsonData));

    debugger;
    try {
        let result = await db.exec(commandSet);
        //console.log("All done.");
        return result;
    } catch (error) {
        console.log("error: ", error);
        utils.writeToFile(error, wardNo, fromYear, toYear, api);
        return error;
    }
}
exports.add2Graph = add2Graph;