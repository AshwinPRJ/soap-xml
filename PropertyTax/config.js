
var settings = {
  hp: {
    paymentsFile: "../../prop-tax-excel-files-cst/pre-processed/AddtionalWardsData_06082018.xlsx",
    ownersFile: "../../prop-tax-excel-files-cst/tmk-prop_07082018.xlsx",
    typesFile: "../prop-tax-excel-files-cst/WardWiseProperty.xlsx",
    latLongsfile: "../prop-tax-excel-files-cst/41650_WardMaster.xlsx",
    propTypesFile: "../../prop-tax-excel-files-cst/WardWiseProperty.xlsx",
    boltUri: "bolt://localhost:7687"
  },

  mac: {
    paymentsFile: "../../prop-tax-excel-files-cst/pre-processed/AddtionalWardsData_06082018.xlsx",
    ownersFile: "../../prop-tax-excel-files-cst/tmk-prop_07082018.xlsx",
    typesFile: "../prop-tax-files-cst/WardWiseProperty.xlsx",
    latLongsfile: "../prop-tax-files-cst/41650_WardMaster.xlsx",
    propTypesFile: "../../prop-tax-files-cst/WardWiseProperty.xlsx",
    boltUri: "bolt://localhost:7687"
  },
  default: {
    paymentsFile: "../../prop-tax-excel-files-cst/pre-processed/AddtionalWardsData_06082018.xlsx",
    ownersFile: "../../prop-tax-excel-files-cst/tmk-prop_07082018.xlsx",
    typesFile: "../prop-tax-files-cst/WardWiseProperty.xlsx",
    latLongsfile: "../prop-tax-files-cst/41650_WardMaster.xlsx",
    propTypesFile: "../../prop-tax-files-cst/WardWiseProperty.xlsx",
    boltUri: "bolt://localhost:7687"
  }
};

module.exports = function() {
  console.log("Checking for environment variable NODE_ENV...")
  let env=process.env.NODE_ENV;
  let environments = ['hp', 'mac'];
  if (environments.indexOf(env) === -1) {
    env = 'default' 
  }
  console.log("Returning settings for :", env, "...");
  return settings[env];
}

