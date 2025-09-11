# airport_dashboard_app.py
"""
Patched: wrap controls into an expander, add "Run simulation" button that runs ./impl/main.py,
and display ./results/bathroom_usage_dashboard.png in a separate expander.
All original functionality preserved.
"""

import json
from pathlib import Path
from typing import Dict, Any, List

import streamlit as st
import plotly.graph_objects as go

# --- Added imports for the simulation button / result display ---
import subprocess
import sys
from PIL import Image
import time
import os

# -----------------------------
# Helpers
# -----------------------------

def load_config_from_source() -> Dict[str, Any]:
    """
    Load the JSON config either from an uploaded file or fall back
    to a default path 'multi_floor_config.json' in the working dir.
    """
    st.sidebar.markdown("### Data Source")
    uploaded = st.sidebar.file_uploader("Upload multi_floor_config.json", type=["json"])

    if uploaded is not None:
        data = json.load(uploaded)
        st.sidebar.success("Loaded JSON from uploaded file.")
        return data

    # Fallback to default path (useful when running locally and file already exists)
    default_path = Path("multi_floor_config.json")
    if default_path.exists():
        with open(default_path, "r") as f:
            data = json.load(f)
        st.sidebar.info(f"Loaded JSON from {default_path.resolve()}")
        return data

    st.sidebar.error("No JSON found. Please upload multi_floor_config.json.")
    st.stop()


def extract_points(data: Dict[str, Any]):
    """Extract floors, gates, restrooms, gate->entry mapping, and flights into convenient lists."""
    floors = data.get("floors", [])
    restrooms = data.get("restrooms", {})
    entry_points = data.get("entry_points", {})
    gate_map = data.get("gate_mappings", {})
    flights = data.get("flights", {})

    # Build gate list with coordinates
    gates: List[Dict[str, Any]] = []
    for gate_code, entry_name in gate_map.items():
        ep = entry_points.get(entry_name)
        if ep is None:
            continue
        gates.append(
            {
                "gate_code": gate_code,
                "entry_name": entry_name,
                "floor": ep.get("floor"),
                "x": ep.get("x"),
                "y": ep.get("y"),
            }
        )

    # Build restroom list
    washrooms: List[Dict[str, Any]] = []
    for r_id, r in restrooms.items():
        washrooms.append(
            {
                "restroom_id": r_id,
                "floor": r.get("floor"),
                "x": r.get("x"),
                "y": r.get("y"),
                "capacity_M": r.get("capacity_M"),
                "capacity_F": r.get("capacity_F"),
            }
        )

    # Arrivals list (flights with flow_type == 'deplaning')
    arrivals: List[Dict[str, Any]] = []
    for flight_id, info in flights.items():
        if str(info.get("flow_type", "")).lower() == "deplaning":
            arrivals.append(
                {
                    "flight": flight_id,
                    "passengers": info.get("passengers", 0),
                    "arrival_time": info.get("arrival_time", 0),
                    "gate": info.get("gate"),
                }
            )

    # Fallback floors if not provided
    if not floors:
        floors = sorted({g["floor"] for g in gates if g.get("floor") is not None} |
                        {w["floor"] for w in washrooms if w.get("floor") is not None})

    return floors, gates, washrooms, arrivals


def floor_map_figure(gates, washrooms, selected_floor: Any) -> go.Figure:
    """Create a Plotly scatter figure for the selected floor."""
    fig = go.Figure()

    # Gates on this floor
    gf = [g for g in gates if g.get("floor") == selected_floor]
    if gf:
        fig.add_trace(
            go.Scatter(
                x=[g["x"] for g in gf],
                y=[g["y"] for g in gf],
                mode="markers+text",
                text=[g["gate_code"] for g in gf],
                textposition="top center",
                name="Gates",
                marker=dict(size=12, symbol="triangle-up"),
                hovertemplate="Gate %{text}<br>(%{x}, %{y})<extra></extra>",
            )
        )

    # Washrooms on this floor
    wf = [w for w in washrooms if w.get("floor") == selected_floor]
    if wf:
        fig.add_trace(
            go.Scatter(
                x=[w["x"] for w in wf],
                y=[w["y"] for w in wf],
                mode="markers+text",
                text=[w["restroom_id"] for w in wf],
                textposition="bottom center",
                name="Washrooms",
                marker=dict(size=10, symbol="circle"),
                hovertemplate=(
                    "Washroom %{text}<br>(%{x}, %{y})"
                    "<br>M: %{customdata[0]} F: %{customdata[1]}<extra></extra>"
                ),
                customdata=[
                    [w.get("capacity_M", "—"), w.get("capacity_F", "—")] for w in wf
                ],
            )
        )

    fig.update_layout(
        title=f"Floor {selected_floor} — Gates & Washrooms",
        xaxis_title="X",
        yaxis_title="Y",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=40, r=40, t=60, b=40),
        height=600,
    )

    # lock aspect ratio
    fig.update_yaxes(scaleanchor="x", scaleratio=1)
    fig.update_xaxes(constrain="domain")
    # --- Add black dashed rectangle overlay (diagonal vertices (-5, -15) and (205, 40)) ---
    try:
        fig.add_shape(
            type="rect",
            x0=-5, y0=-15, x1=205, y1=40,
            xref="x", yref="y",
            line=dict(color="black", width=2, dash="dash"),
            fillcolor="rgba(0,0,0,0)",
            layer="above",
        )
    except Exception:
        # If adding shapes fails for any reason, continue without blocking the figure rendering.
        pass

    return fig


def arrivals_bar_figure(arrivals, selected_floor, gates) -> go.Figure:
    """Create a bar chart of arrivals. Allow optional filtering by selected floor based on gate->floor mapping."""
    # Build a gate->floor dict for filtering
    gate_floor = {g["gate_code"]: g.get("floor") for g in gates}

    st.sidebar.markdown("### Arrivals Filters")
    filter_to_floor = st.sidebar.checkbox("Show only flights arriving to selected floor", value=False)

    data = arrivals
    if filter_to_floor:
        data = [a for a in arrivals if gate_floor.get(a.get("gate")) == selected_floor]

    # Sort by arrival_time
    data = sorted(data, key=lambda d: d.get("arrival_time", 0))

    flights = [d["flight"] for d in data]
    counts = [d.get("passengers", 0) for d in data]
    gate_labels = [d.get("gate", "") for d in data]

    fig = go.Figure(
        data=[
            go.Bar(
                x=flights,
                y=counts,
                text=[f"{c}\n({g})" if g else f"{c}" for c, g in zip(counts, gate_labels)],
                textposition="outside",
                hovertemplate="Flight %{x}<br>Passengers: %{y}<br>Gate: %{customdata}<extra></extra>",
                customdata=gate_labels,
                name="Arrivals",
            )
        ]
    )

    subtitle = f"(Filtered to Floor {selected_floor})" if filter_to_floor else "(All deplaning flights)"
    fig.update_layout(
        title=f"Arrivals (Passengers) per Flight {subtitle}",
        xaxis_title="Flight",
        yaxis_title="Passengers",
        margin=dict(l=40, r=40, t=60, b=40),
        height=500,
    )
    return fig


# -----------------------------
# Streamlit UI
# -----------------------------

st.set_page_config(page_title="Parameter Exploration", layout="wide")
st.title("Parameter Exploration Dashboard")
st.caption("Visualize gates, washrooms, and arrivals from a multi-floor configuration JSON.")

data = load_config_from_source()
floors, gates, washrooms, arrivals = extract_points(data)

# -----------------------------
# Editable numeric config UI (ADDED)
# -----------------------------
# Expose numeric keys in 'choice_params' and 'simulation' as number_input fields in the sidebar.
# Whenever a value changes, save the full config to './multi_floor_config.json' (UTF-8).
CONFIG_SAVE_PATH = Path("multi_floor_config.json")

def _is_number_like(x):
    try:
        if isinstance(x, (int, float)):
            return True
        float(x)
        return True
    except Exception:
        return False

def _cast_like(original, val):
    try:
        if isinstance(original, int) and not isinstance(original, bool):
            return int(round(val))
        else:
            return float(val)
    except Exception:
        return val

# Prepare editable copy in session state
if "editable_config" not in st.session_state:
    st.session_state.editable_config = json.loads(json.dumps(data))

edited = st.session_state.editable_config
config_changed = False

with st.sidebar.expander("Edit config: numeric params", expanded=False):
    st.markdown("Edit numeric values in the **choice_params** and **simulation** sections. Changes are saved to `multi_floor_config.json` and will be used by the simulation.")
    for section in ("choice_params", "simulation"):
        section_obj = edited.get(section, None)
        if section_obj is None:
            st.info(f"No `{section}` section found in the loaded JSON.")
            continue
        if not isinstance(section_obj, dict):
            st.warning(f"`{section}` exists but is not an object/dict in the JSON; skipping.")
            continue

        st.markdown(f"**{section}**")
        for key, orig_val in section_obj.items():
            input_key = f"cfg__{section}__{key}"
            if _is_number_like(orig_val):
                try:
                    default_numeric = int(orig_val) if isinstance(orig_val, int) else float(orig_val)
                except Exception:
                    try:
                        default_numeric = float(orig_val)
                    except Exception:
                        st.write(f"Skipping non-numeric value for {section}.{key}")
                        continue

                step = 1 if isinstance(orig_val, int) and not isinstance(orig_val, bool) else 0.01
                val = st.number_input(f"{section}.{key}", value=default_numeric, step=step, key=input_key)
                new_val = _cast_like(orig_val, val)
                # Compare as strings to handle float repr differences
                if str(new_val) != str(orig_val):
                    edited.setdefault(section, {})[key] = new_val
                    config_changed = True
            else:
                st.write(f"{key}: {orig_val} (non-numeric — not editable)")

# Save updated config if changed
if config_changed:
    try:
        with open(CONFIG_SAVE_PATH, "w", encoding="utf-8") as f:
            json.dump(edited, f, indent=2, ensure_ascii=False)
        st.sidebar.success(f"Config saved to {CONFIG_SAVE_PATH.resolve()}")
        # update in-memory data and derived objects for this run
        data = edited
        floors, gates, washrooms, arrivals = extract_points(data)
    except Exception as exc:
        st.sidebar.error(f"Failed to save config to {CONFIG_SAVE_PATH}: {exc}")
# -----------------------------

# -----------------------------
# Simulation constants & helper
# -----------------------------
SIM_SCRIPT = Path("impl") / "main.py"
RESULT_IMAGE = Path("results") / "bathroom_usage_dashboard.png"
SIM_TIMEOUT_SECONDS = 300  # seconds

def run_simulation_script(timeout: int = SIM_TIMEOUT_SECONDS):
    """Run the simulation script using the same python interpreter that runs Streamlit.
    Ensures the child Python process uses UTF-8 for stdout/stderr to avoid Windows encoding errors
    when the child prints Unicode characters (e.g., emojis).
    """
    if not SIM_SCRIPT.exists():
        return {"ok": False, "error": f"Simulation script not found: {SIM_SCRIPT.resolve()}"}
    cmd = [sys.executable, str(SIM_SCRIPT)]
    # Force the child Python to run in UTF-8 mode so prints of unicode (emoji) won't fail
    env = os.environ.copy()
    # Prefer PYTHONUTF8=1 (turns on UTF-8 mode). Also set PYTHONIOENCODING as a fallback.
    env.setdefault("PYTHONUTF8", "1")
    env.setdefault("PYTHONIOENCODING", "utf-8")
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
        return {"ok": proc.returncode == 0, "returncode": proc.returncode, "stdout": proc.stdout, "stderr": proc.stderr}
    except subprocess.TimeoutExpired as exc:
        return {"ok": False, "error": f"Simulation timed out after {timeout} seconds", "stdout": getattr(exc, "stdout", ""), "stderr": getattr(exc, "stderr", "")}
    except Exception as exc:
        return {"ok": False, "error": f"Exception when running simulation: {exc}"}

# --- Sidebar Run Simulation button (added) ---
# Adds a minimal sidebar control that runs the same simulation script without changing other UI.
if "sim_running" not in st.session_state:
    st.session_state.sim_running = False

with st.sidebar:
    st.markdown("### Simulation")
    if st.button("Run simulation (runs ./impl/main.py)", key="sidebar_run_sim", disabled=st.session_state.sim_running):
        st.session_state.sim_running = True
        with st.spinner("Running simulation from sidebar..."):
            result = run_simulation_script()
            # show logs in a sidebar expander
            with st.expander("Simulation logs (stdout / stderr)", expanded=True):
                if result.get("stdout"):
                    st.text("=== STDOUT ===")
                    st.text(result.get("stdout"))
                if result.get("stderr"):
                    st.text("=== STDERR ===")
                    st.text(result.get("stderr"))
                if result.get("error"):
                    st.error(result.get("error"))
            # show success / failure in sidebar
            if result.get("ok"):
                st.sidebar.success("Simulation finished successfully.")
            else:
                if "returncode" in result:
                    st.sidebar.error(f"Simulation exited with return code {result.get('returncode')}")
                elif "error" in result:
                    st.sidebar.error(result.get("error"))
        st.session_state.sim_running = False
# --- end sidebar button ---

# Keep controls but move them into an expander (no deletions)
with st.expander("Controls", expanded=False):
    # replicate original control layout exactly
    col1, col2 = st.columns([2, 1])
    with col1:
        st.subheader("Controls")
    with col2:
        pass

    selected_floor = st.selectbox("Select Floor", options=floors, index=0, help="Choose a single floor to display on the map.")

    # --- Run simulation button (inside controls expander) ---
    if "sim_running" not in st.session_state:
        st.session_state.sim_running = False
    run_col, status_col = st.columns([1, 3])
    with run_col:
        run_button = st.button("Run simulation (runs ./impl/main.py)", disabled=st.session_state.sim_running)

    with status_col:
        if st.session_state.sim_running:
            st.info("Simulation is running...")
        elif RESULT_IMAGE.exists():
            st.write(f"Result image exists: {RESULT_IMAGE} (last modified {time.ctime(RESULT_IMAGE.stat().st_mtime)})")

    if run_button and not st.session_state.sim_running:
        st.session_state.sim_running = True
        with st.spinner("Running simulation..."):
            result = run_simulation_script()
            # show logs
            with st.expander("Simulation logs (stdout / stderr)", expanded=True):
                if "stdout" in result and result["stdout"]:
                    st.text("=== STDOUT ===")
                    st.text(result["stdout"])
                if "stderr" in result and result["stderr"]:
                    st.text("=== STDERR ===")
                    st.text(result["stderr"])
                if "error" in result and result["error"]:
                    st.error(result["error"])

            # After run, show a quick success/error message
            if result.get("ok"):
                st.success("Simulation finished successfully.")
            else:
                if "returncode" in result:
                    st.error(f"Simulation exited with return code {result.get('returncode')}")
                elif "error" in result:
                    st.error(result.get("error"))

        st.session_state.sim_running = False

# Tabs for Map and Arrivals (unchanged)
tab1, tab2 = st.tabs(["🗺️ Floor Map", "🛬 Arrivals"])

with tab1:
    st.plotly_chart(floor_map_figure(gates, washrooms, selected_floor), use_container_width=True)

with tab2:
    st.plotly_chart(arrivals_bar_figure(arrivals, selected_floor, gates), use_container_width=True)

# --- New expander to display the generated PNG (per your request) ---
with st.expander("Simulation result image (bathroom_usage_dashboard.png)", expanded=False):
    if RESULT_IMAGE.exists():
        try:
            img = Image.open(RESULT_IMAGE)
            st.image(img, caption=str(RESULT_IMAGE), use_column_width=True)
        except Exception as exc:
            st.error(f"Failed to open result image: {exc}")
    else:
        st.info(f"No result image found at {RESULT_IMAGE}. Run the simulation to produce it.")

# Optional: quick data peeks (unchanged)
with st.expander("Show raw parsed data (debug)"):
    st.write("Floors:", floors)
    st.write("Gates (resolved to coordinates):", gates)
    st.write("Washrooms:", washrooms)
    st.write("Arrivals (deplaning flights):", sorted(arrivals, key=lambda d: d.get("arrival_time", 0)))
