from risk_engine.asset_context import get_asset_context


BASELINE_EXPOSURE = {
    "Hospital": 0.70,
    "Power Station": 0.80,
    "Substation": 0.85
}


def get_baseline_exposure(asset_type, asset_id=None):
    """
    Return exposure on a 0-1 scale.

    Without asset_id: the per-type baseline (old behaviour).

    With asset_id: the baseline is scaled by how large the asset is
    compared with others of the SAME type (capacity rank), because a
    bigger facility puts more people and service at stake.

        multiplier = 0.90 + 0.20 * capacity_rank     (0.90 to 1.10)

    Geographic exposure (e.g. distance to coast / flood zones) can be
    added here later using Latitude and Longitude.
    """

    base = BASELINE_EXPOSURE.get(asset_type, 0.50)

    if asset_id is None:
        return base

    ctx = get_asset_context(asset_id)
    multiplier = 0.90 + 0.20 * ctx["capacity_rank"]

    return round(min(base * multiplier, 1.0), 4)
