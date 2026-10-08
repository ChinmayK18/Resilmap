import pandas as pd


INPUT_FILE = "data/processed/ai_event_risk.csv"
OUTPUT_FILE = "data/processed/ai_infrastructure_risk.csv"


def classify_risk(score):

    if score <= 25:
        return "Low"

    elif score <= 50:
        return "Moderate"

    elif score <= 75:
        return "High"

    else:
        return "Critical"


def main():

    # ---------------------------------------------------------
    # 1. Load historical event-level AI risk
    # ---------------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    print("Input rows:", len(df))

    # ---------------------------------------------------------
    # 2. Find maximum historical risk for each
    #    Asset × Hazard combination
    # ---------------------------------------------------------

    risk_table = (
        df.groupby(
            [
                "Asset_ID",
                "Asset_Name",
                "Asset_Type",
                "Hazard_Type"
            ],
            as_index=False
        )
        .agg(
            AI_Risk_Score=("AI_Event_Risk", "max"),
            Hazard_Severity=("Hazard_Severity", "max"),
            Dependency_Count=("Dependency_Count", "max"),
            Avg_Dependency_Strength=(
                "Avg_Dependency_Strength",
                "max"
            ),
            Avg_Distance_km=(
                "Avg_Distance_km",
                "mean"
            )
        )
    )

    # ---------------------------------------------------------
    # 3. Risk classification
    # ---------------------------------------------------------

    risk_table["Risk_Level"] = (
        risk_table["AI_Risk_Score"]
        .apply(classify_risk)
    )

    # ---------------------------------------------------------
    # 4. Save
    # ---------------------------------------------------------

    risk_table.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print(
        "\nAsset-level AI infrastructure risk created."
    )

    print(
        "Rows:",
        len(risk_table)
    )

    print("\nRisk level distribution:")

    print(
        risk_table["Risk_Level"]
        .value_counts()
    )

    print("\nRisk by asset type:")

    print(
        risk_table
        .groupby("Asset_Type")["AI_Risk_Score"]
        .agg(["count", "mean", "max"])
        .round(2)
        .to_string()
    )

    print("\nTop 15 infrastructure risks:")

    print(
        risk_table
        .nlargest(15, "AI_Risk_Score")[
            [
                "Asset_ID",
                "Asset_Name",
                "Asset_Type",
                "Hazard_Type",
                "AI_Risk_Score",
                "Hazard_Severity",
                "Dependency_Count",
                "Risk_Level"
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