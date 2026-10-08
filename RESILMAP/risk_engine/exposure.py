def get_baseline_exposure(asset_type):
    """
    Return baseline exposure on a 0-1 scale.

    This is an MVP baseline. Geographic exposure will be
    added later for assets with valid coordinates.
    """

    exposure = {
        "Hospital": 0.70,
        "Power Station": 0.80,
        "Substation": 0.85
    }

    return exposure.get(asset_type, 0.50)