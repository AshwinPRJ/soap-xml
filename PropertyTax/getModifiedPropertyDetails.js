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
const api = 'GetModifiedPropertyDetails';
let fromDate = "", toDate = "";
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'http://tempuri.org/GetModifiedPropertyDetails',
}
args
  .version('0.1.0')
  .option('-f, --fromDate []', 'from date')
  .option('-t, --toDate []', 'to date')
  .parse(process.argv);

function killTheProcess(err) {
  writeToFile(err, fromDate, toDate);
  connection.end();
  logger.info("ERROR: ", err);
  logger.info("KILLING THE PROCESS");
  process.exit(22);
}

connection.connect(async function (err) {
  if (err) {
    await writeToFile(err, fromDate, toDate);
    killTheProcess(err);
  }
  logger.info("Successfully connected to database...");
  (function () {
    if (args.fromDate == undefined) {
      const response = getLastParams();
    } else {
      start(args);
    }
  }());
});

async function getLastParams() {

  let sql = `SELECT * FROM tblcorn_params where api = '${api}' ORDER BY SNo DESC LIMIT 1`;
  try {
    await connection.query(sql, async function (err, result) {
      if (err) {
        killTheProcess(err);
      }
      logger.info(`got last requested params `, JSON.stringify(result));
      if (!result[0]["from_date"] || !result[0]["to_date"]) {
        logger.info(`\nFrom_date (or) To_date in null in DB.\n -----Please check your DB data-----`);
        killTheProcess('From_date (or) To_date in null in DB.\n -----Please check your DB data-----');
      }
      fromDate = await getFormattedDate(result[0]["to_date"]);
      let oneDown = new Date();
      oneDown.setDate(oneDown.getDate() - 1);
      toDate = await getFormattedDate(oneDown);
      await getModifiedPropertyDetails(fromDate, toDate);
      await insertParam();
      connection.end();
    });
  } catch (error) {
    logger.error("error occure while getting 'from-date and to-date from DB\n");
    killTheProcess(err);
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
  if (args.fromDate) fromDate = args.fromDate;
  if (args.toDate) toDate = args.toDate;
  logger.info("From Date: ", fromDate);
  logger.info("To Date: ", toDate);
  await getModifiedPropertyDetails(fromDate, toDate);
  connection.end();
}

async function getModifiedPropertyDetails(fromDate, toDate) {
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
    logger.info(`xml request sent `)
    const { response } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
    const { body, statusCode } = response;
    logger.info("xml response received body ");
    let json = await convertXMLToJson(body);
    if (json.keys.length === 0) {
      logger.error("Data not found ", json.data);
      return "Data not found ";
    }
    logger.debug("converted xml response to JSON obj");
    await (async () => {
      for (var i = 0; i <= json["data"].length - 1; i++) {
        await updateDB(json, i);
      }
    })();
    return "Data successfully updated ";
  } catch (e) {
    logger.error(`error occurred `, e);
    await writeToFile(e, fromDate, toDate);
  }
}

function convertXMLToJson(body) {
  let toJson = xml2json.toJson(body);
  let obj = JSON.parse(toJson);
  if (obj["soap:Envelope"]["soap:Body"]["GetModifiedPropertyDetailsResponse"]["GetModifiedPropertyDetailsResult"]== undefined ) {
    return { "keys": [], "data": [] }
  }
  let result = obj["soap:Envelope"]["soap:Body"]["GetModifiedPropertyDetailsResponse"]["GetModifiedPropertyDetailsResult"]["MAR19EntityIndianCST"];
  if (!result.length) result = [result];
  let fields = Object.keys(result[0]);
  return { "keys": fields, "data": result }
}

async function updateDB(values, i) {
  var data = values["data"];
  let pid = data[i]["PID"];
  try {
    await connection.query('update tblproperty_details set ? where ?', [data[i], { PID: pid }], async function (err, result) {
      if (err) {
        err["pid"] = pid;
        return writeToFile(err, fromDate, toDate);
      }
      logger.info(`Data successfully updated for PID no: ${pid}`);
      logger.info("===============================================================================");
      return `Data successfully updated for PID no: ${pid}`;
    });
  } catch (error) {
    err["pid"] = pid;
    return writeToFile(err, fromDate, toDate);
  }
}
async function insertParam() {
  var post = { api: api };
  if (fromDate != "") post.from_date = new Date(fromDate);
  if (toDate != "") post.to_date = new Date(toDate);
  console.log("post: ", post)
  try {
    var query = connection.query('INSERT INTO tblcorn_params SET ?', post, function (error, results, fields) {
      if (error) throw error;
      console.log(query.sql);
    });
    return "successfully insert the params "
  } catch (error) {
    return writeToFile(error, fromDate, toDate);
  }
}
async function writeToFile(error, from_date = '', to_date = '') {
  const message = { from_date, to_date, error }
  await fs.appendFileSync(`./output/getModifiedPropertyDetails.txt`, JSON.stringify(message), (err) => {
    if (err) throw err;
    logger.error(`Error data saved in file...`);
  });
}