const soapRequest = require('easy-soap-request');
const fs = require('fs');
const utils = require('./utils.js');
const args = require("commander");
const addToNeo4jDB = require('./propertyDCBLoader.js');
var xml2json = require('xml2json');
var log4js = require('log4js');
const db = require("./neo4j-helper");
const BPromise = require("bluebird");
var logger = log4js.getLogger();
var mysql = require('mysql');
let log_record = [];
logger.level = 'debug';
var config = require('./config/dbconfig.js');
var connection = mysql.createConnection(config.databaseOptions);
const url = 'http://117.239.141.230/eoasis/indiancst.asmx';
let wardNo = "";
let fromYear = "",
    toYear = "",
    fromPID = "",
    toPID = "";
const api = 'GetPropertyTaxDCBDetails';
const headers = {
    'Content-Length': 'length',
    'Content-Type': 'text/xml;charset=UTF-8',
    'soapAction': 'http://tempuri.org/GetPropertyTaxDCBDetails',
};
args
    .version('0.1.0')
    .option('-c, --start []', 'run getPropertyTaxDCB')
    .option('-w, --wardNo []', 'Ward No')
    .option('-s, --fromYear []', 'from year')
    .option('-e, --toYear []', 'to year')
    .option('-f, --fromPID []', 'from pid')
    .option('-t, --toPID []', 'to pid')
    .parse(process.argv);


if (args.start != undefined) {
    dbConnect();
}

function dbConnect() {
    connection.connect(async function (err) {
        if (err) killTheProcess(err);
        logger.info("Successfully connected to database...");
        if (args.wardNo == undefined) {
            await getLastParams();
        } else {
            await start(args);
        }
    });
}

function killTheProcess(err) {
    utils.writeToFile(err, wardNo, fromYear, toYear, api);
    logger.info("ERROR: ", err);
    connection.end();
    logger.info("KILLING THE PROCESS");
    process.exit(22);
}

let getLastParams = function () {
    let sql = `SELECT * FROM tblcron_params where api = '${api}' ORDER BY SNo DESC LIMIT 1`;
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
                if (result.length == 0 || !result[0]["from_year"] || !result[0]["to_year"]) {
                    logger.info(`\nFrom_year (or) To_year `);
                    killTheProcess('From_year (or) To_year');
                    reject({
                        status: false,
                        msg: 'From_date (or) To_date in null in DB'
                    });
                    return;
                }
                var last2digit = new Date().getFullYear().toString().substr(-2);
                let current = parseInt(last2digit) + 1;
                fromYear = "20" + last2digit + "-" + current;
                toYear = fromYear;
                for (var i = 1; i <= 35; i++) {
                    await getPropertyTaxDCBDetails(i, fromYear, toYear, fromPID, toPID);
                    if (i == 35) {
                        await insertParam(api, i, fromYear, toYear);
                        connection.end();
                    }
                }
                resolve({
                    status: true,
                    msg: "DCB Details successfully inserted"
                });
                return;
            });
        } catch (error) {
            logger.error("error occure while getting 'from-year and to-year from DB\n", error);
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
    //logger.log("post xml request", xml);
    await makeRequest(wardNo, xml);
    return;
}
async function makeRequest(wardNo, xml) {
    try {
        logger.info(`xml request sent for ward no ${wardNo}`)
        const {
            response
        } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
        const {
            body,
            statusCode
        } = response;
        logger.info(`xml response received for ward no ${wardNo}`);
        let json = await convertXMLToJson(body);
        if (json.keys.length === 0) {
            logger.warn("Data not found ");
            return "Data not found";
        }
        logger.info("converted xml to json ");
        var values = json["data"].map(el => Object.values(el));
        await insertDB(json.keys, values, wardNo);

        let params = {
            "fromYear": fromYear,
            "toYear": toYear,
            "wardNo": wardNo
        }
        json["data"][0]["params"] = params;

        await BPromise.reduce(json["data"], addToNeo4jDB.add2Graph, log_record)
            .then(function (log_record) {
                logger.info(`Data successfully inserted in Neo4j DB for ward no: ${wardNo}`);
                db.close();
                return;
            })
    } catch (e) {
        logger.error(`Exception occurred for ward No: ${wardNo} `, e);
        utils.writeToFile(e, wardNo, fromYear, toYear, api);
        return;
    }
}

function convertXMLToJson(body) {
    let toJson = xml2json.toJson(body);
    let obj = JSON.parse(toJson);
    if (obj["soap:Envelope"]["soap:Body"]["GetPropertyTaxDCBDetailsResponse"]["GetPropertyTaxDCBDetailsResult"]["DCBEntityIndainCST"] == undefined) {
        return {
            "keys": [],
            "data": []
        }
    }
    let result = obj["soap:Envelope"]["soap:Body"]["GetPropertyTaxDCBDetailsResponse"]["GetPropertyTaxDCBDetailsResult"]["DCBEntityIndainCST"];
    if (!result.length) result = [result];
    let fields = Object.keys(result[0]);
    return {
        "keys": fields,
        "data": result
    }
}

function insertDB(keys, values, wardNo) {
    let sql = `INSERT INTO tblproperty_dcb_details (${keys}) VALUES ?`;
    return new Promise((resolve, reject) => {
        logger.info("inserting into database");
        connection.query(sql, [values], function (err, result) {
            if (err) {
                logger.info(`error occured while inserting data for ward no: ${wardNo}`);
                delete err["sql"];
                //utils.writeToFile(err, wardNo, fromYear, toYear, api);
                reject(err);
                return;
            }
            logger.info(`affectedRows for ward no: ${wardNo} : `, result["affectedRows"]);
            logger.info(`Data successfully inserted for ward no: ${wardNo}`);
            resolve(result);
            return;
        });
    });
}

function insertParam(api, wardNo, fromYear, toYear) {
    var post = {
        api: api
    };
    if (fromYear != "") post.from_year = fromYear;
    if (toYear != "") post.to_year = toYear;
    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO tblcron_params SET ?', post, function (error, results, fields) {
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


module.exports = {
    getLastParams
};