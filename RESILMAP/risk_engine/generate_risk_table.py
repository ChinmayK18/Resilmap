import pandas as pd

from risk_engine.risk_engine import calculate_risk
from risk_engine.vulnerability import get_asset_vulnerability
from risk_engine.exposure import get_baseline_exposure
from risk_engine.dependency import get_baseline_dependency_factor


INPUT_FILE = "data/processed/mumbai_infrastructure_assets.csv"
OUTPUT_FILE = "data/processed/mumbai_infrastructure_risk.csv"


def get_risk_level(score):
    if score <= 25:
        return "Low"
    elif score <= 50:
        return "Moderate"
    elif score <= 75:
        return "High"
    else:
        return "Critical"


def main():

    assets = pd.read_csv(INPUT_FILE)

    hazard_scenarios = {
        "Heat": 98.2,
        "Flood": 94.44,
        "Geomagnetic": 100.0
    }

    records = []

    for _, asset in assets.iterrows():

        for hazard_type, hazard_severity in hazard_scenarios.items():

            risk_score = calculate_risk(
                asset["Asset_Type"],
                hazard_type,
                hazard_severity
            )

            records.append({
                "Asset_ID": asset["Asset_ID"],
                "Asset_Type": asset["Asset_Type"],
                "Asset_Name": asset["Asset_Name"],
                "Latitude": asset["Latitude"],
                "Longitude": asset["Longitude"],
                "Hazard_Type": hazard_type,
                "Hazard_Severity": hazard_severity,
                "Exposure": get_baseline_exposure(
                    asset["Asset_Type"]
                ),
                "Vulnerability": get_asset_vulnerability(
                    asset["Asset_Type"],
                    hazard_type
                ),
                "Dependency_Factor": get_baseline_dependency_factor(
                    asset["Asset_Type"]
                ),
                "Risk_Score": risk_score,
                "Risk_Level": get_risk_level(risk_score)
            })

    risk_df = pd.DataFrame(records)

    risk_df.to_csv(OUTPUT_FILE, index=False)

    print("Risk table created successfully")
    print("Rows:", len(risk_df))
    print("\nRisk levels:")
    print(risk_df["Risk_Level"].value_counts().to_string())

    print("\nRisk by asset type:")
    print(
        risk_df.groupby("Asset_Type")["Risk_Score"]
        .mean()
        .round(2)
        .to_string()
    )


if __name__ == "__main__":
    main()