"""
Main Implementation Script

Runs the multi-floor airport restroom simulator using the JSON configuration
and the new modular architecture.
"""

import os
import sys

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from simulator import MultiFloorAirportRestroomSimulator


def main():
    """Run the multi-floor airport restroom simulation."""
    
    print("=" * 50)
    
    # Configuration file path
    config_path = "/Users/hesamrashidi/Summer 4/Poop-profiles/multi_floor_config.json"
    
    if not os.path.exists(config_path):
        print(f"Configuration file not found: {config_path}")
        return
    
    try:
        # Initialize simulator with JSON config
        simulator = MultiFloorAirportRestroomSimulator(config_path=config_path)
        
        # Run simulation with logit assignment
        print("\n" + "="*50)
        print("RUNNING LOGIT SIMULATION")
        print("="*50)
        simulator.run_simulation(assignment_method='logit', verbose=True)
        
        # Save results and plots
        results_dir = "results"
        os.makedirs(results_dir, exist_ok=True)
        
        # Generate comprehensive dashboard
        dashboard_path = os.path.join(results_dir, "multi_floor_dashboard.png")
        simulator.create_dashboard(save_plot=dashboard_path)
        
        # Generate floor-wise analysis
        floor_plot_path = os.path.join(results_dir, "floor_analysis.png")
        simulator.plot_results(group_by='floor', save_plot=floor_plot_path)
        
        # Generate capacity utilization analysis
        capacity_plot_path = os.path.join(results_dir, "capacity_utilization.png")
        simulator.plot_capacity_utilization(save_plot=capacity_plot_path)
        
        # Generate flight impact analysis
        flight_impact_path = os.path.join(results_dir, "flight_impact.png")
        simulator.plot_flight_impact(save_plot=flight_impact_path)
        
        # Get comprehensive statistics
        stats = simulator.get_statistics()
        
        print("\n" + "="*50)
        print("DETAILED ANALYSIS")
        print("="*50)
        
        # Flight analysis
        flight_summary = stats['flight_summary']
        print(f"\n FLIGHT OPERATIONS:")
        print(f"  Total flights: {flight_summary['total_flights']}")
        print(f"  Total passengers: {flight_summary['total_passengers']:,}")
        print(f"  Deplaning flights: {flight_summary['deplaning_flights']}")
        print(f"  Boarding flights: {flight_summary['boarding_flights']}")
        print(f"  Aircraft types: {dict(flight_summary['aircraft_types'])}")
        print(f"  Gates used: {sorted(flight_summary['gates_used'])}")
        
        # Movement analysis
        movement_summary = stats['movement_summary']
        print(f"\n PASSENGER MOVEMENT:")
        print(f"  Total entry-restroom combinations: {movement_summary['total_entry_restroom_combinations']}")
        print(f"  Cross-floor movements: {movement_summary['vertical_movement_combinations']} "
              f"({movement_summary['vertical_movement_percentage']:.1f}%)")
        print(f"  Average travel time: {movement_summary['avg_travel_time_s']:.1f}s")
        print(f"  Maximum travel time: {movement_summary['max_travel_time_s']:.1f}s")
        print(f"  Average horizontal distance: {movement_summary['avg_horizontal_distance_m']:.1f}m")
        print(f"  Average vertical distance: {movement_summary['avg_vertical_distance_m']:.1f}m")
        
        # Queue performance by section
        queue_stats = stats['queue_statistics']
        print(f"\n RESTROOM PERFORMANCE:")
        print("  Section Analysis:")
        
        # Sort sections by total passengers served
        sorted_sections = sorted(queue_stats.items(), 
                                key=lambda x: x[1]['total_passengers_served'], 
                                reverse=True)
        
        for section_id, section_stats in sorted_sections:
            print(f"    {section_id}:")
            print(f"      Passengers served: {section_stats['total_passengers_served']:.0f}")
            print(f"      Peak arrival rate: {section_stats['peak_arrival_rate_pax_per_s']:.3f} pax/s")
            print(f"      Average wait time: {section_stats['avg_waiting_time_s']:.1f}s")
            print(f"      Maximum wait time: {section_stats['max_waiting_time_s']:.1f}s")
            print(f"      Peak queue length: {section_stats['max_queue_length_pax']:.1f} pax")
            print(f"      Capacity: {section_stats['capacity_pax_per_s']:.3f} pax/s")
        
        # Capacity utilization
        capacity_util = stats['capacity_utilization']
        print(f"\n⚡ CAPACITY UTILIZATION:")
        high_util_sections = [(s, u) for s, u in capacity_util.items() if u > 70]
        if high_util_sections:
            high_util_sections.sort(key=lambda x: x[1], reverse=True)
            for section, utilization in high_util_sections:
                status = " CRITICAL" if utilization > 90 else " HIGH"
                print(f"  {section}: {utilization:.1f}% {status}")
        else:
            print(" All sections operating at comfortable capacity levels")
        
        # System stability
        stability = stats['stability_analysis']
        print(f"\n SYSTEM STABILITY:")
        print(f"  Stable sections: {len(stability['stable_sections'])}")
        print(f"  High utilization sections: {len(stability['high_utilization_sections'])}")
        print(f"  Unstable sections: {len(stability['unstable_sections'])}")
        
        if stability['warnings']:
            print(" Warnings:")
            for warning in stability['warnings']:
                print(f"    - {warning}")
        
        # Summary statistics
        total_served = sum(s['total_passengers_served'] for s in queue_stats.values())
        avg_system_wait = sum(s['avg_waiting_time_s'] for s in queue_stats.values()) / len(queue_stats)
        max_system_wait = max(s['max_waiting_time_s'] for s in queue_stats.values())
        
        print(f"\n SYSTEM TOTALS:")
        print(f"  Total passengers served: {total_served:.0f}")
        print(f"  System average wait time: {avg_system_wait:.1f}s")
        print(f"  System maximum wait time: {max_system_wait:.1f}s")
        print(f"  Simulation duration: {stats['simulation_parameters']['duration_minutes']:.1f} minutes")
        
        print(f"\n OUTPUT FILES:")
        print(f"  Dashboard: {dashboard_path}")
        print(f"  Floor analysis: {floor_plot_path}")
        print(f"  Capacity analysis: {capacity_plot_path}")
        print(f"  Flight impact: {flight_impact_path}")
        
        print(f"\n Simulation completed successfully!")
        
    except FileNotFoundError as e:
        print(f" Configuration file error: {e}")
    except Exception as e:
        print(f" Simulation error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main() 