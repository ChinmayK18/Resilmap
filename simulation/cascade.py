import pandas as pd

from simulation.scenario import SCENARIO


LINK_FILE = "data/processed/hospital_substation_links.csv"
AI_RISK_FILE = "data/processed/ai_event_risk.csv"
OUTPUT_FILE = "data/processed/cascade_results.csv"


def simulate_substation_failure(
    substation_name,
    hazard_type="Geomagnetic",
    event_date=None
):

    # ---------------------------------------------------------
    # 1. Load dependency and AI event-risk data
    # ---------------------------------------------------------

    links = pd.read_csv(LINK_FILE)
    risks = pd.read_csv(AI_RISK_FILE)

    # ---------------------------------------------------------
    # 2. Select the requested historical hazard event
    # ---------------------------------------------------------

    if event_date is not None:

        risks = risks[
            (risks["Hazard_Type"] == hazard_type)
            & (risks["Event_Date"] == event_date)
        ].copy()

    else:

        risks = risks[
            risks["Hazard_Type"] == hazard_type
        ].copy()

    if risks.empty:
        print(
            "No AI risk data found for:",
            hazard_type,
            event_date
        )
        return

    # ---------------------------------------------------------
    # 3. Find hospitals dependent on the substation
    # ---------------------------------------------------------

    affected = links[
        links["Substation_Name"] == substation_name
    ].copy()

    if affected.empty:
        print("No dependent hospitals found.")
        return

    # ---------------------------------------------------------
    # 4. Attach hospital AI event risk
    # ---------------------------------------------------------

    hospital_risks = risks[
        risks["Asset_Type"] == "Hospital"
    ][
        [
            "Asset_ID",
            "Asset_Name",
            "Event_Date",
            "Hazard_Type",
            "Hazard_Severity",
            "AI_Event_Risk",
            "AI_Risk_Level"
        ]
    ]

    affected = affected.merge(
        hospital_risks,
        left_on="Hospital_Name",
        right_on="Asset_Name",
        how="left"
    )

    # Remove hospitals for which no matching AI event risk exists.
    affected = affected.dropna(
        subset=["AI_Event_Risk"]
    )

    if affected.empty:
        print(
            "No hospital AI-risk records matched this scenario."
        )
        return

    # ---------------------------------------------------------
    # 5. Calculate cascade impact
    # ---------------------------------------------------------
    #
    # Dependency strength represents the proximity-based
    # potential dependency between the substation and hospital.
    #
    # AI Event Risk represents the historical hazard-event risk
    # of the hospital.
    #

    affected["Cascade_Impact"] = (
        affected["Dependency_Strength"]
        * affected["AI_Event_Risk"]
    ).round(2)

    affected = affected.sort_values(
        "Cascade_Impact",
        ascending=False
    )

    # ---------------------------------------------------------
    # 6. Calculate cascade severity
    # ---------------------------------------------------------

    total_impact = affected[
        "Cascade_Impact"
    ].sum()

    max_possible_impact = (
        len(affected) * 100
    )

    cascade_severity = (
        total_impact /
        max_possible_impact
    ) * 100 if max_possible_impact > 0 else 0

    cascade_severity = round(
        min(cascade_severity, 100),
        2
    )

    # ---------------------------------------------------------
    # 7. Add scenario information
    # ---------------------------------------------------------

    affected["Failed_Substation"] = (
        substation_name
    )

    affected["Scenario_Hazard"] = (
        hazard_type
    )

    affected["Scenario_Event_Date"] = (
        event_date
    )

    affected["Cascade_Severity"] = (
        cascade_severity
    )

    # ---------------------------------------------------------
    # 8. Save results
    # ---------------------------------------------------------

    affected.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # ---------------------------------------------------------
    # 9. Display results
    # ---------------------------------------------------------

    print("\nSUBSTATION FAILURE SCENARIO")
    print("=" * 50)

    print(
        "Failed Substation:",
        substation_name
    )

    print(
        "Hazard:",
        hazard_type
    )

    print(
        "Event Date:",
        event_date
    )

    print(
        "Affected hospitals:",
        len(affected)
    )

    print("\nTop affected hospitals:")

    print(
        affected[
            [
                "Hospital_Name",
                "Distance_km",
                "Dependency_Strength",
                "Hazard_Severity",
                "AI_Event_Risk",
                "AI_Risk_Level",
                "Cascade_Impact"
            ]
        ]
        .head(10)
        .to_string(index=False)
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
        SCENARIO["hazard_type"],
        SCENARIO.get("event_date")
    )