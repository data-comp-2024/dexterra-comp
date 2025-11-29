"""
Configuration constants for Demand OD package
"""

# Male bathrooms (identified by name)
MALE_BATHROOMS = ['FE2097', 'FF2025', 'FG2057', 'FG2037', 'FG2043', 'FG2085']

# FEMALE_BATHROOMS is computed dynamically from data in utils.get_bathroom_lists()
# All bathrooms starting with 'F' that are not in MALE_BATHROOMS are female bathrooms

# Gate exceptions that should not be truncated to 3 characters
GATE_EXCEPTIONS = ['164A', '164B', '166A', '166B']

# Security gate coordinates
SECURITY_COORDS = {'name': 'Security', 'x': -4400.52, 'y': 2152.793778}

# Simulation parameters
DEFAULT_WALK_SPEED_M_PER_MIN = 80.0  # meters per minute
DEFAULT_NUM_SERVERS = 15
DEFAULT_MEAN_SERVICE_MIN = 2.0
DEFAULT_BATCH_MINUTES = 5

# Passenger behavior parameters
DEFAULT_P_BATHROOM = 0.2  # Probability of using bathroom
DEFAULT_MALE_SHARE = 0.5  # Share of male passengers

# Entry time generation parameters
ARRIVAL_OFFSET_LOC = 5  # minutes (mean)
ARRIVAL_OFFSET_SCALE = 3  # minutes (std)
ARRIVAL_OFFSET_MIN = 0
ARRIVAL_OFFSET_MAX = 15

DEPARTURE_OFFSET_LOC = -60  # minutes (mean, negative = before flight)
DEPARTURE_OFFSET_SCALE = 15  # minutes (std)
DEPARTURE_OFFSET_MIN = -90
DEPARTURE_OFFSET_MAX = -30

