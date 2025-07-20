# Algorithm Description for Airport Restroom Flow MVP

This algorithm implements the MVP specification for generating time-series demand curves ("poop profiles") for two airport restrooms, each with gendered sections (Men’s and Women’s), based on passenger inflows from Arrivals and Departures, continuous flow assignment, and restroom service capacities.

---

## Inputs
- **Coordinates**: (x,y) for entry nodes (*E_dep*, *E_arr*) and restrooms (*R1*, *R2*).
- **Walking speed**: *v_walk* (m/s, constant).
- **Percent using restroom**: *α_arr* (Arrivals), *α_dep* (Departures).
- **Inflow curves**: *λ_arr(t)* (pax/s, Arrivals), *λ_dep(t)* (pax/s, Departures), with defined functional forms and time horizons.
- **Service rates**: *μ_M* (Men’s, pax/s), *μ_F = γ · μ_M* (Women’s, γ < 1).
- **Choice model parameters**: *β_walk* (s/m), *β_wait* (s/s), or *θ* (logit dispersion).
- **Simulation time step**: *∆t* (s).
- **Aircraft size**: *N_plane* (pax, e.g., 200).

---

## Outputs
- **Restroom arrival rates**: *λ_r(t)* for each restroom section (R1-M, R1-F, R2-M, R2-F) per *∆t*.
- **Queue lengths**: *L_r(t)* for each section per *∆t*.
- **Waiting times**: *w_r(t)* for each section per *∆t*.

---

## Algorithm Steps

1. **Initialization**:
   - Load parameters from JSON (coordinates, *v_walk*, *α_arr*, *α_dep*, *λ_arr(t)*, *λ_dep(t)*, *μ_M*, *μ_F*, *β_walk*, *β_wait*, *θ*, *∆t*, *N_plane*).
   - Initialize time horizon *T* based on inflow curves.
   - Set up arrays to store *λ_r(t)*, *L_r(t)*, *w_r(t)* for each restroom section (R1-M, R1-F, R2-M, R2-F).
   - Initialize queue states: *L_r(0) = 0* for all sections.

2. **Calculate Distances**:
   - Compute Euclidean distances *d(E, r)* from each entry node (*E_dep*, *E_arr*) to each restroom (*R1*, *R2*) using coordinates.

3. **Simulation Loop** (for each time step *t = 0, ∆t, 2∆t, ..., T*):
   - **Step 3.1: Compute Inflows**:
     - Evaluate *λ_arr(t)* and *λ_dep(t)* based on their functional forms (e.g., exponential for Arrivals, uniform for Departures).
     - Scale inflows by restroom usage: *λ_arr(t) · α_arr*, *λ_dep(t) · α_dep*.
   - **Step 3.2: Compute Waiting Times**:
     - For each restroom section (R1-M, R1-F, R2-M, R2-F):
       - Use current arrival rate *λ_r(t)* and service rate (*μ_M* or *μ_F*) in M/M/1 queue model.
       - Compute traffic intensity: *ρ_r = λ_r(t) / μ_r*.
       - Calculate probability of waiting: *P_wait = ρ_r / (1 + ρ_r)* (for M/M/1, s=1).
       - Compute waiting time: *w_r(t) = P_wait / (μ_r - λ_r(t))*, ensuring *λ_r(t) < μ_r* to avoid instability.
   - **Step 3.3: Compute Generalized Costs**:
     - For each entry node (*E_dep*, *E_arr*) and restroom (*R1*, *R2*):
       - Walking time: *t_walk = d(E, r) / v_walk*.
       - Generalized cost: *c_r(t) = β_walk · d(E, r) / v_walk + β_wait · w_r(t)*.
   - **Step 3.4: Assign Flows (User Equilibrium)**:
     - For each entry node’s scaled inflow (*λ_arr(t) · α_arr*, *λ_dep(t) · α_dep*):
       - Option 1 (Deterministic UE): Assign all flow to restroom with minimum *c_r(t)*.
       - Option 2 (Logit split): Compute probability *p_r = exp(-θ · c_r) / Σ_j exp(-θ · c_j)* and split flow proportionally.
       - Update *λ_r(t)* for each restroom section based on gender split (assume 50:50 for simplicity or use provided data).
   - **Step 3.5: Update Queues**:
     - For each restroom section:
       - Update queue length using forward Euler: *L_r(t + ∆t) = L_r(t) + ∆t · (λ_r(t) - μ_r · min(1, L_r(t) + 1))*, ensuring non-negative queues.
       - Store *λ_r(t)*, *L_r(t)*, *w_r(t)*.
   - **Step 3.6: Advance Time**:
     - Increment *t* by *∆t*.

4. **Output Generation**:
   - Save *λ_r(t)*, *L_r(t)*, *w_r(t)* for each restroom section as time-series data (e.g., CSV).
   - Optionally, generate visualizations (e.g., stacked area plots for *λ_r(t)*).

---

## Edge Cases
- If *λ_r(t) ≥ μ_r*, cap inflow or log warning to prevent queue explosion.
- If inflows cease, continue simulation until queues clear (*L_r(t) ≈ 0*).
- Validate coordinates to ensure non-negative distances.