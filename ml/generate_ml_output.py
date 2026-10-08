import pandas as pd

RISK_FILE = "data/processed/mumbai_infrastructure_risk.csv"
ML_FILE = "data/processed/ml_anomaly_results.csv"
OUTPUT_FILE = "data/processed/mumbai_ml_risk_output.csv"


def main():
    risk = pd.read_csv(RISK_FILE)
    ml = pd.read_csv(ML_FILE)

    # ml has one row per asset x historical event (many rows).
    # risk has one row per asset x hazard. Aggregate ml to the same
    # level first, then join on the keys (NOT by row position).
    ml_agg = (
        ml.groupby(["Asset_ID", "Hazard_Type"], as_index=False)
        .agg(
            Hazard_Severity=("Hazard_Severity", "max"),
            ML_Anomaly=("ML_Anomaly", "max"),
            ML_Anomaly_Score=("ML_Anomaly_Score", "max"),
        )
    )

    output = ml_agg.merge(
        risk[
            [
                "Asset_ID",
                "Hazard_Type",
                "Asset_Type",
                "Asset_Name",
                "Latitude",
                "Longitude",
                "Risk_Score",
                "Risk_Level",
            ]
        ],
        on=["Asset_ID", "Hazard_Type"],
        how="left",
    )

    output = output[
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
            "ML_Anomaly_Score",
        ]
    ]

    output.to_csv(OUTPUT_FILE, index=False)

    print("Final ML output generated successfully.")
    print(f"Rows: {len(output)}")
    print(f"Rows with no risk match: {int(output['Risk_Score'].isna().sum())}")
    print(f"ML anomalies: {int(output['ML_Anomaly'].sum())}")
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
