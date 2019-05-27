let getMar19Details = require('./getMar19Details.js')
let getModifiedPropertyDetails = require('./getModifiedPropertyDetails.js')
let getPropertyTaxDCB = require('./getPropertyTaxDCB.js')
let getSASTaxDetails = require('./getSASTaxDetails.js')
//console.log(getMar19Details);
// console.log(getModifiedPropertyDetails);
// console.log(getSASTaxDetails);
// console.log(getPropertyTaxDCB);

// (async ()=>{
//     await getMar19Details.getLastParams;
//     await getModifiedPropertyDetails.getLastParams;
//     await getPropertyTaxDCB.getLastParams;
//     await getSASTaxDetails.getLastParams;
// })(); 

async function start() {
    let master = await getMar19Details.getLastParams();
    console.log(master.status == true);
    let dcbDeatils = await getPropertyTaxDCB.getLastParams();
    console.log(dcbDeatils);
    let masterUpdate = await getModifiedPropertyDetails.getLastParams();
    console.log(dcbDeatils);
    let sasDeatils = await getSASTaxDetails.getLastParams();
    console.log(dcbDeatils);
}

start();