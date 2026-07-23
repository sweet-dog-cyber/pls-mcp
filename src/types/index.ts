export interface TagData {
  id: number;
  tagCode: string;
  model: string;
  tagType: string;
  status: string;
  power: string;
  isBind: string;
  markerFile: string;
  slice: number;
}

export interface TagLocation {
  tagCode: string;
  x: number;
  y: number;
  mapCode: string;
  mapName: string;
  timestamp: string;
  power: string;
  bindName?: string;
  areaName?: string;
}

export interface PersonnelData {
  id: number;
  name: string;
  departmentId: number;
  phone: string;
  gender: string;
  status: string;
  tagId: number;
  tagCode: string;
}

export interface LocationWithPersonnel {
  name: string;
  tagCode: string;
  x: number;
  y: number;
  mapCode: string;
  mapName: string;
  timestamp: string;
  areaName?: string;
}

export interface AreaData {
  id: number;
  name: string;
  mapId: number;
  areaType: string;
  inside: number;
  outside: number;
}

export interface AlarmRecord {
  id: number;
  tagCode: string;
  alarmType: string;
  areaId: number;
  areaName: string;
  alarmTime: string;
  isRead: string;
  content: string;
}

export interface AnchorData {
  id: number;
  anchorCode: string;
  mapId: number;
  x: number;
  y: number;
  status: string;
  anchorLocation: string;
}

export interface MapData {
  id: number;
  code: string;
  name: string;
  buildingId: number;
}

export interface InOutRecord {
  id: number;
  tagCode: string;
  areaId: number;
  areaRuleId: number;
  inDateTime: string;
  outDateTime: string;
}

export interface TagBinding {
  tagCode: string;
  bindType: 'personnel' | 'car' | 'goods';
  bindName: string;
  bindId: number;
}

export interface CarData {
  id: number;
  carType: number;
  carTypeName: string;
  carCode: string;
  carBrand: string;
  carModel: string;
  plateNumber: string;
  tagId: number;
  tagCode: string;
  hasWeightDevice: number;
}

export interface GoodsData {
  id: number;
  code: string;
  name: string;
  tagId: number;
  tagCode: string;
}

export interface AlarmRuleData {
  id: number;
  name: string;
  alarmType: number;
  alarmTypeName: string;
  thresholds: number;
  monitoredPeriod: string;
}

export interface DepartmentData {
  id: number;
  name: string;
  code: string;
  pid: number;
  head: string;
  phone: string;
  description: string;
  children: DepartmentData[];
}

export interface SystemStats {
  tags: { total: number; online: number; offline: number };
  personnel: { total: number; inBuilding: number; outBuilding: number };
  areas: { total: number };
  anchors: { total: number; online: number; offline: number };
  alarms: { today: number; unread: number };
}