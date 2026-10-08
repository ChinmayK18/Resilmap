import pandas as pd

ML_FILE = "data/processed/mumbai_ml_risk_output.csv"
CASCADE_FILE = "data/processed/cascade_results.csv"
OUTPUT_FILE = "data/processed/final_ai_cascade_output.csv"


def main():

    ml = pd.read_csv(ML_FILE)
    cascade = pd.read_csv(CASCADE_FILE)

    # Keep only the cascade information needed for integration
    cascade_info = cascade[
        [
            "Hospital_Name",
            "Failed_Substation",
            "Hazard_Type",
            "Dependency_Strength",
            "Cascade_Impact",
            "Cascade_Severity"
        ]
    ].copy()
    cascade_info = cascade_info.drop_duplicates(
    subset=["Hospital_Name", "Hazard_Type"]
    )

    # Rename for clarity
    cascade_info = cascade_info.rename(
        columns={
            "Hazard_Type": "Cascade_Hazard"
        }
    )

    # Merge ML risk information with cascade information
    final = ml.merge(
        cascade_info,
        left_on=["Asset_Name", "Hazard_Type"],
        right_on=["Hospital_Name", "Cascade_Hazard"],
        how="left"
    )

    # Remove duplicate merge column
    final.drop(
        columns=["Hospital_Name", "Cascade_Hazard"],
        inplace=True
    )

    # Mark whether an asset participates in the cascade
    final["Cascade_Affected"] = (
        final["Cascade_Impact"].notna()
    ).astype(int)

    # Save final integrated output
    final.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("Final AI + Cascade output generated successfully.")
    print(f"Rows: {len(final)}")
    print(
        "ML anomalies:",
        int(final["ML_Anomaly"].sum())
    )
    print(
        "Cascade-affected records:",
        int(final["Cascade_Affected"].sum())
    )
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()