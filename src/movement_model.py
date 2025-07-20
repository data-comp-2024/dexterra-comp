"""
Movement Modeling Module

Handles 3D distance calculations, travel time computation, and movement
between floors using elevators and stairs.
"""

from typing import Dict, Tuple
import numpy as np


class MovementModel:
    """Models passenger movement in 3D space with vertical transportation."""
    
    def __init__(self, entry_points: Dict, restrooms: Dict, movement_params: Dict):
        """
        Initialize movement model.
        
        Args:
            entry_points: Entry point configuration
            restrooms: Restroom configuration
            movement_params: Movement speed parameters
        """
        self.entry_points = entry_points
        self.restrooms = restrooms
        
        # Movement parameters
        self.v_walk = movement_params['v_walk']          # Walking speed (m/s)
        self.v_elevator = movement_params['v_elevator']  # Elevator speed (m/s)
        self.v_stairs = movement_params['v_stairs']      # Stairs speed (m/s)
        self.elevator_wait = movement_params['elevator_wait']  # Elevator wait time (s)
        
        # Calculate all distances
        self.distances = self.calculate_all_distances()
    
    def calculate_all_distances(self) -> Dict[str, Dict[str, Dict]]:
        """Calculate distances between all entry points and restrooms (3D)."""
        distances = {}
        
        for entry_id, entry in self.entry_points.items():
            distances[entry_id] = {}
            
            for restroom_id, restroom in self.restrooms.items():
                # 3D distance calculation with floor differences
                dx = restroom['x'] - entry['x']  # (m)
                dy = restroom['y'] - entry['y']  # (m)
                floor_diff = abs(restroom['floor'] - entry['floor'])
                
                # Horizontal distance
                horizontal_dist = np.sqrt(dx**2 + dy**2)  # (m)
                
                # Total distance includes vertical movement
                if floor_diff == 0:
                    total_dist = horizontal_dist
                    vertical_dist = 0
                else:
                    # Add distance for vertical movement (stairs/elevator path)
                    vertical_dist = floor_diff * 4.0  # Assume 4m per floor
                    total_dist = horizontal_dist + vertical_dist
                
                distances[entry_id][restroom_id] = {
                    'horizontal': horizontal_dist,
                    'vertical': vertical_dist,
                    'total': total_dist,
                    'floor_diff': floor_diff
                }
        
        return distances
    
    def compute_travel_time(self, entry_id: str, restroom_id: str) -> float:
        """
        Compute travel time from entry point to restroom.
        
        Args:
            entry_id: Entry point identifier
            restroom_id: Restroom identifier
        
        Returns:
            Travel time (s)
        """
        dist_info = self.distances[entry_id][restroom_id]
        
        # Horizontal walking time
        walk_time = dist_info['horizontal'] / self.v_walk  # (s)
        
        # Vertical movement time
        if dist_info['floor_diff'] > 0:
            # Choose between elevator and stairs (assume elevator for now)
            elevator_time = self.elevator_wait + (dist_info['vertical'] / self.v_elevator)
            stairs_time = dist_info['vertical'] / self.v_stairs
            
            # Use faster option (passengers are smart)
            vertical_time = min(elevator_time, stairs_time)
        else:
            vertical_time = 0
        
        return walk_time + vertical_time
    
    def get_distance_info(self, entry_id: str, restroom_id: str) -> Dict:
        """Get detailed distance information."""
        return self.distances[entry_id][restroom_id]
    
    def compute_all_travel_times(self) -> Dict[str, Dict[str, float]]:
        """Compute travel times between all entry points and restrooms."""
        travel_times = {}
        
        for entry_id in self.entry_points.keys():
            travel_times[entry_id] = {}
            for restroom_id in self.restrooms.keys():
                travel_times[entry_id][restroom_id] = self.compute_travel_time(entry_id, restroom_id)
        
        return travel_times
    
    def get_movement_summary(self) -> Dict:
        """Get summary of movement characteristics."""
        all_horizontal = []
        all_vertical = []
        all_travel_times = []
        vertical_movements = 0
        
        for entry_id in self.entry_points.keys():
            for restroom_id in self.restrooms.keys():
                dist_info = self.distances[entry_id][restroom_id]
                travel_time = self.compute_travel_time(entry_id, restroom_id)
                
                all_horizontal.append(dist_info['horizontal'])
                all_vertical.append(dist_info['vertical'])
                all_travel_times.append(travel_time)
                
                if dist_info['floor_diff'] > 0:
                    vertical_movements += 1
        
        total_combinations = len(self.entry_points) * len(self.restrooms)
        
        return {
            'total_entry_restroom_combinations': total_combinations,
            'vertical_movement_combinations': vertical_movements,
            'vertical_movement_percentage': (vertical_movements / total_combinations) * 100,
            'avg_horizontal_distance_m': np.mean(all_horizontal),
            'max_horizontal_distance_m': np.max(all_horizontal),
            'avg_vertical_distance_m': np.mean(all_vertical),
            'max_vertical_distance_m': np.max(all_vertical),
            'avg_travel_time_s': np.mean(all_travel_times),
            'max_travel_time_s': np.max(all_travel_times),
            'movement_speeds': {
                'walking_m_per_s': self.v_walk,
                'elevator_m_per_s': self.v_elevator,
                'stairs_m_per_s': self.v_stairs,
                'elevator_wait_s': self.elevator_wait
            }
        } 