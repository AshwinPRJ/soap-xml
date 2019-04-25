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
  'soapAction': 'http://tempuri.org/GetModifiedPropertyDetails',
}
args
  .version('0.1.0')
  .option('-f, --fromDate <>', 'from date')
  .option('-t, --toDate <>', 'to date')
  .parse(process.argv);
// Ensure we get minimum required arguments
if (args.fromDate == undefined && args.toDate == undefined) {
  args.help();
  process.exit(1);
} else {
  connection.connect(function (err) {
    if (err) throw err;
    logger.info("Successfully connected to database...");
    start(args);

  });
}
async function start(args) {
  let fromDate = "", toDate = "";
  if (args.fromDate) fromDate = args.fromDate;
  if (args.toDate) toDate = args.toDate;
  logger.info("from date >>> ", fromDate);
  logger.info("to date >>> ", toDate);
  return await getMAR19Details(fromDate, toDate);
}
async function getMAR19Details(fromDate, toDate) {
  const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      			  <soap:Body>
      			    <GetModifiedPropertyDetails xmlns="http://tempuri.org/">
      			      <FromDate>${fromDate}</FromDate>
      			      <ToDate>${toDate}</ToDate>
      			    </GetModifiedPropertyDetails>
      			  </soap:Body>
            </soap:Envelope>`;
  return await makeRequest(xml);
}
async function makeRequest(xml) {
  try {
    logger.info("xml request sent >>> ", xml)
    const { response } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
    const { body, statusCode } = response;
    logger.info("xml response received body >>> ", body);
    let json = await convertXMLToJson(body);
    if (json.keys.length === 0) {
      logger.error(json.data);
      return json.data;
    }
    for (var i = 0; i <= json["data"].length - 1; i++) {
      await updateDB(json, i);
    }
    connection.end();
    return;
  } catch (e) {
    logger.error(`error occurred `, e);
    connection.end();
  }
}
function convertXMLToJson(body) {
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  logger.debug("converted xml response to JSON obj >>> ");
  if (obj["soap:Envelope"]["soap:Body"]["GetModifiedPropertyDetailsResponse"]["GetModifiedPropertyDetailsResult"]["MAR19EntityIndianCST"] == undefined || obj["soap:Envelope"]["soap:Body"]["GetModifiedPropertyDetailsResponse"] == undefined) {
    return { "keys": [], "data": "data not found " }
  }
  let result = obj["soap:Envelope"]["soap:Body"]["GetModifiedPropertyDetailsResponse"]["GetModifiedPropertyDetailsResult"]["MAR19EntityIndianCST"];
  if (!result.length) result = [result];
  let fields = Object.keys(result[0]);
  return { "keys": fields, "data": result }
}
function convertToCSV(keys, data) {
  let json2csvParser = new json2csv({ keys });
  let csv = json2csvParser.parse(data);
  return csv;
}
async function writeToFile(err) {
  await fs.writeFile(`./output/getModifiedPropertyDetialsWardNo.txt`, err, (err) => {
    if (err) throw err;
    logger.info(`Error Data saved in file `);
    logger.info("===============================================================================");
    connection.end();
  });
}
async function updateDB(values, i) {
  var data = values["data"];
  let pid = data[i]["PID"];
  console.log(i)
  await connection.query('update tblproperty_details set ? where ?', [data[i], { PID: pid }], async function (err, result) {
    if (err) {
      err["pid"] = pid;
      return writeToFile(err);
    }
    logger.info("affectedRows ", result["affectedRows"]);
    logger.info(`Data successfully updated for PID no: ${pid}`);
    logger.info("===============================================================================");
    return `Data successfully updated for PID no: ${pid}`;
  });
}