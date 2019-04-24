drop table tblproperty_dcb_details;
CREATE TABLE `tblproperty_dcb_details` (
  `DCBID` int NOT NULL AUTO_INCREMENT,
  `PID` int(11) NOT NULL,
  `AssessmentYear` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `Ward_name` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `DemandTax` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `DemandCess` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `DemandPenalty` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `DemandSWMCess` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `DemandTotal` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`DCBID`)
);
