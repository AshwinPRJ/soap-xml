const soapRequest = require('easy-soap-request');
const fs = require('fs');
const args = require("commander");
const json2csv = require('json2csv').Parser
var xml2json = require('xml2json');
var log4js = require('log4js');
var logger = log4js.getLogger();
var mysql = require('mysql');
logger.level = 'debug';
var config = require('./config/dbconfig.js');
var connection = mysql.createConnection(config.databaseOptions);
const url = 'http://103.112.213.209/INDIANCST/indiancst.asmx';
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
  connection.connect(function (err) {
    if (err) throw err;
    logger.info("Successfully connected to database...");
    start(args);
  });
}
async function start(args) {
  let wardNo="", fromDate="", toDate="";
  if (args.wardNo) wardNo = args.wardNo;
  if (args.fromDate) fromDate = args.fromDate;
  if (args.toDate) toDate = args.toDate;
  logger.info("===============================================================================");
  logger.info("ward no >>> ", wardNo);
  logger.info("from date >>> ", fromDate);
  logger.info("to date >>> ", toDate);
  return await getMAR19Details(wardNo, fromDate, toDate);
}
async function getMAR19Details(wardNo, fromDate, toDate) {
  logger.debug("params received to pass in request >>> ", wardNo);
  const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      			  <soap:Body>
      			    <GetMar19Details xmlns="http://tempuri.org/">
      			      <WardId>${wardNo}</WardId>
      			      <FromDate>${fromDate}</FromDate>
      			      <ToDate>${toDate}</ToDate>
      			    </GetMar19Details>
      			  </soap:Body>
            </soap:Envelope>`;
  //logger.debug("XML parameters >>> ", xml);
  return await makeRequest(wardNo, xml);
}
async function makeRequest(wardNo, xml) {
  try {
    //logger.debug("url >>> ", url);
    //logger.debug("headers >>> ", headers);
    //logger.debug("xml >>> ", xml);
    logger.info("xml request sent >>> ")
    const { response } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
    //logger.debug("response from api: ", response)
    const { body, statusCode } = response;
    logger.info("xml response received body >>> ")
    let json = await convertXMLToJson(body);
    
    //logger.debug("converted xml to json >>> ", json.keys);
    if(json.keys.length === 0){
      logger.warn(json.data + wardNo);
      connection.end();
       return json.data ;
    }
    var answer = json["data"].map(el => Object.values(el));
    //let csv = await convertToCSV(json.keys, json.data);
    //logger.debug("converted json to csv >>> ");
    //return await writeToFile(wardNo, csv);
    return await insertDB(json.keys, answer, wardNo);
  } catch (e) {
     logger.warn(`error occurred for ward ${wardNo} `, e);
  }
}
function convertXMLToJson(body) {
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  logger.debug("converted xml response to JSON obj >>> ");
  //logger.debug("checking for  data >>> ", obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"]);
  if (obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"] == undefined){
    return { "keys": [], "data": "data not found for ward no: " }
  }
  let result = obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"]["MAR19EntityIndianCST"];
  //logger.debug("json stringify data >>",result);
  let data = JSON.stringify(result);
  if(!result.length) result = [result];
  let fields = Object.keys(result[0]);
  //logger.debug("key name for creating columns >>> ", fields);
  return {"keys": fields, "data": result}
}
function convertToCSV(keys, data) {
  let json2csvParser = new json2csv({ keys });
  let csv = json2csvParser.parse(data);
  return csv;
}
async function writeToFile(err, wardNo) {
  await fs.writeFile(`./output/error${wardNo}.txt`, err, (err) => {
    if (err) throw err;
    logger.info(`Error Data saved in file for ward ${wardNo}`);
    logger.info("===============================================================================");
    connection.end();
  }); 
}
function insertDB(keys, values, wardNo ){
  let sql = `INSERT INTO tblproperty_details (${keys}) VALUES ?`;
  connection.query(sql, [values], function (err, result) {
    if (err) {
      return writeToFile(err, wardNo )
    }
    connection.end();
    logger.info(`Data successfully inserted for ${wardNo}`);
    logger.info("===============================================================================");
  });
}