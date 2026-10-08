export const hazards = ['Heat', 'Flood', 'Geomagnetic'];

// Representative demo records using the same columns as the project's CSV outputs.
export const assets = [
  {
    Asset_ID: 'SUB_1', Asset_Type: 'Substation', Asset_Name: '220kV BORIVALI',
    Latitude: 19.2145, Longitude: 72.8806, Capacity: 220,
    risk: { Hazard_Type: 'Flood', Hazard_Severity: 94.44, Exposure: 0.85, Vulnerability: 0.85, Dependency_Factor: 1.3, Risk_Score: 88.70, Risk_Level: 'Critical' },
    ml: { ML_Anomaly: 1, ML_Anomaly_Score: 0.72 },
  },
  {
    Asset_ID: 'SUB_2', Asset_Type: 'Substation', Asset_Name: '220kV TROMBAY',
    Latitude: 19.0008, Longitude: 72.9043, Capacity: 220,
    risk: { Hazard_Type: 'Flood', Hazard_Severity: 94.44, Exposure: 0.85, Vulnerability: 0.85, Dependency_Factor: 1.3, Risk_Score: 88.70, Risk_Level: 'Critical' },
    ml: { ML_Anomaly: 0, ML_Anomaly_Score: 0.31 },
  },
  {
    Asset_ID: 'SUB_3', Asset_Type: 'Substation', Asset_Name: '220kV MULUND',
    Latitude: 19.1457, Longitude: 72.9635, Capacity: 220,
    risk: { Hazard_Type: 'Flood', Hazard_Severity: 94.44, Exposure: 0.85, Vulnerability: 0.85, Dependency_Factor: 1.3, Risk_Score: 88.70, Risk_Level: 'Critical' },
    ml: { ML_Anomaly: 1, ML_Anomaly_Score: 0.69 },
  },
  {
    Asset_ID: 'SUB_4', Asset_Type: 'Substation', Asset_Name: '220kV GIS BHANDUP',
    Latitude: 19.1587, Longitude: 72.9391, Capacity: 220,
    risk: { Hazard_Type: 'Flood', Hazard_Severity: 94.44, Exposure: 0.85, Vulnerability: 0.85, Dependency_Factor: 1.3, Risk_Score: 88.70, Risk_Level: 'Critical' },
    ml: { ML_Anomaly: 0, ML_Anomaly_Score: 0.28 },
  },
  {
    Asset_ID: 'HOS_3', Asset_Type: 'Hospital', Asset_Name: 'Arihant Heart and Surgical Hospital',
    Latitude: 19.2240612, Longitude: 72.8666469, Capacity: 0,
    risk: { Hazard_Type: 'Flood', Hazard_Severity: 94.44, Exposure: 0.70, Vulnerability: 0.65, Dependency_Factor: 1.0, Risk_Score: 42.94, Risk_Level: 'Moderate' },
    ml: { ML_Anomaly: 0, ML_Anomaly_Score: 0.22 },
  },
  {
    Asset_ID: 'PWR_1', Asset_Type: 'Power Station', Asset_Name: 'TROMBAY CCPP',
    Latitude: null, Longitude: null, Capacity: 120,
    risk: { Hazard_Type: 'Flood', Hazard_Severity: 94.44, Exposure: 0.75, Vulnerability: 0.70, Dependency_Factor: 1.0, Risk_Score: 49.58, Risk_Level: 'Moderate' },
    ml: { ML_Anomaly: 0, ML_Anomaly_Score: 0.26 },
  },
].map((asset) => ({
  ...asset,
  riskByHazard: {
    Heat: { ...asset.risk, Hazard_Type: 'Heat', Hazard_Severity: 98.2, Risk_Score: asset.Asset_Type === 'Substation' ? 92.23 : asset.risk.Risk_Score },
    Flood: asset.risk,
    Geomagnetic: { ...asset.risk, Hazard_Type: 'Geomagnetic', Hazard_Severity: 100, Risk_Score: asset.Asset_Type === 'Substation' ? 100 : asset.risk.Risk_Score },
  },
})).map((asset) => ({ ...asset, risk: asset.riskByHazard.Flood }));

export function getRiskCounts(items) {
  return items.reduce((counts, asset) => {
    counts[asset.risk.Risk_Level] = (counts[asset.risk.Risk_Level] ?? 0) + 1;
    return counts;
  }, { Low: 0, Moderate: 0, High: 0, Critical: 0 });
}

export function forHazard(asset, hazard) {
  return { ...asset, risk: asset.riskByHazard[hazard] };
}
