const soapRequest = require('easy-soap-request');
const fs = require('fs');
const transform = require('camaro')
const json2csv = require('json2csv').parse
const prettifyXml = require('prettify-xml')

const url = 'http://103.112.213.209/INDIANCST/indiancst.asmx';
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'http://tempuri.org/GetAllStreets',
};
const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <GetAllStreets xmlns="http://tempuri.org/">
                  <BlockId>4</BlockId>
                </GetAllStreets>
              </soap:Body>
            </soap:Envelope>`;
(async () => {
  const { response } = await soapRequest(url, headers, xml); // Optional timeout parameter(milliseconds)
  const { body, statusCode } = response;
  const options = {indent: 2, newline: '\n'} // 2 spaces is default, newline defaults to require('os').EOL
  const output = prettifyXml(body, options) // options is optional
  /*let data = body;
  const template = {
    data: ['//BlockEntityWS', {
        WardId: 'WardId',
        WardNo: 'WardNo',
        BlockId: 'BlockId',
        BlockNo: 'BlockNo'
    }]
}

const result = transform(body, template)
  var ash = JSON.stringify(result, null, 2);
  console.log(ash)
  const csv = json2csv(result.data)
  console.log(csv)*/

  fs.writeFile('./output/getAllStreets.xml', output, (err) => {  
    if (err) throw err;
    console.log('Data saved!');
  });
})();

