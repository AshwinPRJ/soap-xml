const soapRequest = require('easy-soap-request');
const args = require("commander");
const xml2json = require('xml2json');
const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = 'debug';
const BPromise = require("bluebird");
const mysql = require('mysql');
const utils = require('./utils.js');
const config = require('./config/dbconfig.js');
const db = require("./neo4j-helper");
const addToNeo4jDB = require('./propertyMaster.js');
const connection = mysql.createConnection(config.databaseOptions);
const url = 'http://117.239.141.230/eoasis/indiancst.asmx';
let api = 'GetMar19Details';

let log_record = [];
let wardNo = "";
let fromDate = "",
	toDate = "";

const headers = {
	'Content-Length': 'length',
	'Content-Type': 'text/xml;charset=UTF-8',
	'soapAction': 'http://tempuri.org/GetMar19Details',
};

args
	.version('0.1.0')
	.option('-c, --start []', 'run getMar19Deatils')
	.option('-w, --wardNo []', 'Ward No')
	.option('-f, --fromDate []', 'from date')
	.option('-t, --toDate []', 'to date')
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
	utils.writeToFile(err, wardNo, fromDate, toDate, api);
	connection.end();
	logger.info("ERROR: ", err);
	logger.info("KILLING THE PROCESS");
	process.exit(22);
	return;
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
				const oneDown = new Date();
				oneDown.setDate(oneDown.getDate() - 1);
				toDate = await utils.getFormattedDate(oneDown);
				for (var i = 1; i <= 35; i++) {
					await getMAR19Details(i, fromDate, toDate);
					if (i == 35) {
						await insertParam(api, i, fromDate, toDate)
						connection.end();
					}
				}
				resolve({
					status: true,
					msg: "Property Master successfully inserted"
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
	})
};

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
		let master_data = await utils.formatData(json);
		let params = {
			"fromDate": fromDate,
			"toDate": toDate,
			"wardNo": wardNo
		}
		master_data[0]["params"] = params;
		await insertDB(json.keys, values, wardNo);
		await BPromise.reduce(master_data, addToNeo4jDB.add2Graph, log_record)
			.then(function (log_record) {
				logger.info(`Data successfully inserted in Neo4j DB for ward no: ${wardNo}`);
				db.close();
				return;
			})
	} catch (e) {
		logger.error(`Exception occurred for ward No: ${wardNo} `, e);
		utils.writeToFile(e, wardNo, fromDate, toDate, api);
		return;
	}
}

function insertDB(keys, values, wardNo) {
	let sql = `INSERT INTO tblproperty_details_api (${keys}) VALUES ?`;
	return new Promise((resolve, reject) => {
		logger.info("inserting into database");
		connection.query(sql, [values], (err, result) => {
			if (err) {
				logger.error(`error occured while inserting data for ward no: ${wardNo}`);
				delete err["sql"];
				//utils.writeToFile(err, wardNo, fromDate, toDate, api);
				reject(err);
				return;
			} else {
				logger.info(`affectedRows for ward no: ${wardNo} : `, result["affectedRows"]);
				logger.info(`Data successfully inserted in MySQL for ward no: ${wardNo}`);
				resolve(result);
				return;
			}
		});
	});
}

let insertParam = function (api, wardNo, fromDate, toDate) {
	var post = {
		api: api
	};
	if (fromDate != "") post.from_date = new Date(fromDate);
	if (toDate != "") post.to_date = new Date(toDate);
	new Promise((resolve, reject) => {
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

async function convertXMLToJson(body) {
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
	let finalData = await utils.removeObj(result);
	let fields = Object.keys(result[0]);
	return {
		"keys": fields,
		"data": finalData
	}
}

module.exports = {
	getLastParams
};