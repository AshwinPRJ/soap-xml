const soapRequest = require('easy-soap-request');
const fs = require('fs');
const args = require("commander");
var xml2json = require('xml2json');
var log4js = require('log4js');
const utils = require('./utils.js');
var logger = log4js.getLogger();
var mysql = require('mysql');
logger.level = 'debug';
const BPromise = require("bluebird");
const db = require("./neo4j-helper");
const addToNeo4jDB = require('./propertySASDetails.js');
var config = require('./config/dbconfig.js');
let log_record = [];
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
  .option('-c, --start []', 'run getSASTaxDetails')
  .option('-w, --wardNo []', 'Ward No')
  .option('-s, --fromDate []', 'from date')
  .option('-e, --toDate []', 'to date')
  .option('-f, --fromPID []', 'from pid')
  .option('-t, --toPID []', 'to pid')
  .parse(process.argv);

if (args.start != undefined) {
  dbConnect();
}

function dbConnect() {
  connection.connect(async function (err) {
    if (err){
			killTheProcess(err) ;
			return;
		} 
    logger.info("Successfully connected to database...");
    if (args.wardNo == undefined) {
      await getLastParams();
    } else {
      await start(args);
    }
    return;
  });
}

function killTheProcess(err) {
  utils.writeToFile(err, wardNo, fromDate, toDate);
  connection.end();
  logger.info("ERROR: ", err);
  logger.info("KILLING THE PROCESS");
  process.exit(22);
}

let getLastParams = function () {
  let sql = `SELECT * FROM tblcron_params_api where api = '${api}' ORDER BY SNo DESC LIMIT 1`;
  return new Promise((resolve, reject) => {
    try {
      connection.query(sql, async function (err, result) {
        if (err) {
          killTheProcess(err);
          reject({
            status: false,
            msg: err
          });
          return;
        }
        logger.info(`got last requested params `, JSON.stringify(result));
        if (result.length == 0 || !result[0]["from_date"] || !result[0]["to_date"]) {
          logger.info(`\nFrom_date (or) To_date in null in DB`);
          killTheProcess('From_date (or) To_date in null in DB');
          reject({
            status: false,
            msg: 'From_date (or) To_date in null in DB'
          });
          return;
        }
        let oneUp = result[0]["to_date"];
        oneUp.setDate(oneUp.getDate() + 1);
        fromDate = await utils.getFormattedDate(oneUp);
        let oneDown = new Date();
        oneDown.setDate(oneDown.getDate() - 1);
        toDate = await utils.getFormattedDate(oneDown);
        for (var i = 1; i <= 35; i++) {
          await getSASTaxDetails(i, fromDate, toDate, fromPID, toPID);
          if (i == 35) {
            await insertParam(api, i, fromDate, toDate)
            connection.end();
          }
        }
        resolve({
          status: true,
          msg: "SAS Deatils successfully inserted"
        });
        return;
      });
    } catch (error) {
      logger.error("error occure while getting 'from-date and to-date from DB\n", error);
      killTheProcess(error);
      reject({
        status: false,
        msg: error
      });
      return;
    }
  });
};

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
  //logger.info("xml : >>", xml)
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
    logger.info("converted to json ");
    let stringifyFloors = await floorStirng(body);
    if (json.sasList.length === 0) {
      logger.warn("data not found");
      return "data not found";
    }
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
    let params = {
      "fromDate": fromDate,
      "toDate": toDate,
      "wardNo": wardNo
    };
    stringifyFloors["sasDeatils"][0]["params"] = params;
    await BPromise.reduce(stringifyFloors["sasDeatils"], addToNeo4jDB.add2Graph, log_record)
      .then(function (log_record) {
        logger.info(`SAS Data successfully inserted for ward no: ${wardNo}`);
        db.close();
        return;
      })

    // stringifyFloors["sasDeatils"].forEach(async function(value, index){
    // 	let neo4jResult = await addToNeo4jDB.add2Graph({SAS:value});
    // 	console.log("count: ", index);
    // });
  } catch (e) {
    logger.error(`error occurred for ward ${wardNo} `);
    utils.writeToFile(e, wardNo, fromDate, toDate, api);
    return;
  }
}

async function convertXMLToJson(body) {
  var sasList = [];
  var mapSasToFloors = [];
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  //console.log("obj: ", obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]);
  if (obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"] == undefined || obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]["SASEntityIndialCST"] == undefined) {
    return {
      "floor": [],
      "sasList": []
    }
  }
  var result = obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]["SASEntityIndialCST"];
  if (!result.length) result = [result];
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
  let finalSASList = await utils.removeObj(sasList);
  //console.log("finalSASList: \t", finalSASList);
  var table = {
    "floor": mapSasToFloors,
    "sasList": finalSASList
  }
  return table;
}

function insertDB(keys, values, wardNo) {
  let sasMaster = `INSERT INTO tblsas_master_details_api (${keys["sasTableFileds"]}) VALUES ?`;
  let sasFloor = `INSERT INTO tblsas_floor_details_api (${keys["floorFeilds"]}) VALUES ?`;
  return new Promise((resolve, reject) => {
    connection.query(sasMaster, [values["sasDetails"]], function (err, result) {
      if (err) {
        logger.error("error occured during inserting master ");
        reject(err);
        return;
      }
      logger.info("affectedRows in sas master table:  ", result["affectedRows"]);
      logger.info(`SAS Master Data successfully inserted for ward no: ${wardNo}`);
      if (keys["floorFeilds"] != "") {
        connection.query(sasFloor, [values["floor"]], function (err, result1) {
          if (err) {
            logger.error("error occured during inserting for floor");
            reject(err);
            return;
          }
          logger.info("affectedRows in floor table: ", result1["affectedRows"]);
          logger.info(`SAS Floor Data successfully inserted for ward no: ${wardNo}`);
          resolve({
            result,
            result1
          });
          return;
        });
      } else {
        resolve({
          result
        });
        return;
      }
    });
  });
}

function insertParam(api, wardNo, fromDate, toDate) {
  var post = {
    api: api
  };
  if (fromDate != "") post.from_date = new Date(fromDate);
  if (toDate != "") post.to_date = new Date(toDate);
  return new Promise((resolve, reject) => {
    connection.query('INSERT INTO tblcron_params_api SET ?', post, function (error, results, fields) {
      if (error) {
        logger.error(`error occured while inserting params data `);
        delete error["sql"];
        //utils.writeToFile(error, wardNo, fromDate, toDate, api);
        reject(error);
        return;
      }
      logger.info(`inserted params to cron table `, post);
      resolve(results);
      return;
    });
  });
}

function floorStirng(body) {
  var sasDeatils = [];
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  if (obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"] == undefined || obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]["SASEntityIndialCST"] == undefined) {
    return {
      "sasDeatils": []
    }
  }
  var result = obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]["SASEntityIndialCST"];
  if (!result.length) result = [result];
  result.map(function floor(value, index) {
    value["amt"] = parseInt(value["TotalAmount"]);
    value["TotalAmount"] = parseInt(value["TotalAmount"]);
    value["NotPaidAmount"] = parseInt(value["NotPaidAmount"]);
    value["TaxAmount"] = parseInt(value["TaxAmount"]);
    if (value["Status"] == 'Filed & Paid') {
      value["status"] = "PAID"
    } else {
      value["status"] = "NOT_PAID"
    }
    value["FloorDetails"] = JSON.stringify(value["FloorDetails"]);
    Object.keys(value).forEach((k) => {
      if (typeof (value[k]) === "object" && Object.keys(value[k]).length == 0) {
        value[k] = "-";
      }
    })
    sasDeatils.push({
      ...value
    })
  });
  return {
    "sasDeatils": sasDeatils
  }
}

module.exports = {
  getLastParams
};