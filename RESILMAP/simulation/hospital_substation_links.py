import pandas as pd
from math import radians, sin, cos, sqrt, asin


HOSPITAL_FILE = "data/processed/mumbai_hospitals.csv"
SUBSTATION_FILE = "data/processed/mumbai_substations_msetcl.csv"
OUTPUT_FILE = "data/processed/hospital_substation_links.csv"

R = 6371.0


def haversine(lat1, lon1, lat2, lon2):

    lat1 = radians(float(lat1))
    lon1 = radians(float(lon1))
    lat2 = radians(float(lat2))
    lon2 = radians(float(lon2))

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    return 2 * R * asin(sqrt(a))


def dependency_strength(distance):

    if distance <= 2:
        return 1.00

    elif distance <= 5:
        return 0.70

    return 0.0


hospitals = pd.read_csv(HOSPITAL_FILE)
substations = pd.read_csv(SUBSTATION_FILE)

hospitals = hospitals.dropna(
    subset=["Latitude", "Longitude"]
)

links = []


for _, substation in substations.iterrows():

    for _, hospital in hospitals.iterrows():

        distance = haversine(
            hospital["Latitude"],
            hospital["Longitude"],
            substation["Latitude"],
            substation["Longitude"]
        )

        if distance <= 5:

            links.append({
                "Substation_Name":
                    substation["Substation_Name"],

                "Hospital_Name":
                    hospital["Hospital_Name"],

                "Distance_km":
                    round(distance, 3),

                "Dependency_Strength":
                    dependency_strength(distance)
            })


links_df = pd.DataFrame(links)

links_df.to_csv(
    OUTPUT_FILE,
    index=False
)

print("Dependency links created successfully")
print("Total links:", len(links_df))

print("\nDependency strength:")
print(
    links_df["Dependency_Strength"]
    .value_counts()
    .sort_index()
    .to_string()
)