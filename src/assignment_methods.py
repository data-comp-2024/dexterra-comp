"""
Assignment Methods Module

Handles passenger choice models and flow assignment algorithms including
logit and deterministic user equilibrium methods.
"""

from typing import Dict, Tuple
import numpy as np
import warnings


class AssignmentMethods:
    """Implements different passenger assignment algorithms."""
    
    def __init__(self, choice_params: Dict, movement_model, restrooms: Dict):
        """
        Initialize assignment methods.
        
        Args:
            choice_params: Choice model parameters
            movement_model: MovementModel instance
            restrooms: Restroom configuration
        """
        self.beta_walk = choice_params['beta_walk']      # Walking time coefficient
        self.beta_wait = choice_params['beta_wait']      # Waiting time coefficient
        self.beta_vertical = choice_params['beta_vertical']  # Vertical movement penalty
        self.theta = choice_params['theta']              # Logit dispersion parameter
        
        self.movement_model = movement_model
        self.restrooms = restrooms
    
    def compute_generalized_cost(self, entry_id: str, section_id: str, waiting_time: float) -> float:
        """
        Compute generalized cost for traveling from entry to restroom section.
        
        Args:
            entry_id: Entry point identifier
            section_id: Restroom section identifier (e.g., 'R1A-M')
            waiting_time: Expected waiting time at restroom (s)
        
        Returns:
            Generalized cost (utility units)
        """
        # Extract restroom ID from section ID
        restroom_id = section_id.rsplit('-', 1)[0]  # 'R1A-M' -> 'R1A'
        
        travel_time = self.movement_model.compute_travel_time(entry_id, restroom_id)
        dist_info = self.movement_model.get_distance_info(entry_id, restroom_id)
        
        # Cost components
        travel_cost = self.beta_walk * travel_time
        wait_cost = self.beta_wait * waiting_time
        vertical_penalty = self.beta_vertical * dist_info['floor_diff'] * 10  # Extra penalty for changing floors
        
        total_cost = travel_cost + wait_cost + vertical_penalty
        return total_cost
    
    def assign_flows_logit(self, total_flow: float, costs: Dict[str, float]) -> Dict[str, float]:
        """
        Assign flows using logit choice model.
        
        Args:
            total_flow: Total flow to assign (pax/s)
            costs: Dictionary of costs for each restroom (utility)
        
        Returns:
            Dictionary of assigned flows (pax/s)
        """
        if not costs or total_flow <= 0:
            return {r: 0.0 for r in costs.keys()}
        
        # Calculate utilities (negative costs)
        utilities = {r: -self.theta * cost for r, cost in costs.items()}
        
        # Numerical stability
        max_utility = max(utilities.values())
        exp_utilities = {r: np.exp(u - max_utility) for r, u in utilities.items()}
        sum_exp = sum(exp_utilities.values())
        
        if sum_exp == 0:
            # Equal split if all utilities are very negative
            n_restrooms = len(costs)
            return {r: total_flow / n_restrooms for r in costs.keys()}
        
        probabilities = {r: exp_u / sum_exp for r, exp_u in exp_utilities.items()}
        flows = {r: total_flow * prob for r, prob in probabilities.items()}
        
        return flows
    
    def assign_flows_deterministic(self, total_flow: float, costs: Dict[str, float]) -> Dict[str, float]:
        """
        Assign flows using deterministic user equilibrium (all to minimum cost).
        
        Args:
            total_flow: Total flow to assign (pax/s)
            costs: Dictionary of costs for each restroom (utility)
        
        Returns:
            Dictionary of assigned flows (pax/s)
        """
        if not costs or total_flow <= 0:
            return {r: 0.0 for r in costs.keys()}
        
        min_cost_restroom = min(costs.keys(), key=lambda x: costs[x])
        flows = {r: total_flow if r == min_cost_restroom else 0.0 for r in costs.keys()}
        return flows
    
    def assign_flows_proportional(self, total_flow: float, costs: Dict[str, float]) -> Dict[str, float]:
        """
        Assign flows inversely proportional to costs (capacity-based).
        
        Args:
            total_flow: Total flow to assign (pax/s)
            costs: Dictionary of costs for each restroom (utility)
        
        Returns:
            Dictionary of assigned flows (pax/s)
        """
        if not costs or total_flow <= 0:
            return {r: 0.0 for r in costs.keys()}
        
        # Calculate inverse costs (higher cost = lower attractiveness)
        max_cost = max(costs.values())
        inverse_costs = {r: max_cost - cost + 1 for r, cost in costs.items()}
        total_inverse = sum(inverse_costs.values())
        
        if total_inverse == 0:
            # Equal split if all costs are the same
            n_restrooms = len(costs)
            return {r: total_flow / n_restrooms for r in costs.keys()}
        
        # Proportional assignment
        flows = {r: total_flow * (inv_cost / total_inverse) 
                for r, inv_cost in inverse_costs.items()}
        
        return flows
    
    def assign_flows(self, total_flow: float, costs: Dict[str, float], 
                    method: str = 'logit') -> Dict[str, float]:
        """
        Main flow assignment method that delegates to specific algorithms.
        
        Args:
            total_flow: Total flow to assign (pax/s)
            costs: Dictionary of costs for each restroom (utility)
            method: Assignment method ('logit', 'deterministic', 'proportional')
        
        Returns:
            Dictionary of assigned flows (pax/s)
        """
        if method == 'logit':
            return self.assign_flows_logit(total_flow, costs)
        elif method == 'deterministic':
            return self.assign_flows_deterministic(total_flow, costs)
        elif method == 'proportional':
            return self.assign_flows_proportional(total_flow, costs)
        else:
            raise ValueError(f"Unknown assignment method: {method}")
    
    def compute_choice_probabilities(self, costs: Dict[str, float]) -> Dict[str, float]:
        """
        Compute choice probabilities using logit model without flow assignment.
        
        Args:
            costs: Dictionary of costs for each restroom (utility)
        
        Returns:
            Dictionary of choice probabilities
        """
        if not costs:
            return {}
        
        # Calculate utilities (negative costs)
        utilities = {r: -self.theta * cost for r, cost in costs.items()}
        
        # Calculate choice probabilities
        max_utility = max(utilities.values())
        exp_utilities = {r: np.exp(u - max_utility) for r, u in utilities.items()}
        sum_exp = sum(exp_utilities.values())
        
        if sum_exp == 0:
            n_restrooms = len(costs)
            return {r: 1.0 / n_restrooms for r in costs.keys()}
        
        probabilities = {r: exp_u / sum_exp for r, exp_u in exp_utilities.items()}
        return probabilities
    
    def get_assignment_summary(self, costs: Dict[str, float]) -> Dict:
        """
        Get summary of assignment characteristics for given costs.
        
        Args:
            costs: Dictionary of costs for each restroom
        
        Returns:
            Summary dictionary with assignment analysis
        """
        if not costs:
            return {}
        
        logit_probs = self.compute_choice_probabilities(costs)
        min_cost_restroom = min(costs.keys(), key=lambda x: costs[x])
        
        return {
            'total_restrooms': len(costs),
            'min_cost_restroom': min_cost_restroom,
            'min_cost_value': costs[min_cost_restroom],
            'max_cost_value': max(costs.values()),
            'cost_range': max(costs.values()) - min(costs.values()),
            'logit_probabilities': logit_probs,
            'logit_entropy': -sum(p * np.log(p) if p > 0 else 0 for p in logit_probs.values()),
            'deterministic_winner': min_cost_restroom,
            'choice_parameters': {
                'beta_walk': self.beta_walk,
                'beta_wait': self.beta_wait, 
                'beta_vertical': self.beta_vertical,
                'theta': self.theta
            }
        } 