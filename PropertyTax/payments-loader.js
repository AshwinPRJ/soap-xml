/**
 * Loads property tax payment data to graph database.
 **/

"use script";

const config = require("./config.js")();
const xlsx = require("node-xlsx");
const path = require("path");
const db = require("./neo4j-helper");
const BPromise = require("bluebird");
const TAX_PAYMENT_REL = "TAX_PAYMENT"

const IssueTypes = {
  paymentDefault:         'NOT_PAID',
  missingPaymentDetails:  'UNKNOWN',
  todo: 'ADD_OTHERS'
};

// identifies a relation between column number and year of assessment.
const yearMap = [
  "",     // The first 5 are intentionally left empty, so 5th element 
  "",     // matches with year 2002-03, as in excel file.
  "",
  "",
  "",
  "2002-03",
  "2003-04",
  "2004-05",
  "2005-06",
  "2006-07",
  "2007-08",
  "2008-09",
  "2009-10",
  "2010-11",
  "2011-12",
  "2012-13",
  "2013-14",
  "2014-15",
  "2015-16",
  "2016-17",
  "2017-18",
  "2018-19",
];

// Load the file
const worksheets = xlsx.parse(path.resolve(config.paymentsFile));
//let worksheetIndex = process.argv[2] || 0;

debugger;
let startSheet = process.argv[2] || 0;
let endSheet = process.argv[3] || worksheets.length -1;

//worksheets[worksheetIndex].data.splice(0, 2);
//data = worksheets[worksheetIndex].data;

if (startSheet < 0 || startSheet > worksheets.length) {
  console.error("Worksheet index cannot be less then 0, or greater than ", worksheets.length);
  process.exit(1);
}

if (endSheet < startSheet || endSheet > worksheets.length) {
  console.error("Worksheet index cannot be less then start sheet, or greater than ", worksheets.length);
  process.exit(2);
}

worksheets.splice(0, startSheet);
worksheets.length=endSheet-startSheet+1;

BPromise.reduce(worksheets, run, {})
  .then(() => {
    db.close();
    console.log("All done.");
  })


// iterate over the rows and add 
// payment info for each year.
function run(acc, sheet, index) {

  sheet.data.splice(0,2);
  console.log("Processing worksheet #", index, "...");
  return BPromise.reduce(sheet.data, addPayment, {ward:index+1})
  .then( () => {
    console.log ("Finished worksheet: ", index, ".");
  });

}

/** 
 * Scans a row of data and prepares cypher queries
 * to upload them to neo4J graphDB.
 **/
async function addPayment(acc, row, index) {

  console.log("Processing row:", index, "...");
  try {
    console.log("Adding payments for pid:", row[0], "...");
    let commandSet = [];
    let paymentIssues = {};
    let dataIssues = {};

    let pidData = {pid: row[0]};
    let pidDataF = Object.assign ({fromPayments: 1}, pidData);
    // matches a property node by pid 
    //let propNode = db.upsertNode("p:Property", ['pid'], {pid:row[0]});
    let propNode = db.upsertNodeEx("p:Property", ['pid'], pidDataF, pidData);
    commandSet.push(propNode);
    let unpaidTotal = 0;

    // add payments from year 2002-03 till now, based on entries in the excel file.
    // Why 5??? Because payment data is present from the 6th column (0 based index) onwards
    for (var i=5; i<row.length; i++) {
      if (!isNaN(row[i])) {

        commandSet.push(db.addPipe(propNode.alias, propNode.alias));
        let yearNode = db.upsertNode(`y${i}:Year`, ['name'], {name:yearMap[i]});
        commandSet.push(yearNode);
        commandSet.push(db.setRelation(propNode, yearNode, 
                TAX_PAYMENT_REL, {status: "PAID", amt: row[i]}));

      } else if (row[i] == "N/P") {
        
        // accummulate payment defaults...
        paymentIssues.year = yearMap[i];
        paymentIssues.unpaid = findMax(row, 5);
        unpaidTotal += paymentIssues.unpaid;

        commandSet.push(db.addPipe(propNode.alias, propNode.alias));
        let yearNode = db.upsertNode(`y${i}:Year`, ['name'], {name:yearMap[i]});
        commandSet.push(yearNode);
        commandSet.push(db.setRelation(propNode, yearNode, 
                  TAX_PAYMENT_REL, {status: "NOT_PAID", amt:paymentIssues.unpaid}));

      } else if (row[i] == "N/A"){ /*nothing to do here.*/ 
      
      } else if (row[i] === undefined || row[i] === "") { // no data present.
        dataIssues[yearMap[i]] = IssueTypes.missingPaymentDetails;

        commandSet.push(db.addPipe(propNode.alias, propNode.alias));
        let yearNode = db.findNode(`y${i}:Year`, {name:yearMap[i].toString()});
        commandSet.push(yearNode);
        commandSet.push(db.setRelation(propNode, yearNode, 
              `TAX_PAYMENT`, {status: "UNKNOWN"}));
      }
    }

    if (!empty(paymentIssues)) addPaymentIssues(commandSet, propNode, paymentIssues, unpaidTotal);
    if (!empty(dataIssues) || row.length<17) addDataIssues(commandSet, propNode, dataIssues);

    let result = await db.exec(commandSet);
  } catch (e) {
    console.error("error while processing record:", i, e);
  }
}

function addPaymentIssues(cmdSet, propNode, paymentIssues, unpaidTotal) {
  console.log("Adding payment issue for pid:", JSON.stringify(propNode));
  paymentIssues.name = "PaymentDefaults";
  let issueNode = db.upsertNode('ip:Issue', ['name'], {name: paymentIssues.name});
  cmdSet.push(issueNode);
  cmdSet.push(db.setRelation(propNode, issueNode, IssueTypes.paymentDefault, {amt:unpaidTotal}));

}

function addDataIssues(cmdSet, propNode, dataIssues) {
  dataIssues.name = "MissingPaymentsData";
  let issueNode = db.upsertNode("im:Issue", ["name"], dataIssues);
  cmdSet.push(issueNode);
  cmdSet.push(db.setRelation(propNode, issueNode, IssueTypes.paymentDefault, dataIssues))
}



/**
 * Finds the maximum value in a given array.
 * Checks for starting element and ending element if given.
 **/
function findMax(array, start, end) {
  start = start || 0;
  end = end || array.length;

  // first filter array to include start and end
  let filtered = array.slice(start, end)
  // then filter elements and obtain number values.
  filtered = filtered.filter((item) => { return !isNaN(item); });

  return filtered.length==0?-1:Math.max.apply(null, filtered);
}

function empty(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

