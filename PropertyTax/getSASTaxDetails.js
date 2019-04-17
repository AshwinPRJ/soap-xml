const soapRequest = require('easy-soap-request');
const fs = require('fs');
const transform = require('camaro')
const json2csv = require('json2csv').Parser
const prettifyXml = require('prettify-xml');
const xml2json = require('xml2json');

const url = 'http://103.112.213.209/INDIANCST/indiancst.asmx';
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'http://tempuri.org/GetSASTaxDetails',
};
const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <GetSASTaxDetails xmlns="http://tempuri.org/">
                  <WardId>1</WardId>
                  <FromDate>01/01/2017</FromDate>
                  <ToDate>01/01/2018</ToDate>
                  <FromPID></FromPID>
                  <ToPID></ToPID>
                </GetSASTaxDetails>
              </soap:Body>
            </soap:Envelope>`;
(async () => {
	
  const { response } = await soapRequest(url, headers, xml, 1000000); // Optional timeout parameter(milliseconds)
  const { body, statusCode } = response;
  console.log("<<<<<<<<<<<<<<<<<<", body);
  // var sasList = [];
  // var mapSasToFloors = [];
  // var json = xml2json.toJson(body);
  // let obj = JSON.parse(json);
  // var result = obj["soap:Envelope"]["soap:Body"]["GetSASTaxDetailsResponse"]["GetSASTaxDetailsResult"]["SASEntityIndialCST"];
  // result.map(function floar(value, index ) {
  //   var floorDetails = value["FloorDetails"];
  //   const PID = value["PID"];
  //   const SASID = value["SASID"]; 
  //   if (floorDetails["FloorDetail"] != undefined){
  //     if (!Array.isArray(floorDetails["FloorDetail"])) { 
  //       result[index]["FloorDetails"]["FloorDetail"] = [floorDetails["FloorDetail"]] 
  //     }//convert into array 
  //     let arrayOfFloors = result[index]["FloorDetails"]["FloorDetail"];
  //     for(var i=0; i < arrayOfFloors.length; i++){
  //       mapSasToFloors.push({SASID, PID, ...arrayOfFloors[i]});
  //     }
  //   }
  //   delete value["FloorDetails"];
  //   sasList.push({...value})
  // });

  // const sasTableFileds = Object.keys(sasList[0]);
  // const sasFloorTableFileds = Object.keys(mapSasToFloors[0]);
  // const sasData_csv = jsontocsv(sasTableFileds, sasList);
  // createFile('./output/getSASTaxDetails.csv',sasData_csv);
  // const sasFloorData_csv = jsontocsv(sasFloorTableFileds, mapSasToFloors);
  // createFile('./output/getSASfloorDetails.csv', sasFloorData_csv);
  
})();

function createFile(name, data){
  fs.writeFile(name, data, (err) => {
    if (err) throw err;
    console.log(`${name} Data saved!`);
  });
}
function jsontocsv(keys, data){
  const json2csvParser = new json2csv({ keys });
  const csvdata = json2csvParser.parse(data);
  return csvdata;
}


