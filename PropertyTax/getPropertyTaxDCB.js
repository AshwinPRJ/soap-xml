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
const url = 'http://117.239.141.230/eoasis/indiancst.asmx';
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
  start(args);
}
async function start(args) {
  let wardNo = "", fromYear = "", toYear = "", fromPID = "", toPID = "";
  if (args.wardNo) wardNo = args.wardNo;
  if (args.fromYear) fromYear = args.fromYear;
  if (args.toYear) toYear = args.toYear;
  if (args.fromPID) fromPID = args.fromPID;
  if (args.toPID) toPID = args.toPID;
  logger.info("ward no >>> ", wardNo);
  logger.info("fromYear >>> ", fromYear);
  logger.info("toYear >>> ", toYear);
  logger.info("fromPID >>> ", fromPID);
  logger.info("toPID >>> ", toPID);
  return await getMAR19Details(wardNo, fromYear, toYear, fromPID, toPID);
}
async function getMAR19Details(wardNo, fromYear, toYear, fromPID, toPID) {
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
  return await makeRequest(wardNo, xml);
}
async function makeRequest(wardNo, xml) {
  try {
    logger.info("Request sent ")
    const { response } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
    const { body, statusCode } = response;
    logger.info("xml response received ");
    let json = await convertXMLToJson(body);
    logger.debug("converted xml to json ");
    if (json.keys.length === 0) {
      logger.warn("Data not found ");
      return "Data not found";
    }
    //logger.debug("converted json to csv >>> ");
    var values = json["data"].map(el => Object.values(el));
    return await insertDB(json.keys, values, wardNo);;
  } catch (e) {
     logger.error(`error occurred for ward ${wardNo} `, e);
    return await writeToFile(e, wardNo);
  }
}
function convertXMLToJson(body) {
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  logger.debug("converted xml response to JSON obj >>> ");
  if (obj["soap:Envelope"]["soap:Body"]["GetPropertyTaxDCBDetailsResponse"]["GetPropertyTaxDCBDetailsResult"]["DCBEntityIndainCST"] == undefined) {
    return { "keys": [], "data": [] }
  }
  let result = obj["soap:Envelope"]["soap:Body"]["GetPropertyTaxDCBDetailsResponse"]["GetPropertyTaxDCBDetailsResult"]["DCBEntityIndainCST"];
  if (!result.length) result = [result];
  let fields = Object.keys(result[0]);
  return { "keys": fields, "data": result }
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
  await connection.connect(async function (err) {
    if (err) throw err;
    logger.info("Successfully connected to database...");
    let sql = `INSERT INTO tblproperty_dcb_details (${keys}) VALUES ?`;
    await connection.query(sql, [values], async function (err, result) {
      if (err) {
        logger.error("error occured during inserting ", err);
        await writeToFile(err, wardNo);
        return await connection.end();
      }
      logger.info("affectedRows ", result["affectedRows"]);
      logger.info("===============================================================================");
      logger.info(`Data successfully inserted for ward no: ${wardNo}`);
      await connection.end();
    });
  });
}
// function convertToCSV(keys, data) {
//   let json2csvParser = new json2csv({ keys });
//   let csv = json2csvParser.parse(data);
//   return csv;
// }

