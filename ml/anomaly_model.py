import pandas as pd
from sklearn.ensemble import IsolationForest

INPUT_FILE = "data/processed/ml_features.csv"
OUTPUT_FILE = "data/processed/ml_anomaly_results.csv"


def main():
    # Load ML features
    df = pd.read_csv(INPUT_FILE)

    # Features used by the ML model
    feature_columns = [
        "Asset_Type_Code",
        "Hazard_Type_Code",
        "Hazard_Severity",
        "Exposure",
        "Vulnerability",
        "Dependency_Factor",
        "Has_Location"
    ]

    X = df[feature_columns]

    # Isolation Forest for unsupervised anomaly detection
    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42
    )

    # Train model
    model.fit(X)

    # Predictions:
    #  1 = normal
    # -1 = anomaly
    df["ML_Prediction"] = model.predict(X)

    # Convert prediction into easier interpretation
    df["ML_Anomaly"] = df["ML_Prediction"].map({
        1: 0,
        -1: 1
    })

    # Anomaly score
    df["ML_Anomaly_Score"] = -model.score_samples(X)

    # Save results
    df.to_csv(OUTPUT_FILE, index=False)

    print("ML model trained successfully.")
    print(f"Input rows: {len(df)}")
    print(f"Anomalies detected: {df['ML_Anomaly'].sum()}")
    print(f"Results saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()