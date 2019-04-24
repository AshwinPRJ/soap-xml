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
  'soapAction': 'http://tempuri.org/GetPropertyTaxDCBDetails',
};
args
  .version('0.1.0')
  .option('-w, --wardNo <>', 'Ward No')
  .option('-s, --fromYear []', 'from year')
  .option('-e, --toYear []', 'to year')
  .option('-f, --fromPID []', 'from pid')
  .option('-t, --toPID []', 'to pid')
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
  let wardNo = "", fromYear = "", toYear = "", fromPID="", toPID="";
  if (args.wardNo) wardNo = args.wardNo;
  if (args.fromYear) fromYear = args.fromYear;
  if (args.toYear) toYear = args.toYear;
  if (args.fromPID) fromPID = args.fromPID;
  if (args.toPID) toPID = args.toPID;
  logger.info("===============================================================================");
  logger.info("ward no >>> ", wardNo);
  logger.info("fromYear >>> ", fromYear);
  logger.info("toYear >>> ", toYear);
  logger.info("fromPID >>> ", fromPID);
  logger.info("toPID >>> ", toPID);
  return await getMAR19Details(wardNo, fromYear, toYear, fromPID, toPID);
}
async function getMAR19Details(wardNo, fromYear, toYear, fromPID, toPID) {
  logger.debug("params received to pass in request >>> ", wardNo);
  const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetPropertyTaxDCBDetails xmlns="http://tempuri.org/">
      <WardId>${wardNo}</WardId>
      <FromPID>${fromPID}</FromPID>
      <ToPID>${toPID}</ToPID>
      <FromTaxationYear>${fromYear}</FromTaxationYear>
      <ToTaxationYear>${toYear}</ToTaxationYear>
    </GetPropertyTaxDCBDetails>
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
    //logger.info("xml response received body >>> ", body)
    let json = await convertXMLToJson(body);
    var answer = json["data"].map(el => Object.values(el));
    //logger.debug("converted xml to json >>> ", json.data);
    if (json.keys.length === 0) {
      logger.warn(json.data + wardNo);
      connection.end();
      return json.data;
    }
    //let csv = await convertToCSV(json.keys, json.data);
    logger.debug("converted json to csv >>> ");
    //return await writeToFile(csv, wardNo);
    return await insertDB(json.keys, answer, wardNo);;
  } catch (e) {
    return logger.error(`error occurred for ward ${wardNo} `, e);
  }
}
function convertXMLToJson(body) {
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  logger.debug("converted xml response to JSON obj >>> ");
  //logger.debug("checking for  data >>> ", obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"]);
  if (obj["soap:Envelope"]["soap:Body"]["GetPropertyTaxDCBDetailsResponse"]["GetPropertyTaxDCBDetailsResult"]["DCBEntityIndainCST"] == undefined) {
    return { "keys": [], "data": "data not found for ward no: " }
  }
  let result = obj["soap:Envelope"]["soap:Body"]["GetPropertyTaxDCBDetailsResponse"]["GetPropertyTaxDCBDetailsResult"]["DCBEntityIndainCST"];
  //logger.debug("json stringify data >>",result);
  let data = JSON.stringify(result);
  if (!result.length) result = [result];
  let fields = Object.keys(result[0]);
  //logger.debug("key name for creating columns >>> ", fields);
  return { "keys": fields, "data": result }
}
function convertToCSV(keys, data) {
  let json2csvParser = new json2csv({ keys });
  let csv = json2csvParser.parse(data);
  return csv;
}
async function writeToFile(err, wardNo) {
  await fs.writeFile(`./output/getPropertyTaxDCBDetails
  WardNo:${wardNo}.txt`, err, (err) => {
    if (err) throw err;
    logger.info(`Error Data saved in file for ward ${wardNo}`);
    logger.info("===============================================================================");
    connection.end();
  });
}
async function insertDB(keys, values, wardNo) {
  let sql = `INSERT INTO tblproperty_dcb_details (${keys}) VALUES ?`;
  await connection.query(sql, [values], async function (err, result) {
    if (err) {
      logger.error("error occured during inserting ", err);
      return writeToFile(err, wardNo)
    }
    logger.info("affectedRows ", result["affectedRows"]);
    logger.info("===============================================================================");
    logger.info(`Data successfully inserted for ward no: ${wardNo}`);
    connection.end();
  });
}

