const soapRequest = require('easy-soap-request');
const args = require("commander");
var xml2json = require('xml2json');
var log4js = require('log4js');
var logger = log4js.getLogger();
var mysql = require('mysql');
logger.level = 'debug';
const BPromise = require("bluebird");
const db = require("./neo4j-helper");
const utils = require('./utils.js');
let log_record = [];
var config = require('./config/dbconfig.js');
const updateToNeo4jDB = require('./propertyMasterUpdate.js');
var connection = mysql.createConnection(config.databaseOptions);
const url = 'http://117.239.141.230/eoasis/indiancst.asmx';
const api = 'GetModifiedPropertyDetails';
let fromDate = "",
    toDate = "";
const headers = {
    'Content-Length': 'length',
    'Content-Type': 'text/xml;charset=UTF-8',
    'soapAction': 'http://tempuri.org/GetModifiedPropertyDetails',
}
args
    .version('0.1.0')
    .option('-c, --start []', 'run getModifiedPropertyDeatils')
    .option('-f, --fromDate []', 'from date')
    .option('-t, --toDate []', 'to date')
    .parse(process.argv);

function killTheProcess(err) {
    utils.writeToFile(err, wardNo, fromDate, toDate, api);
    connection.end();
    logger.info("ERROR: ", err);
    logger.info("KILLING THE PROCESS");
    process.exit(22);
}


if (args.start != undefined) {
	dbConnect();
}

function dbConnect() {
    connection.connect(async function (err) {
        if (err) killTheProcess(err);
        logger.info("Successfully connected to database...");
        if (args.fromDate == undefined) {
            await getLastParams();
        } else {
            await start(args);
        }
    });
}
let getLastParams = function () {
    let sql = `SELECT * FROM tblcron_params where api = '${api}' ORDER BY SNo DESC LIMIT 1`;
    return new Promise((resolve, reject) => {
        try {
            connection.query(sql, async function (err, result) {
                if (err) {
					killTheProcess(err);
					reject({status:false, msg:err});
				}
                logger.info(`got last requested params `, JSON.stringify(result));
                if (result.length == 0 || !result[0]["from_date"] || !result[0]["to_date"]) {
                    logger.info(`From_date (or) To_date in null in DB.`);
                    killTheProcess('From_date (or) To_date in null in DB.');
                    reject({status:false, msg:'From_date (or) To_date in null in DB'});
                }
                let oneUp = result[0]["to_date"];
                oneUp.setDate(oneUp.getDate() + 1);
                fromDate = await utils.getFormattedDate(oneUp);
                let oneDown = new Date();
                oneDown.setDate(oneDown.getDate() - 1);
                toDate = await utils.getFormattedDate(oneDown);
                await getModifiedPropertyDetails(fromDate, toDate);
                await insertParam(api, fromDate, toDate);
                connection.end();
                resolve({status:true, msg:"Property Update Details successfully inserted"});
            });
        } catch (error) {
            logger.error("error occure while getting 'from-date and to-date from DB\n", error);
            killTheProcess(error);
            reject({status:false, msg:error});
        }
    });
};

async function start(args) {
    if (args.fromDate) fromDate = args.fromDate;
    if (args.toDate) toDate = args.toDate;
    logger.info("From Date: ", fromDate);
    logger.info("To Date: ", toDate);
    await getModifiedPropertyDetails(fromDate, toDate);
    connection.end();
    return;
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
    await makeRequest(xml);
    return;
}

async function makeRequest(xml) {
    try {
        logger.info(`xml request sent for from date: ${fromDate} - to date: ${toDate} `)
        const {
            response
        } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
        const {
            body,
            statusCode
        } = response;
        logger.info(`xml response received for from date: ${fromDate} - to date: ${toDate} `);
        let json = await convertXMLToJson(body);
        if (json.keys.length === 0) {
            logger.error("Data not found ", json.data);
            return "Data not found ";
        }
        logger.info("converted xml response to JSON obj");
        let master_data = await utils.formatData(json);
        let params = {
            "fromDate": fromDate,
            "toDate": toDate
        }
        master_data[0]["params"] = params;
        //logger.info("master_data: ", master_data);
        for (var i = 0; i <= json["data"].length - 1; i++) {
            await updateDB(json, i);
        }
        await BPromise.reduce(master_data, updateToNeo4jDB.add2Graph, log_record)
            .then(function (log_record) {
                db.close();
                return;
            })
    } catch (e) {
        logger.error(`error occurred for from date: ${fromDate} - to date: ${toDate}`, e);
        utils.writeToFile(e, 'no ward for update', fromDate, toDate, api);
        return;
    }
}

async function convertXMLToJson(body) {
    let finalData = [];
    let toJson = xml2json.toJson(body);
    let obj = JSON.parse(toJson);
    if (obj["soap:Envelope"]["soap:Body"]["GetModifiedPropertyDetailsResponse"]["GetModifiedPropertyDetailsResult"] == undefined) {
        return {
            "keys": [],
            "data": []
        }
    }
    let result = obj["soap:Envelope"]["soap:Body"]["GetModifiedPropertyDetailsResponse"]["GetModifiedPropertyDetailsResult"]["MAR19EntityIndianCST"];
    if (!result.length) result = [result];
    finalData = await utils.removeObj(result);
    let fields = Object.keys(result[0]);
    return {
        "keys": fields,
        "data": finalData
    }
}

function updateDB(values, i) {
    var data = values["data"];
    let pid = data[i]["PID"];
    return new Promise((resolve, reject) => {
        connection.query('update tblproperty_details set ? where ?', [data[i], {
            PID: pid
        }], function (err, result) {
            if (err) {
                err["pid"] = pid;
                delete err["sql"];
                //utils.writeToFile(err, '', fromDate, toDate, api);
                reject(err);
            }

            logger.info(`affectedRows for from date: ${fromDate} - to date: ${toDate} `, result["affectedRows"]);
            logger.info(`Data successfully updated for PID no: ${pid}`);
            resolve(result);
        });
    });
}

let insertParam = function (api, fromDate, toDate) {
    var post = {
        api: api
    };
    if (fromDate != "") post.from_date = new Date(fromDate);
    if (toDate != "") post.to_date = new Date(toDate);
    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO tblcron_params SET ?', post, function (error, results, fields) {
            if (error) {
                delete error["sql"];
                //utils.writeToFile(err, '', fromDate, toDate, api);
                reject(error);
            }
            logger.info(`inserted params to cron table `, post);
            resolve(results);
        });
    });
}

module.exports = {
    getLastParams
};