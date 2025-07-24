"""
Cleaning Crew Visualization Module

Provides comprehensive visualization capabilities for the cleaning crew optimization system.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import matplotlib.dates as mdates
from matplotlib.animation import FuncAnimation
import matplotlib.gridspec as gridspec


class CrewVisualizationManager:
    """Manages all visualization for the cleaning crew optimization system."""
    
    def __init__(self):
        """Initialize visualization manager."""
        plt.style.use('seaborn-v0_8')
        self.colors = {
            'primary': '#1f77b4',
            'secondary': '#ff7f0e',
            'success': '#2ca02c',
            'warning': '#ffbb78',
            'danger': '#d62728',
            'info': '#17becf'
        }
        
        # Status colors for crew visualization
        self.status_colors = {
            'idle': '#90EE90',          # Light green
            'cleaning': '#4169E1',      # Royal blue
            'traveling': '#FFD700',     # Gold
            'break': '#DDA0DD',         # Plum
            'emergency_response': '#FF4500'  # Orange red
        }
        
        # Task type colors
        self.task_colors = {
            'routine': '#87CEEB',       # Sky blue
            'emergency': '#DC143C',     # Crimson
            'call_in': '#FF8C00',       # Dark orange
            'deep_clean': '#9370DB'     # Medium purple
        }
    
    def create_crew_dashboard(self, optimization_results: Dict, crew_members: List, 
                             save_plot: str = None) -> None:
        """
        Create comprehensive dashboard showing crew performance and system status.
        
        Args:
            optimization_results: Results from crew optimization
            crew_members: List of crew member objects
            save_plot: Path to save the plot
        """
        fig = plt.figure(figsize=(20, 16))
        gs = gridspec.GridSpec(4, 4, figure=fig, hspace=0.3, wspace=0.3)
        
        # Title
        fig.suptitle('Cleaning Crew Optimization Dashboard', fontsize=20, fontweight='bold')
        
        # 1. KPI Timeline (top row, spans 2 columns)
        ax1 = fig.add_subplot(gs[0, :2])
        self._plot_kpi_timeline(ax1, optimization_results['kpi_timeline'])
        
        # 2. Cost Breakdown (top row, right)
        ax2 = fig.add_subplot(gs[0, 2])
        self._plot_cost_breakdown(ax2, optimization_results['cost_breakdown'])
        
        # 3. Task Completion Status (top row, far right)
        ax3 = fig.add_subplot(gs[0, 3])
        self._plot_task_completion(ax3, optimization_results['task_summary'])
        
        # 4. Crew Utilization (second row, left)
        ax4 = fig.add_subplot(gs[1, :2])
        self._plot_crew_utilization(ax4, optimization_results['kpi_timeline'])
        
        # 5. Response Time Analysis (second row, right)
        ax5 = fig.add_subplot(gs[1, 2:])
        self._plot_response_time_analysis(ax5, optimization_results['kpi_timeline'])
        
        # 6. Crew Performance Heatmap (third row, spans all)
        ax6 = fig.add_subplot(gs[2, :])
        self._plot_crew_performance_heatmap(ax6, optimization_results['crew_performance'])
        
        # 7. Task Distribution (bottom left)
        ax7 = fig.add_subplot(gs[3, :2])
        self._plot_task_distribution(ax7, optimization_results['task_summary'])
        
        # 8. Key Metrics Summary (bottom right)
        ax8 = fig.add_subplot(gs[3, 2:])
        self._plot_key_metrics_summary(ax8, optimization_results['final_kpis'])
        
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Dashboard saved to {save_plot}")
        else:
            plt.show()
    
    def _plot_kpi_timeline(self, ax, kpi_timeline: List[Dict]) -> None:
        """Plot KPI trends over time."""
        if not kpi_timeline:
            ax.text(0.5, 0.5, 'No KPI data available', ha='center', va='center')
            return
        

        times = [kpi['time'] / 3600 for kpi in kpi_timeline]  # Convert to hours
        
        # Primary metrics
        ax2 = ax.twinx()
        
        # Cost (left axis)
        costs = [kpi['total_cost'] for kpi in kpi_timeline]
        ax.plot(times, costs, color=self.colors['primary'], linewidth=2, label='Total Cost ($)', marker='o')
        ax.set_ylabel('Total Cost ($)', color=self.colors['primary'])
        ax.tick_params(axis='y', labelcolor=self.colors['primary'])
        
        # Satisfaction (right axis)
        satisfaction = [kpi['passenger_satisfaction'] for kpi in kpi_timeline]
        ax2.plot(times, satisfaction, color=self.colors['success'], linewidth=2, label='Satisfaction', marker='s')
        ax2.set_ylabel('Passenger Satisfaction', color=self.colors['success'])
        ax2.tick_params(axis='y', labelcolor=self.colors['success'])
        ax2.set_ylim(0, 100)
        
        ax.set_xlabel('Time (hours)')
        ax.set_title('KPI Timeline', fontweight='bold')
        ax.grid(True, alpha=0.3)
        
        # Add legends
        lines1, labels1 = ax.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax.legend(lines1 + lines2, labels1 + labels2, loc='upper left')
    
    def _plot_cost_breakdown(self, ax, cost_breakdown: Dict) -> None:
        """Plot cost breakdown pie chart."""
        labels = []
        values = []
        colors = []
        
        cost_mapping = {
            'labor_cost': ('Labor', self.colors['primary']),
            'overtime_cost': ('Overtime', self.colors['warning']),
            'supply_cost': ('Supplies', self.colors['secondary']),
            'emergency_cost': ('Emergency', self.colors['danger'])
        }
        
        for key, value in cost_breakdown.items():
            if value > 0:
                label, color = cost_mapping.get(key, (key, self.colors['info']))
                labels.append(f'{label}\n${value:.0f}')
                values.append(value)
                colors.append(color)
        
        if values:
            wedges, texts, autotexts = ax.pie(values, labels=labels, colors=colors, autopct='%1.1f%%',
                                            startangle=90)
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('bold')
        else:
            ax.text(0.5, 0.5, 'No cost data', ha='center', va='center')
        
        ax.set_title('Cost Breakdown', fontweight='bold')
    
    def _plot_task_completion(self, ax, task_summary: Dict) -> None:
        """Plot task completion status."""
        if 'by_type' in task_summary:
            task_types = list(task_summary['by_type'].keys())
            completed = [task_summary['by_type'][t]['completed'] for t in task_types]
            total = [task_summary['by_type'][t]['total'] for t in task_types]
            
            # Stacked bar chart
            incomplete = [t - c for t, c in zip(total, completed)]
            
            bar_width = 0.6
            x_pos = np.arange(len(task_types))
            
            bars1 = ax.bar(x_pos, completed, bar_width, label='Completed', 
                          color=self.colors['success'], alpha=0.8)
            bars2 = ax.bar(x_pos, incomplete, bar_width, bottom=completed, 
                          label='Incomplete', color=self.colors['warning'], alpha=0.8)
            
            ax.set_xlabel('Task Type')
            ax.set_ylabel('Number of Tasks')
            ax.set_title('Task Completion Status', fontweight='bold')
            ax.set_xticks(x_pos)
            ax.set_xticklabels([t.replace('_', ' ').title() for t in task_types], rotation=45)
            ax.legend()
            
            # Add completion rate labels
            for i, (c, t) in enumerate(zip(completed, total)):
                if t > 0:
                    rate = c / t * 100
                    ax.text(i, c + (t - c) / 2, f'{rate:.0f}%', ha='center', va='center', 
                           fontweight='bold', color='white')
        else:
            ax.text(0.5, 0.5, 'No task data available', ha='center', va='center')
    
    def _plot_crew_utilization(self, ax, kpi_timeline: List[Dict]) -> None:
        """Plot crew utilization over time."""
        if not kpi_timeline:
            ax.text(0.5, 0.5, 'No utilization data available', ha='center', va='center')
            return
        
        times = [kpi['time'] / 3600 for kpi in kpi_timeline]
        utilization = [kpi['crew_utilization'] for kpi in kpi_timeline]
        
        ax.fill_between(times, utilization, alpha=0.3, color=self.colors['primary'])
        ax.plot(times, utilization, color=self.colors['primary'], linewidth=2, marker='o')
        
        # Add target utilization line
        target_utilization = 75  # 75% target
        ax.axhline(y=target_utilization, color=self.colors['success'], linestyle='--', 
                  label=f'Target ({target_utilization}%)')
        
        ax.set_xlabel('Time (hours)')
        ax.set_ylabel('Crew Utilization (%)')
        ax.set_title('Crew Utilization Over Time', fontweight='bold')
        ax.set_ylim(0, 100)
        ax.grid(True, alpha=0.3)
        ax.legend()
    
    def _plot_response_time_analysis(self, ax, kpi_timeline: List[Dict]) -> None:
        """Plot response time analysis."""
        if not kpi_timeline:
            ax.text(0.5, 0.5, 'No response time data available', ha='center', va='center')
            return
        
        times = [kpi['time'] / 3600 for kpi in kpi_timeline]
        avg_response = [kpi['avg_response_time'] for kpi in kpi_timeline]
        emergency_response = [kpi['emergency_response_time'] for kpi in kpi_timeline]
        
        ax.plot(times, avg_response, color=self.colors['primary'], linewidth=2, 
               marker='o', label='Average Response Time')
        ax.plot(times, emergency_response, color=self.colors['danger'], linewidth=2, 
               marker='s', label='Emergency Response Time')
        
        # Target response times
        ax.axhline(y=30, color=self.colors['success'], linestyle='--', alpha=0.7, 
                  label='Target (30 min)')
        ax.axhline(y=10, color=self.colors['danger'], linestyle='--', alpha=0.7, 
                  label='Emergency Target (10 min)')
        
        ax.set_xlabel('Time (hours)')
        ax.set_ylabel('Response Time (minutes)')
        ax.set_title('Response Time Analysis', fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.legend()
    
    def _plot_crew_performance_heatmap(self, ax, crew_performance: Dict) -> None:
        """Plot crew performance heatmap."""
        if not crew_performance:
            ax.text(0.5, 0.5, 'No crew performance data available', ha='center', va='center')
            return
        
        crew_ids = list(crew_performance.keys())
        crew_names = [crew_performance[cid]['name'] for cid in crew_ids]
        
        # Performance metrics
        metrics = ['tasks_completed', 'total_work_time_hours', 'emergency_tasks', 'efficiency_score']
        metric_labels = ['Tasks\nCompleted', 'Work Time\n(hours)', 'Emergency\nTasks', 'Efficiency\nScore']
        
        # Normalize data for heatmap
        data = []
        for metric in metrics:
            values = [crew_performance[cid][metric] for cid in crew_ids]
            if max(values) > 0:
                normalized = [v / max(values) * 100 for v in values]
            else:
                normalized = [0] * len(values)
            data.append(normalized)
        
        data = np.array(data).T  # Transpose for proper orientation
        
        im = ax.imshow(data, cmap='RdYlGn', aspect='auto', vmin=0, vmax=100)
        
        # Set ticks and labels
        ax.set_xticks(np.arange(len(metrics)))
        ax.set_yticks(np.arange(len(crew_names)))
        ax.set_xticklabels(metric_labels)
        ax.set_yticklabels(crew_names)
        
        # Add text annotations
        for i in range(len(crew_names)):
            for j in range(len(metrics)):
                text = f'{data[i, j]:.0f}'
                ax.text(j, i, text, ha='center', va='center', 
                       color='white' if data[i, j] < 50 else 'black', fontweight='bold')
        
        ax.set_title('Crew Performance Heatmap (Normalized %)', fontweight='bold')
        
        # Add colorbar
        cbar = plt.colorbar(im, ax=ax, shrink=0.8)
        cbar.set_label('Performance Score (%)', rotation=270, labelpad=15)
    
    def _plot_task_distribution(self, ax, task_summary: Dict) -> None:
        """Plot task distribution and patterns."""
        if 'by_type' not in task_summary:
            ax.text(0.5, 0.5, 'No task distribution data available', ha='center', va='center')
            return
        
        task_types = list(task_summary['by_type'].keys())
        totals = [task_summary['by_type'][t]['total'] for t in task_types]
        completion_rates = [task_summary['by_type'][t]['completion_rate'] for t in task_types]
        
        # Dual axis plot
        ax2 = ax.twinx()
        
        # Bar chart for totals
        x_pos = np.arange(len(task_types))
        bars = ax.bar(x_pos, totals, alpha=0.7, color=[self.task_colors.get(t, self.colors['info']) for t in task_types])
        
        # Line chart for completion rates
        line = ax2.plot(x_pos, completion_rates, color=self.colors['danger'], marker='o', 
                       linewidth=3, markersize=8, label='Completion Rate')
        
        ax.set_xlabel('Task Type')
        ax.set_ylabel('Total Tasks', color=self.colors['primary'])
        ax2.set_ylabel('Completion Rate (%)', color=self.colors['danger'])
        
        ax.set_title('Task Distribution and Completion Rates', fontweight='bold')
        ax.set_xticks(x_pos)
        ax.set_xticklabels([t.replace('_', ' ').title() for t in task_types], rotation=45)
        
        ax2.set_ylim(0, 100)
        ax2.tick_params(axis='y', labelcolor=self.colors['danger'])
        
        # Add value labels on bars
        for bar, total in zip(bars, totals):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                   f'{total}', ha='center', va='bottom', fontweight='bold')
    
    def _plot_key_metrics_summary(self, ax, final_kpis: Dict) -> None:
        """Plot key metrics summary."""
        ax.axis('off')  # Remove axes for text display
        
        # Key metrics to display
        metrics = {
            'Total Cost': f"${final_kpis.get('total_cost', 0):.0f}",
            'Avg Response Time': f"{final_kpis.get('avg_response_time', 0):.1f} min",
            'Passenger Satisfaction': f"{final_kpis.get('passenger_satisfaction', 0):.1f}%",
            'Crew Utilization': f"{final_kpis.get('crew_utilization', 0):.1f}%",
            'Emergency Response': f"{final_kpis.get('emergency_response_time', 0):.1f} min",
            'Task Completion': f"{final_kpis.get('task_completion_rate', 0):.1f}%",
            'Overtime Hours': f"{final_kpis.get('overtime_hours', 0):.1f} hrs",
            'Quality Score': f"{final_kpis.get('cleaning_quality_score', 0):.1f}%"
        }
        
        # Create text display
        y_positions = np.linspace(0.9, 0.1, len(metrics))
        
        ax.text(0.5, 0.95, 'Final Performance Metrics', ha='center', va='top', 
               fontsize=14, fontweight='bold', transform=ax.transAxes)
        
        for i, (metric, value) in enumerate(metrics.items()):
            # Color code based on performance
            color = self.colors['success']  # Default to success color
            
            if 'Cost' in metric or 'Response Time' in metric or 'Overtime' in metric:
                color = self.colors['warning']  # Warning for cost/time metrics
            elif 'Satisfaction' in metric or 'Quality' in metric:
                if float(value.split('%')[0]) < 80:
                    color = self.colors['danger']
            
            ax.text(0.1, y_positions[i], f'{metric}:', ha='left', va='center', 
                   fontweight='bold', transform=ax.transAxes)
            ax.text(0.9, y_positions[i], value, ha='right', va='center', 
                   color=color, fontweight='bold', transform=ax.transAxes)
    
    def plot_crew_gantt_chart(self, assignments: List[Dict], crew_members: List, 
                             simulation_duration: float, save_plot: str = None) -> None:
        """
        Create Gantt chart showing crew assignments over time.
        
        Args:
            assignments: List of assignment dictionaries with time and assignments
            crew_members: List of crew member objects
            simulation_duration: Total simulation duration in seconds
            save_plot: Path to save the plot
        """
        fig, ax = plt.subplots(figsize=(16, 10))
        
        # Prepare data
        crew_names = [crew.name for crew in crew_members]
        crew_ids = [crew.crew_id for crew in crew_members]
        
        y_positions = range(len(crew_names))
        
        # Plot shift times as background
        for i, crew in enumerate(crew_members):
            shift_start_hours = crew.shift_start / 3600
            shift_end_hours = crew.shift_end / 3600
            
            ax.barh(i, shift_end_hours - shift_start_hours, 
                   left=shift_start_hours, height=0.8, 
                   color='lightgray', alpha=0.3, label='Shift Time' if i == 0 else "")
        
        # Plot assignments
        colors_used = {}
        for assignment in assignments:
            time_hours = assignment['time'] / 3600
            
            for task_id, crew_assignment in assignment['assignments'].items():
                # Handle both single crew ID and list of crew IDs
                if isinstance(crew_assignment, list):
                    crew_list = crew_assignment
                else:
                    crew_list = [crew_assignment]
                
                # Use different colors for different task types
                if task_id not in colors_used:
                    colors_used[task_id] = np.random.choice(list(self.task_colors.values()))
                
                # Plot for each crew member assigned to this task
                for crew_id in crew_list:
                    if crew_id in crew_ids:
                        crew_idx = crew_ids.index(crew_id)
                        
                        # Estimate task duration (reduced if multiple cleaners)
                        base_duration = 0.5  # 30 minutes default
                        task_duration = base_duration / (len(crew_list) ** 0.7)  # Diminishing returns
                        
                        ax.barh(crew_idx, task_duration, left=time_hours, height=0.6,
                               color=colors_used[task_id], alpha=0.8)
        
        ax.set_yticks(y_positions)
        ax.set_yticklabels(crew_names)
        ax.set_xlabel('Time (hours)')
        ax.set_ylabel('Crew Members')
        ax.set_title('Crew Assignment Gantt Chart', fontsize=16, fontweight='bold')
        ax.grid(True, alpha=0.3)
        
        # Add legend for task types
        legend_elements = []
        for task_type, color in self.task_colors.items():
            legend_elements.append(mpatches.Patch(color=color, label=task_type.replace('_', ' ').title()))
        
        ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1.15, 1))
        
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Gantt chart saved to {save_plot}")
        else:
            plt.show()
    
    def plot_call_in_analysis(self, tasks: List, save_plot: str = None) -> None:
        """
        Analyze and visualize call-in patterns.
        
        Args:
            tasks: List of all cleaning tasks
            save_plot: Path to save the plot
        """
        call_in_tasks = [t for t in tasks if t.cleaning_type.value == 'call_in']
        
        if not call_in_tasks:
            print("No call-in tasks found for analysis.")
            return
        
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('Call-In Task Analysis', fontsize=16, fontweight='bold')
        
        # 1. Call-ins by time of day
        hours = [t.created_time / 3600 for t in call_in_tasks]
        ax1.hist(hours, bins=24, alpha=0.7, color=self.colors['warning'], edgecolor='black')
        ax1.set_xlabel('Hour of Day')
        ax1.set_ylabel('Number of Call-ins')
        ax1.set_title('Call-ins by Time of Day')
        ax1.grid(True, alpha=0.3)
        
        # 2. Call-ins by restroom
        restrooms = [t.restroom_id for t in call_in_tasks]
        restroom_counts = pd.Series(restrooms).value_counts()
        
        ax2.bar(range(len(restroom_counts)), restroom_counts.values, 
               color=self.colors['secondary'], alpha=0.7)
        ax2.set_xlabel('Restroom')
        ax2.set_ylabel('Number of Call-ins')
        ax2.set_title('Call-ins by Restroom Location')
        ax2.set_xticks(range(len(restroom_counts)))
        ax2.set_xticklabels(restroom_counts.index, rotation=45)
        ax2.grid(True, alpha=0.3)
        
        # 3. Response time distribution
        response_times = [(t.completion_time - t.created_time) / 60 for t in call_in_tasks 
                         if t.completion_time is not None]
        
        if response_times:
            ax3.hist(response_times, bins=15, alpha=0.7, color=self.colors['info'], edgecolor='black')
            ax3.axvline(np.mean(response_times), color=self.colors['danger'], 
                       linestyle='--', label=f'Mean: {np.mean(response_times):.1f} min')
            ax3.set_xlabel('Response Time (minutes)')
            ax3.set_ylabel('Frequency')
            ax3.set_title('Call-in Response Time Distribution')
            ax3.legend()
            ax3.grid(True, alpha=0.3)
        else:
            ax3.text(0.5, 0.5, 'No completed call-in tasks', ha='center', va='center')
        
        # 4. Priority vs response time
        if response_times:
            priorities = [t.priority for t in call_in_tasks if t.completion_time is not None]
            ax4.scatter(priorities, response_times, alpha=0.6, color=self.colors['primary'], s=50)
            ax4.set_xlabel('Priority Level')
            ax4.set_ylabel('Response Time (minutes)')
            ax4.set_title('Priority vs Response Time')
            ax4.grid(True, alpha=0.3)
            
            # Add trend line
            if len(priorities) > 1:
                z = np.polyfit(priorities, response_times, 1)
                p = np.poly1d(z)
                ax4.plot(priorities, p(priorities), color=self.colors['danger'], linestyle='--')
        else:
            ax4.text(0.5, 0.5, 'No completed call-in tasks', ha='center', va='center')
        
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Call-in analysis saved to {save_plot}")
        else:
            plt.show()
    
    def create_real_time_status_display(self, crew_members: List, current_tasks: List, 
                                      current_time: float, save_plot: str = None) -> None:
        """
        Create real-time status display showing current crew activities.
        
        Args:
            crew_members: List of crew member objects
            current_tasks: List of current active tasks
            current_time: Current simulation time
            save_plot: Path to save the plot
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
        fig.suptitle(f'Real-Time Crew Status (Time: {current_time/3600:.1f} hours)', 
                    fontsize=16, fontweight='bold')
        
        # 1. Crew status overview
        status_counts = {}
        for crew in crew_members:
            status = crew.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        labels = list(status_counts.keys())
        values = list(status_counts.values())
        colors = [self.status_colors.get(label, self.colors['info']) for label in labels]
        
        wedges, texts, autotexts = ax1.pie(values, labels=labels, colors=colors, 
                                          autopct='%1.0f', startangle=90)
        ax1.set_title('Current Crew Status Distribution')
        
        # 2. Active tasks overview
        if current_tasks:
            task_priorities = [t.priority for t in current_tasks]
            task_types = [t.cleaning_type.value for t in current_tasks]
            
            # Priority distribution
            priority_counts = pd.Series(task_priorities).value_counts().sort_index()
            
            bars = ax2.bar(range(len(priority_counts)), priority_counts.values, 
                          color=self.colors['primary'], alpha=0.7)
            ax2.set_xlabel('Priority Level')
            ax2.set_ylabel('Number of Tasks')
            ax2.set_title('Active Tasks by Priority')
            ax2.set_xticks(range(len(priority_counts)))
            ax2.set_xticklabels(priority_counts.index)
            ax2.grid(True, alpha=0.3)
            
            # Add value labels
            for bar in bars:
                height = bar.get_height()
                ax2.text(bar.get_x() + bar.get_width()/2., height + 0.05,
                        f'{int(height)}', ha='center', va='bottom')
        else:
            ax2.text(0.5, 0.5, 'No active tasks', ha='center', va='center', 
                    transform=ax2.transAxes, fontsize=14)
            ax2.set_title('Active Tasks by Priority')
        
        plt.tight_layout()
        
        if save_plot:
            plt.savefig(save_plot, dpi=300, bbox_inches='tight')
            print(f"Real-time status saved to {save_plot}")
        else:
            plt.show() 