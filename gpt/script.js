// Global variables
let trains = [];
let initialTrainData = [];
let recommendations = [];
let eventLog = [];
let simulationRunning = false;
let selectedTrain = null;
let movementInterval = null;

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

// DOM Elements
const datetimeDisplay = document.getElementById('datetime-display');
const trackDiagram = document.getElementById('track-diagram');
const trainsVisualization = document.getElementById('trains-visualization');
const kpiThroughput = document.getElementById('kpi-throughput');
const kpiDelay = document.getElementById('kpi-delay');
const kpiUtilization = document.getElementById('kpi-utilization');
const kpiConflicts = document.getElementById('kpi-conflicts');
const kpiPunctuality = document.getElementById('kpi-punctuality');
const recommendationsContainer = document.getElementById('recommendations-container');
const eventLogContainer = document.getElementById('event-log-container');
const trainPopup = document.getElementById('train-popup');
const closePopupBtn = document.getElementById('close-popup');
const popupTrainNumber = document.getElementById('popup-train-number');
const popupTrainDetails = document.getElementById('popup-train-details');
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

// Init
function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    drawTrackDiagram();
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
        { id: 4, number: '19012', type: 'express', priority: 'high', direction: 'down', status: 'running', position: 800, delayMinutes: 2, problem: "Approaching Ode. Scheduled to meet 12928 near Uttarsanda (potential time collision).", lastUpdate: "10:30:00" },
        { id: 5, number: '22915', type: 'express', priority: 'high', direction: 'up', status: 'running', position: 400, delayMinutes: 15, problem: "Severe weather (heavy fog) reported ahead. Speed restricted to 30km/h.", lastUpdate: "10:25:00" },
        { id: 6, number: '69101', type: 'passenger', priority: 'medium', direction: 'down', status: 'running', position: 650, delayMinutes: 0, problem: "Running on time. Must be prioritized after Express trains.", lastUpdate: "10:29:00" },
        { id: 7, number: '8877F', type: 'freight', priority: 'low', direction: 'up', status: 'running', position: 550, delayMinutes: 0, problem: "Slow moving. Blocking track for faster trains behind it (22915).", lastUpdate: "10:29:00" },
        { id: 8, number: '12267', type: 'express', priority: 'high', direction: 'down', status: 'waiting', position: 900, delayMinutes: 45, problem: "Long delayed due to earlier track maintenance. Requires immediate re-slotting.", lastUpdate: "10:20:00" },
        { id: 9, number: '3344F', type: 'freight', priority: 'low', direction: 'up', status: 'running', position: 450, delayMinutes: 5, problem: "Freight train near Uttarsanda. Must be diverted to clear path for express.", lastUpdate: "10:30:00" },
        { id: 10, number: '59049', type: 'passenger', priority: 'medium', direction: 'down', status: 'running', position: 350, delayMinutes: 0, problem: "Running on the same track segment as train 12928 in the opposing direction (conflict zone).", lastUpdate: "10:30:00" },
        { id: 11, number: '9901X', type: 'freight', priority: 'low', direction: 'down', status: 'waiting', position: 900, delayMinutes: 0, problem: "Waiting at Anand. Only a single slot available after 12267 departs.", lastUpdate: "10:30:00" },
        { id: 12, number: '12952', type: 'express', priority: 'high', direction: 'up', status: 'running', position: 50, delayMinutes: 0, problem: "About to enter section. Needs clear path for optimal throughput.", lastUpdate: "10:30:00" }
    ];

    trains = JSON.parse(JSON.stringify(initialTrainData));

    addEventLog('Local database loaded with 12 trains and initial conflicts.', 'system');
    renderTrainsOnTrack();
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
    selectedTrain = null;

    addEventLog('System data reset to initial state.', 'system');
    renderTrainsOnTrack();
    renderTrainRoster();
    renderRecommendations();
    updateKPIs();
    startAISimulation();
}

// AI simulation loop
function startAISimulation() {
    if (simulationRunning) {
        clearInterval(movementInterval);
    }

    simulationRunning = true;
    aiSimulateBtn.textContent = 'AI Simulating… (Stop)';
    aiSimulateBtn.style.backgroundColor = 'var(--accent-red)';

    addEventLog('AI flow control initiated. Analyzing track conditions...', 'ai');

    if (movementInterval) clearInterval(movementInterval);

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
                        addEventLog(`Train ${train.number} ARRIVED at Anand`, 'ai');
                    }
                } else {
                    train.position -= currentSpeed;
                    if (train.position <= 100) {
                        train.status = 'completed';
                        addEventLog(`Train ${train.number} ARRIVED at Nadiad`, 'ai');
                    }
                }
            }

            if (train.status !== 'completed') {
                allTrainsFinished = false;
            }
        });

        generateRecommendations();
        renderTrainsOnTrack();
        renderTrainRoster();
        updateKPIs();

        if (allTrainsFinished) {
            clearInterval(movementInterval);
            simulationRunning = false;
            aiSimulateBtn.textContent = 'AI Simulation Finished';
            aiSimulateBtn.style.backgroundColor = 'var(--accent-blue)';
            addEventLog('AI-controlled flow completed all current trains.', 'ai');
        }
    }, 1000);
}

function toggleAISimulation() {
    if (simulationRunning) {
        clearInterval(movementInterval);
        simulationRunning = false;
        aiSimulateBtn.textContent = 'Start AI Simulation';
        aiSimulateBtn.style.backgroundColor = 'var(--accent-blue)';
        addEventLog('AI flow control PAUSED by operator action.', 'operator');
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
                    justification: `CRITICAL CONFLICT with ${higherPriorityTrain.type} ${higherPriorityTrain.number} near ${getTrainLocation(lowerPriorityTrain.position)}. AI recommends holding lower scored train at next available loop line to avoid collision/major delay.`,
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
                    action: `Divert Freight ${slowTrain.number} to Loop Line`,
                    justification: `AI Optimization: Slow-moving freight is blocking higher scored Express ${fastTrainBehind.number}. Diverting to the loop line near ${getTrainLocation(slowTrain.position)} saves 10+ minutes in Express running time.`,
                    impact: 'High'
                });
            }
        }
    });

    // Long delay resolution
    trains.filter(t => t.delayMinutes >= 45 && t.status === 'waiting').forEach(delayedTrain => {
        recommendations.push({
            id: Date.now() + Math.floor(Math.random() * 1000) + delayedTrain.id,
            action: `Prioritize Departure: Express ${delayedTrain.number}`,
            justification: `AI Alert: Train is 45+ minutes delayed. What-if analysis shows immediate departure minimally impacts other traffic but drastically improves service adherence.`,
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
                action: `Resume Journey: ${haltedTrain.number}`,
                justification: `AI Confirmation: Track ahead is clear. Immediate resumption advised to regain lost time.`,
                impact: 'Low'
            });
        }
    });

    kpiConflicts.textContent = conflictsDetected;
    renderRecommendations();
}

function estimateImpact(rec) {
    if (!rec || !rec.impact) return '';
    switch (rec.impact) {
        case 'Safety Critical':
            return 'Estimated impact: Eliminates potential conflict and avoids cascading 10–15 min delays; maintains safe headway.';
        case 'High':
            return 'Estimated impact: Frees main line for express traffic; reduces average delay by ~2–4 minutes and improves throughput.';
        case 'Medium':
            return 'Estimated impact: Improves punctuality for a long-delayed express with limited knock-on effects.';
        case 'Low':
            return 'Estimated impact: Restores halted train to normal running with minimal effect on other traffic.';
        default:
            return '';
    }
}

// Event listeners
function setupEventListeners() {
    aiSimulateBtn.addEventListener('click', toggleAISimulation);
    resetDataBtn.addEventListener('click', resetData);
    closePopupBtn.addEventListener('click', hideTrainPopup);

    document.addEventListener('click', (e) => {
        if (!trainPopup.contains(e.target) && e.target.className !== 'train') {
            hideTrainPopup();
        }
    });

    document.getElementById('zoom-in-btn').addEventListener('click', zoomIn);
    document.getElementById('zoom-out-btn').addEventListener('click', zoomOut);
    document.getElementById('reset-view-btn').addEventListener('click', resetView);
    document.getElementById('recommendations-container').addEventListener('click', handleRecommendationAction);

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
    if (!ruleExpressInput) return; // defensive

    const applyRuleChange = () => {
        priorityRules.express = Number(ruleExpressInput.value);
        priorityRules.passenger = Number(rulePassengerInput.value);
        priorityRules.freight = Number(ruleFreightInput.value);
        priorityRules.delaySensitivity = Number(ruleDelayInput.value);

        ruleExpressValue.textContent = priorityRules.express.toString();
        rulePassengerValue.textContent = priorityRules.passenger.toString();
        ruleFreightValue.textContent = priorityRules.freight.toString();
        ruleDelayValue.textContent = priorityRules.delaySensitivity.toFixed(2);

        addEventLog(
            `Priority rules updated: Express=${priorityRules.express}, Passenger=${priorityRules.passenger}, Freight=${priorityRules.freight}, DelayWeight=${priorityRules.delaySensitivity.toFixed(2)}`,
            'operator'
        );

        generateRecommendations();
    };

    [ruleExpressInput, rulePassengerInput, ruleFreightInput, ruleDelayInput].forEach(input => {
        input.addEventListener('input', applyRuleChange);
    });

    // Initial display
    applyRuleChange();
}

function handleRecommendationAction(e) {
    if (!e.target.dataset.recId) return;

    const recId = parseInt(e.target.dataset.recId);
    const action = e.target.classList.contains('btn-accept') ? 'Accepted (AI Execute)' : 'Overridden (Manual)';

    const recommendation = recommendations.find(r => r.id === recId);
    if (recommendation) {
        addEventLog(`Operator Action: Recommendation "${recommendation.action}" ${action}`, 'operator');

        recommendations = recommendations.filter(r => r.id !== recId);
        renderRecommendations();

        if (action.includes('Accepted')) {
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
        if (recommendation.action.includes('Hold') || recommendation.action.includes('Divert')) {
            train.status = 'halted';
            train.problem = `AI-enforced hold/diversion at ${getTrainLocation(train.position)}.`;
        } else if (recommendation.action.includes('Prioritize Departure') || recommendation.action.includes('Resume Journey')) {
            train.status = 'running';
            train.problem = '';
        }
        renderTrainsOnTrack();
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
                    t.problem = 'Heavy fog in section (what-if scenario). Speed restricted by dispatcher.';
                    t.delayMinutes = (t.delayMinutes || 0) + 10;
                }
            });
            addEventLog('What-if: Heavy fog applied for up express trains in section.', 'operator');
            break;
        case 'signal-failure-ode':
            trains.forEach(t => {
                if (t.position >= 650 && t.position <= 750 && t.status !== 'completed') {
                    t.status = 'halted';
                    t.problem = 'Signal failure near Ode (what-if scenario).';
                    t.delayMinutes = (t.delayMinutes || 0) + 5;
                }
            });
            addEventLog('What-if: Signal failure near Ode applied. Affected trains halted.', 'operator');
            break;
        case 'maintenance-uttarsanda':
            trains.forEach(t => {
                if (t.position >= 450 && t.position <= 550 && t.status !== 'completed') {
                    t.status = 'waiting';
                    t.problem = 'Temporary maintenance block near Uttarsanda (what-if scenario).';
                    t.delayMinutes = (t.delayMinutes || 0) + 8;
                }
            });
            addEventLog('What-if: Maintenance block near Uttarsanda applied. Trains held in section.', 'operator');
            break;
        case 'clear-all':
            trains = JSON.parse(JSON.stringify(initialTrainData));
            addEventLog('All disruptions cleared. Section restored to baseline scenario.', 'operator');
            break;
    }
    generateRecommendations();
    renderTrainsOnTrack();
    renderTrainRoster();
    updateKPIs();
}

// Date & time
function updateDateTime() {
    const now = new Date();
    datetimeDisplay.textContent = now.toLocaleString();
}

// Track diagram drawing
function drawTrackDiagram() {
    trackDiagram.setAttribute('viewBox', '0 0 1000 200');
    const loopTracks = [
        { d: 'M 100 80 L 300 80', station: 'Nadiad-Kanjari' },
        { d: 'M 500 80 L 700 80', station: 'Uttarsanda-Ode' },
        { d: 'M 100 120 L 300 120', station: 'Nadiad-Kanjari' },
        { d: 'M 700 120 L 900 120', station: 'Ode-Anand' }
    ];

    loopTracks.forEach(track => {
        const loopTrack = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        loopTrack.setAttribute('d', track.d);
        loopTrack.setAttribute('class', 'track-secondary');
        loopTrack.setAttribute('data-station', track.station);
        trackDiagram.appendChild(loopTrack);
    });

    const junctionPositions = [100, 300, 500, 700, 900];
    for (let i = 0; i < junctionPositions.length - 1; i++) {
        const trackSegment = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        trackSegment.setAttribute('d', `M ${junctionPositions[i]} 100 L ${junctionPositions[i + 1]} 100`);
        trackSegment.setAttribute('class', 'track');
        trackDiagram.appendChild(trackSegment);
    }

    const connections = [
        { d: 'M 100 100 C 100 80, 100 80, 120 80', type: 'main-to-loop' },
        { d: 'M 280 80 C 300 80, 300 80, 300 100', type: 'loop-to-main' },
        { d: 'M 500 100 C 500 80, 500 80, 520 80', type: 'main-to-loop' },
        { d: 'M 680 80 C 700 80, 700 80, 700 100', type: 'loop-to-main' },
        { d: 'M 100 100 C 100 120, 100 120, 120 120', type: 'main-to-loop' },
        { d: 'M 280 120 C 300 120, 300 120, 300 100', type: 'loop-to-main' },
        { d: 'M 700 100 C 700 120, 700 120, 720 120', type: 'main-to-loop' },
        { d: 'M 880 120 C 900 120, 900 120, 900 100', type: 'loop-to-main' }
    ];

    connections.forEach(conn => {
        const connection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        connection.setAttribute('d', conn.d);
        connection.setAttribute('class', 'track-secondary');
        connection.setAttribute('data-type', conn.type);
        trackDiagram.appendChild(connection);
    });

    const stations = [
        { name: 'Nadiad', x: 100, isJunction: true },
        { name: 'Kanjari', x: 300, isJunction: true },
        { name: 'Uttarsanda', x: 500, isJunction: false },
        { name: 'Ode', x: 700, isJunction: true },
        { name: 'Anand', x: 900, isJunction: true }
    ];

    stations.forEach(station => {
        if (station.isJunction) {
            const junctionOuter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            junctionOuter.setAttribute('cx', station.x);
            junctionOuter.setAttribute('cy', 100);
            junctionOuter.setAttribute('r', 25);
            junctionOuter.setAttribute('class', 'station junction-outer');
            trackDiagram.appendChild(junctionOuter);

            const junctionInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            junctionInner.setAttribute('cx', station.x);
            junctionInner.setAttribute('cy', 100);
            junctionInner.setAttribute('r', 15);
            junctionInner.setAttribute('class', 'station-inner');
            trackDiagram.appendChild(junctionInner);

            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', station.x - 15);
            line1.setAttribute('y1', 85);
            line1.setAttribute('x2', station.x + 15);
            line1.setAttribute('y2', 115);
            line1.setAttribute('class', 'junction-line');
            trackDiagram.appendChild(line1);

            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', station.x - 15);
            line2.setAttribute('y1', 115);
            line2.setAttribute('x2', station.x + 15);
            line2.setAttribute('y2', 85);
            line2.setAttribute('class', 'junction-line');
            trackDiagram.appendChild(line2);
        } else {
            const stationRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            stationRect.setAttribute('x', station.x - 30);
            stationRect.setAttribute('y', 85);
            stationRect.setAttribute('width', 60);
            stationRect.setAttribute('height', 30);
            stationRect.setAttribute('class', 'station');
            stationRect.setAttribute('data-station', station.name);
            trackDiagram.appendChild(stationRect);
        }

        const stationText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        stationText.setAttribute('x', station.x);
        stationText.setAttribute('y', 150);
        stationText.setAttribute('class', 'station-label');
        stationText.textContent = station.name;
        trackDiagram.appendChild(stationText);

        if (station.isJunction) {
            const junctionIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            junctionIndicator.setAttribute('x', station.x);
            junctionIndicator.setAttribute('y', 165);
            junctionIndicator.setAttribute('class', 'station-label');
            junctionIndicator.setAttribute('font-size', '10');
            junctionIndicator.textContent = '(Junction)';
            trackDiagram.appendChild(junctionIndicator);
        }
    });
}

// Train rendering
function renderTrainsOnTrack() {
    trainsVisualization.innerHTML = '';

    trains.forEach(train => {
        if (train.status === 'completed') return;

        const trainElement = document.createElement('div');
        trainElement.className = `train train-${train.type} ${selectedTrain === train.id ? 'selected' : ''}`;
        trainElement.dataset.trainId = train.id;
        trainElement.style.left = `${train.position}px`;
        trainElement.style.top = train.direction === 'up' ? '85px' : '105px';
        trainElement.textContent = train.number;

        trainElement.title = `${capitalizeFirstLetter(train.type)} ${train.number} (${capitalizeFirstLetter(train.priority)})`;

        trainElement.addEventListener('click', (e) => {
            e.stopPropagation();
            selectTrain(train.id);
            const trainRect = trainElement.getBoundingClientRect();
            showTrainPopup(train, trainRect.left + trainRect.width, trainRect.top + 20);
        });

        if (train.status === 'running') {
            trainElement.classList.add('train-running');
        } else if (train.status === 'waiting') {
            trainElement.classList.add('train-waiting');
        } else if (train.status === 'halted') {
            trainElement.classList.add('train-halted');
        }

        trainsVisualization.appendChild(trainElement);
    });
}

// Recommendations rendering
function renderRecommendations() {
    recommendationsContainer.innerHTML = '';

    if (recommendations.length === 0) {
        recommendationsContainer.innerHTML =
            '<p style="font-size:0.82rem;color:#9ca3af;">No critical conflicts or optimization opportunities detected by AI at this time.</p>';
        return;
    }

    recommendations.forEach(rec => {
        const recCard = document.createElement('div');
        recCard.className = 'recommendation-card';

        const impactText = estimateImpact(rec);

        recCard.innerHTML = `
            <div><strong>${rec.action}</strong></div>
            <div style="margin-top:4px;font-size:0.8rem;color:#d1d5db;">${rec.justification}</div>
            ${impactText ? `<div class="rec-impact">${impactText}</div>` : ''}
            <div class="recommendation-actions">
                <button class="btn-accept" data-rec-id="${rec.id}">Accept</button>
                <button class="btn-override" data-rec-id="${rec.id}">Override</button>
            </div>
        `;

        recommendationsContainer.appendChild(recCard);
    });
}

// Event log rendering
function renderEventLog() {
    eventLogContainer.innerHTML = '';

    if (eventLog.length === 0) {
        eventLogContainer.innerHTML = '<p style="font-size:0.8rem;color:#9ca3af;">System initialized.</p>';
        return;
    }

    eventLog.forEach(entry => {
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
}

// Selection + popup
function selectTrain(trainId) {
    selectedTrain = trainId;
}

function showTrainPopup(train, x, y) {
    popupTrainNumber.textContent = `Train ${train.number}`;
    popupTrainDetails.innerHTML = `
        <p><strong>Type:</strong> ${capitalizeFirstLetter(train.type)}</p>
        <p><strong>Priority:</strong> ${capitalizeFirstLetter(train.priority)}</p>
        <p><strong>Direction:</strong> ${train.direction === 'up' ? 'Up (Nadiad → Anand)' : 'Down (Anand → Nadiad)'}</p>
        <p><strong>Status:</strong> ${capitalizeFirstLetter(train.status)}</p>
        <p><strong>Current Location:</strong> ${getTrainLocation(train.position)}</p>
        <p><strong>Delay:</strong> ${train.delayMinutes} min</p>
        <p><strong>Problem:</strong> ${train.problem || 'None'}</p>
    `;

    trainPopup.style.left = `${x}px`;
    trainPopup.style.top = `${y}px`;
    trainPopup.style.display = 'block';
}

function hideTrainPopup() {
    trainPopup.style.display = 'none';
}

// Event log util
function addEventLog(message, type = 'status') {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    eventLog.unshift({ time, message, type });

    if (eventLog.length > 30) {
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

    kpiThroughput.textContent = throughput;
    kpiDelay.textContent = avgDelay;
    kpiUtilization.textContent = `${utilization}%`;
    kpiPunctuality.textContent = `${punctuality}%`;
    // conflicts is updated in generateRecommendations
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

// Zoom
let currentZoom = 1;
const zoomStep = 0.1;
const maxZoom = 2;
const minZoom = 0.5;

function zoomIn() {
    if (currentZoom < maxZoom) {
        currentZoom += zoomStep;
        applyZoom();
    }
}
function zoomOut() {
    if (currentZoom > minZoom) {
        currentZoom -= zoomStep;
        applyZoom();
    }
}
function resetView() {
    currentZoom = 1;
    applyZoom();
}
function applyZoom() {
    trackDiagram.style.transform = `scale(${currentZoom})`;
    trackDiagram.style.transformOrigin = 'center center';
}

window.addEventListener('load', init);
