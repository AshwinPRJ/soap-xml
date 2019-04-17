const soapRequest = require('easy-soap-request');
const fs = require('fs');
const transform = require('camaro')
const json2csv = require('json2csv').Parser
const prettifyXml = require('prettify-xml')
const xml2json = require('xml2json');

const url = 'http://103.112.213.209/INDIANCST/indiancst.asmx';
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'http://tempuri.org/GetPropertyTaxDCBDetails',
};
const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetPropertyTaxDCBDetails xmlns="http://tempuri.org/">
      <WardId>1</WardId>
      <FromPID></FromPID>
      <ToPID></ToPID>
      <FromTaxationYear></FromTaxationYear>
      <ToTaxationYear></ToTaxationYear>
    </GetPropertyTaxDCBDetails>
  </soap:Body>
</soap:Envelope>`;
(async () => {
  const { response } = await soapRequest(url, headers, xml, 10000000); // Optional timeout parameter(milliseconds)
  const { body, statusCode } = response;
  var json = xml2json.toJson(body);
  let obj = JSON.parse(json);
  var result = obj["soap:Envelope"]["soap:Body"]["GetPropertyTaxDCBDetailsResponse"]["GetPropertyTaxDCBDetailsResult"]["DCBEntityIndainCST"];  
  const fields = Object.keys(result[0]);
  console.log(fields);
  const json2csvParser = new json2csv({ fields });
  const csv = json2csvParser.parse(result);

  fs.writeFile('./output/getPropertyTaxDCB.csv', csv, (err) => {  
    if (err) throw err;
    console.log('Data saved!');
  });
})();

