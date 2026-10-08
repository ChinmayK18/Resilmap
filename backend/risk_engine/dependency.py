from risk_engine.asset_context import get_asset_context


BASELINE_DEPENDENCY = {
    "Hospital": 1.10,
    "Power Station": 1.20,
    "Substation": 1.30
}


def get_baseline_dependency_factor(asset_type, asset_id=None):
    """
    Return the dependency factor.

    Without asset_id: the per-type baseline (old behaviour).

    With asset_id, using the hospital-substation links:

      Substation (range 1.0 to 1.5)
        The more hospitals it feeds, and the stronger those links,
        the more damage its failure causes.
            1.0 + 0.40 * served_norm + 0.10 * strength_norm

      Hospital (range 1.0 to 1.25)
        The stronger its reliance on a substation, the more exposed it
        is to that substation failing. A single supply link means no
        backup, so it gets a small extra penalty.
            1.0 + 0.20 * strength_norm + (0.05 if only one link)

      Power Station / assets with no link data
        Fall back to the baseline.
    """

    baseline = BASELINE_DEPENDENCY.get(asset_type, 1.00)

    if asset_id is None:
        return baseline

    ctx = get_asset_context(asset_id)

    if asset_type == "Substation" and ctx["served_norm"] is not None:
        strength = ctx["strength_norm"] or 0.0
        return round(1.0 + 0.40 * ctx["served_norm"] + 0.10 * strength, 4)

    if asset_type == "Hospital" and ctx["strength_norm"] is not None:
        single_link = 0.05 if ctx["supply_links"] == 1 else 0.0
        return round(1.0 + 0.20 * ctx["strength_norm"] + single_link, 4)

    return baseline
