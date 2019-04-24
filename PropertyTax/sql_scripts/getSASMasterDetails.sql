drop table tblsas_master_details;
CREATE TABLE `tblsas_master_details` (
  `SASID` varchar(345) NOT NULL,
  `PID` varchar(345) NOT NULL,
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


select * from tblsas_master_details;