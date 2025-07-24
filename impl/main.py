"""
Main Cleaning Crew Optimization Script

This script runs the cleaning crew optimization system independently from the main bathroom
simulation. It first runs the bathroom usage simulation to get usage profiles, then optimizes
cleaning crew scheduling based on that data.

Key Features:
- Dynamic crew assignment optimization
- Real-time call-in handling
- Multi-KPI optimization (cost, response time, passenger satisfaction)
- Comprehensive visualization of crew operations
- Realistic practical implementation
"""

import os
import sys
import json
import numpy as np

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src'))

from simulator import MultiFloorAirportRestroomSimulator
from cleaning_crew_optimizer import CleaningCrewOptimizer
from crew_visualization import CrewVisualizationManager


def run_bathroom_simulation(config_path: str):
    """
    Run the bathroom usage simulation to get usage profiles.
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        Dictionary containing bathroom usage data (lambda_r, L_r, w_r)
    """
    print("Step 1: Running bathroom usage simulation...")
    print("=" * 60)
    
    # Initialize and run bathroom simulator
    simulator = MultiFloorAirportRestroomSimulator(config_path=config_path)
    simulator.run_simulation(assignment_method='logit', verbose=True)
    
    # Extract usage data
    bathroom_usage_data = {
        'lambda_r': simulator.lambda_r,  # Arrival rates
        'L_r': simulator.L_r,           # Queue lengths
        'w_r': simulator.w_r,           # Waiting times
        'restrooms': simulator.restrooms,
        'dt': simulator.dt,
        'duration': simulator.T
    }
    
    print(f"\nBathroom simulation completed!")
    print(f"  - Duration: {simulator.T/3600:.1f} hours")
    print(f"  - Time step: {simulator.dt:.1f} seconds")
    print(f"  - Restrooms tracked: {len(simulator.restrooms)}")
    
    return bathroom_usage_data, simulator


def analyze_bathroom_usage_patterns(bathroom_data: dict):
    """
    Analyze bathroom usage patterns to inform cleaning optimization.
    
    Args:
        bathroom_data: Bathroom usage data from simulation
    """
    print("\nBathroom Usage Pattern Analysis:")
    print("-" * 40)
    
    lambda_r = bathroom_data['lambda_r']
    L_r = bathroom_data['L_r']
    w_r = bathroom_data['w_r']
    
    # Aggregate statistics across all restroom sections
    total_usage_over_time = np.zeros(len(next(iter(lambda_r.values()))))
    max_queue_lengths = {}
    max_waiting_times = {}
    
    for section_id, arrival_rates in lambda_r.items():
        # Sum arrival rates for total usage pattern
        total_usage_over_time += np.array(arrival_rates)
        
        # Track peak conditions by restroom
        restroom_id = section_id.rsplit('-', 1)[0]
        if restroom_id not in max_queue_lengths:
            max_queue_lengths[restroom_id] = 0
            max_waiting_times[restroom_id] = 0
        
        max_queue_lengths[restroom_id] = max(max_queue_lengths[restroom_id], 
                                           np.max(L_r[section_id]))
        max_waiting_times[restroom_id] = max(max_waiting_times[restroom_id], 
                                           np.max(w_r[section_id]))
    
    # Find peak usage periods
    peak_usage_time = np.argmax(total_usage_over_time) * bathroom_data['dt']
    peak_usage_rate = np.max(total_usage_over_time)
    avg_usage_rate = np.mean(total_usage_over_time)
    
    print(f"  Peak usage time: {peak_usage_time/3600:.1f} hours ({peak_usage_rate:.3f} pax/s)")
    print(f"  Average usage rate: {avg_usage_rate:.3f} pax/s")
    print(f"  Usage variability: {np.std(total_usage_over_time):.3f} pax/s")
    
    print("\n  Restroom Stress Analysis:")
    for restroom_id in sorted(max_queue_lengths.keys()):
        print(f"    {restroom_id}: Max queue {max_queue_lengths[restroom_id]:.1f} people, "
              f"Max wait {max_waiting_times[restroom_id]/60:.1f} min")
    
    print(f"\n  Enhanced System Features:")
    print(f"    Multi-cleaner assignment: Enabled (1-3 cleaners per bathroom)")
    print(f"    Peak demand avoidance: Active (threshold: 0.05 pax/s)")
    print(f"    Capacity reduction tracking: Real-time monitoring")
    print(f"    Usage-based cleaning: Triggered after 15 people per restroom")
    print(f"    Supply management: Auto-restocking when supplies <15%")
    print(f"    Real-time emergencies: Dynamic call-ins with crew preemption")
    print(f"    Task reassignment: Higher priority tasks interrupt lower priority")
    
    return {
        'peak_usage_time': peak_usage_time,
        'peak_usage_rate': peak_usage_rate,
        'avg_usage_rate': avg_usage_rate,
        'restroom_stress': {
            'max_queues': max_queue_lengths,
            'max_waits': max_waiting_times
        }
    }


def run_crew_optimization(bathroom_data: dict):
    """
    Run the cleaning crew optimization based on bathroom usage data.
    
    Args:
        bathroom_data: Bathroom usage data from simulation
        
    Returns:
        Optimization results and crew optimizer instance
    """
    print("\n\nStep 2: Running cleaning crew optimization...")
    print("=" * 60)
    
    # Initialize crew optimizer
    crew_optimizer = CleaningCrewOptimizer(
        restrooms=bathroom_data['restrooms'],
        simulation_duration=bathroom_data['duration'],
        dt=bathroom_data['dt']
    )
    
    print(f"Crew optimization initialized:")
    print(f"  - Crew members: {len(crew_optimizer.crew_members)}")
    print(f"  - Routine tasks scheduled: {len([t for t in crew_optimizer.cleaning_tasks if t.cleaning_type.value == 'routine'])}")
    print(f"  - Simulation duration: {bathroom_data['duration']/3600:.1f} hours")
    
    # Run optimization
    optimization_results = crew_optimizer.run_optimization(bathroom_data)
    
    return optimization_results, crew_optimizer


def display_key_performance_indicators(results: dict):
    """
    Display key performance indicators in a formatted table.
    
    Args:
        results: Optimization results dictionary
    """
    print("\n\nKey Performance Indicators (KPIs):")
    print("=" * 60)
    
    final_kpis = results['final_kpis']
    
    # Define KPI categories and descriptions
    kpi_categories = {
        'Cost Metrics': {
            'total_cost': ('Total Cost', '${:.0f}', 'Lower is better'),
            'overtime_hours': ('Overtime Hours', '{:.1f} hrs', 'Lower is better')
        },
        'Response Metrics': {
            'avg_response_time': ('Avg Response Time', '{:.1f} min', 'Lower is better'),
            'emergency_response_time': ('Emergency Response', '{:.1f} min', 'Lower is better')
        },
        'Quality Metrics': {
            'passenger_satisfaction': ('Passenger Satisfaction', '{:.1f}%', 'Higher is better'),
            'cleaning_quality_score': ('Cleaning Quality', '{:.1f}%', 'Higher is better')
        },
        'Efficiency Metrics': {
            'crew_utilization': ('Crew Utilization', '{:.1f}%', 'Target: 70-80%'),
            'task_completion_rate': ('Task Completion', '{:.1f}%', 'Higher is better')
        },
        'Disruption Metrics': {
            'disruption_cost': ('Disruption Cost', '${:.0f}', 'Lower is better'),
            'avg_capacity_reduction': ('Avg Capacity Loss', '{:.1f}%', 'Lower is better')
        }
    }
    
    for category, metrics in kpi_categories.items():
        print(f"\n{category}:")
        print("-" * len(category))
        
        for kpi_key, (label, format_str, target) in metrics.items():
            value = final_kpis.get(kpi_key, 0)
            formatted_value = format_str.format(value)
            
            # Color coding for terminal output
            if 'cost' in kpi_key.lower() or 'time' in kpi_key.lower() or 'overtime' in kpi_key.lower():
                status = "GOOD" if value < 50 else "HIGH" if value < 100 else "CRITICAL"
            elif 'satisfaction' in kpi_key.lower() or 'quality' in kpi_key.lower() or 'completion' in kpi_key.lower():
                status = "EXCELLENT" if value >= 90 else "GOOD" if value >= 80 else "NEEDS IMPROVEMENT"
            elif 'utilization' in kpi_key.lower():
                status = "OPTIMAL" if 70 <= value <= 80 else "ACCEPTABLE" if 60 <= value <= 90 else "SUBOPTIMAL"
            else:
                status = "MEASURED"
            
            print(f"  {label:<20}: {formatted_value:>12} ({target}) [{status}]")
    
    # Cost breakdown
    print(f"\nCost Breakdown:")
    print("-" * 15)
    cost_breakdown = results['cost_breakdown']
    for cost_type, amount in cost_breakdown.items():
        if amount > 0:
            cost_name = cost_type.replace('_', ' ').title()
            print(f"  {cost_name:<15}: ${amount:>8.0f}")
    
    # Display supply management summary
    print(f"\nSupply Management:")
    print("-" * 18)
    restocks = cost_breakdown.get('restock_cost', 0) / 25.0  # $25 per restock
    print(f"  Restocking Events   : {restocks:>8.0f}")
    print(f"  Supply Efficiency   : {(cost_breakdown.get('supply_cost', 0) / max(cost_breakdown.get('total_cost', 1), 1) * 100):>7.1f}%")


def display_crew_performance_summary(results: dict):
    """
    Display crew performance summary.
    
    Args:
        results: Optimization results dictionary
    """
    print(f"\n\nCrew Performance Summary:")
    print("=" * 60)
    
    crew_performance = results['crew_performance']
    
    # Sort crew by efficiency score
    sorted_crew = sorted(crew_performance.items(), 
                        key=lambda x: x[1]['efficiency_score'], reverse=True)
    
    print(f"{'Crew Member':<15} {'Tasks':<6} {'Hours':<6} {'Emergency':<9} {'Supplies':<8} {'Efficiency':<10}")
    print("-" * 66)
    
    for crew_id, performance in sorted_crew:
        name = performance['name'].split()[0]  # First name only
        tasks = performance['tasks_completed']
        hours = performance['total_work_time_hours']
        emergency = performance['emergency_tasks']
        efficiency = performance['efficiency_score']
        
        # Get supply level from crew member (placeholder for now)
        supplies = f"OK"  # Simplified display
        
        print(f"{name:<15} {tasks:<6} {hours:<6.1f} {emergency:<9} {supplies:<8} {efficiency:<10.1f}")
    
    # Top performers
    if sorted_crew:
        top_performer = sorted_crew[0]
        print(f"\nTop Performer: {top_performer[1]['name']} "
              f"(Efficiency: {top_performer[1]['efficiency_score']:.1f})")


def display_task_analysis(results: dict):
    """
    Display task completion analysis.
    
    Args:
        results: Optimization results dictionary
    """
    print(f"\n\nTask Analysis:")
    print("=" * 60)
    
    task_summary = results['task_summary']
    
    print(f"Overall Completion Rate: {task_summary['overall_completion_rate']:.1f}%")
    print(f"Total Tasks: {task_summary['total_tasks']}")
    print(f"Completed Tasks: {task_summary['completed_tasks']}")
    print(f"Average Passenger Impact: {task_summary['avg_passenger_impact']:.1f}/100")
    print(f"Usage-Based Cleanings: {task_summary.get('usage_based_cleanings', 0)}")
    print(f"Real-Time Call-ins: {task_summary.get('real_time_call_ins', 0)}")
    print(f"Emergency Responses: {task_summary.get('emergency_responses', 0)}")
    print(f"Total Bathroom Usage: {task_summary.get('total_restroom_usage', 0):.1f} people")
    
    print(f"\nBy Task Type:")
    print("-" * 15)
    
    for task_type, stats in task_summary['by_type'].items():
        task_name = task_type.replace('_', ' ').title()
        completion_rate = stats['completion_rate']
        status = "EXCELLENT" if completion_rate >= 95 else "GOOD" if completion_rate >= 85 else "NEEDS ATTENTION"
        
        print(f"  {task_name:<12}: {stats['completed']:>3}/{stats['total']:<3} "
              f"({completion_rate:>5.1f}%) [{status}]")


def generate_crew_recommendations(results: dict, usage_analysis: dict):
    """
    Generate actionable recommendations based on results.
    
    Args:
        results: Optimization results
        usage_analysis: Bathroom usage analysis
    """
    print(f"\n\nActionable Recommendations:")
    print("=" * 60)
    
    final_kpis = results['final_kpis']
    recommendations = []
    
    # Cost optimization
    if final_kpis['total_cost'] > 1000:
        recommendations.append("COST: Consider reducing crew overlap during low-traffic periods")
    
    if final_kpis['overtime_hours'] > 5:
        recommendations.append("STAFFING: Hire additional part-time staff to reduce overtime costs")
    
    # Response time optimization
    if final_kpis['avg_response_time'] > 30:
        recommendations.append("RESPONSE: Add mobile cleaning units for faster response to call-ins")
    
    if final_kpis['emergency_response_time'] > 15:
        recommendations.append("EMERGENCY: Designate dedicated emergency response team members")
    
    # Quality improvements
    if final_kpis['passenger_satisfaction'] < 85:
        recommendations.append("QUALITY: Implement customer feedback system and additional training")
    
    if final_kpis['cleaning_quality_score'] < 85:
        recommendations.append("TRAINING: Provide advanced cleaning technique training for crew")
    
    # Utilization optimization
    if final_kpis['crew_utilization'] < 60:
        recommendations.append("EFFICIENCY: Reduce crew size during identified low-traffic periods")
    elif final_kpis['crew_utilization'] > 90:
        recommendations.append("CAPACITY: Add more crew members or extend break periods")
    
    # Task completion
    if final_kpis['task_completion_rate'] < 90:
        recommendations.append("SCHEDULING: Revise task scheduling algorithm or add backup crew")
    
    # Usage-based recommendations
    peak_time_hour = usage_analysis['peak_usage_time'] / 3600
    recommendations.append(f"SCHEDULING: Peak usage occurs at {peak_time_hour:.1f}h - ensure full staffing")
    
    if usage_analysis['avg_usage_rate'] > 0.1:
        recommendations.append("CAPACITY: High usage facility - consider increasing cleaning frequency")
    
    # Display recommendations
    for i, rec in enumerate(recommendations, 1):
        category, description = rec.split(': ', 1)
        print(f"  {i:2d}. [{category}] {description}")
    
    if not recommendations:
        print("  System is operating optimally - no immediate recommendations.")


def create_visualizations(results: dict, crew_optimizer, bathroom_simulator, save_dir: str):
    """
    Create comprehensive visualizations of the optimization results.
    
    Args:
        results: Optimization results
        crew_optimizer: Crew optimizer instance
        bathroom_simulator: Bathroom simulator instance
        save_dir: Directory to save visualizations
    """
    print(f"\n\nGenerating visualizations...")
    print("=" * 60)
    
    os.makedirs(save_dir, exist_ok=True)
    
    # Initialize visualization manager
    viz_manager = CrewVisualizationManager()
    
    # 1. Main crew dashboard
    dashboard_path = os.path.join(save_dir, "crew_optimization_dashboard.png")
    try:
        viz_manager.create_crew_dashboard(results, crew_optimizer.crew_members, dashboard_path)
        print(f"  1. Crew dashboard saved to: {dashboard_path}")
    except Exception as e:
        print(f"  1. ✗ Error creating crew dashboard: {e}")
        import traceback
        traceback.print_exc()
    
    # 2. Crew Gantt chart
    gantt_path = os.path.join(save_dir, "crew_gantt_chart.png")
    viz_manager.plot_crew_gantt_chart(
        results['crew_assignments'], 
        crew_optimizer.crew_members,
        crew_optimizer.simulation_duration,
        gantt_path
    )
    print(f"  2. Gantt chart saved to: {gantt_path}")
    
    # 3. Call-in analysis
    callin_path = os.path.join(save_dir, "call_in_analysis.png")
    all_tasks = crew_optimizer.cleaning_tasks + crew_optimizer.completed_tasks
    viz_manager.plot_call_in_analysis(all_tasks, callin_path)
    print(f"  3. Call-in analysis saved to: {callin_path}")
    
    # 4. Real-time status (snapshot at peak time)
    status_path = os.path.join(save_dir, "real_time_status_snapshot.png")
    peak_time = crew_optimizer.simulation_duration / 2  # Middle of simulation
    active_tasks = [t for t in crew_optimizer.cleaning_tasks 
                   if t.assigned_crew and not t.completion_time]
    viz_manager.create_real_time_status_display(
        crew_optimizer.crew_members, active_tasks, peak_time, status_path
    )
    print(f"  4. Real-time status saved to: {status_path}")
    
    # 5. Original bathroom simulation dashboard for comparison
    bathroom_dashboard_path = os.path.join(save_dir, "bathroom_usage_dashboard.png")
    bathroom_simulator.create_dashboard(bathroom_dashboard_path)
    print(f"  5. Bathroom usage dashboard saved to: {bathroom_dashboard_path}")


def save_results_summary(results: dict, usage_analysis: dict, save_path: str):
    """
    Save a comprehensive results summary to JSON file.
    
    Args:
        results: Optimization results
        usage_analysis: Usage pattern analysis
        save_path: Path to save JSON file
    """
    summary = {
        'timestamp': str(np.datetime64('now')),
        'simulation_parameters': {
            'duration_hours': results.get('simulation_duration', 0) / 3600,
            'crew_count': len(results['crew_performance']),
            'total_tasks': results['task_summary']['total_tasks'],
            'task_completion_rate': results['task_summary']['overall_completion_rate']
        },
        'kpis': results['final_kpis'],
        'cost_breakdown': results['cost_breakdown'],
        'usage_patterns': usage_analysis,
        'top_performers': sorted(
            results['crew_performance'].items(),
            key=lambda x: x[1]['efficiency_score'],
            reverse=True
        )[:3]  # Top 3 performers
    }
    
    with open(save_path, 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    
    print(f"Results summary saved to: {save_path}")


def main():
    """Main execution function."""
    print("CLEANING CREW OPTIMIZATION")
    print("=" * 80)
    
    # Configuration
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "multi_floor_config.json")
    results_dir = "results"
    
    if not os.path.exists(config_path):
        print(f"ERROR: Configuration file not found: {config_path}")
        print("Please ensure multi_floor_config.json exists in the project root.")
        return
    
    try:
        # Step 1: Run bathroom usage simulation
        bathroom_data, bathroom_simulator = run_bathroom_simulation(config_path)
        
        # Analyze usage patterns
        usage_analysis = analyze_bathroom_usage_patterns(bathroom_data)
        
        # Step 2: Run crew optimization
        optimization_results, crew_optimizer = run_crew_optimization(bathroom_data)
        
        # Step 3: Display results
        display_key_performance_indicators(optimization_results)
        display_crew_performance_summary(optimization_results)
        display_task_analysis(optimization_results)
        generate_crew_recommendations(optimization_results, usage_analysis)
        
        # Step 4: Create visualizations
        os.makedirs(results_dir, exist_ok=True)
        create_visualizations(optimization_results, crew_optimizer, bathroom_simulator, results_dir)
        
        # Step 5: Save comprehensive summary
        summary_path = os.path.join(results_dir, "optimization_summary.json")
        save_results_summary(optimization_results, usage_analysis, summary_path)
        
        print(f"\n\nCOMPLETE! All results saved to '{results_dir}/' directory.")
        print("Review the visualizations and summary for detailed insights.")
        
        # Final system status
        print(f"\n" + "=" * 80)
        print("SYSTEM STATUS SUMMARY:")
        final_kpis = optimization_results['final_kpis']
        print(f"  Total Cost: ${final_kpis['total_cost']:.0f}")
        print(f"  Passenger Satisfaction: {final_kpis['passenger_satisfaction']:.1f}%")
        print(f"  Response Time: {final_kpis['avg_response_time']:.1f} minutes")
        print(f"  Task Completion: {final_kpis['task_completion_rate']:.1f}%")
        print(f"  System Status: {'OPTIMAL' if final_kpis['passenger_satisfaction'] > 85 else 'NEEDS ATTENTION'}")
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        print("Check configuration and ensure all dependencies are installed.")
        raise


if __name__ == "__main__":
    main() 