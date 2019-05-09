const soapRequest = require('easy-soap-request');
const fs = require('fs');
const args = require("commander");
const json2csv = require('json2csv').Parser
const xml2json = require('xml2json');
const log4js = require('log4js');
const logger = log4js.getLogger();
const mysql = require('mysql');
logger.level = 'debug';
const config = require('./config/dbconfig.js');
const connection = mysql.createConnection(config.databaseOptions);
const url = 'http://117.239.141.230/eoasis/indiancst.asmx';
let api = 'GetMar19Details';
let wardNo = "",
    fromDate = "",
    toDate = "";
const headers = {
    'Content-Length': 'length',
    'Content-Type': 'text/xml;charset=UTF-8',
    'soapAction': 'http://tempuri.org/GetMar19Details',
};
args
    .version('0.1.0')
    .option('-w, --wardNo []', 'Ward No')
    .option('-f, --fromDate []', 'from date')
    .option('-t, --toDate []', 'to date')
    .parse(process.argv);

connection.connect(function(err) {
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
    let sql = `SELECT * FROM tblcorn_params where api = '${api}' ORDER BY SNo DESC LIMIT 1`;
    try {
        connection.query(sql, async function(err, result) {
            if (err) killTheProcess(err);
            logger.info(`got last requested params `, JSON.stringify(result));
            if (result.length == 0 || !result[0]["from_date"] || !result[0]["to_date"]) {
                logger.info(`\nFrom_date (or) To_date (or) Ward_no in null in DB.\n -----Please check your DB data-----`);
                killTheProcess('From_date (or) To_date (or) Ward_no in null in DB.\n -----Please check your DB data-----');
                return;
            }
            fromDate = await getFormattedDate(result[0]["to_date"]);
            let oneDown = new Date();
            oneDown.setDate(oneDown.getDate() - 1);
            toDate = await getFormattedDate(oneDown);
            for (var i = 1; i <= 35; i++) {
                await getMAR19Details(i, fromDate, toDate);
                if (i == 35) {
                    await insertParam()
                    connection.end();
                }
            }
            return;
        });
    } catch (error) {
        logger.error("error occure while getting 'from-date and to-date from DB\n", error);
        killTheProcess(error);
        return;
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
    logger.info("Ward No: ", wardNo);
    logger.info("From Date: ", fromDate);
    logger.info("To Date: ", toDate);
    await getMAR19Details(wardNo, fromDate, toDate);
    connection.end();
    return;
}

async function getMAR19Details(wardNo, fromDate, toDate) {
    const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      			  <soap:Body>
      			    <GetMar19Details xmlns="http://tempuri.org/">
      			      <WardId>${wardNo}</WardId>
      			      <FromDate>${fromDate}</FromDate>
      			      <ToDate>${toDate}</ToDate>
      			    </GetMar19Details>
      			  </soap:Body>
            </soap:Envelope>`;
    await makeRequest(wardNo, xml);
    return;
}

async function makeRequest(wardNo, xml) {
    try {
        logger.info(`xml request sent for ward no ${wardNo}`)
        const {
            response
        } = await soapRequest(url, headers, xml, 10000000); // 2.7 hrs Optional timeout parameter(milliseconds)
        const {
            body,
            statusCode
        } = response;
        logger.info(`xml response received for ward no ${wardNo}`);
        let json = await convertXMLToJson(body);
        if (json.keys.length === 0) {
            logger.warn(`Data not found for ward no ${wardNo}`);
            return `Data not found for ward no ${wardNo}`;
        }
        logger.info("converted xml to json object ");
        let values = json["data"].map(el => Object.values(el));
        await insertDB(json.keys, values, wardNo);
        return;
    } catch (e) {
        logger.error(`Exception occurred for ward No: ${wardNo} `, e);
        await writeToFile(e, wardNo, fromDate, toDate);
        return;
    }
}

function convertXMLToJson(body) {
    let toJson = xml2json.toJson(body);
    let obj = JSON.parse(toJson);
    if (obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"] == undefined) {
        logger.info(`data not found`);
        return {
            "keys": [],
            "data": []
        }
    }
    let result = obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"]["MAR19EntityIndianCST"];
    if (!result.length) result = [result];
    let fields = Object.keys(result[0]);
    return {
        "keys": fields,
        "data": result
    }
}

function writeToFile(error, ward_no = '', from_date = '', to_date = '') {
    const message = {
        ward_no: ward_no,
        from_date: from_date,
        to_date: to_date,
        error: error
    }
    try {
        fs.appendFile(`./output/getMar19Details.txt`, JSON.stringify(message), function(err) {
            if (err) throw err;
            logger.info(`Error data saved in file...`);
            return;
        });
    } catch (error) {
        logger.error(`error occured while saving to file for ward No: ${wardNo} `, error);
        return;
    }
}

function insertDB(keys, values, wardNo) {
    let sql = `INSERT INTO tblproperty_details (${keys}) VALUES ?`;
    try {
        logger.info("inserting into database");
        connection.query(sql, [values], function(err, result) {
            if (err) {
                logger.info(`error occured while inserting data for ward no: ${wardNo}`);
                writeToFile(err, wardNo, fromDate, toDate);
                return;
            }
            logger.info(`Data successfully inserted for ward no: ${wardNo}`);
            return;
        });
    } catch (error) {
        logger.error(`Error occured while insering master data of ward No. ${wardNo}. \n ErrorMsg: `, error);
        writeToFile(error, wardNo, fromDate, toDate);
        return;
    }
}

function insertParam() {
    var post = {
        api: api
    };
    if (fromDate != "") post.from_date = new Date(fromDate);
    if (toDate != "") post.to_date = new Date(toDate);
    try {
        var query = connection.query('INSERT INTO tblcorn_params SET ?', post, function(error, results, fields) {
            if (error) throw error;
            return "successfully insert the params "
        });
        logger.info("inserted param to cron table",query.sql);
    } catch (e) {
        logger.error(`Error occured while insering input params. ${wardNo}. \n ErrorMsg: `, e);
        writeToFile(e, wardNo, fromDate, toDate);
        return;
    }
}