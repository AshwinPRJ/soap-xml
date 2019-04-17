const soapRequest = require('easy-soap-request');
const fs = require('fs');
const transform = require('camaro')
const json2csv = require('json2csv').parse
const prettifyXml = require('prettify-xml')


const url = 'http://103.112.213.209/WTAXTMKNEWDESIGN/indiancst.asmx';
const headers = {
  'Content-Length': 'length',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'http://tempuri.org/GetTapDetails',
};
const xml = `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <GetTapDetails xmlns="http://tempuri.org/">
                  <CityId>101</CityId>
                  <WardId>1</WardId>
                  <FDate></FDate>
                  <TDate></TDate>
                </GetTapDetails>
              </soap:Body>
            </soap:Envelope>`;
(async () => {
  const { response } = await soapRequest(url, headers, xml); // Optional timeout parameter(milliseconds)
  const { body, statusCode } = response;

  const options = {indent: 2, newline: '\n'} // 2 spaces is default, newline defaults to require('os').EOL
  const output = prettifyXml(body, options) // options is optional
  
  /*let data = body;
  const template = {
    data: ['//WTEntityWS', {
        SeqNo: 'SeqNo',
        Status: 'Status',
        SasPid: 'SasPid',
        WardId: 'WardId',
        RvnRefNo:'RvnRefNo',
        TapNo:'TapNo',
        AddressEng:'AddressEng',
        TapStatus:'TapStatus',
        DevlopCharges:'DevlopCharges',
        Arrears:'Arrears',
        Interest:'Interest',
        Penalty:'Penalty',
        CurDMD:'CurDMD',
        TotalAmount:'TotalAmount',
        ArrearsPaid:'ArrearsPaid',
        InterestPaid:'InterestPaid',
        PenaltyPaid:'PenaltyPaid',
        CurDMDPaid:'CurDMDPaid',
        TotalAmountPaid:'TotalAmountPaid',
        DevlopChargesPaid:'DevlopChargesPaid',
        ConnectionChargesPaid:'ConnectionChargesPaid',
        PaymentType:'PaymentType',
        PaymentMode:'PaymentMode',
        NoOfTaps:'NoOfTaps',
        chkDDDate:'chkDDDate',
        OwnerNameEng:'OwnerNameEng',
        GPRSBillNo:'GPRSBillNo',
        MaxBillNo:'MaxBillNo',
        Months:'Months',
        UsageFrom:'UsageFrom',
        UsageTo:'UsageTo',
        TotalUsage:'TotalUsage',
        ConnectionCharges:'ConnectionCharges',
        StatusId:'StatusId',
        BalanceAmount:'BalanceAmount',
        Staff_Id:'Staff_Id',
        TapType:'TapType',
        WardName:'WardName',
        TapUsage:'TapUsage',
        Rate:'Rate',
        ConsumerNo:'ConsumerNo'
    }]
}

const result = transform(body, template)
  var ash = JSON.stringify(result, null, 2);
  console.log(ash)
  const csv = json2csv(result.data)
  console.log(csv)*/

  fs.writeFile('./output/getTapDetails.txt', output, (err) => {  
    if (err) throw err;
    console.log('Data saved!');
  });
})();

