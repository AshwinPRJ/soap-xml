const soapRequest = require('easy-soap-request');
const fs = require('fs');
const transform = require('camaro')
const json2csv = require('json2csv').parse
const prettifyXml = require('prettify-xml')
const url = 'http://103.112.213.209/grievanceICST/IndianCST.asmx';
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'http://tempuri.org/GrievanceDetails',
};
const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GrievanceDetails xmlns="http://tempuri.org/">
      <cityid>101</cityid>
      <FromDate></FromDate>
      <ToDate></ToDate>
    </GrievanceDetails>
  </soap:Body>
</soap:Envelope>`;
(async () => {
  const { response } = await soapRequest(url, headers, xml, 100000); // Optional timeout parameter(milliseconds)
  const { body, statusCode } = response;
  const options = {indent: 2, newline: '\n'} // 2 spaces is default, newline defaults to require('os').EOL
  const output = prettifyXml(body, options) // options is optional
  /*let data = body;
  const template = {
    data: ['//WTEntityWS', {
        SeqNo: 'SeqNo',
        Status: 'Status',
        WardId: 'WardId',
        RvnRefNo: 'RvnRefNo',
        TaxYear: 'TaxYear',
        DevlopCharges: 'DevlopCharges',
        Arrears: 'Arrears',
        Interest: 'Interest',
        Penalty: 'Penalty',
        CurDMD: 'CurDMD',
        TotalAmount: 'TotalAmount',
        ArrearsPaid: 'ArrearsPaid',
        InterestPaid: 'InterestPaid',
        PenaltyPaid: 'PenaltyPaid',
        CurDMDPaid: 'CurDMDPaid',
        TotalAmountPaid: 'TotalAmountPaid',
        DevlopChargesPaid: 'DevlopChargesPaid',
        ConnectionChargesPaid: 'ConnectionChargesPaid',
        PaymentType: 'PaymentType',
        PaymentMode: 'PaymentMode',
        NoOfTaps: 'NoOfTaps',
        chkDDDate: 'chkDDDate',
        GPRSBillNo: 'GPRSBillNo',
        MaxBillNo: 'MaxBillNo',
        Months: 'Months',
        UsageFrom: 'UsageFrom',
        UsageTo: 'UsageTo',
        TotalUsage: 'TotalUsage',
        ConnectionCharges: 'ConnectionCharges',
        StatusId: 'StatusId',
        BalanceAmount: 'BalanceAmount',
        Staff_Id: 'Staff_Id',
        WardName: 'WardName',
        Rate: 'Rate',
        ConsumerNo: 'ConsumerNo'
    }]
}

const result = transform(body, template)
  var ash = JSON.stringify(result, null, 2);
  console.log(ash)
  const csv = json2csv(result.data)
  console.log(csv)*/

  fs.writeFile('./output/grievanceDetails.txt', output, (err) => {  
    if (err) throw err;
    console.log('Data saved!');
  });
})();

