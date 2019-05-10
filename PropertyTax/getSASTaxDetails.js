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
let wardNo = "",
  fromDate = "",
  toDate = "",
  fromPID = "",
  toPID = "";
const api = 'GetSASTaxDetails';
const url = 'http://117.239.141.230/eoasis/indiancst.asmx';
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'SOAPAction': "http://tempuri.org/GetSASTaxDetails",
};
args
  .version('0.1.0')
  .option('-w, --wardNo []', 'Ward No')
  .option('-s, --fromDate []', 'from date')
  .option('-e, --toDate []', 'to date')
  .option('-f, --fromPID []', 'from pid')
  .option('-t, --toPID []', 'to pid')
  .parse(process.argv);

connection.connect(function (err) {
  if (err) killTheProcess(err);
  logger.info("Successfully connected to database...");
  if (args.wardNo == undefined) {
    getLastParams();
  } else {
    start(args);
  }
});

function killTheProcess(err) {
  writeToFile(err, wardNo, fromDate, toDate);
  connection.end();
  logger.info("ERROR: ", err);
  logger.info("KILLING THE PROCESS");
  process.exit(22);
}

function getLastParams() {
  let sql = `SELECT * FROM tblcron_params where api = '${api}' ORDER BY SNo DESC LIMIT 1`;
  try {
    connection.query(sql, async function (err, result) {
      if (err) killTheProcess(err);
      logger.info(`got last requested params `, JSON.stringify(result));
      if (result.length == 0 || !result[0]["from_date"] || !result[0]["to_date"]) {
        logger.info(`\nFrom_date (or) To_date (or) Ward_no in null in DB.\n -----Please check your DB data-----`);
        killTheProcess('From_date (or) To_date (or) Ward_no in null in DB.\n -----Please check your DB data-----');
      }
      fromDate = await getFormattedDate(result[0]["to_date"]);
      let oneDown = new Date();
      oneDown.setDate(oneDown.getDate() - 1);
      toDate = await getFormattedDate(oneDown);
      for (var i = 1; i <= 35; i++) {
        await getSASTaxDetails(i, fromDate, toDate, fromPID, toPID);
        if (i == 35) {
          await insertParam()
          connection.end();
        }
      }
    });
  } catch (error) {
    logger.error("error occure while getting 'from-date and to-date from DB\n", error);
    killTheProcess(error);
  }
};

function getFormattedDate(date) {
  let year = date.getFullYear();
  let month = (1 + date.getMonth()).toString().padStart(2, '0');
  let day = date.getDate().toString().padStart(2, '0');
  var formate = month + "/" + day + "/" + year;
  logger.info("formated in MM/DD/YYY", formate);
  return month + '/' + day + '/' + year;
}

async function start(args) {
  if (args.wardNo) wardNo = args.wardNo;
  if (args.fromDate) fromDate = args.fromDate;
  if (args.toDate) toDate = args.toDate;
  if (args.fromPID) fromPID = args.fromPID;
  if (args.toPID) toPID = args.toPID;
  logger.info("ward no >>> ", wardNo);
  logger.info("fromYear >>> ", fromDate);
  logger.info("toYear >>> ", toDate);
  logger.info("fromPID >>> ", fromPID);
  logger.info("toPID >>> ", toPID);
  await getSASTaxDetails(wardNo, fromDate, toDate, fromPID, toPID);
  connection.end();
  return;

}
async function getSASTaxDetails(wardNo, fromDate, toDate, fromPID, toPID) {
  const date = {
    wardNo,
    fromDate,
    toDate,
    fromPID,
    toPID
  }
  //logger.info("date : >>", date)
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
  logger.info("xml : >>", xml)
  await makeRequest(wardNo, xml);
  return;
}
async function makeRequest(wardNo, xml) {
  try {
    logger.info(`xml request sent for ward no ${wardNo}`)
    const {
      response
    } = await soapRequest(url, headers, xml, 1000000); // Optional timeout parameter(milliseconds)
    const {
      body,
      statusCode
    } = response;
    logger.info(`xml response received for ward no ${wardNo}`);
    let json = await convertXMLToJson(body);
    if (json.sasList.length === 0) {
      logger.warn("data not found");
      return "data not found";
    }
    logger.info("converted to json ");
    var floor = "";
    var floorFeilds = "";
    if (json["floor"].length != 0) {
      floor = json["floor"].map(el => Object.values(el));
      floorFeilds = Object.keys(json["floor"][0]);
      logger.info("floor details are stored separately ");
    }
    var sasDetails = json["sasList"].map(el => Object.values(el));
    var sasTableFileds = Object.keys(json["sasList"][0]);
    let key = {
      "floorFeilds": floorFeilds,
      "sasTableFileds": sasTableFileds
    };
    let data = {
      "floor": floor,
      "sasDetails": sasDetails
    };
    await insertDB(key, data, wardNo);
    return;
  } catch (e) {
    logger.error(`error occurred for ward ${wardNo} `, e);
    writeToFile(e, wardNo);
    return;
  }
}

function convertXMLToJson(body) {
  var sasList = [];
  var mapSasToFloors = [];
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  if (obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"] == undefined || obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]["SASEntityIndialCST"] == undefined) {
    return {
      "floor": [],
      "sasList": []
    }
  }
  var result = obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]["SASEntityIndialCST"];
  result.map(function floar(value, index) {
    var floorDetails = value["FloorDetails"];
    const PID = value["PID"];
    const SASID = value["SASID"];
    if (floorDetails["FloorDetail"] != undefined) {
      if (!Array.isArray(floorDetails["FloorDetail"])) {
        result[index]["FloorDetails"]["FloorDetail"] = [floorDetails["FloorDetail"]]
      }
      let arrayOfFloors = result[index]["FloorDetails"]["FloorDetail"];
      for (var i = 0; i < arrayOfFloors.length; i++) {
        mapSasToFloors.push({
          SASID,
          PID,
          ...arrayOfFloors[i]
        });
      }
    }
    delete value["FloorDetails"];
    sasList.push({
      ...value
    })
  });
  var table = {
    "floor": mapSasToFloors,
    "sasList": sasList
  }
  return table;
}

function insertDB(keys, values, wardNo) {
  let sasMaster = `INSERT INTO tblsas_master_details (${keys["sasTableFileds"]}) VALUES ?`;
  let sasFloor = `INSERT INTO tblsas_floor_details (${keys["floorFeilds"]}) VALUES ?`;
  try {
    connection.query(sasMaster, [values["sasDetails"]], function (err, result) {
      if (err) {
        logger.error("error occured during inserting master ");
        return writeToFile(err, wardNo);
      }
      logger.info("affectedRows in sas master table:  ", result["affectedRows"]);
      logger.info(`SAS Master Data successfully inserted for ward no: ${wardNo}`);
    });
    if (keys["floorFeilds"] != "") {
      connection.query(sasFloor, [values["floor"]], function (err, result1) {
        if (err) {
          logger.error("error occured during inserting for floor");
          return writeToFile(err, wardNo)
        }
        logger.info("affectedRows in floor table: ", result1["affectedRows"]);
        logger.info(`SAS Floor Data successfully inserted for ward no: ${wardNo}`);
      });
    }
  } catch (e) {
    logger.error(`error occurred for ward ${wardNo} `, e);
    return writeToFile(e, wardNo);
  }
}
function writeToFile(error, ward_no = '', from_date = '', to_date = '') {
  const message = {
    ward_no,
    from_date,
    to_date,
    error
  }
  fs.appendFile(`./output/getSASTaxDetails.txt`, JSON.stringify(message), (err) => {
    if (err) throw err;
    logger.error(`Error data saved in file...`);
    return;
  });
}
function insertParam() {
  var post = {
    api: api
  };
  if (fromDate != "") post.from_date = new Date(fromDate);
  if (toDate != "") post.to_date = new Date(toDate);
  console.log("post: ", post)
  try {
    var query = connection.query('INSERT INTO tblcron_params SET ?', post, function (error, results, fields) {
      if (error) throw error;
      return "successfully insert the params "
    });
    logger.log('inserted params ',query.sql);
  } catch (e) {
    logger.error(`Error occured while insering input params. ${wardNo}. \n ErrorMsg: `, e);
    writeToFile(e, wardNo, fromDate, toDate);
    return;
  }
}