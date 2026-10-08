import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


INPUT_FILE = "data/processed/ml_features.csv"
OUTPUT_FILE = "data/processed/ml_anomaly_results.csv"


def main():

    # ---------------------------------------------------------
    # 1. Load event-based feature dataset
    # ---------------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    print("Total samples:", len(df))

    # ---------------------------------------------------------
    # 2. Features used by the AI model
    # ---------------------------------------------------------
    #
    # Hazard_Type_Code is deliberately excluded because:
    # 0 = Heat, 1 = Flood, 2 = Geomagnetic
    # is a categorical label, not a numerical quantity.
    #
    # The actual hazard intensity is represented by
    # Hazard_Severity.
    #

    feature_columns = [
        "Asset_Type_Code",
        "Hazard_Severity",
        "Capacity_Normalized",
        "Latitude",
        "Longitude",
        "Has_Location",
        "Dependency_Count",
        "Avg_Dependency_Strength",
        "Avg_Distance_km"
    ]

    # ---------------------------------------------------------
    # 3. Create balanced training dataset
    # ---------------------------------------------------------

    hazard_counts = df["Hazard_Type_Code"].value_counts()

    print("\nAvailable samples by hazard:")
    print(hazard_counts.sort_index())

    min_count = hazard_counts.min()

    # Use the same number of samples from each hazard.
    # Random state makes the selection reproducible.
    balanced_parts = []

    for hazard_code in sorted(hazard_counts.index):

        hazard_data = df[
            df["Hazard_Type_Code"] == hazard_code
        ]

        sampled = hazard_data.sample(
            n=min_count,
            random_state=42
        )

        balanced_parts.append(sampled)

    train_df = pd.concat(
        balanced_parts,
        ignore_index=True
    )

    print("\nBalanced training samples:", len(train_df))

    print("\nBalanced hazard distribution:")
    print(
        train_df["Hazard_Type_Code"]
        .value_counts()
        .sort_index()
    )

    # ---------------------------------------------------------
    # 4. Prepare training features
    # ---------------------------------------------------------

    X_train = train_df[feature_columns].copy()

    # Handle missing values safely.
    X_train = X_train.fillna(
        X_train.median()
    )

    # ---------------------------------------------------------
    # 5. Standardize features
    # ---------------------------------------------------------

    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(
        X_train
    )

    # ---------------------------------------------------------
    # 6. Train Isolation Forest
    # ---------------------------------------------------------

    model = IsolationForest(
        n_estimators=300,
        contamination=0.05,
        random_state=42
    )

    model.fit(
        X_train_scaled
    )

    # ---------------------------------------------------------
    # 7. Score the complete dataset
    # ---------------------------------------------------------

    X_all = df[feature_columns].copy()

    X_all = X_all.fillna(
        X_train.median()
    )

    X_all_scaled = scaler.transform(
        X_all
    )

    df["ML_Anomaly_Score"] = (
        -model.score_samples(X_all_scaled)
    )

    # Normalize anomaly score to 0-100
    score_min = df["ML_Anomaly_Score"].min()
    score_max = df["ML_Anomaly_Score"].max()

    if score_max > score_min:

        df["AI_Risk_Score"] = (
            (df["ML_Anomaly_Score"] - score_min)
            / (score_max - score_min)
            * 100
        )

    else:

        df["AI_Risk_Score"] = 0

    # ---------------------------------------------------------
    # 8. Identify anomalies
    # ---------------------------------------------------------

    # Cutoff is the 95th percentile of the scores of the rows the model
    # was actually trained on (train_df), matching contamination=0.05.
    train_scores = -model.score_samples(X_train_scaled)
    anomaly_cutoff = np.quantile(train_scores, 0.95)

    df["ML_Anomaly"] = (
        df["ML_Anomaly_Score"] >= anomaly_cutoff
    ).astype(int)

    # ---------------------------------------------------------
    # 9. Save results
    # ---------------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\nAI model trained successfully.")

    print("Training samples:", len(train_df))
    print("Features used:", len(feature_columns))
    print("Total samples scored:", len(df))

    print(
        "Anomalies detected:",
        df["ML_Anomaly"].sum()
    )

    print(
        "AI Risk Score range:",
        round(df["AI_Risk_Score"].min(), 2),
        "to",
        round(df["AI_Risk_Score"].max(), 2)
    )

    print(
        "\nResults saved to:",
        OUTPUT_FILE
    )


if __name__ == "__main__":
    main()