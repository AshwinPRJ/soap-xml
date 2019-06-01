let getMar19Details = require('./getMar19Details.js')
let getModifiedPropertyDetails = require('./getModifiedPropertyDetails.js')
let getPropertyTaxDCB = require('./getPropertyTaxDCB.js')
let getSASTaxDetails = require('./getSASTaxDetails.js')

// (async ()=>{
//     await getMar19Details.getLastParams;
//     await getModifiedPropertyDetails.getLastParams;
//     await getPropertyTaxDCB.getLastParams;
//     await getSASTaxDetails.getLastParams;
// })(); 

// async function start() {
//     let master = await getMar19Details.getLastParams();
//     console.log(master);
//     if(master.status){
//         let masterUpdate = await getModifiedPropertyDetails.getLastParams();
//         if(masterUpdate.status){
//             console.log(masterUpdate);
//             let dcbDeatils = await getPropertyTaxDCB.getLastParams();
//             if(dcbDeatils.status){
//                 console.log(dcbDeatils);
//                 let sasDeatils = await getSASTaxDetails.getLastParams();
//                 if(sasDeatils.status){
//                     console.log(sasDeatils);
//                     return "All tables updated successfully";
//                 }else{
//                     console.log("Error occured while inserting DCB details ", sasDeatils);
//                     return;
//                 }
//             }else{
//                 console.log("Error occured while inserting DCB details ", dcbDeatils);
//                 return;
//             }
//         }else{
//             console.log("Error occured while updateing master data ", masterUpdate);
//             return;
//         }
//     }else{
//         console.log("Error occured while inserting master data ", master);
//         return;
//     }
// }

//start();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function start() {
    let master = await getMar19Details.getLastParams();
    console.log(master);
    if (!master.status) {
        console.log("Error occured while inserting master data ", master);
        return;
    }
    let masterUpdate = await getModifiedPropertyDetails.getLastParams();
    if (!masterUpdate.status) {
        console.log("Error occured while updateing master data ", masterUpdate);
        return;
    }
    console.log(masterUpdate);
    // let dcbDeatils = await getPropertyTaxDCB.getLastParams();
    // if (!dcbDeatils.status) {
    //     console.log("Error occured while inserting DCB details ", dcbDeatils);
    //     return;
    // }
    // console.log(dcbDeatils);
    let sasDeatils = await getSASTaxDetails.getLastParams();
    if (!sasDeatils.status) {
        console.log("Error occured while inserting DCB details ", sasDeatils);
        return;
    }
    console.log(sasDeatils);
    return "All tables updated successfully";
}

start();