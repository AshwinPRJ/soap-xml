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
let wardNo = "", fromYear = "", toYear = "", fromPID = "", toPID = "";
const api = 'GetPropertyTaxDCBDetails';
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'http://tempuri.org/GetPropertyTaxDCBDetails',
};
args
  .version('0.1.0')
  .option('-w, --wardNo []', 'Ward No')
  .option('-s, --fromYear []', 'from year')
  .option('-e, --toYear []', 'to year')
  .option('-f, --fromPID []', 'from pid')
  .option('-t, --toPID []', 'to pid')
  .parse(process.argv);


  connection.connect(async function (err) {
    if (err) {
      await writeToFile(err, wardNo, fromYear, toYear);
      killTheProcess(err);
    }
    logger.info("Successfully connected to database...");
    (function () {
      if (args.wardNo == undefined) {
        const response = getLastParams();
      } else {
        start(args);
      }
    }());
  
  });

  function killTheProcess(err) {
    writeToFile(err, wardNo, fromYear, toYear);
    logger.info("ERROR: ", err);
    //connection.end();
    logger.info("KILLING THE PROCESS");
    process.exit(22);
  }

  async function getLastParams() {
    let sql = `SELECT * FROM tblcorn_params where api = '${api}' ORDER BY SNo DESC LIMIT 1`;
    try {
      await connection.query(sql, async function (err, result) {
        if (err) {
          killTheProcess(err);
        }
        logger.info(`got last requested params `, JSON.stringify(result));
        if (!result[0]["from_year"] || !result[0]["to_year"]) {
          logger.info(`\nFrom_year (or) To_year (or) Ward_no in null in DB.\n -----Please check your DB data-----`);
          killTheProcess('From_year (or) To_year (or) Ward_no in null in DB.\n -----Please check your DB data-----');
        }
        fromYear = result[0]["to_year"];
        var temp = fromYear.split('-');
        var last2digit = new Date().getFullYear().toString().substr(-2);
        toYear = "20"+last2digit-1+"-"+last2digit;
        console.log("toYear", toYear);
        for (var i = 1; i <= 35; i++) {
          await getPropertyTaxDCBDetails(i, fromYear, toYear, fromPID='', toPID='');
          if (i == 35) {
            await insertParam()
            connection.end();
          }
        }
      });
    } catch (error) {
      logger.error("error occure while getting 'from-year and to-year from DB\n");
      killTheProcess(err);
    }
  };

async function start(args) {
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
  await getPropertyTaxDCBDetails(wardNo, fromYear, toYear, fromPID, toPID);
  connection.end();
}
async function getPropertyTaxDCBDetails(wardNo, fromYear, toYear, fromPID, toPID) {
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
console.log(xml);
  return await makeRequest(wardNo, xml);
}
async function makeRequest(wardNo, xml) {
  try {
    logger.info("Request sent ")
    const { response } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
    const { body, statusCode } = response;
    logger.info("xml response received ");
    let json = await convertXMLToJson(body);
    if (json.keys.length === 0) {
        logger.warn("Data not found ");
        return "Data not found";
    }
    logger.debug("converted xml to json ");
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

async function insertDB(keys, values, wardNo) {
    let sql = `INSERT INTO tblproperty_dcb_details (${keys}) VALUES ?`;
  try {
    await connection.query(sql, [values], async function (err, result) {
      if (err) {
        await writeToFile(err, wardNo, fromYear, toYear);
        return;
      }
      logger.info(`Data successfully inserted for ${wardNo}`);
      logger.info("===============================================================================");
      return ;
    });
  } catch (error) {
    logger.error(`Error occured while insering data of ward No. ${wardNo}. \n ErrorMsg: `, error);
    await writeToFile(err, wardNo, fromYear, toYear);
    return;
  }
  
}
async function insertParam() {
    var post = { api: api };
    if (fromYear != "") post.from_year = fromYear;
    if (toYear != "") post.to_year = toYear;
    console.log("post: ", post)
    try{
    var query = connection.query('INSERT INTO tblcorn_params SET ?', post, function (error, results, fields) {
      if (error) throw error;
    });
    console.log(query.sql);
    return "successfully insert the params "

    } catch (e){
        await writeToFile(e, wardNo, fromYear, toYear);
    return;   
    }
  }
async function writeToFile(error, ward_no = '', from_year = '', to_year = '') {
    const message = { ward_no, from_year, to_year, error }
    await fs.appendFileSync(`./output/getPropertyTaxDCBDetails.txt`, JSON.stringify(message), (err) => {
      if (err) throw err;
      logger.error(`Error data saved in file...`);
    });
  }