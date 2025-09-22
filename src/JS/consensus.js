let hilResponses = [];
let preferencesData = {};

function getConfidenceConfig() {
    const config = {};
    document.querySelectorAll('#confidence-form input[type=number]').forEach(input => {
        config[input.name] = parseInt(input.value, 10);
    });
    return config;
}

function getMatchMode() {
    return {
        inclusionMode: document.querySelector('input[name="inclusion-mode"]:checked')?.value || 'all',
        exclusionMode: document.querySelector('input[name="exclusion-mode"]:checked')?.value || 'all'
    };
}

function calculateConsensus(first, second) {
    const a = Number(first ?? -1);
    const b = Number(second ?? -1);

    if (a !== -1 && b !== -1 && a === b) return a;
    if (a === -1) return b;
    if (b === -1) return a;
    return Math.min(a, b);
}

function computeConsensusValues(study) {
    const consensus = {};
    // corrected property name: secondModelDecision
    const allCriteria = new Set([
        ...Object.keys(study.firstModelDecision || {}),
        ...Object.keys(study.secondModelDecision || {})
    ]);

    allCriteria.forEach(key => {
        const f = Number(study.firstModelDecision?.[key] ?? -1);
        const s = Number(study.secondModelDecision?.[key] ?? -1);
        consensus[key] = calculateConsensus(f, s);
    });

    return consensus;
}

function passesCriteria(output, config) {
    const { inclusionMode, exclusionMode } = getMatchMode();
    const inclusionCriteria = Object.keys(config).filter(k => k.startsWith('IC'));
    const exclusionCriteria = Object.keys(config).filter(k => k.startsWith('EC'));

    // Inclusion
    let inclusionPass = false;
    if (inclusionCriteria.length === 0) inclusionPass = true;
    else if (inclusionMode === 'all') {
        inclusionPass = inclusionCriteria.every(c => (output[c] ?? -1) !== -1 && Number(output[c]) >= config[c]);
    } else { // 'one'
        inclusionPass = inclusionCriteria.some(c => (output[c] ?? -1) !== -1 && Number(output[c]) >= config[c]);
    }

    // Exclusion: determine if any exclusion criteria are TRIGGERED
    let exclusionTriggered = false;
    if (exclusionCriteria.length === 0) exclusionTriggered = false;
    else if (exclusionMode === 'all') {
        // triggered only if ALL exclusion criteria meet or exceed thresholds
        exclusionTriggered = exclusionCriteria.every(c => (output[c] ?? -1) !== -1 && Number(output[c]) >= config[c]);
    } else { // 'one'
        // triggered if ANY exclusion criterion meets or exceeds threshold
        exclusionTriggered = exclusionCriteria.some(c => (output[c] ?? -1) !== -1 && Number(output[c]) >= config[c]);
    }

    // include only if inclusion passed AND no exclusion was triggered
    return inclusionPass && !exclusionTriggered;
}

function generateDynamicCriteriaFormFromPreferences() {
    const inclusionContainer = document.getElementById('inclusion-fields');
    const exclusionContainer = document.getElementById('exclusion-fields');
    inclusionContainer.innerHTML = '';
    exclusionContainer.innerHTML = '';

    (preferencesData.inclusionCriteria || []).forEach((crit, idx) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-control';
        input.name = `IC${idx + 1}`;
        input.min = 1;
        input.max = 7;
        input.value = 6;

        const label = document.createElement('label');
        label.innerText = crit;
        label.htmlFor = input.name;

        inclusionContainer.appendChild(label);
        inclusionContainer.appendChild(input);
    });

    (preferencesData.exclusionCriteria || []).forEach((crit, idx) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-control';
        input.name = `EC${idx + 1}`;
        input.min = 1;
        input.max = 7;
        input.value = 6;

        const label = document.createElement('label');
        label.innerText = crit;
        label.htmlFor = input.name;

        exclusionContainer.appendChild(label);
        exclusionContainer.appendChild(input);
    });

    document.querySelectorAll('#confidence-form input[type=number], input[name="inclusion-mode"], input[name="exclusion-mode"]').forEach(el => {
        el.addEventListener('input', renderStudies);
        el.addEventListener('change', renderStudies);
    });
}

function parseDecisionString(decisionStr) {
    if (!decisionStr || typeof decisionStr !== "string") return {};

    const lines = decisionStr.trim().split("\n").slice(1); // keep same format you used
    const decisionObj = {};

    lines.forEach(line => {
        const [criteria, rate] = line.split(",").map(s => s.trim());
        if (criteria && rate !== undefined && rate !== "") {
            const n = Number(rate);
            decisionObj[criteria] = Number.isNaN(n) ? rate : n;
        }
    });

    return decisionObj;
}

function renderStudies() {
    const config = getConfidenceConfig();

    const container = document.getElementById("cardsContainer");
    container.innerHTML = "";

    let included = 0, excluded = 0;

    hilResponses.forEach((study, idx) => {

        if (typeof study.firstModelDecision === "string") {
            study.firstModelDecision = parseDecisionString(study.firstModelDecision);
        }
        if (typeof study.secondModelDecision === "string") {
            study.secondModelDecision = parseDecisionString(study.secondModelDecision);
        }

        const consensus = computeConsensusValues(study);

        study.userDecision = passesCriteria(consensus, config) ? "Include" : "Exclude";
        if (study.userDecision === "Include") included++; else excluded++;

        const allCriteria = Object.keys(consensus);

        const card = document.createElement("div");
        card.className = `card mb-4 p-3 ${study.userDecision === "Include" ? 'included' : 'excluded'}`;
        card.setAttribute("data-idx", idx);
        card.innerHTML = `
            <h5 class="card-title">${study.title}</h5>
            <p><strong>Abstract:</strong> ${study.abstract}</p>
            <p><strong>Keywords:</strong> ${study.keywords || "—"}</p>
            <p><strong>Publication Venue:</strong> ${study.journal || "—"}</p>
            <p><strong>Publication date:</strong> ${study.date || study.year || "—"}</p>
            <h6 class="mt-3">Decision Comparison</h6>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Criteria</th>
                        <th>First Model</th>
                        <th>Second Model</th>
                        <th>Consensus</th>
                    </tr>
                </thead>
                <tbody>
                    ${allCriteria.map(criteria => `
                        <tr>
                            <td>${criteria}</td>
                            <td>${study.firstModelDecision?.[criteria] ?? "—"}</td>
                            <td>${study.secondModelDecision?.[criteria] ?? "—"}</td>
                            <td><strong>${consensus[criteria]}</strong></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div class="mt-3">
                <label><strong>Your decision:</strong></label>
                <div class="form-check form-check-inline">
                    <input class="form-check-input user-decision-radio" type="radio" 
                        name="userDecision-${idx}" id="userDecisionInclude-${idx}" value="Include"
                        ${study.userDecision === "Include" ? "checked" : ""}>
                    <label class="form-check-label" for="userDecisionInclude-${idx}">Included</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input user-decision-radio" type="radio" 
                        name="userDecision-${idx}" id="userDecisionExclude-${idx}" value="Exclude"
                        ${study.userDecision === "Exclude" ? "checked" : ""}>
                    <label class="form-check-label" for="userDecisionExclude-${idx}">Excluded</label>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.user-decision-radio').forEach(input => {
        input.addEventListener('change', (event) => {
            const inputEl = event.target;
            const idx = parseInt(inputEl.name.split('-')[1], 10);
            const study = hilResponses[idx];
            if (!study) return;
            study.userDecision = inputEl.value;

            const card = document.querySelector(`.card[data-idx="${idx}"]`);
            if (card) {
                card.classList.toggle('included', study.userDecision === "Include");
                card.classList.toggle('excluded', study.userDecision === "Exclude");
            }

            const includedCount = hilResponses.filter(s => s.userDecision === "Include").length;
            const excludedCount = hilResponses.filter(s => s.userDecision === "Exclude").length;
            document.getElementById("summary").innerText = `Included: ${includedCount} | Excluded: ${excludedCount}`;
        });
    });

    document.getElementById("summary").innerText = `Included: ${included} | Excluded: ${excluded}`;
}


window.addEventListener("DOMContentLoaded", () => {
    const raw = localStorage.getItem("excludedStudies");
    if (!raw) {
        alert("No hilResponses found in localStorage.");
        return;
    }
    hilResponses = JSON.parse(raw);

    const preferencesRaw = localStorage.getItem("preferencesData");
    if (preferencesRaw) {
        try {
            preferencesData = JSON.parse(preferencesRaw);
        } catch (e) {
            console.error("Erro ao parsear preferencesData", e);
        }
    }

    const criteriaSection = document.getElementById("criteria-text");
    if (preferencesData.inclusionCriteria || preferencesData.exclusionCriteria) {
        criteriaSection.textContent =
            "Inclusion Criteria:\n- " + (preferencesData.inclusionCriteria || []).join("\n- ") +
            "\n\nExclusion Criteria:\n- " + (preferencesData.exclusionCriteria || []).join("\n- ");
    } else {
        criteriaSection.textContent = "No criteria found.";
    }

    generateDynamicCriteriaFormFromPreferences();
    renderStudies();
});

document.getElementById('download-btn').addEventListener('click', () => {
    const config = getConfidenceConfig();
    const included = [], excluded = [];

    hilResponses.forEach(study => {
        (study.userDecision === "Include" ? included : excluded).push(study);
    });

    const zip = new JSZip();

    // 🔹 Recuperar studyMetadata (se existir)
    const studyMetadata = JSON.parse(localStorage.getItem("studyMetadata") || "{}");

    // 🔹 Montar metadata incluindo config, critérios e studyMetadata
    const metadata = {
        config,
        inclusionCriteria: preferencesData.inclusionCriteria || [],
        exclusionCriteria: preferencesData.exclusionCriteria || [],
        studyInfo: studyMetadata   // <-- agora incluído também
    };

    zip.file("metadata.json", JSON.stringify(metadata, null, 2));
    zip.file("included.json", JSON.stringify(included, null, 2));
    zip.file("excluded.json", JSON.stringify(excluded, null, 2));

    zip.generateAsync({ type: "blob" }).then(content => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = "consensus_assets.zip";
        a.click();
        URL.revokeObjectURL(a.href);
    });
});