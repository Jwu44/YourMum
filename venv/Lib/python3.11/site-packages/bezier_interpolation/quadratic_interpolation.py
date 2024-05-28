import numpy as np

def quadratic_interpolation(data: np.ndarray, t: float = 0.5) -> np.ndarray:
    """Compute the control points to interpolates the data using quadratic bezier interpolation. It adds 1 control point between each pair of data points to create a smooth curve with quadratic bezier curves per each segmet.
    Args:
        data (np.ndarray): Data to interpolate. Each tuple contains the x and y coordinates of a point.
        t (float, optional): Initial tension. Defaults to 0.5.

    Returns:
        np.ndarray: Interpolated data. This data contains the control points. 
        So it will have n + (n-1) points with n=len(data). Each tuple contains the x and y.
    """
    data = np.array(data, dtype=float)
    if len(data) < 2:
        return data
    
    control_points = _calculate_control_points(data, t)
    
    # Insert the control points into the data
    for i, control_point in enumerate(control_points):
        data = np.insert(data, i * 2 + 1, control_point, axis=0)
        
    return data

def _calculate_control_points(data: np.ndarray, t: float = 0.5) -> list:
    n = len(data)
    control_points = []
    for i in range(n - 1):
        x_0, y_0 = data[i]
        x_1, y_1 = data[i + 1]
        if i == 0:
            x_c, y_c = _calculate_first_control_point(x_0, y_0, x_1, y_1, t)
        else:
            x_c, y_c = _calculate_next_control_point(x_c, y_c, x_0, y_0, x_1)
        control_points.append((x_c, y_c))
    return control_points


def _calculate_first_control_point(
    x_0: float, y_0: float,
    x_1: float, y_1: float,
    t: float
) -> tuple[float, float]:
    x_c = x_0 + (x_1 - x_0) / 2
    y_c = y_0 + t * (y_1 - y_0)
    return x_c, y_c


def _calculate_next_control_point(
    x_c: float, y_c: float,
    x_0: float, y_0: float,
    x_1: float
) -> tuple[float, float]:
    m = (y_0 - y_c) / (x_0 - x_c)
    b = y_0 - m * x_0
    x_cn = x_0 + (x_1 - x_0) / 2
    y_cn = m * x_cn + b
    return x_cn, y_cn