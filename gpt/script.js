// Global variables
let trains = [];
let initialTrainData = [];
let recommendations = [];
let eventLog = [];
let simulationRunning = false;

// Priority rules (editable from UI)
let priorityRules = {
    express: 3,
    passenger: 2,
    freight: 1,
    delaySensitivity: 0.1,
};

// Roster filters / sort state
let rosterFilters = {
    search: '',
    type: 'all',
    direction: 'all',
    status: 'all',
};

let rosterSort = {
    key: 'number',
    asc: true,
};

let movementInterval = null;

// DOM Elements
const datetimeDisplay = document.getElementById('datetime-display');

// KPI elements
const kpiThroughput = document.getElementById('kpi-throughput');
const kpiDelay = document.getElementById('kpi-delay');
const kpiUtilization = document.getElementById('kpi-utilization');
const kpiConflicts = document.getElementById('kpi-conflicts');
const kpiPunctuality = document.getElementById('kpi-punctuality');

// KPI bar elements
const kpiThroughputBar = document.getElementById('kpi-throughput-bar');
const kpiDelayBar = document.getElementById('kpi-delay-bar');
const kpiUtilizationBar = document.getElementById('kpi-utilization-bar');
const kpiConflictsBar = document.getElementById('kpi-conflicts-bar');
const kpiPunctualityBar = document.getElementById('kpi-punctuality-bar');

// Hero summary elements
const heroConflicts = document.getElementById('hero-conflicts');
const heroDelay = document.getElementById('hero-delay');
const heroPunctuality = document.getElementById('hero-punctuality');

// Section overview
const overviewActiveTrains = document.getElementById('overview-active-trains');
const overviewConflicts = document.getElementById('overview-conflicts');
const overviewMode = document.getElementById('overview-mode');

const recommendationsContainer = document.getElementById('recommendations-container');
const eventLogContainer = document.getElementById('event-log-container');
const aiSimulateBtn = document.getElementById('ai-simulate-btn');
const resetDataBtn = document.getElementById('reset-data-btn');
const scenarioControls = document.getElementById('scenario-controls');

// Roster DOM
const trainRosterBody = document.getElementById('train-roster-body');
const trainSearchInput = document.getElementById('train-search-input');
const filterType = document.getElementById('filter-type');
const filterDirection = document.getElementById('filter-direction');
const filterStatus = document.getElementById('filter-status');

// Priority editor DOM
const ruleExpressInput = document.getElementById('rule-express');
const rulePassengerInput = document.getElementById('rule-passenger');
const ruleFreightInput = document.getElementById('rule-freight');
const ruleDelayInput = document.getElementById('rule-delay');
const ruleExpressValue = document.getElementById('rule-express-value');
const rulePassengerValue = document.getElementById('rule-passenger-value');
const ruleFreightValue = document.getElementById('rule-freight-value');
const ruleDelayValue = document.getElementById('rule-delay-value');

function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadInitialAITrainData();
    setupEventListeners();
    initPriorityEditor();
    startAISimulation();
}

// Local Database: Load initial train data
function loadInitialAITrainData() {
    initialTrainData = [
        { id: 1, number: '12928', type: 'express', priority: 'high', direction: 'up', status: 'running', position: 250, delayMinutes: 5, problem: "High-priority train running 5 min late, approaching Kanjari.", lastUpdate: "10:30:00" },
        { id: 2, number: '59048', type: 'passenger', priority: 'medium', direction: 'up', status: 'waiting', position: 100, delayMinutes: 0, problem: "Waiting at Nadiad for clearance. Potential conflict with 12928.", lastUpdate: "10:30:00" },
        { id: 3, number: '4321F', type: 'freight', priority: 'low', direction: 'down', status: 'halted', position: 750, delayMinutes: 10, problem: "Halted at Ode loop line due to signal issue (AI should hold it for priority trains).", lastUpdate: "10:28:00" },
        { id: 4, number: '19012', type: 'express', priority: 'high', direction: 'down', status: 'running', position: 800, delayMinutes: 2, problem: "Approaching Ode. Scheduled to meet 12928 near Uttarsanda.", lastUpdate: "10:30:00" },
        { id: 5, number: '22915', type: 'express', priority: 'high', direction: 'up', status: 'running', position: 400, delayMinutes: 15, problem: "Heavy fog reported ahead. Speed restricted to 30km/h.", lastUpdate: "10:25:00" },
        { id: 6, number: '69101', type: 'passenger', priority: 'medium', direction: 'down', status: 'running', position: 650, delayMinutes: 0, problem: "Running on time. Must be prioritized after Express trains.", lastUpdate: "10:29:00" },
        { id: 7, number: '8877F', type: 'freight', priority: 'low', direction: 'up', status: 'running', position: 550, delayMinutes: 0, problem: "Slow moving. Blocking 22915 behind it.", lastUpdate: "10:29:00" },
        { id: 8, number: '12267', type: 'express', priority: 'high', direction: 'down', status: 'waiting', position: 900, delayMinutes: 45, problem: "45+ min late due to earlier maintenance. Needs re-slotting.", lastUpdate: "10:20:00" },
        { id: 9, number: '3344F', type: 'freight', priority: 'low', direction: 'up', status: 'running', position: 450, delayMinutes: 5, problem: "Freight near Uttarsanda. Should yield to express.", lastUpdate: "10:30:00" },
        { id: 10, number: '59049', type: 'passenger', priority: 'medium', direction: 'down', status: 'running', position: 350, delayMinutes: 0, problem: "On same segment as 12928 in opposing direction.", lastUpdate: "10:30:00" },
        { id: 11, number: '9901X', type: 'freight', priority: 'low', direction: 'down', status: 'waiting', position: 900, delayMinutes: 0, problem: "Waiting at Anand. Slot only after 12267 departs.", lastUpdate: "10:30:00" },
        { id: 12, number: '12952', type: 'express', priority: 'high', direction: 'up', status: 'running', position: 50, delayMinutes: 0, problem: "Entering section. Needs clear path.", lastUpdate: "10:30:00" }
    ];

    trains = JSON.parse(JSON.stringify(initialTrainData));

    addEventLog('Baseline timetable loaded (12 trains).', 'system');
    renderTrainRoster();
    updateKPIs();
}

// Reset Data
function resetData() {
    if (simulationRunning) {
        toggleAISimulation();
    }
    trains = JSON.parse(JSON.stringify(initialTrainData));
    eventLog = [];
    recommendations = [];

    addEventLog('Scenario reset to baseline.', 'system');
    renderTrainRoster();
    renderRecommendations();
    updateKPIs();
    startAISimulation();
}

// AI simulation loop
function startAISimulation() {
    if (simulationRunning && movementInterval) {
        clearInterval(movementInterval);
    }

    simulationRunning = true;
    aiSimulateBtn.textContent = 'AI Simulating… (Stop)';
    aiSimulateBtn.style.backgroundColor = 'var(--accent-red)';
    updateOverviewMode();

    addEventLog('AI simulation started.', 'ai');

    movementInterval = setInterval(() => {
        let allTrainsFinished = true;

        trains.forEach(train => {
            if (train.status === 'running') {
                const baseSpeed = getTrainSpeed(train.type);
                let currentSpeed = baseSpeed;

                if (train.problem && train.problem.toLowerCase().includes('fog')) {
                    currentSpeed = baseSpeed * 0.5;
                }

                if (train.direction === 'up') {
                    train.position += currentSpeed;
                    if (train.position >= 900) {
                        train.status = 'completed';
                        addEventLog(`Train ${train.number} arrived at Anand.`, 'ai');
                    }
                } else {
                    train.position -= currentSpeed;
                    if (train.position <= 100) {
                        train.status = 'completed';
                        addEventLog(`Train ${train.number} arrived at Nadiad.`, 'ai');
                    }
                }
            }

            if (train.status !== 'completed') {
                allTrainsFinished = false;
            }
        });

        generateRecommendations();
        renderTrainRoster();
        updateKPIs();

        if (allTrainsFinished) {
            clearInterval(movementInterval);
            simulationRunning = false;
            aiSimulateBtn.textContent = 'AI Simulation Finished';
            aiSimulateBtn.style.backgroundColor = 'var(--accent-blue)';
            updateOverviewMode();
            addEventLog('All trains in this scenario have cleared the section.', 'ai');
        }
    }, 1000);
}

function toggleAISimulation() {
    if (simulationRunning) {
        clearInterval(movementInterval);
        simulationRunning = false;
        aiSimulateBtn.textContent = 'Start AI Simulation';
        aiSimulateBtn.style.backgroundColor = 'var(--accent-blue)';
        updateOverviewMode();
        addEventLog('AI simulation paused.', 'operator');
    } else {
        startAISimulation();
    }
}

// Priority score computation
function computePriorityScore(train) {
    let base;
    switch (train.type) {
        case 'express':
            base = priorityRules.express;
            break;
        case 'passenger':
            base = priorityRules.passenger;
            break;
        case 'freight':
        default:
            base = priorityRules.freight;
            break;
    }
    const delayComponent = (train.delayMinutes || 0) * priorityRules.delaySensitivity;
    return base + delayComponent;
}

// Generate AI recommendations
function generateRecommendations() {
    recommendations = [];
    const runningTrains = trains.filter(t => t.status === 'running' && t.status !== 'completed');
    let conflictsDetected = 0;

    const upTrains = runningTrains.filter(t => t.direction === 'up' && t.position < 850);
    const downTrains = runningTrains.filter(t => t.direction === 'down' && t.position > 150);

    // Head-on conflicts
    upTrains.forEach(upTrain => {
        downTrains.forEach(downTrain => {
            const distance = downTrain.position - upTrain.position;
            if (distance > 0 && distance < 300) {
                conflictsDetected++;

                const upScore = computePriorityScore(upTrain);
                const downScore = computePriorityScore(downTrain);

                const higherPriorityTrain = upScore >= downScore ? upTrain : downTrain;
                const lowerPriorityTrain = higherPriorityTrain === upTrain ? downTrain : upTrain;

                recommendations.push({
                    id: Date.now() + Math.floor(Math.random() * 1000) + lowerPriorityTrain.id,
                    action: `Hold/Divert ${lowerPriorityTrain.type} ${lowerPriorityTrain.number}`,
                    justification: `Conflict with ${higherPriorityTrain.type} ${higherPriorityTrain.number} near ${getTrainLocation(lowerPriorityTrain.position)}.`,
                    impact: 'Safety Critical'
                });
            }
        });
    });

    // Overtaking / blocking conflicts
    upTrains.filter(t => t.type === 'freight' && t.position > 200).forEach(slowTrain => {
        const fastTrainBehind = upTrains.find(fast =>
            fast.id !== slowTrain.id &&
            fast.type === 'express' &&
            slowTrain.position - fast.position < 150 &&
            slowTrain.position > fast.position
        );

        if (fastTrainBehind) {
            const slowScore = computePriorityScore(slowTrain);
            const fastScore = computePriorityScore(fastTrainBehind);
            if (fastScore > slowScore) {
                conflictsDetected++;
                recommendations.push({
                    id: Date.now() + Math.floor(Math.random() * 1000) + slowTrain.id,
                    action: `Divert Freight ${slowTrain.number} to loop`,
                    justification: `Freight is blocking Express ${fastTrainBehind.number} near ${getTrainLocation(slowTrain.position)}.`,
                    impact: 'High'
                });
            }
        }
    });

    // Long delay resolution
    trains.filter(t => t.delayMinutes >= 45 && t.status === 'waiting').forEach(delayedTrain => {
        recommendations.push({
            id: Date.now() + Math.floor(Math.random() * 1000) + delayedTrain.id,
            action: `Prioritize departure: ${delayedTrain.number}`,
            justification: `45+ min late. Slot immediate departure with minimal knock-on effect.`,
            impact: 'Medium'
        });
    });

    // Halted trains: allow resume when clear
    trains.filter(t => t.status === 'halted').forEach(haltedTrain => {
        const isTrackClear = !runningTrains.some(t =>
            t.direction === haltedTrain.direction && Math.abs(t.position - haltedTrain.position) < 150
        );
        if (isTrackClear) {
            recommendations.push({
                id: Date.now() + Math.floor(Math.random() * 1000) + haltedTrain.id,
                action: `Resume journey: ${haltedTrain.number}`,
                justification: `Track ahead is clear. Safe to resume.`,
                impact: 'Low'
            });
        }
    });

    kpiConflicts.textContent = conflictsDetected;
    renderRecommendations();
    updateHeroSummary();
}

// Impact summary text
function estimateImpact(rec) {
    if (!rec || !rec.impact) return '';
    switch (rec.impact) {
        case 'Safety Critical':
            return 'Avoids conflict and large delay ripple.';
        case 'High':
            return 'Improves express running and throughput.';
        case 'Medium':
            return 'Improves punctuality of delayed train.';
        case 'Low':
            return 'Recovers halted train with low side effects.';
        default:
            return '';
    }
}

// Event listeners
function setupEventListeners() {
    aiSimulateBtn.addEventListener('click', toggleAISimulation);
    resetDataBtn.addEventListener('click', resetData);

    if (scenarioControls) {
        scenarioControls.addEventListener('click', handleScenarioClick);
    }

    // Roster controls
    if (trainSearchInput) {
        trainSearchInput.addEventListener('input', () => {
            rosterFilters.search = trainSearchInput.value.toLowerCase();
            renderTrainRoster();
        });
    }
    if (filterType) {
        filterType.addEventListener('change', () => {
            rosterFilters.type = filterType.value;
            renderTrainRoster();
        });
    }
    if (filterDirection) {
        filterDirection.addEventListener('change', () => {
            rosterFilters.direction = filterDirection.value;
            renderTrainRoster();
        });
    }
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            rosterFilters.status = filterStatus.value;
            renderTrainRoster();
        });
    }

    // Roster sorting
    const rosterTable = document.querySelector('.roster-table');
    if (rosterTable) {
        rosterTable.addEventListener('click', (e) => {
            const th = e.target.closest('th[data-sort]');
            if (!th) return;
            const key = th.dataset.sort;
            if (rosterSort.key === key) {
                rosterSort.asc = !rosterSort.asc;
            } else {
                rosterSort.key = key;
                rosterSort.asc = true;
            }
            renderTrainRoster();
        });
    }
}

// Priority editor initialization
function initPriorityEditor() {
    if (!ruleExpressInput) return;

    const applyRuleChange = () => {
        priorityRules.express = Number(ruleExpressInput.value);
        priorityRules.passenger = Number(rulePassengerInput.value);
        priorityRules.freight = Number(ruleFreightInput.value);
        priorityRules.delaySensitivity = Number(ruleDelayInput.value);

        ruleExpressValue.textContent = priorityRules.express.toString();
        rulePassengerValue.textContent = priorityRules.passenger.toString();
        ruleFreightValue.textContent = priorityRules.freight.toString();
        ruleDelayValue.textContent = priorityRules.delaySensitivity.toFixed(2);

        addEventLog('Priority weights updated.', 'operator');

        generateRecommendations();
    };

    [ruleExpressInput, rulePassengerInput, ruleFreightInput, ruleDelayInput].forEach(input => {
        input.addEventListener('input', applyRuleChange);
    });

    applyRuleChange();
}

function handleRecommendationAction(e) {
    if (!e.target.dataset.recId) return;

    const recId = parseInt(e.target.dataset.recId);
    const action = e.target.classList.contains('btn-accept') ? 'accepted' : 'overridden';

    const recommendation = recommendations.find(r => r.id === recId);
    if (recommendation) {
        addEventLog(`Recommendation "${recommendation.action}" ${action}.`, 'operator');

        recommendations = recommendations.filter(r => r.id !== recId);
        renderRecommendations();

        if (action === 'accepted') {
            applyRecommendationEffect(recommendation);
            updateKPIs(true);
        } else {
            updateKPIs(false);
        }
        renderTrainRoster();
    }
}

function applyRecommendationEffect(recommendation) {
    const trainNumberMatch = recommendation.action.match(/\d+[A-Z]?/);
    const trainNumber = trainNumberMatch ? trainNumberMatch[0] : null;
    const train = trains.find(t => t.number === trainNumber);

    if (train) {
        if (recommendation.action.toLowerCase().includes('hold') ||
            recommendation.action.toLowerCase().includes('divert')) {
            train.status = 'halted';
            train.problem = `Held/diverted at ${getTrainLocation(train.position)} by AI rule.`;
        } else if (recommendation.action.toLowerCase().includes('prioritize') ||
                   recommendation.action.toLowerCase().includes('resume')) {
            train.status = 'running';
            train.problem = '';
        }
    }
}

function handleScenarioClick(e) {
    const btn = e.target.closest('button[data-scenario]');
    if (!btn) return;
    const scenario = btn.dataset.scenario;
    applyScenario(scenario);
}

// Disruption / What-if scenarios
function applyScenario(type) {
    switch (type) {
        case 'heavy-fog':
            trains.forEach(t => {
                if (t.type === 'express' && t.direction === 'up' && t.status !== 'completed') {
                    t.problem = 'Heavy fog in section (scenario).';
                    t.delayMinutes = (t.delayMinutes || 0) + 10;
                }
            });
            addEventLog('Scenario: heavy fog applied on Up expresses.', 'operator');
            break;
        case 'signal-failure-ode':
            trains.forEach(t => {
                if (t.position >= 650 && t.position <= 750 && t.status !== 'completed') {
                    t.status = 'halted';
                    t.problem = 'Signal failure near Ode (scenario).';
                    t.delayMinutes = (t.delayMinutes || 0) + 5;
                }
            });
            addEventLog('Scenario: signal failure near Ode.', 'operator');
            break;
        case 'maintenance-uttarsanda':
            trains.forEach(t => {
                if (t.position >= 450 && t.position <= 550 && t.status !== 'completed') {
                    t.status = 'waiting';
                    t.problem = 'Maintenance block near Uttarsanda (scenario).';
                    t.delayMinutes = (t.delayMinutes || 0) + 8;
                }
            });
            addEventLog('Scenario: maintenance block near Uttarsanda.', 'operator');
            break;
        case 'clear-all':
            trains = JSON.parse(JSON.stringify(initialTrainData));
            addEventLog('Scenarios cleared. Baseline restored.', 'operator');
            break;
    }
    generateRecommendations();
    renderTrainRoster();
    updateKPIs();
}

// Date & time
function updateDateTime() {
    const now = new Date();
    datetimeDisplay.textContent = now.toLocaleString();
}

// Recommendations rendering
function renderRecommendations() {
    recommendationsContainer.innerHTML = '';

    if (recommendations.length === 0) {
        recommendationsContainer.innerHTML =
            '<p style="font-size:0.82rem;color:#9ca3af;">No critical conflicts detected right now.</p>';
        return;
    }

    recommendations.forEach((rec, index) => {
        const recCard = document.createElement('div');
        recCard.className = 'recommendation-card';

        const impactText = estimateImpact(rec);

        recCard.innerHTML = `
            <div><strong>${rec.action}</strong></div>
            <div style="margin-top:3px;color:#d1d5db;">${rec.justification}</div>
            ${impactText ? `<div class="rec-impact">${impactText}</div>` : ''}
            <div class="recommendation-actions">
                <button class="btn-accept" data-rec-id="${rec.id}">Accept</button>
                <button class="btn-override" data-rec-id="${rec.id}">Override</button>
            </div>
        `;

        // Slightly more emphasis on top 2
        if (index < 2) {
            recCard.style.borderColor = 'rgba(59,130,246,0.7)';
        }

        recommendationsContainer.appendChild(recCard);
    });

    recommendationsContainer.removeEventListener('click', handleRecommendationAction);
    recommendationsContainer.addEventListener('click', handleRecommendationAction);
}

// Event log rendering
function renderEventLog() {
    eventLogContainer.innerHTML = '';

    if (eventLog.length === 0) {
        eventLogContainer.innerHTML = '<p style="font-size:0.8rem;color:#9ca3af;">Log is empty.</p>';
        return;
    }

    const latest = eventLog.slice(0, 20);

    latest.forEach(entry => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';

        const type = (entry.type || 'status').toLowerCase();
        const badgeClass =
            type === 'system' ? 'log-badge-system' :
                type === 'ai' ? 'log-badge-ai' :
                    type === 'operator' ? 'log-badge-operator' : 'log-badge-system';

        logEntry.innerHTML = `
            <div class="log-time">
                ${entry.time}
                <div class="log-badge ${badgeClass}">${(entry.type || 'status').toUpperCase()}</div>
            </div>
            <div class="log-message">${entry.message}</div>
        `;

        eventLogContainer.appendChild(logEntry);
    });
}

// Train roster rendering
function renderTrainRoster() {
    if (!trainRosterBody) return;

    let rows = trains.map(t => ({
        ...t,
        location: getTrainLocation(t.position)
    }));

    const search = rosterFilters.search.trim();
    if (search) {
        rows = rows.filter(row =>
            row.number.toLowerCase().includes(search) ||
            row.location.toLowerCase().includes(search) ||
            row.type.toLowerCase().includes(search)
        );
    }

    if (rosterFilters.type !== 'all') {
        rows = rows.filter(row => row.type === rosterFilters.type);
    }

    if (rosterFilters.direction !== 'all') {
        rows = rows.filter(row => row.direction === rosterFilters.direction);
    }

    if (rosterFilters.status !== 'all') {
        rows = rows.filter(row => row.status === rosterFilters.status);
    }

    rows.sort((a, b) => {
        const key = rosterSort.key;
        const asc = rosterSort.asc ? 1 : -1;

        let va = a[key];
        let vb = b[key];

        if (key === 'delayMinutes' || key === 'position') {
            va = Number(va || 0);
            vb = Number(vb || 0);
            return (va - vb) * asc;
        }

        va = (va || '').toString().toLowerCase();
        vb = (vb || '').toString().toLowerCase();

        if (va < vb) return -1 * asc;
        if (va > vb) return 1 * asc;
        return 0;
    });

    trainRosterBody.innerHTML = rows.map(row => {
        const statusClass =
            row.status === 'running' ? 'status-running' :
                row.status === 'waiting' ? 'status-waiting' :
                    row.status === 'halted' ? 'status-halted' :
                        'status-completed';

        const dirShort = row.direction === 'up' ? 'Up' : 'Down';

        return `
            <tr>
                <td>${row.number}</td>
                <td>${capitalizeFirstLetter(row.type)}</td>
                <td>${dirShort}</td>
                <td>
                    <span class="status-chip ${statusClass}">
                        ${capitalizeFirstLetter(row.status)}
                    </span>
                </td>
                <td>${row.delayMinutes || 0} min</td>
                <td>${row.location}</td>
            </tr>
        `;
    }).join('');

    renderEventLog();
}

// Event log util
function addEventLog(message, type = 'status') {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    eventLog.unshift({ time, message, type });

    if (eventLog.length > 50) {
        eventLog.pop();
    }

    renderEventLog();
}

// KPI calculation
function updateKPIs(improved = false) {
    const activeTrains = trains.filter(t => t.status !== 'completed');
    const runningTrains = activeTrains.filter(t => t.status === 'running').length;
    const totalTrains = activeTrains.length;
    const totalDelay = activeTrains.reduce((sum, t) => sum + (t.delayMinutes || 0), 0);

    let throughput = Math.floor(Math.random() * 5) + 10;
    if (improved) throughput += 1;

    let avgDelay = totalTrains > 0 ? parseFloat((totalDelay / totalTrains).toFixed(1)) : 0;
    if (improved) avgDelay = parseFloat((avgDelay * 0.9).toFixed(1));

    let utilization = totalTrains > 0 ? Math.floor((runningTrains / totalTrains) * 100) : 0;
    if (improved) utilization = Math.min(100, utilization + 5);

    const onTimeCount = activeTrains.filter(t => (t.delayMinutes || 0) <= 5).length;
    const punctuality = activeTrains.length ? Math.round((onTimeCount / activeTrains.length) * 100) : 0;

    const conflicts = parseInt(kpiConflicts.textContent) || 0;

    kpiThroughput.textContent = throughput;
    kpiDelay.textContent = avgDelay;
    kpiUtilization.textContent = `${utilization}%`;
    kpiPunctuality.textContent = `${punctuality}%`;

    updateKPIBars({ throughput, avgDelay, utilization, conflicts, punctuality });
    updateOverview(activeTrains.length, conflicts);
    updateHeroSummary();
}

function updateKPIBars({ throughput, avgDelay, utilization, conflicts, punctuality }) {
    // Normalize basic scales
    const throughputPct = Math.min(100, (throughput / 20) * 100); // assume 20 trains/hr upper bound
    const delayPct = Math.max(0, Math.min(100, (avgDelay / 30) * 100)); // 30 min avg bound
    const conflictsPct = Math.max(0, Math.min(100, conflicts * 20)); // each conflict ~20%

    if (kpiThroughputBar) kpiThroughputBar.style.width = `${throughputPct}%`;
    if (kpiDelayBar) kpiDelayBar.style.width = `${100 - delayPct}%`; // inverse (lower delay is better)
    if (kpiUtilizationBar) kpiUtilizationBar.style.width = `${utilization}%`;
    if (kpiConflictsBar) kpiConflictsBar.style.width = `${conflictsPct}%`;
    if (kpiPunctualityBar) kpiPunctualityBar.style.width = `${punctuality}%`;
}

function updateHeroSummary() {
    const conflicts = parseInt(kpiConflicts.textContent) || 0;
    const avgDelay = parseFloat(kpiDelay.textContent) || 0;
    const punctualityText = kpiPunctuality.textContent || '0%';

    if (heroConflicts) heroConflicts.textContent = conflicts;
    if (heroDelay) heroDelay.textContent = `${avgDelay.toFixed(1)} min`;
    if (heroPunctuality) heroPunctuality.textContent = punctualityText;
}

function updateOverview(totalActive, conflicts) {
    if (overviewActiveTrains) overviewActiveTrains.textContent = totalActive;
    if (overviewConflicts) overviewConflicts.textContent = conflicts;
}

function updateOverviewMode() {
    if (!overviewMode) return;
    overviewMode.textContent = simulationRunning ? 'Simulation' : 'Paused';
}

// Helpers
function getTrainSpeed(type) {
    switch (type) {
        case 'express': return 15;
        case 'passenger': return 10;
        case 'freight': return 5;
        default: return 10;
    }
}

function getTrainLocation(position) {
    if (position <= 200) return 'Nadiad';
    if (position <= 400) return 'Kanjari';
    if (position <= 600) return 'Uttarsanda';
    if (position <= 800) return 'Ode';
    return 'Anand';
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

window.addEventListener('load', init);
