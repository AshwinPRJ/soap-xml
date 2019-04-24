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
  'soapAction': 'http://tempuri.org/GetSASTaxDetails',
};
args
  .version('0.1.0')
  .option('-w, --wardNo <>', 'Ward No')
  .option('-s, --fromDate []', 'from date')
  .option('-e, --toDate []', 'to date')
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
  let wardNo = "", fromDate = "", toDate = "", fromPID = "", toPID = "";
  if (args.wardNo) wardNo = args.wardNo;
  if (args.fromDate) fromDate = args.fromDate;
  if (args.toDate) toDate = args.toDate;
  if (args.fromPID) fromPID = args.fromPID;
  if (args.toPID) toPID = args.toPID;
  logger.info("===============================================================================");
  logger.info("ward no >>> ", wardNo);
  logger.info("fromYear >>> ", fromDate);
  logger.info("toYear >>> ", toDate);
  logger.info("fromPID >>> ", fromPID);
  logger.info("toPID >>> ", toPID);
  return await getMAR19Details(wardNo, fromDate, toDate, fromPID, toPID);
}
async function getMAR19Details(wardNo, fromDate, toDate, fromPID, toPID) {
  const date = { wardNo, fromDate, toDate, fromPID, toPID }
  //logger.debug("date : >>", date)
  const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <GetSASTaxDetails xmlns="http://tempuri.org/">
                  <WardId>${wardNo}</WardId>
                  <FromDate>${fromDate}</FromDate>
                  <ToDate>${toDate}</ToDate>
                  <FromPID>${fromPID}</FromPID>
                  <ToPID>${toPID}</ToPID>
                </GetSASTaxDetails>
              </soap:Body>
            </soap:Envelope>`;
  //logger.debug("xml : >>", xml)
  return await makeRequest(wardNo, xml);
}
async function makeRequest(wardNo, xml) {
  try {
    //logger.info("xml request sent >>> ")
    const { response } = await soapRequest(url, headers, xml, 1000000); // Optional timeout parameter(milliseconds)
    const { body, statusCode } = response;
    //logger.debug("response from api: ", body)
    let json = await convertXMLToJson(body);
    //logger.debug("converted to json: ", json);
    var floor = json["floor"].map(el => Object.values(el));
    var sasDetails = json["sasList"].map(el => Object.values(el));
    //logger.debug("converted to floor: ", floor);
    //logger.debug("converted to sasDetails: ", sasDetails);
    const floorFeilds = Object.keys(json["floor"][0]);
    const sasTableFileds = Object.keys(json["sasList"][0]);
    //logger.debug("converted to sasTableFileds: ", sasTableFileds);
    //logger.debug("converted to floorFeilds: ", floorFeilds);
    let key = { "floorFeilds": floorFeilds, "sasTableFileds": sasTableFileds };
    let data = { "floor": floor, "sasDetails": sasDetails };
    return await insertDB(key, data, wardNo);
  } catch (e) {
    return logger.error(`error occurred for ward ${wardNo} `, e);
  }
}
function convertXMLToJson(body) {
  var sasList = [];
  var mapSasToFloors = [];
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  logger.debug("converted xml response to JSON obj >>> ");
  var result = obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]["SASEntityIndialCST"];
  console.log("result : ", result);
  result.map(function floar(value, index) {
    var floorDetails = value["FloorDetails"];
    const PID = value["PID"];
    const SASID = value["SASID"];
    if (floorDetails["FloorDetail"] != undefined) {
      if (!Array.isArray(floorDetails["FloorDetail"])) {
        result[index]["FloorDetails"]["FloorDetail"] = [floorDetails["FloorDetail"]]
      }//convert into array 
      let arrayOfFloors = result[index]["FloorDetails"]["FloorDetail"];
      for (var i = 0; i < arrayOfFloors.length; i++) {
        mapSasToFloors.push({ SASID, PID, ...arrayOfFloors[i] });
      }
    }
    delete value["FloorDetails"];
    sasList.push({ ...value })
  });
  console.log("sasList:>>>", sasList);
  console.log("mapSasToFloors:>>>", mapSasToFloors);
  var table = { "floor": mapSasToFloors, "sasList": sasList }
  return table;
}
async function insertDB(keys, values, wardNo) {
  logger.debug("converted to keys: ", keys);
  logger.debug("converted to values: ", values);
  let sasMaster = `INSERT INTO tblsas_master_details (${keys["sasTableFileds"]}) VALUES ?`;
  let sasFloor = `INSERT INTO tblsas_floor_details (${keys["floorFeilds"]}) VALUES ?`;

  await connection.query(sasMaster, [values["sasDetails"]], async function (err, result) {
    if (err) {
      logger.error("error occured during inserting ", err);
      return writeToFile(err, wardNo)
    }
    logger.info("affectedRows in sas master table:  ", result["affectedRows"]);
    logger.info(`SAS Master Data successfully inserted for ward no: ${wardNo}`);
    await connection.query(sasFloor, [values["floor"]], async function (err, result1) {
      if (err) {
        logger.error("error occured during inserting ", err);
        return writeToFile(err, wardNo)
      }
      logger.info("affectedRows in floor table: ", result1["affectedRows"]);
      logger.info("===============================================================================");
      logger.info(`SAS Floor Data successfully inserted for ward no: ${wardNo}`);
      connection.end();
    });
  });
}
async function writeToFile(err, wardNo) {
  await fs.writeFile(`./output/getSASDetailsWardNo:${wardNo}.txt`, err, (err) => {
      if (err) throw err;
      logger.info(`Error Data saved in file for ward ${wardNo}`);
      logger.info("===============================================================================");
      connection.end();
    });
}
