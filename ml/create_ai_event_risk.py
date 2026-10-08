import pandas as pd


INPUT_FILE = "data/processed/ml_anomaly_results.csv"
OUTPUT_FILE = "data/processed/ai_event_risk.csv"


def main():

    # ---------------------------------------------------------
    # 1. Load AI anomaly results
    # ---------------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    # ---------------------------------------------------------
    # 2. Calculate AI Event Risk
    # ---------------------------------------------------------
    #
    # Hazard Severity:
    #   Measures the intensity of the historical hazard.
    #
    # ML Anomaly Score:
    #   Measures how unusual the infrastructure-hazard
    #   combination is relative to the historical dataset.
    #
    # Final score is NOT probability of failure.
    #

    anomaly_min = df["ML_Anomaly_Score"].min()
    anomaly_max = df["ML_Anomaly_Score"].max()

    if anomaly_max > anomaly_min:

        normalized_anomaly = (
            (df["ML_Anomaly_Score"] - anomaly_min)
            / (anomaly_max - anomaly_min)
            * 100
        )

    else:

        normalized_anomaly = 0

    df["AI_Event_Risk"] = (
        0.60 * df["Hazard_Severity"]
        + 0.40 * normalized_anomaly
    )

    # Keep score within 0-100
    df["AI_Event_Risk"] = (
        df["AI_Event_Risk"]
        .clip(0, 100)
    )

    # ---------------------------------------------------------
    # 3. Risk classification
    # ---------------------------------------------------------

    def classify_risk(score):

        if score <= 25:
            return "Low"

        elif score <= 50:
            return "Moderate"

        elif score <= 75:
            return "High"

        else:
            return "Critical"

    df["AI_Risk_Level"] = (
        df["AI_Event_Risk"]
        .apply(classify_risk)
    )

    # ---------------------------------------------------------
    # 4. Select final event-level output
    # ---------------------------------------------------------

    output_columns = [
        "Asset_ID",
        "Asset_Name",
        "Asset_Type",
        "Event_Date",
        "Hazard_Type",
        "Hazard_Severity",
        "ML_Anomaly_Score",
        "AI_Event_Risk",
        "AI_Risk_Level",
        "Dependency_Count",
        "Avg_Dependency_Strength",
        "Avg_Distance_km"
    ]

    output = df[output_columns].copy()

    # ---------------------------------------------------------
    # 5. Save output
    # ---------------------------------------------------------

    output.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # ---------------------------------------------------------
    # 6. Display results
    # ---------------------------------------------------------

    print("AI event-level risk dataset created successfully.")
    print("Rows:", len(output))

    print("\nColumns:")
    print(output.columns.tolist())

    print("\nRisk level distribution:")
    print(
        output["AI_Risk_Level"]
        .value_counts()
    )

    print("\nTop 10 AI-risk events:")

    print(
        output
        .nlargest(10, "AI_Event_Risk")[
            [
                "Asset_Name",
                "Asset_Type",
                "Event_Date",
                "Hazard_Type",
                "Hazard_Severity",
                "ML_Anomaly_Score",
                "AI_Event_Risk",
                "AI_Risk_Level"
            ]
        ]
        .to_string(index=False)
    )

    print(
        "\nSaved to:",
        OUTPUT_FILE
    )


if __name__ == "__main__":
    main()