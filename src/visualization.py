"""
Visualization Module

Handles all plotting and visualization functions for the multi-floor
airport restroom simulator.
"""

from typing import Dict, List, Optional
import numpy as np
import matplotlib.pyplot as plt


class VisualizationManager:
    """Manages all visualization and plotting functions."""
    
    def __init__(self, time_steps: np.ndarray, restroom_sections: List[str], 
                 restrooms: Dict, floors: List[int], flight_flows: Dict):
        """
        Initialize visualization manager.
        
        Args:
            time_steps: Time array (s)
            restroom_sections: List of restroom section IDs
            restrooms: Restroom configuration
            floors: List of floor numbers
            flight_flows: Flight flow information
        """
        self.time_steps = time_steps
        self.time_minutes = time_steps / 60  # Convert to minutes for plotting
        self.restroom_sections = restroom_sections
        self.restrooms = restrooms
        self.floors = floors
        self.flight_flows = flight_flows
    
    def plot_by_floor(self, lambda_r: Dict, L_r: Dict, w_r: Dict, save_plot: str = None):
        """Plot results grouped by floor."""
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('Multi-Floor Airport Restroom Simulation Results', fontsize=16)
        
        colors = plt.cm.Set3(np.linspace(0, 1, len(self.floors)))
        
        # Aggregate by floor
        floor_data = {}
        for floor in self.floors:
            floor_restrooms = [rid for rid, r in self.restrooms.items() if r['floor'] == floor]
            floor_sections = [f"{rid}-{g}" for rid in floor_restrooms for g in ['M', 'F']]
            
            floor_lambda = np.zeros_like(self.time_steps)
            floor_queue = np.zeros_like(self.time_steps)
            floor_wait = np.zeros_like(self.time_steps)
            
            for section in floor_sections:
                if section in lambda_r:
                    floor_lambda += lambda_r[section]
                    floor_queue += L_r[section]
                    floor_wait += w_r[section]
            
            # Average waiting time across sections
            floor_wait = floor_wait / len(floor_sections) if floor_sections else floor_wait
            
            floor_data[floor] = {
                'lambda': floor_lambda,
                'queue': floor_queue, 
                'wait': floor_wait
            }
        
        # Plot arrival rates by floor
        ax = axes[0, 0]
        for i, (floor, data) in enumerate(floor_data.items()):
            ax.plot(self.time_minutes, data['lambda'], label=f'Floor {floor}', 
                   color=colors[i], linewidth=2)
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Arrival Rate (pax/s)')
        ax.set_title('Total Arrival Rates by Floor')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Plot queue lengths by floor
        ax = axes[0, 1]
        for i, (floor, data) in enumerate(floor_data.items()):
            ax.plot(self.time_minutes, data['queue'], label=f'Floor {floor}', 
                   color=colors[i], linewidth=2)
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Total Queue Length (pax)')
        ax.set_title('Total Queue Lengths by Floor')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Plot average waiting times by floor
        ax = axes[1, 0]
        for i, (floor, data) in enumerate(floor_data.items()):
            ax.plot(self.time_minutes, data['wait'], label=f'Floor {floor}', 
                   color=colors[i], linewidth=2)
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Average Waiting Time (s)')
        ax.set_title('Average Waiting Times by Floor')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Plot flight schedule
        ax = axes[1, 1]
        flight_times = []
        flight_labels = []
        
        for flight_id, flow in self.flight_flows.items():
            start_min = flow['start'] / 60
            end_min = flow['end'] / 60
            pax = flow['passengers']
            
            ax.barh(len(flight_times), end_min - start_min, left=start_min, 
                   height=0.8, alpha=0.7, label=flight_id)
            flight_times.append(len(flight_times))
            flight_labels.append(f"{flight_id} ({pax} pax)")
        
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Flights')
        ax.set_title('Flight Schedule')
        ax.set_yticks(range(len(flight_labels)))
        ax.set_yticklabels(flight_labels)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Multi-floor plot saved to {save_plot}")
        else:
            plt.show()
    
    def plot_by_restroom(self, lambda_r: Dict, L_r: Dict, w_r: Dict, save_plot: str = None):
        """Plot results grouped by individual restrooms."""
        n_restrooms = len(self.restrooms)
        cols = min(3, n_restrooms)
        rows = (n_restrooms + cols - 1) // cols
        
        fig, axes = plt.subplots(rows, cols, figsize=(5*cols, 4*rows))
        if n_restrooms == 1:
            axes = [axes]
        elif rows == 1:
            axes = [axes]
        else:
            axes = axes.flatten()
        
        fig.suptitle('Restroom-by-Restroom Analysis', fontsize=16)
        
        for i, (restroom_id, restroom) in enumerate(self.restrooms.items()):
            if i >= len(axes):
                break
                
            ax = axes[i]
            
            # Plot both M and F sections for this restroom
            for gender in ['M', 'F']:
                section_id = f"{restroom_id}-{gender}"
                if section_id in lambda_r:
                    ax.plot(self.time_minutes, lambda_r[section_id], 
                           label=f"{gender} Arrivals", linewidth=2)
                    ax.plot(self.time_minutes, L_r[section_id], 
                           label=f"{gender} Queue", linewidth=2, linestyle='--')
            
            ax.set_xlabel('Time (minutes)')
            ax.set_ylabel('Rate/Count')
            ax.set_title(f'{restroom_id} (Floor {restroom["floor"]})')
            ax.legend()
            ax.grid(True, alpha=0.3)
        
        # Hide unused subplots
        for i in range(n_restrooms, len(axes)):
            axes[i].set_visible(False)
        
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Restroom analysis plot saved to {save_plot}")
        else:
            plt.show()
    
    def plot_by_section(self, lambda_r: Dict, L_r: Dict, w_r: Dict, save_plot: str = None):
        """Plot all individual sections."""
        n_sections = len(self.restroom_sections)
        cols = min(4, n_sections)
        rows = (n_sections + cols - 1) // cols
        
        fig, axes = plt.subplots(rows, cols, figsize=(4*cols, 3*rows))
        if n_sections == 1:
            axes = [axes]
        elif rows == 1:
            axes = [axes]
        else:
            axes = axes.flatten()
        
        fig.suptitle('Individual Section Analysis', fontsize=16)
        
        for i, section_id in enumerate(self.restroom_sections):
            if i >= len(axes):
                break
                
            ax = axes[i]
            ax.plot(self.time_minutes, lambda_r[section_id], 'b-', 
                   label='Arrivals', linewidth=2)
            ax.plot(self.time_minutes, L_r[section_id], 'r--', 
                   label='Queue', linewidth=2)
            
            ax.set_xlabel('Time (min)')
            ax.set_ylabel('Rate/Count')
            ax.set_title(section_id)
            ax.legend()
            ax.grid(True, alpha=0.3)
        
        # Hide unused subplots
        for i in range(n_sections, len(axes)):
            axes[i].set_visible(False)
        
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Section analysis plot saved to {save_plot}")
        else:
            plt.show()
    
    def plot_capacity_utilization(self, queue_dynamics, save_plot: str = None):
        """Plot capacity utilization over time."""
        fig, axes = plt.subplots(2, 1, figsize=(14, 10))
        fig.suptitle('Capacity Utilization Analysis', fontsize=16)
        
        # Plot utilization over time
        ax = axes[0]
        for section_id in self.restroom_sections:
            capacity = queue_dynamics.get_section_capacity(section_id)
            utilization = (queue_dynamics.lambda_r[section_id] / capacity) * 100
            
            ax.plot(self.time_minutes, utilization, label=section_id, linewidth=2)
        
        ax.axhline(y=90, color='r', linestyle='--', alpha=0.7, label='90% Capacity')
        ax.axhline(y=100, color='r', linestyle='-', alpha=0.7, label='100% Capacity')
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Utilization (%)')
        ax.set_title('Capacity Utilization Over Time')
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        ax.grid(True, alpha=0.3)
        
        # Plot peak utilization by section
        ax = axes[1]
        peak_utilizations = queue_dynamics.get_capacity_utilization()
        sections = list(peak_utilizations.keys())
        utilizations = list(peak_utilizations.values())
        
        colors = ['red' if u > 90 else 'orange' if u > 70 else 'green' for u in utilizations]
        bars = ax.bar(sections, utilizations, color=colors, alpha=0.7)
        
        ax.axhline(y=90, color='r', linestyle='--', alpha=0.7, label='90% Threshold')
        ax.set_xlabel('Restroom Section')
        ax.set_ylabel('Peak Utilization (%)')
        ax.set_title('Peak Capacity Utilization by Section')
        ax.legend()
        ax.grid(True, alpha=0.3, axis='y')
        
        # Add utilization values on bars
        for bar, util in zip(bars, utilizations):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 1,
                   f'{util:.1f}%', ha='center', va='bottom')
        
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Utilization analysis plot saved to {save_plot}")
        else:
            plt.show()
    
    def plot_flight_impact(self, lambda_r: Dict, save_plot: str = None):
        """Plot flight arrival impact on restroom usage."""
        fig, axes = plt.subplots(2, 1, figsize=(14, 10))
        fig.suptitle('Flight Impact on Restroom Usage', fontsize=16)
        
        # Plot total system arrivals with flight markers
        ax = axes[0]
        total_arrivals = np.zeros_like(self.time_steps)
        for section in self.restroom_sections:
            if section in lambda_r:
                total_arrivals += lambda_r[section]
        
        ax.plot(self.time_minutes, total_arrivals, 'b-', linewidth=2, label='Total Arrivals')
        
        # Add flight markers
        for flight_id, flow in self.flight_flows.items():
            start_min = flow['start'] / 60
            end_min = flow['end'] / 60
            
            ax.axvspan(start_min, end_min, alpha=0.3, label=f'{flight_id}')
            ax.axvline(start_min, color='red', linestyle='--', alpha=0.7)
        
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Total Arrival Rate (pax/s)')
        ax.set_title('System-Wide Restroom Arrivals vs Flight Schedule')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Plot floor-wise arrivals
        ax = axes[1]
        colors = plt.cm.Set3(np.linspace(0, 1, len(self.floors)))
        
        for i, floor in enumerate(self.floors):
            floor_restrooms = [rid for rid, r in self.restrooms.items() if r['floor'] == floor]
            floor_sections = [f"{rid}-{g}" for rid in floor_restrooms for g in ['M', 'F']]
            
            floor_arrivals = np.zeros_like(self.time_steps)
            for section in floor_sections:
                if section in lambda_r:
                    floor_arrivals += lambda_r[section]
            
            ax.plot(self.time_minutes, floor_arrivals, 
                   color=colors[i], linewidth=2, label=f'Floor {floor}')
        
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Floor Arrival Rate (pax/s)')
        ax.set_title('Floor-Wise Restroom Arrivals')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Flight impact plot saved to {save_plot}")
        else:
            plt.show()
    
    def plot_results(self, lambda_r: Dict, L_r: Dict, w_r: Dict, 
                    group_by: str = 'floor', save_plot: str = None):
        """
        Main plotting function that delegates to specific visualization methods.
        
        Args:
            lambda_r: Arrival rate data
            L_r: Queue length data  
            w_r: Waiting time data
            group_by: Grouping method ('floor', 'restroom', 'section')
            save_plot: Path to save plot
        """
        if group_by == 'floor':
            self.plot_by_floor(lambda_r, L_r, w_r, save_plot)
        elif group_by == 'restroom':
            self.plot_by_restroom(lambda_r, L_r, w_r, save_plot)
        elif group_by == 'section':
            self.plot_by_section(lambda_r, L_r, w_r, save_plot)
        else:
            raise ValueError(f"Unknown grouping method: {group_by}")
    
    def create_summary_dashboard(self, lambda_r: Dict, L_r: Dict, w_r: Dict, 
                               queue_dynamics, save_plot: str = None):
        """Create a comprehensive dashboard with multiple visualizations."""
        fig = plt.figure(figsize=(20, 16))
        gs = fig.add_gridspec(3, 3, hspace=0.3, wspace=0.3)
        
        fig.suptitle('Multi-Floor Airport Restroom Simulation Dashboard', fontsize=20)
        
        # Floor-wise arrival rates
        ax1 = fig.add_subplot(gs[0, 0])
        colors = plt.cm.Set3(np.linspace(0, 1, len(self.floors)))
        for i, floor in enumerate(self.floors):
            floor_restrooms = [rid for rid, r in self.restrooms.items() if r['floor'] == floor]
            floor_sections = [f"{rid}-{g}" for rid in floor_restrooms for g in ['M', 'F']]
            floor_arrivals = np.zeros_like(self.time_steps)
            for section in floor_sections:
                if section in lambda_r:
                    floor_arrivals += lambda_r[section]
            ax1.plot(self.time_minutes, floor_arrivals, color=colors[i], label=f'Floor {floor}')
        ax1.set_title('Arrival Rates by Floor')
        ax1.set_xlabel('Time (min)')
        ax1.set_ylabel('Rate (pax/s)')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Peak utilization
        ax2 = fig.add_subplot(gs[0, 1])
        peak_utilizations = queue_dynamics.get_capacity_utilization()
        sections = list(peak_utilizations.keys())
        utilizations = list(peak_utilizations.values())
        colors_util = ['red' if u > 90 else 'orange' if u > 70 else 'green' for u in utilizations]
        ax2.bar(sections, utilizations, color=colors_util, alpha=0.7)
        ax2.set_title('Peak Utilization')
        ax2.set_ylabel('Utilization (%)')
        plt.setp(ax2.get_xticklabels(), rotation=45, ha='right')
        ax2.grid(True, alpha=0.3, axis='y')
        
        # Flight schedule
        ax3 = fig.add_subplot(gs[0, 2])
        for i, (flight_id, flow) in enumerate(self.flight_flows.items()):
            start_min = flow['start'] / 60
            end_min = flow['end'] / 60
            ax3.barh(i, end_min - start_min, left=start_min, height=0.8, alpha=0.7)
            ax3.text(start_min + (end_min - start_min)/2, i, 
                    f"{flight_id}\n{flow['passengers']} pax", 
                    ha='center', va='center', fontsize=8)
        ax3.set_title('Flight Schedule')
        ax3.set_xlabel('Time (min)')
        ax3.set_ylabel('Flights')
        ax3.grid(True, alpha=0.3)
        
        # Queue lengths over time (top restrooms)
        ax4 = fig.add_subplot(gs[1, :])
        # Show top 6 busiest sections
        section_totals = {s: np.sum(lambda_r[s]) for s in self.restroom_sections if s in lambda_r}
        top_sections = sorted(section_totals.items(), key=lambda x: x[1], reverse=True)[:6]
        
        for section, _ in top_sections:
            ax4.plot(self.time_minutes, L_r[section], label=section, linewidth=2)
        ax4.set_title('Queue Lengths (Top 6 Busiest Sections)')
        ax4.set_xlabel('Time (min)')
        ax4.set_ylabel('Queue Length (pax)')
        ax4.legend()
        ax4.grid(True, alpha=0.3)
        
        # System totals
        ax5 = fig.add_subplot(gs[2, 0])
        total_arrivals = np.zeros_like(self.time_steps)
        total_queues = np.zeros_like(self.time_steps)
        for section in self.restroom_sections:
            if section in lambda_r:
                total_arrivals += lambda_r[section]
                total_queues += L_r[section]
        
        ax5_twin = ax5.twinx()
        line1 = ax5.plot(self.time_minutes, total_arrivals, 'b-', label='Arrivals')
        line2 = ax5_twin.plot(self.time_minutes, total_queues, 'r-', label='Queues')
        
        ax5.set_title('System Totals')
        ax5.set_xlabel('Time (min)')
        ax5.set_ylabel('Arrival Rate (pax/s)', color='b')
        ax5_twin.set_ylabel('Queue Length (pax)', color='r')
        
        lines = line1 + line2
        labels = [l.get_label() for l in lines]
        ax5.legend(lines, labels)
        ax5.grid(True, alpha=0.3)
        
        # Waiting time heatmap by floor and time
        ax6 = fig.add_subplot(gs[2, 1:])
        floor_wait_matrix = []
        floor_labels = []
        
        for floor in self.floors:
            floor_restrooms = [rid for rid, r in self.restrooms.items() if r['floor'] == floor]
            floor_sections = [f"{rid}-{g}" for rid in floor_restrooms for g in ['M', 'F']]
            
            avg_wait = np.zeros_like(self.time_steps)
            count = 0
            for section in floor_sections:
                if section in w_r:
                    avg_wait += w_r[section]
                    count += 1
            if count > 0:
                avg_wait /= count
            
            floor_wait_matrix.append(avg_wait[::60])  # Sample every 60 time steps
            floor_labels.append(f'Floor {floor}')
        
        if floor_wait_matrix:
            im = ax6.imshow(floor_wait_matrix, aspect='auto', cmap='Reds', interpolation='nearest')
            ax6.set_title('Average Waiting Times by Floor (Heatmap)')
            ax6.set_xlabel('Time (sampled)')
            ax6.set_ylabel('Floor')
            ax6.set_yticks(range(len(floor_labels)))
            ax6.set_yticklabels(floor_labels)
            plt.colorbar(im, ax=ax6, label='Waiting Time (s)')
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Dashboard saved to {save_plot}")
        else:
            plt.show() 