import pandas as pd

file_path = "data/raw/nasa_power_mumbai_2015_2025.csv"

# Read NASA POWER file
df = pd.read_csv(file_path, skiprows=12)

# Assign correct column names
df.columns = [
    "PARAMETER", "YEAR", "JAN", "FEB", "MAR", "APR",
    "MAY", "JUN", "JUL", "AUG", "SEP", "OCT",
    "NOV", "DEC", "ANN"
]

# Remove NASA header rows
df = df[df["PARAMETER"] != "-END HEADER-"]
df = df[df["PARAMETER"] != "PARAMETER"]

# Reset index
df = df.reset_index(drop=True)

# Convert numeric columns
numeric_columns = [
    "YEAR", "JAN", "FEB", "MAR", "APR", "MAY",
    "JUN", "JUL", "AUG", "SEP", "OCT", "NOV",
    "DEC", "ANN"
]

df[numeric_columns] = df[numeric_columns].apply(pd.to_numeric)

# Save cleaned dataset
output_file = "data/processed/mumbai_weather_2015_2025.csv"
df.to_csv(output_file, index=False)

print("\nNASA POWER preprocessing complete.")
print("Shape:", df.shape)
print("Saved to:", output_file)
print("\nParameters:")
print(df["PARAMETER"].unique())

# Inspect IMD rainfall dataset
imd_file = "data/raw/imd_district_rainfall_daily.csv"

imd = pd.read_csv(imd_file)

print("\n--- IMD RAINFALL DATASET ---")
print("Shape:", imd.shape)

print("\nColumns:")
print(imd.columns.tolist())

print("\nFirst 5 rows:")
print(imd.head())

print("\nData types:")
print(imd.dtypes)

print("\nMissing values:")
print(imd.isnull().sum())

# Filter IMD rainfall data for Mumbai
mumbai_imd = imd[
    (imd["State"].str.upper() == "MAHARASHTRA") &
    (imd["District"].str.upper().isin(["MUMBAI CITY", "MUMBAI SUBURBAN"]))
].copy()

# Keep only useful columns
mumbai_imd = mumbai_imd[
    [
        "State",
        "District",
        "Date",
        "Daily Actual",
        "Daily Normal",
        "Daily Departure Per",
        "Daily Category"
    ]
]

# Convert date
mumbai_imd["Date"] = pd.to_datetime(
    mumbai_imd["Date"],
    errors="coerce"
)

# Save processed Mumbai rainfall dataset
output_file = "data/processed/mumbai_rainfall_daily.csv"
mumbai_imd.to_csv(output_file, index=False)

print("\n--- MUMBAI IMD RAINFALL ---")
print("Shape:", mumbai_imd.shape)
print("\nDistricts:")
print(mumbai_imd["District"].unique())
print("\nDate range:")
print(mumbai_imd["Date"].min(), "to", mumbai_imd["Date"].max())
print("\nSaved to:", output_file)

# Inspect space weather dataset
space_file = "data/raw/space_weather_indices_2015_2025.txt"

with open(space_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("\n--- SPACE WEATHER DATASET ---")
print("Total lines:", len(lines))

print("\nFirst 20 lines:")
for line in lines[:20]:
    print(line.rstrip())

# ==========================================
# SPACE WEATHER PREPROCESSING
# ==========================================

space_file = "data/raw/space_weather_indices_2015_2025.txt"

# Column names based on GFZ ASCII format
space_columns = [
    "YEAR", "MONTH", "DAY",
    "DAY_NUMBER", "DAY_NUMBER_HALF",
    "BSR", "DB",
    "KP1", "KP2", "KP3", "KP4",
    "KP5", "KP6", "KP7", "KP8",
    "AP1", "AP2", "AP3", "AP4",
    "AP5", "AP6", "AP7", "AP8",
    "AP",
    "SN",
    "F107",
    "F107_ADJUSTED",
    "STATUS"
]

# Read whitespace-separated data
space_df = pd.read_csv(
    space_file,
    sep=r"\s+",
    header=None,
    names=space_columns
)

# Create date
space_df["Date"] = pd.to_datetime(
    space_df[["YEAR", "MONTH", "DAY"]]
)

# Calculate useful daily Kp features
space_df["KP_MEAN"] = space_df[
    ["KP1", "KP2", "KP3", "KP4",
     "KP5", "KP6", "KP7", "KP8"]
].mean(axis=1)

space_df["KP_MAX"] = space_df[
    ["KP1", "KP2", "KP3", "KP4",
     "KP5", "KP6", "KP7", "KP8"]
].max(axis=1)

# Keep only useful fields
space_processed = space_df[
    [
        "Date",
        "KP_MEAN",
        "KP_MAX",
        "AP",
        "SN",
        "F107",
        "F107_ADJUSTED"
    ]
].copy()

# Save processed dataset
space_output = "data/processed/space_weather_2015_2025.csv"

space_processed.to_csv(
    space_output,
    index=False
)

print("\n--- SPACE WEATHER PREPROCESSING ---")
print("Shape:", space_processed.shape)

print("\nColumns:")
print(space_processed.columns.tolist())

print("\nFirst 5 rows:")
print(space_processed.head())

print("\nDate range:")
print(
    space_processed["Date"].min(),
    "to",
    space_processed["Date"].max()
)

print("\nSaved to:", space_output)  

# ==========================================
# CEA POWER STATION DATASET
# ==========================================

import pypdf

cea_file = "data/raw/cea_list_of_power_stations_2025.pdf"

reader = pypdf.PdfReader(cea_file)

cea_text = ""

for page in reader.pages:
    text = page.extract_text()
    if text:
        cea_text += text + "\n"

# Find Maharashtra section
lines = cea_text.splitlines()

maharashtra_lines = [
    line for line in lines
    if "Maharashtra" in line
]

print("\n--- CEA MAHARASHTRA SEARCH ---")
print("Matching lines:", len(maharashtra_lines))

for line in maharashtra_lines[:30]:
    print(line)

# Extract Maharashtra power-station records
cea_maharashtra = []

for line in lines:
    if "Maharashtra" in line:
        cea_maharashtra.append(line)

# Save the raw Maharashtra text for inspection
cea_maharashtra_file = "data/processed/cea_maharashtra_power_stations.txt"

with open(cea_maharashtra_file, "w", encoding="utf-8") as f:
    for line in cea_maharashtra:
        f.write(line + "\n")

print("\n--- CEA MAHARASHTRA EXTRACTION ---")
print("Records extracted:", len(cea_maharashtra))
print("Saved to:", cea_maharashtra_file)


