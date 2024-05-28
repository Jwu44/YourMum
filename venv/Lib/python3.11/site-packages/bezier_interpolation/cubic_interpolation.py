from typing import List, Tuple

import numpy as np
import numpy.typing as npt


def cubic_interpolation(data: npt.ArrayLike) -> np.ndarray:
    """Compute the control points to interpolates the data using cubic bezier interpolation. It adds 2 control points
    between points to create a smooth curve with cuadratic bezier curves per each segmet.

    Args:
        data (List[Tuple[float, float]]): Data to interpolate. Each tuple contains the x and y coordinates of a point.

    Returns:
        List[Tuple[float, float]]: Interpolated data. This data contains the control points. 
        So it will have n + 2(n-1) points with n=len(data). Each tuple contains the x and y coordinates of a point.
    """
    data = np.array(data)
    n = len(data)
    if n < 2:
        return data

    new_data = []
    if n == 2:
        # If there are only two points, add two intermediate points
        x1, y1 = data[0]
        x2, y2 = data[1]
        new_data.append((x1, y1))
        new_data.append((x1 + (x2 - x1) / 3, y1 + (y2 - y1) / 3))
        new_data.append((x1 + 2 * (x2 - x1) / 3, y1 + 2 * (y2 - y1) / 3))
        new_data.append((x2, y2))

    else:
        P1, P2 = _calculate_control_points(data)
        for i in range(n - 1):
            new_data.append(data[i])
            new_data.append(P1[i])
            new_data.append(P2[i])
        new_data.append(data[-1])
    return np.array(new_data)


def _calculate_control_points(data: np.array) -> Tuple[np.ndarray, np.ndarray]:
    """Create the system Ax - b = 0 and solve it to find P1 control points.
    Then, compute P2 control points using P1 and the data points.
    See:
    https://www.particleincell.com/2012/bezier-splines/
    Second last eq has a typo, it's P2_i = 2*K_(i+1) - P1_(i+1)
    """
    # N. of segments: n = N. of points - 1
    n = len(data) - 1
    # Create matrix A (Ax + b = 0)
    A = _create_tri_diagonal_matrix(n)
    # Create vector K (Common points between segments)
    K = np.array(data)
    # Create vector b (each component contains bx and by)
    b = _create_b_vector(K)

    # Solve the system:
    P1 = np.linalg.solve(A, b)

    # Compute P2:
    P2 = 2 * K[1:-1] - P1[1:]
    P2 = np.concatenate((P2, [(1/2)*(K[-1] + P1[-1])]))
    return P1, P2


def _create_tri_diagonal_matrix(n: int) -> np.ndarray:
    """Creates the A matrix to find the control points of the cubic bezier curve.
    See "The Matrix" Section in:
    https://exploringswift.com/blog/Drawing-Smooth-Cubic-Bezier-Curve-through-prescribed-points-using-Swift
    """
    A = np.zeros((n, n))
    # Main diagonal
    A += np.diag([2] + [4]*(n-2) + [7], k=0)
    # Upper diagonal
    A += np.diag([1]*(n-1), k=1)
    # Lower diagonal
    A += np.diag([1]*(n-2) + [2], k=-1)
    return A


def _create_b_vector(K: List[Tuple[float, float]]) -> np.ndarray:
    """Creates the b vector to find the control points of the cubic bezier curve.
    See:
    https://exploringswift.com/blog/Drawing-Smooth-Cubic-Bezier-Curve-through-prescribed-points-using-Swift
    """
    n = len(K) - 1
    b = np.array(
        [(K[0][0] + 2 * K[1][0], K[0][1] + 2 * K[1][1])]
        + [(4 * K[i][0] + 2 * K[i+1][0], 4 * K[i][1] + 2 * K[i+1][1]) for i in range(1, n - 1)]
        + [(8 * K[n-1][0] + K[n][0], 8 * K[n-1][1] + K[n][1])]
    )
    return b
