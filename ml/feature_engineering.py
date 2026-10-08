import pandas as pd


INPUT_FILE = "data/processed/mumbai_infrastructure_risk.csv"
OUTPUT_FILE = "data/processed/ml_features.csv"


def main():

    df = pd.read_csv(INPUT_FILE)

    # Convert categorical variables into numerical features
    df["Asset_Type_Code"] = df["Asset_Type"].map({
        "Hospital": 0,
        "Power Station": 1,
        "Substation": 2
    })

    df["Hazard_Type_Code"] = df["Hazard_Type"].map({
        "Heat": 0,
        "Flood": 1,
        "Geomagnetic": 2
    })

    # Location availability
    df["Has_Location"] = (
        df["Latitude"].notna() &
        df["Longitude"].notna()
    ).astype(int)

    # Select ML features
    features = df[
        [
            "Asset_Type_Code",
            "Hazard_Type_Code",
            "Hazard_Severity",
            "Exposure",
            "Vulnerability",
            "Dependency_Factor",
            "Has_Location"
        ]
    ].copy()

    features.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("ML feature dataset created successfully")
    print("Shape:", features.shape)
    print("\nFeatures:")
    print(features.columns.tolist())

    print("\nFirst 5 rows:")
    print(features.head().to_string(index=False))


if __name__ == "__main__":
    main()