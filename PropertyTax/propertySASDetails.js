const db = require("./neo4j-helper");
let jsonData = require('./data_file.json');
const api = 'GetSASTaxDetails';
const utils = require('./utils.js');
let fromDate = "",
    toDate = "",
    wardNo = "";
async function add2Graph(acc, jsonData, index) {
    let commandSet = [];
    if (jsonData["params"] != undefined) {
        fromDate = jsonData["params"]["fromDate"];
        toDate = jsonData["params"]["toDate"];
        wardNo = jsonData["params"]["wardNo"];
        delete jsonData["params"];
    }
    let pid = {
        "PID": jsonData["PID"]
    };
    let year = {
        "name": jsonData["AssessmentYear"]
    }
    let sasDeatils = db.upsertNodeEx1(pid, year, jsonData);
    commandSet.push(sasDeatils);
    /////////////////////////////////////// ISSUE CHECK //////////////////////////////////
    if (jsonData.status == "NOT_PAID") {
        let defaulters = [];
        let propNode = db.findNode('p:Property', pid);
        defaulters.push(propNode);
        let issue = db.upsertNode('i:Issue', ['name'], {
            name: "PaymentDefaults"
        });
        defaulters.push(issue);
        let amt = {
            "amt": jsonData["amt"]
        };
        defaulters.push(db.setRelation(propNode, issue, "NOT_PAID", amt));
        await db.exec(defaulters);
        //console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>  NOT_PAID  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    } else {
        let deleteRel = db.deleteRel(pid, 'NOT_PAID');
        await db.exec([deleteRel]);
    }
    ////////////////////////////////////  ISSUE CHECK //////////////////////////////////
    debugger;
    try {
        let result = await db.exec(commandSet);
        //console.log("All done.");
        return result;
    } catch (error) {
        console.log("error: ", error);
        utils.writeToFile(error, wardNo, fromDate, toDate, api);
    }
}
exports.add2Graph = add2Graph;

// async function add2Graph(acc, jsonData, index) {
//     let commandSet = [];
//     let propData = jsonData["PID"];
//     let pid = {"PID": propData };
//     let propNode = db.findNode('p:Property', pid);
//     commandSet.push(propNode);
//     let yearData = jsonData["AssessmentYear"];
//     let yearJson = {"name": yearData};
//     let year = db.upsertNode('y:Year', ['name'], yearJson);
//     commandSet.push(year);
//     commandSet.push(db.setRelation(propNode, year, "TAX_PAYMENT"));
//     //commandSet.push(db.setRelation(propNode, year, "TAX_PAYMENT", jsonData));


//     // console.log("jsonData.Status:>>> ", jsonData.Status)
//     // if (propData.Status != "Filed & Paid") {
//     //     let issue = db.upsertNode('i:Issue', ['name'], {name: "PaymentDefaults"});
//     //     commandSet.push(issue);
//     //     commandSet.push(db.setRelation(propNode, issue, "PaymentDefaults"));
//     // }
//     debugger;
//     try {
//         let result = await db.exec(commandSet);
//         console.log("All done.");
//         return result;
//     } catch (error) {
//         console.log("error: ", error);
//     }
// }