def get_baseline_dependency_factor(asset_type):
    """
    Return a baseline dependency factor.

    This is an MVP assumption. The value will later be
    replaced by dependency-graph-based calculations.
    """

    dependency_factor = {
        "Hospital": 1.10,
        "Power Station": 1.20,
        "Substation": 1.30
    }

    return dependency_factor.get(asset_type, 1.00)