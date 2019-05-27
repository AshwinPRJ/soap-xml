drop table tblsas_floor_details;
drop table tblsas_master_details;
drop table tblproperty_dcb_details;
drop table tblproperty_details;
drop table tblcron_params;



CREATE TABLE `tblproperty_details` (
  `PID` varchar(345) CHARACTER SET utf8 NOT NULL,
  `WardNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `OldAssessmentNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `NewAssessmentNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `PropertyNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `BlockName` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `StreetName` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `PinCode` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Latitude` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Longitude` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `PropertyUsage` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `physical_property` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `property_type` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `property_class` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Dimenstion` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Length` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Breadth` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `TotalArea` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `BuiltUpAreaLength` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `BuiltUpAreaBreadth` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `TotalBuiltUpArea` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `NoOfFloors` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `ResidenceType` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `TradeLicenceNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `WaterSeqNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `tblproperty_detailscol` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `NumberOfTaps` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `UGDSeqNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `PropertyAddress` varchar(445)  CHARACTER SET utf8 DEFAULT NULL,
  `OwnerAddress` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `OccupierName` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `OwnerFirstName` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `OwnerMiddleName` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `OwnerLastName` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `OwnerFirstNameEng` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `OwnerMiddleNameEng` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `OwnerLastNameEng` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `PhoneNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `MobileNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Email` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `AdharNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `PageNo` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `RRNo` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `PropertyStatus` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `AssessmentInitiatedYear` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`PID`)
);


CREATE TABLE `tblproperty_dcb_details` (
  `DCBID` int NOT NULL AUTO_INCREMENT,
  `PID` varchar(345) CHARACTER SET utf8 NOT NULL,
  `AssessmentYear` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Ward_name` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `DemandTax` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `DemandCess` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `DemandPenalty` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `DemandSWMCess` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `DemandTotal` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`DCBID`)
);


CREATE TABLE `tblsas_master_details` (
  `SASID` varchar(345) CHARACTER SET utf8 NOT NULL,
  `PID` varchar(345) CHARACTER SET utf8 NOT NULL,
  `AssessmentYear` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `WardNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `OwnerName` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `TaxAmount` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Cess` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `Penalty` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `SWMCess` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `TotalAmount` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `ReceiptDate` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Recptno` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `ModeOfPayment` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Bank_Name` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Bank_Acc_No` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Status` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `NotPaidAmount` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`SASID`)
);

CREATE TABLE `tblsas_floor_details` (
  `SNo` int NOT NULL AUTO_INCREMENT,
  `SASID` varchar(345) CHARACTER SET utf8 NOT NULL,
  `PID` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `FloorNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `FloorType` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `FloorUsage` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `SlabType` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `FloorTax` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `PlinthArea` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `BuildingAge` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `SelfTenant` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`SNo`),
  FOREIGN KEY (SASID) REFERENCES tblsas_master_details(SASID)
);

CREATE TABLE `tblcron_params`(
  `SNo` int AUTO_INCREMENT,
  `API` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `from_date` DATE  DEFAULT NULL,
  `to_date` DATE DEFAULT NULL,
  `from_year` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `to_year` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY (`SNo`)
);


INSERT INTO tblcron_params (API,  from_date, to_date)
VALUES ('GetMar19Details',  '2002-01-01', '2002-01-01');
INSERT INTO tblcron_params (API,  from_date, to_date)
VALUES ('GetModifiedPropertyDetails',  '2002-01-01', '2002-01-01');
INSERT INTO tblcron_params (API,  from_year, to_year)
VALUES ('GetPropertyTaxDCBDetails',  '2017-18', '2017-18');
INSERT INTO tblcron_params (API,  from_date, to_date)
VALUES ('GetSASTaxDetails',  '2018-01-01', '2019-01-01');
SET GLOBAL max_allowed_packet=1073741824;
select * from tblcron_params;