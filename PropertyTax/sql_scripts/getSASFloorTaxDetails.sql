drop table tblsas_floor_details;
CREATE TABLE `tblsas_floor_details` (
  `SNo` int NOT NULL AUTO_INCREMENT,
  `SASID` varchar(345) NOT NULL,
  `PID` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `FloorNo` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `FloorType` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `FloorUsage` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `SlabType` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `FloorTax` varchar(345)  CHARACTER SET utf8 DEFAULT NULL,
  `PlinthArea` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `BuildingAge` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  `SelfTenant` varchar(345) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`SNo`)
);


select * from tblsas_floor_details;
