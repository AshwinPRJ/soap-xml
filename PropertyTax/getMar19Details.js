const soapRequest = require('easy-soap-request');
const fs = require('fs');
const args = require("commander");
const json2csv = require('json2csv').Parser
const xml2json = require('xml2json');
const log4js = require('log4js');
const logger = log4js.getLogger();
const mysql = require('mysql');
logger.level = 'debug';
const config = require('./config/dbconfig.js');
const connection = mysql.createConnection(config.databaseOptions);
const url = 'http://117.239.141.230/eoasis/indiancst.asmx';
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'http://tempuri.org/GetMar19Details',
};
args
  .version('0.1.0')
  .option('-w, --wardNo <>', 'Ward No')
  .option('-f, --fromDate []', 'from date')
  .option('-t, --toDate []', 'to date')
  .parse(process.argv);
// Ensure we get minimum required arguments
if (args.wardNo == undefined) {
  args.help();
  process.exit(1);
}
if (args.wardNo && isNaN(args.wardNo)) {
  console.error("wardNo should be a number.");
  process.exit(1);
} else { 
  args.wardNo = Number(args.wardNo); 
  start(args);
}
async function start(args) {
  let wardNo="", fromDate="", toDate="";
  if (args.wardNo) wardNo = args.wardNo;
  if (args.fromDate) fromDate = args.fromDate;
  if (args.toDate) toDate = args.toDate;
  logger.info("Ward No: ", wardNo);
  logger.info("From Date: ", fromDate);
  logger.info("To Date: ", toDate);
  return await getMAR19Details(wardNo, fromDate, toDate);
}
async function getMAR19Details(wardNo, fromDate, toDate) {
  const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      			  <soap:Body>
      			    <GetMar19Details xmlns="http://tempuri.org/">
      			      <WardId>${wardNo}</WardId>
      			      <FromDate>${fromDate}</FromDate>
      			      <ToDate>${toDate}</ToDate>
      			    </GetMar19Details>
      			  </soap:Body>
            </soap:Envelope>`;
  return await makeRequest(wardNo, xml);
}
async function makeRequest(wardNo, xml) {
  try {
    logger.info(`xml request sent for ward no ${wardNo}`)
    const { response } = await soapRequest(url, headers, xml, 10000000); // 2.7 hrs Optional timeout parameter(milliseconds)
    const { body, statusCode } = response;
    logger.debug(`xml response received for ward no ${wardNo}`);
    //await writeToFile(body);
    let json = await convertXMLToJson(body);
    if(json.keys.length === 0){
      logger.warn(`Data not found for ward no ${wardNo}`);
      return `Data not found for ward no ${wardNo}`;
    }
    logger.debug("converted xml to json object ");
    //let csv = await convertToCSV(json.keys, json.data)
    //logger.debug("storing csv data in file", csv);
    let values = json["data"].map(el => Object.values(el));
    return await insertDB(json.keys, values, wardNo);
    //return await writeToFile(csv);
  } catch (e) {
     logger.warn(`Exception occurred for ward No: ${wardNo} `, e);
     await writeToFile(e, wardNo);
  }
}
function convertXMLToJson(body) {
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  if (obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"] == undefined){
    logger.debug(`data not found`);
    return { "keys": [], "data": [] }
  }
  let result = obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"]["MAR19EntityIndianCST"];
  if(!result.length) result = [result];
  let fields = Object.keys(result[0]);
  return {"keys": fields, "data": result}
}
async function writeToFile(err, wardNo) {
  await fs.writeFile(`./output/getMar19Details${wardNo}.txt`, err, (err) => {
    if (err) throw err;
    logger.info(`Error data saved in file...`);
    logger.info("===============================================================================");
  }); 
}
async function insertDB(keys, values, wardNo) {
  await connection.connect(async function (err) {
    if (err) {
     return await writeToFile(err, wardNo);
    }
    logger.info("Successfully connected to database...");
    let sql = `INSERT INTO tblproperty_details (${keys}) VALUES ?`;
    logger.info(`Data inserting into tblproperty_details table `);
    await connection.query(sql, [values], async function (err, result) {
      if (err) {
        await writeToFile(err, wardNo);
        return await connection.end();
      }
      logger.info(`No of rows affected ${result["affectedRows"]}`);
      logger.info(`Data successfully inserted for ${wardNo}`); 
      logger.info("===============================================================================");
      return await connection.end();
    });
  });
}
function convertToCSV(keys, data) {
  let json2csvParser = new json2csv({ keys });
  let csv = json2csvParser.parse(data);
  return csv;
}