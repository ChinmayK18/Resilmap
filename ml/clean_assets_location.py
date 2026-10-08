"""
Remove assets whose coordinates are outside Mumbai.

Some hospitals were geocoded to the wrong place (Osaka, Ohio, ...). They would
show up on the map and distort the ML anomaly scores.

What it does
  1. Keeps a backup of the original file the first time it runs:
         data/processed/mumbai_infrastructure_assets_raw.csv
     (later runs always filter from this backup, so you can change the box
      below and run again safely)
  2. Writes the cleaned file over:
         data/processed/mumbai_infrastructure_assets.csv
  3. Saves the removed rows for checking:
         data/processed/removed_out_of_mumbai_assets.csv

Assets with NO coordinates are kept (their location is unknown, not wrong).

Run from the project root:
    python ml/clean_assets_location.py            # clean
    python ml/clean_assets_location.py --dry-run  # only show what would go
"""

import shutil
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "processed"

ASSET_FILE = DATA_DIR / "mumbai_infrastructure_assets.csv"
RAW_FILE = DATA_DIR / "mumbai_infrastructure_assets_raw.csv"
REMOVED_FILE = DATA_DIR / "removed_out_of_mumbai_assets.csv"

# Bounding box around Mumbai city + suburbs (Thane/Navi Mumbai edges included)
LAT_MIN, LAT_MAX = 18.85, 19.35
LON_MIN, LON_MAX = 72.75, 73.05


def main(dry_run: bool = False):
    source = RAW_FILE if RAW_FILE.exists() else ASSET_FILE
    df = pd.read_csv(source)

    lat = pd.to_numeric(df["Latitude"], errors="coerce")
    lon = pd.to_numeric(df["Longitude"], errors="coerce")

    has_coords = lat.notna() & lon.notna()
    inside = lat.between(LAT_MIN, LAT_MAX) & lon.between(LON_MIN, LON_MAX)

    outside = has_coords & ~inside
    keep = ~outside

    print(f"Read {len(df)} assets from {source.name}")
    print(f"No coordinates (kept): {int((~has_coords).sum())}")
    print(f"Outside Mumbai (removed): {int(outside.sum())}")

    if outside.any():
        print("\nRemoved by asset type:")
        print(df[outside]["Asset_Type"].value_counts().to_string())
        print("\nExamples:")
        print(
            df[outside][["Asset_ID", "Asset_Name", "Asset_Type", "Latitude", "Longitude"]]
            .head(10)
            .to_string(index=False)
        )

    print(f"\nAssets left: {int(keep.sum())}")
    print("By type:")
    print(df[keep]["Asset_Type"].value_counts().to_string())

    if dry_run:
        print("\nDry run: nothing was written.")
        return

    if not RAW_FILE.exists():
        shutil.copy(ASSET_FILE, RAW_FILE)
        print(f"\nBackup saved: {RAW_FILE}")

    df[outside].to_csv(REMOVED_FILE, index=False)
    df[keep].to_csv(ASSET_FILE, index=False)
    print(f"Cleaned file saved: {ASSET_FILE}")
    print(f"Removed rows saved: {REMOVED_FILE}")


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)
