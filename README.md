✨✨Explaination of the project✨✨

1. High-level idea

Goal:
Give the section controller an AI co-pilot that:

Looks at all trains in the Nadiad–Anand section

Detects conflicts and inefficiencies

Proposes concrete, explainable actions (who to hold, who to let go)

Lets the human controller change rules and override decisions

Shows impact via KPIs and logs

Under the hood it’s a simplified decision-support prototype, not a full optimizer, but the workflow matches what Indian Railways actually needs: precedence decisions, conflict resolution, disruption handling, and continuous monitoring.

2. Data & core engine (conceptual)
Train model

Each train in the section is represented with:

number – Train ID (e.g., 12928)

type – express, passenger, freight

priority – high / medium / low (for narrative)

direction – up (Nadiad → Anand) or down (Anand → Nadiad)

status – running, waiting, halted, completed

position – scalar along the line (100 = Nadiad, 900 = Anand)

delayMinutes – current delay

problem – textual reason (fog, signal failure, etc.)

This acts as the local “section database” that the AI engine continuously reads and updates.

AI scoring function (simple OR/AI heuristic)

To decide precedence, the engine computes a priority score for each train:

score = baseWeight(type) + delayMinutes × delaySensitivity

where:

baseWeight(type) is controlled by the Priority Rules sliders

delaySensitivity is also configurable

So if you increase Express weight or Delay weight, the engine will automatically favour:

express over passenger/freight

more delayed trains over on-time ones

This is a simplified, configurable approximation of a multi-criteria priority function, which could later be replaced by a full OR/ML model.

Conflict detection logic

Every simulation tick (1 second), the engine:

Updates train positions (based on type and disruptions).

Computes priority scores.

Detects:

Head-on conflicts:
Up-train and down-train on the same main segment, distance < threshold.

Blocking conflicts:
Slow freight ahead of an express within a small headway margin.

For each such pattern, it creates a recommendation:

Hold or divert the lower-scored train

Let the higher-scored train get precedence

This is exactly the “who should wait for whom” decision the problem statement talks about.

3. UI walkthrough module by module
3.1 Header & Section Overview

What it is:

Header shows:

Product name: RailFlow AI

Section: Nadiad – Anand

Real-time clock

Status badges (“Real-time decision support”, “Section controller view”)

Below it, a static section strip:

Nadiad → Kanjari → Uttarsanda → Ode → Anand

Pills showing:

Active trains

Conflicts

Mode: Simulation / Paused

Why it matters for the problem:

Immediately shows which section and what state we are in.

Replaces the old jittery visualizer with a clean, reliable overview.

Directly answers: “What part of the network is the AI controlling right now?”

3.2 Hero Panel – “AI Optimization Recommendations”

This is the primary decision surface.

Top row:

Title: “AI Optimization Recommendations”

Short subtitle: “Top actions for precedence, crossings, and holds”

Hero summary chips on the right:

Conflicts (from conflict detector)

Avg delay (section-wide)

On-time %

These three numbers give a single-glance health check.

Main content: list of recommendations

Each recommendation card contains:

Action
e.g. Hold/Divert freight 8877F to loop, Prioritize departure: 12267, Resume journey: 4321F

Justification (short)
e.g. Conflict with Express 22915 near Uttarsanda.

Impact summary
e.g. Avoids conflict and large delay ripple.

Buttons:

Accept (Apply AI recommendation → updates train status/problem)

Override (Reject it but still log the decision)

Top 1–2 cards get a slightly stronger border to visually show “these are most important”.

Why it matters:

Directly implements “decision-support system” and “clear recommendations + explanations + override” from the Expected Solution.

It’s not hiding the logic: the text explicitly mentions which trains, what location, and why.

Accepting a recommendation actually changes the simulated state, so you can show “before vs after” behaviour.

3.3 KPIs – “Section snapshot”

Metrics shown:

Trains / hour (kpi-throughput)

Average delay (min) (kpi-delay)

Track utilization (%) (kpi-utilization)

Active conflicts (kpi-conflicts)

On-time (≤ 5 min) (kpi-punctuality)

Each KPI card has:

Label

Big numeric value

A small micro-bar below (visual indication):

Throughput: higher is better

Delay: bar fills inversely (lower delay → more green)

Utilization: bar reflects percentage

Conflicts: bar reflects number of conflicts (bad when high)

On-time: bar shows fraction of punctual trains

Why it matters:

This corresponds to:

“Maximize section throughput”

“Minimize overall train travel time”

“Utilization of railway infrastructure”

“Punctuality, average delay, throughput, utilization KPIs”

You can literally point a judge to this and say:
“This is the controller’s high-level dashboard for the section.”

3.4 Priority Rule Editor – “Tune AI decision weights”

Sliders:

Express weight

Passenger weight

Freight weight

Delay weight / min

How it works:

Changing a slider:

Updates the priorityRules object.

Recomputes the score for each train:

score = baseWeight(type) + delay × delayWeight

Re-runs conflict detection and recommendation generation.

Example explanation you can give in judging:

“If IR wants to prioritise time-sensitive freight corridors, they can increase the Freight weight so freight trains are not always sacrificed.”

“If policy says very delayed trains must be cleared first, increase Delay weight and the AI will start recommending priority departures for those trains.”

Why it matters:

Demonstrates policy configurability, not a black-box AI.

Directly supports:
“Model constraints, train priorities, operational rules” with a configurable rule layer.

Also supports: “Controllers can override and tune logic”.

3.5 Train Roster – “All trains in this section”

Capabilities:

Search bar – search by:

Train number

Type

Location (Nadiad, Kanjari, etc.)

Filters:

Type: All / Express / Passenger / Freight

Direction: All / Up / Down

Status: All / Running / Waiting / Halted / Completed

Sortable columns (click column headers):

Train

Type

Dir

Status

Delay

Position (converted to location label)

Rows show:

Train number

Type (Express/Passenger/Freight)

Direction (Up/Down)

Status chip with colour:

Running → green

Waiting → yellow

Halted → red-ish

Completed → grey

Delay in minutes

Location (getTrainLocation(position) = Nadiad, Kanjari, Uttarsanda, Ode, Anand)

Why it matters:

This is the controller’s mental map in table form.

When a recommendation says
“Hold freight 8877F near Uttarsanda”,
you can immediately cross-check in the roster:

Where is it?

How delayed is it?

What’s its status?

This addresses:
“Coordinating movements across spatial and temporal dimensions” and “train precedence and crossings”.

3.6 Event Log – “AI Event Log (Audit Trail)”

Each log entry stores:

Time

Type:

SYSTEM – baseline load, reset, scenario clear

AI – AI-detected events, arrivals, flow control

OPERATOR – rule changes, accept/override actions

Message – short, readable text

Only the latest ~20 logs are rendered to avoid clutter.

Examples:

SYSTEM – “Baseline timetable loaded (12 trains).”

AI – “Train 12928 arrived at Anand.”

OPERATOR – “Priority weights updated.”

Why it matters:

Directly maps to “Include audit trails”.

Demonstrates accountability and explainability:

You can point to exactly which recommendations were accepted or overridden.

In a production system, this is crucial for safety and post-incident analysis.

3.7 System & Scenarios – “Integration and What-if”

This panel has two parts.

a) System & Data Feeds (mock integration)

Statuses:

Signalling – Simulated

TMS / Timetable – Simulated

Rolling Stock – Placeholder

AI Engine – Online

These are mocked, but represent where:

Block section states

Timetables

Coach/loco information

ML/OR models

would plug into the system, likely via secure APIs.

This directly ties into:

“Integrate with existing railway control systems and data sources (signalling, TMS, timetables, rolling stock status) via secure APIs.”

We’re showing an integration-ready UI, even if the backend is simulated for the hackathon.

b) Quick Scenarios (What-if analysis)

Buttons:

Heavy fog (Up express)
→ Adds delay and “fog” problem to affected express trains.

Signal failure (Ode)
→ Halts trains around Ode segment.

Maintenance (Uttarsanda)
→ Puts trains to “waiting” near that area.

Clear all
→ Restore baseline train data.

What happens when you click:

The scenario mutates the trains state (delay, status, problem).

The AI engine immediately re-runs conflict detection and recommendations.

KPIs update (delay, conflicts, on-time %).

Event log records the scenario.

Why it matters:

This is exactly the “what-if simulation and scenario analysis” requirement:

Add disruptions

See how the section behaves

See how AI recommends new precedence and holding strategies

Demonstrates rapid re-optimisation under disruptions (within our simplified logic).

4. How this solution answers the SIH problem statement

Let me map it line-by-line to the “Expected Solution”.

4.1 “Leverage operations research and AI to model constraints, train priorities, and operational rules”

We use a priority scoring function:

baseWeight(type) + delay × delayWeight

Configurable via the Priority Rules sliders.

We model:

Train categories (express, passenger, freight)

Directions

Status (running/waiting/halted/completed)

Section positions mapping to Nadiad–Anand

Conflicts are resolved based on priority score, approximating OR logic.

Clearly indicated human override on each recommendation.

4.2 “Maximize section throughput and minimize overall train travel time, with ability to re-optimize rapidly”

Throughput, delay, utilization, conflicts are computed continuously in KPIs.

Accepting recommendations (e.g., divert blocking freight to loop) simulates:

Better utilization

Reduced delays on expresses

When scenarios are applied (fog, signal failure, maintenance), the AI engine immediately recomputes:

Recommendations

KPIs

You can demonstrate:

“Before” scenario: low delay/low conflicts

“After disruption”: delay and conflicts spike

“After accepting AI actions”: metrics improve again

4.3 “Support what-if simulation and scenario analysis”

Clear scenario triggers:

Heavy fog

Signal failure

Maintenance block

Reset

Each scenario changes train states, and the rest of the system reacts:

New recommendations

Different train statuses

Updated KPIs and event log

4.4 “Provide a user-friendly interface with clear recommendations, explanations, and override capabilities”

Hero AI panel is the central feature:

Each recommendation is actionable, human-readable.

Reason and impact are shown.

“Accept” and “Override” actions are explicit.

Roster and KPIs let the controller validate AI’s suggestions quickly.

Priority Rules sliders act as an intuitive “dial” instead of raw config files.

4.5 “Integrate with existing railway control systems and data sources via secure APIs”

Current hackathon implementation uses simulated feeds but:

The UI already surfaces Signalling, TMS, Rolling Stock, AI Engine as distinct modules.

Each feed has a clear status (simulated/placeholder/online), so real APIs can be wired in later.

Conceptually, you would replace the local trains array with:

Data from TMS/signalling (section occupancy, actual delays)

Rolling stock conditions

The same logic/UI would then operate on real-time data.

4.6 “Include audit trails, performance dashboards, and KPIs”

Performance dashboard: KPI card cluster + hero summary.

Audit trail: Event log with typed entries (SYSTEM, AI, OPERATOR).

Together, they give:

Historical view of actions taken

Performance metrics for continuous improvement
