import pandas as pd

from simulation.scenario import SCENARIO


LINK_FILE = "data/processed/hospital_substation_links.csv"
RISK_FILE = "data/processed/mumbai_infrastructure_risk.csv"
OUTPUT_FILE = "data/processed/cascade_results.csv"


def simulate_substation_failure(
    substation_name,
    hazard_type="Geomagnetic"
):

    links = pd.read_csv(LINK_FILE)
    risks = pd.read_csv(RISK_FILE)

    affected = links[
        links["Substation_Name"] == substation_name
    ].copy()

    if affected.empty:
        print("No dependent hospitals found.")
        return

    hospital_risks = risks[
        (risks["Asset_Type"] == "Hospital")
        & (risks["Hazard_Type"] == hazard_type)
    ][
        ["Asset_Name", "Risk_Score", "Risk_Level"]
    ]

    affected = affected.merge(
        hospital_risks,
        left_on="Hospital_Name",
        right_on="Asset_Name",
        how="left"
    )

    affected["Cascade_Impact"] = (
        affected["Dependency_Strength"]
        * affected["Risk_Score"]
    ).round(2)

    affected = affected.sort_values(
        "Cascade_Impact",
        ascending=False
    )

    total_impact = affected["Cascade_Impact"].sum()

    max_possible_impact = len(affected) * 100

    cascade_severity = (
        total_impact / max_possible_impact
    ) * 100 if max_possible_impact > 0 else 0

    cascade_severity = round(
        min(cascade_severity, 100),
        2
    )

    # Add scenario-level information
    affected["Failed_Substation"] = substation_name
    affected["Hazard_Type"] = hazard_type
    affected["Cascade_Severity"] = cascade_severity

    # Save structured cascade results
    affected.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\nSUBSTATION FAILURE SCENARIO")
    print("=" * 50)

    print("Failed Substation:", substation_name)
    print("Hazard:", hazard_type)
    print("Affected hospitals:", len(affected))

    print("\nTop affected hospitals:")

    print(
        affected[
            [
                "Hospital_Name",
                "Distance_km",
                "Dependency_Strength",
                "Risk_Score",
                "Risk_Level",
                "Cascade_Impact"
            ]
        ].head(10).to_string(index=False)
    )

    print(
        "\nTotal Cascade Impact Index:",
        round(total_impact, 2)
    )

    print(
        "Cascade Severity Score:",
        cascade_severity,
        "/ 100"
    )

    print(
        "\nCascade results saved to:",
        OUTPUT_FILE
    )


if __name__ == "__main__":

    simulate_substation_failure(
        SCENARIO["failed_substation"],
        SCENARIO["hazard_type"]
    )