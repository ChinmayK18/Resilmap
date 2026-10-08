import pandas as pd


ASSET_FILE = "data/processed/mumbai_infrastructure_assets.csv"
LINK_FILE = "data/processed/hospital_substation_links.csv"

WEATHER_FILE = "data/processed/mumbai_weather_2015_2025.csv"
RAINFALL_FILE = "data/processed/mumbai_rainfall_daily.csv"
SPACE_FILE = "data/processed/space_weather_2015_2025.csv"

OUTPUT_FILE = "data/processed/ml_features.csv"


def build_infrastructure_features():
    assets = pd.read_csv(ASSET_FILE)
    links = pd.read_csv(LINK_FILE)

    assets["Asset_Type_Code"] = assets["Asset_Type"].map({
        "Hospital": 0,
        "Power Station": 1,
        "Substation": 2
    })

    assets["Has_Location"] = (
        assets["Latitude"].notna() &
        assets["Longitude"].notna()
    ).astype(int)

    dependency_stats = (
        links.groupby("Substation_Name")
        .agg(
            Dependency_Count=("Hospital_Name", "count"),
            Avg_Dependency_Strength=("Dependency_Strength", "mean"),
            Avg_Distance_km=("Distance_km", "mean")
        )
        .reset_index()
    )

    assets = assets.merge(
        dependency_stats,
        left_on="Asset_Name",
        right_on="Substation_Name",
        how="left"
    )

    assets.drop(columns=["Substation_Name"], inplace=True)

    assets["Dependency_Count"] = assets["Dependency_Count"].fillna(0)
    assets["Avg_Dependency_Strength"] = (
        assets["Avg_Dependency_Strength"].fillna(0)
    )
    assets["Avg_Distance_km"] = assets["Avg_Distance_km"].fillna(0)

    return assets


def build_heat_events():
    weather = pd.read_csv(WEATHER_FILE)

    # NASA POWER processed data is in wide format:
    # PARAMETER | YEAR | JAN | FEB | ... | DEC | ANN

    heat = weather[
        weather["PARAMETER"] == "T2M_MAX"
    ].copy()

    heat["YEAR"] = pd.to_numeric(
        heat["YEAR"], errors="coerce"
    )

    month_columns = [
        "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ]

    # Convert monthly values to numeric
    for month in month_columns:
        heat[month] = pd.to_numeric(
            heat[month], errors="coerce"
        )

    # Convert wide monthly data into individual historical events
    events = heat.melt(
        id_vars=["YEAR"],
        value_vars=month_columns,
        var_name="Month",
        value_name="Temperature"
    )

    events = events.dropna(
        subset=["Temperature"]
    )

    # Use upper 10% of historical monthly maximum temperatures
    threshold = events["Temperature"].quantile(0.90)
    maximum = events["Temperature"].max()

    events = events[
        events["Temperature"] >= threshold
    ].copy()

    events["Hazard_Type"] = "Heat"

    if maximum > threshold:
        events["Hazard_Severity"] = (
            (events["Temperature"] - threshold) /
            (maximum - threshold)
        ).clip(0, 1) * 100
    else:
        events["Hazard_Severity"] = 100

    month_numbers = {
        "JAN": "01",
        "FEB": "02",
        "MAR": "03",
        "APR": "04",
        "MAY": "05",
        "JUN": "06",
        "JUL": "07",
        "AUG": "08",
        "SEP": "09",
        "OCT": "10",
        "NOV": "11",
        "DEC": "12"
    }

    events["Event_Date"] = (
        events["YEAR"].astype(int).astype(str)
        + "-"
        + events["Month"].map(month_numbers)
    )

    return events[
        ["Event_Date", "Hazard_Type", "Hazard_Severity"]
    ]
def build_flood_events():
    rainfall = pd.read_csv(RAINFALL_FILE)

    rainfall["Date"] = pd.to_datetime(
        rainfall["Date"], errors="coerce"
    )

    rainfall["Daily Actual"] = pd.to_numeric(
        rainfall["Daily Actual"], errors="coerce"
    )

    rainfall["Daily Normal"] = pd.to_numeric(
        rainfall["Daily Normal"], errors="coerce"
    )

    rainfall = rainfall.dropna(
        subset=["Date", "Daily Actual"]
    )

    # Use the upper 10% of observed rainfall
    # as flood-event candidates.
    threshold = rainfall["Daily Actual"].quantile(0.90)

    events = rainfall[
        rainfall["Daily Actual"] >= threshold
    ].copy()

    events["Hazard_Type"] = "Flood"

    maximum = rainfall["Daily Actual"].max()

    if maximum > threshold:
        events["Hazard_Severity"] = (
            (events["Daily Actual"] - threshold) /
            (maximum - threshold)
        ).clip(0, 1) * 100
    else:
        events["Hazard_Severity"] = 100

    events["Event_Date"] = (
        events["Date"].dt.strftime("%Y-%m-%d")
    )

    return events[
        ["Event_Date", "Hazard_Type", "Hazard_Severity"]
    ]
def build_geomagnetic_events():
    space = pd.read_csv(SPACE_FILE)

    space["Date"] = pd.to_datetime(
        space["Date"], errors="coerce"
    )

    space["KP_MAX"] = pd.to_numeric(
        space["KP_MAX"], errors="coerce"
    )

    space["AP"] = pd.to_numeric(
        space["AP"], errors="coerce"
    )

    space = space.dropna(
        subset=["Date", "KP_MAX", "AP"]
    )

    # Use the upper 5% of geomagnetic activity.
    kp_threshold = space["KP_MAX"].quantile(0.95)
    ap_threshold = space["AP"].quantile(0.95)

    events = space[
        (space["KP_MAX"] >= kp_threshold) |
        (space["AP"] >= ap_threshold)
    ].copy()

    events["Hazard_Type"] = "Geomagnetic"

    kp_range = (
        space["KP_MAX"].max() - kp_threshold
    )

    ap_range = (
        space["AP"].max() - ap_threshold
    )

    kp_score = (
        (events["KP_MAX"] - kp_threshold) /
        kp_range
        if kp_range > 0 else 0
    )

    ap_score = (
        (events["AP"] - ap_threshold) /
        ap_range
        if ap_range > 0 else 0
    )

    events["Hazard_Severity"] = (
        pd.concat(
            [kp_score, ap_score],
            axis=1
        ).max(axis=1).clip(0, 1) * 100
    )

    events["Event_Date"] = events["Date"].dt.strftime("%Y-%m-%d")

    return events[
        ["Event_Date", "Hazard_Type", "Hazard_Severity"]
    ]


def main():

    print("Building infrastructure features...")
    assets = build_infrastructure_features()

    print("Building historical heat events...")
    heat_events = build_heat_events()

    print("Building historical flood events...")
    flood_events = build_flood_events()

    print("Building historical geomagnetic events...")
    geomagnetic_events = build_geomagnetic_events()

    events = pd.concat(
        [
            heat_events,
            flood_events,
            geomagnetic_events
        ],
        ignore_index=True
    )

    print("\nHistorical hazard events:", len(events))

    # ---------------------------------------------------------
    # Create Asset × Historical Event dataset
    # ---------------------------------------------------------

    assets["_key"] = 1
    events["_key"] = 1

    df = assets.merge(
        events,
        on="_key",
        how="inner"
    )

    df.drop(columns=["_key"], inplace=True)

    # ---------------------------------------------------------
    # Normalize infrastructure capacity
    # ---------------------------------------------------------

    max_capacity = df["Capacity"].max()

    if max_capacity > 0:
        df["Capacity_Normalized"] = (
            df["Capacity"] / max_capacity
        )
    else:
        df["Capacity_Normalized"] = 0

    # ---------------------------------------------------------
    # Encode hazard type
    # ---------------------------------------------------------

    df["Hazard_Type_Code"] = df["Hazard_Type"].map({
        "Heat": 0,
        "Flood": 1,
        "Geomagnetic": 2
    })

    # ---------------------------------------------------------
    # Select AI features
    # ---------------------------------------------------------

    identifier_columns = [
        "Asset_ID",
        "Asset_Type",
        "Asset_Name",
        "Event_Date",
        "Hazard_Type"
    ]

    feature_columns = [
        "Asset_Type_Code",
        "Hazard_Type_Code",
        "Hazard_Severity",
        "Capacity_Normalized",
        "Latitude",
        "Longitude",
        "Has_Location",
        "Dependency_Count",
        "Avg_Dependency_Strength",
        "Avg_Distance_km"
    ]

    features = df[
        identifier_columns + feature_columns
    ].copy()

    # Handle missing coordinates
    features["Latitude"] = features["Latitude"].fillna(
        features["Latitude"].median()
    )

    features["Longitude"] = features["Longitude"].fillna(
        features["Longitude"].median()
    )

    features.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\nAI event-based feature dataset created successfully.")
    print("Shape:", features.shape)

    print("\nColumns:")
    print(features.columns.tolist())

    print("\nFirst 5 rows:")
    print(
        features.head().to_string(index=False)
    )
    print("\nFirst 5 rows:")
    print(
        features.head().to_string(index=False)
    )


if __name__ == "__main__":
    main()