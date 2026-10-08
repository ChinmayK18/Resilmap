import pandas as pd

RISK_FILE = "data/processed/mumbai_infrastructure_risk.csv"
ML_FILE = "data/processed/ml_anomaly_results.csv"
OUTPUT_FILE = "data/processed/mumbai_ml_risk_output.csv"


def main():
    risk = pd.read_csv(RISK_FILE)
    ml = pd.read_csv(ML_FILE)

    # Add identifiers and descriptive information from the original risk table
    ml["Asset_ID"] = risk["Asset_ID"]
    ml["Asset_Type"] = risk["Asset_Type"]
    ml["Asset_Name"] = risk["Asset_Name"]
    ml["Latitude"] = risk["Latitude"]
    ml["Longitude"] = risk["Longitude"]
    ml["Hazard_Type"] = risk["Hazard_Type"]
    ml["Risk_Score"] = risk["Risk_Score"]
    ml["Risk_Level"] = risk["Risk_Level"]

    # Final columns for downstream use
    output = ml[
        [
            "Asset_ID",
            "Asset_Type",
            "Asset_Name",
            "Latitude",
            "Longitude",
            "Hazard_Type",
            "Hazard_Severity",
            "Risk_Score",
            "Risk_Level",
            "ML_Anomaly",
            "ML_Anomaly_Score"
        ]
    ]

    output.to_csv(OUTPUT_FILE, index=False)

    print("Final ML output generated successfully.")
    print(f"Rows: {len(output)}")
    print(f"ML anomalies: {output['ML_Anomaly'].sum()}")
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()