const soapRequest = require('easy-soap-request');
const fs = require('fs');
const transform = require('camaro');
const json2csv = require('json2csv').Parser
const prettifyXml = require('prettify-xml');
var format = require('xml-formatter');
var xml2json = require('xml2json');
var parseString = require('xml2js').parseString;
var prettyjson = require('prettyjson');
const util = require('util')


const url = 'http://103.112.213.209/INDIANCST/indiancst.asmx';
const headers = {
    'Content-Length': 'length',
    'Content-Type': 'text/xml;charset=UTF-8',
    'soapAction': 'http://tempuri.org/GetModifiedPropertyDetails',
};
const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      			  <soap:Body>
      			    <GetModifiedPropertyDetails xmlns="http://tempuri.org/">
      			      <WardId>1</WardId>
      			      <FromDate>01/01/2015</FromDate>
      			      <ToDate>01/01/2019</ToDate>
      			    </GetModifiedPropertyDetails>
      			  </soap:Body>
      			</soap:Envelope>`;
(async () => {
    const { response } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
    const { body, statusCode } = response;
    console.log(body);
    var json = xml2json.toJson(body);
    let obj = JSON.parse(json);
    // console.log("to json -> %s", JSON.parse(json));
    // console.log("######keys", Object.keys(obj));
    // console.log("######keys", Object.keys(obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"]["MAR19EntityIndianCST"]));
    // const result = obj["soap:Envelope"]["soap:Body"]["GetMar19DetailsResponse"]["GetMar19DetailsResult"]["MAR19EntityIndianCST"];
    // const data = JSON.stringify(result);
    // const fields = Object.keys(result[0]);
    // // console.log("keys: ",Object.keys(result[0]));
    // const json2csvParser = new json2csv({ fields });
    // const csv = json2csvParser.parse(result);
    // // console.log(csv)
    // fs.writeFile('./output/getModifiedPropertyDetails.csv', csv, (err) => {
    //     if (err) throw err;
    //     console.log('Data saved!');
    // });

})();

