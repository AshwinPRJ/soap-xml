const fs = require('fs');
const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = 'debug';
const mysql = require('mysql');
const config = require('./config/dbconfig.js');
const connection = mysql.createConnection(config.databaseOptions);
let u_type = {
	"UNDEFINED": 0,
	"COMMERCIAL": 1,
	"RESIDENTIAL": 2,
	"RESI/COMM": 3,
	"PUBLIC SERVICE": 4,
	"INDUSTRIAL": 5,
	"Mosque(Masjid)": 6,
	"TEMPLE": 7,
	"VACANT SITE": 8,
	"Church": 9,
	"COLLEGE": 10,
	"Govt office": 11,
	"HOTEL/CHOULTRIES/NURSING HOME": 12,
	"SCHOOL": 13
};
let c_type = {
	"CONSTRUCTED": 0,
	"OPEN LAND": 1,
};
let b_type = {
	"central govt": 0,
	"Ex-Servicemen": 1,
	"Government Educational  Institutions": 2,
	"Masjed": 3,
	"Private Educational Institutions with Exemption": 4,
	"PUBLIC SERVICE": 5,
	"state govt": 6,
	"Temple": 7,
	"unknown": 8
};
let owner_details = [
	"OwnerAddress",
	"OccupierName",
	"OwnerFirstName",
	"OwnerMiddleName",
	"OwnerLastName",
	"OwnerFirstNameEng",
	"OwnerMiddleNameEng",
	"OwnerLastNameEng",
	"PhoneNo",
	"MobileNo",
	"Email",
	"AdharNo"
];

let formatData = function (json) {
	let finalData = [];
	json["data"].map(function (value, index) {
		let property_master = {};
		let owner_master = {};
		Object.keys(value).forEach((k) => {
			if (typeof (value[k]) === "object" && Object.keys(value[k]).length == 0) {
				value[k] = "-";
			}
			if (owner_details.indexOf(k) != -1) {
				owner_master[k] = value[k]
			} else {
				property_master[k] = value[k];
				if (k == "PropertyUsage")
					property_master["u_type"] = u_type[value[k]];
				if (k == "physical_property")
					property_master["c_type"] = c_type[value[k]];
				if (k == "property_class")
					property_master["b_type"] = b_type[value[k]];
				if (k == "TotalArea")
					property_master["TotalArea"] = parseInt(value[k]);
			}
		})
		finalData.push({
			property_master,
			owner_master
		})
	});
	return finalData;
}
let writeToFile = function (error, ward_no = '', from_date = '', to_date = '', api = '') {
	const message = {
		ward_no: ward_no,
		from_date: from_date,
		to_date: to_date,
		error: error,
		api: api
	}
	var today = new Date();
	var dd = String(today.getDate()).padStart(2, '0');
	var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
	var yyyy = today.getFullYear();
	today =   dd + mm + yyyy;
	api += today;
	console.log("api: \t",api);
	try {
		fs.appendFile(`./output/${api}.txt`, JSON.stringify(message), function (err) {
			if (err) throw err;
			logger.info(`Error data saved in file...`);
			return;
		});
	} catch (error) {
		logger.error(`error occured while saving to file for ward No: ${ward_no} `, error);
		return;
	}
}
let insertParam = function (api, wardNo, fromDate, toDate) {
	var post = {
		api: api
	};
	if (fromDate != "") post.from_date = new Date(fromDate);
	if (toDate != "") post.to_date = new Date(toDate);
	try {
		var query = connection.query('INSERT INTO tblcron_params SET ?', post, function (error, results, fields) {
			if (error) throw error;
			logger.info(`affectedRows for ward no: ${wardNo} : `, results["affectedRows"]);
			return "successfully insert the params "
		});
		logger.info("inserted param to cron table", query.sql);
	} catch (e) {
		logger.error(`Error occured while insering input params. ${wardNo}. \n ErrorMsg: `, e);
		writeToFile(e, wardNo, fromDate, toDate);
		return;
	}
}
let removeObj = function (result) {
	let finalData = [];
	result.map(function (value, index) {
		let rmObj = {};
		Object.keys(value).forEach((k) => {
			if (typeof (value[k]) === "object" && Object.keys(value[k]).length == 0) {
				value[k] = "-";
			}
			rmObj[k] = value[k];
		})
		finalData.push(rmObj);
	});
	return finalData;
}
let getFormattedDate = function (date) {
	let year = date.getFullYear();
	let month = (1 + date.getMonth()).toString().padStart(2, '0');
	let day = date.getDate().toString().padStart(2, '0');
	var formate = month + "/" + day + "/" + year;
	logger.info("formated in MM/DD/YYY", formate);
	return month + '/' + day + '/' + year;
}
module.exports = {
	u_type,
	c_type,
	b_type,
	owner_details,
	formatData,
	writeToFile,
	insertParam,
	getFormattedDate,
	removeObj
};