# Multi-Floor Airport Restroom Flow Simulator

A **modular simulation framework** for analyzing passenger flow and restroom usage in multi-floor airport terminals.

```
Poop-profiles/
├── src/                           # Modular simulation library
│   ├── __init__.py               # Package initialization
│   ├── config_manager.py         # Configuration management
│   ├── flight_manager.py         # Flight scheduling & passenger flows
│   ├── movement_model.py         # 3D movement & travel calculations
│   ├── assignment_methods.py     # Passenger choice models
│   ├── queue_dynamics.py         # M/M/1 queue modeling
│   ├── visualization.py          # Plotting & analysis
│   └── simulator.py              # Main orchestrator
├── impl/                          # Implementation scripts
│   └── main.py                   # Main execution script
├── test/                          # Interactive testing
│   └── parameter_exploration.ipynb  # Jupyter notebook (not online still)
├── results/                       # Output files
│   ├── multi_floor_dashboard.png
│   ├── floor_analysis.png
│   ├── capacity_utilization.png
│   └── flight_impact.png
├── multi_floor_config.json       # JSON configuration file
├── requirements.txt               # Python dependencies
├── simulation_logic.markdown  # Algorithm specification
└── README.md                      # This file
```

## **Quick Start**

### 1. Installation

```bash
pip install -r requirements.txt
```

### 2. Run Simulation

```bash
python impl/main.py
```

This automatically:
- Loads configuration from `multi_floor_config.json` (you have to change the local dir by hand, look for config_path in main.py)
- Runs sample simulation with 3 floors, 5 restrooms, 3 flights
- Generates comprehensive analysis plots
- Saves results to `results/` directory

### 3. Interactive Exploration (not online)

```bash
jupyter notebook test/parameter_exploration.ipynb
```