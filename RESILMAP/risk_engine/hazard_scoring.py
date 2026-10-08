import numpy as np


def percentile_score(value, historical_values):
    """
    Convert a value into a 0-100 percentile-based severity score.
    """
    values = np.asarray(historical_values, dtype=float)
    values = values[~np.isnan(values)]

    if len(values) == 0:
        return 0.0

    score = (np.sum(values <= value) / len(values)) * 100

    return round(float(score), 2)


def rainfall_severity(rainfall, normal_rainfall):
    """
    Calculate rainfall severity based on rainfall
    relative to the normal rainfall.
    """
    if normal_rainfall <= 0:
        return 0.0

    ratio = rainfall / normal_rainfall

    score = min((ratio / 4.0) * 100, 100)

    return round(float(score), 2)


def heat_severity(current_temperature):
    """
    Calculate heat hazard severity on a 0-100 scale.

    40°C = 0 severity
    45°C = 100 severity
    """

    score = ((current_temperature - 40.0) / 5.0) * 100

    score = max(0.0, min(score, 100.0))

    return round(float(score), 2)

def geomagnetic_severity(kp_max, ap):
    """
    Calculate geomagnetic storm severity using
    interpretable domain-based thresholds.
    """

    # KP: 0-5 maps to 0-50, KP 9 maps to 100
    kp_score = min((kp_max / 9.0) * 100, 100)

    # Ap: 0-50 maps to 0-50, Ap 100+ maps to 100
    ap_score = min((ap / 100.0) * 100, 100)

    # Weighted combination
    score = (0.6 * kp_score) + (0.4 * ap_score)

    return round(float(min(score, 100)), 2)

def overall_hazard_score(
    heat_score=0,
    rainfall_score=0,
    geomagnetic_score=0
):
    """
    Combine Earth and Space hazard scores.

    Heat, rainfall, and geomagnetic activity
    contribute equally to the overall hazard severity.
    """

    score = (
        0.33 * heat_score
        + 0.33 * rainfall_score
        + 0.34 * geomagnetic_score
    )

    return round(float(min(max(score, 0), 100)), 2)