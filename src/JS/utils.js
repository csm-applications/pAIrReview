function handleJsonFile(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const jsonData = JSON.parse(event.target.result);
            saveFile(jsonData, file.name);
        } catch (err) {
            alert("O arquivo selecionado não é um JSON válido.");
        }
    };
    reader.readAsText(file);
}

function handleBibFile(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const bibText = event.target.result;
            let jsonData = bibToJson(bibText);

            jsonData = jsonData.filter(
                (entry) => entry.ID !== "unknown" && entry.ENTRYTYPE !== "unknown"
            );

            if (jsonData.length === 0) {
                alert("Nenhuma entrada válida encontrada no arquivo .bib.");
                return;
            }

            saveFile(jsonData, file.name + " (convertido de .bib)");
        } catch (err) {
            alert("O arquivo .bib não pôde ser convertido.");
        }
    };
    reader.readAsText(file);
}

function bibToJson(bibText) {
    const entries = bibText.split(/@/).filter(Boolean);
    return entries.map((entry) => {
        const typeMatch = entry.match(/^(\w+){([^,]+),/);
        const type = typeMatch ? typeMatch[1] : "unknown";
        const id = typeMatch ? typeMatch[2] : "unknown";
        const fields = {};
        const fieldRegex = /(\w+)\s*=\s*[{"]([^}"]+)[}"]/g;
        let match;
        while ((match = fieldRegex.exec(entry)) !== null) {
            fields[match[1]] = match[2];
        }
        return { ID: id, ENTRYTYPE: type, ...fields };
    });
}


function handleExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (jsonData.length === 0) {
                alert("Planilha vazia ou sem dados válidos.");
                return;
            }

            saveFile(jsonData, file.name + " (convertido de Excel)");
        } catch (err) {
            console.error(err);
            alert("O arquivo Excel não pôde ser convertido.");
        }
    };
    reader.readAsArrayBuffer(file);
}


function processFile(file) {
    const name = file.name.toLowerCase();

    if (name.endsWith(".json")) {
        handleJsonFile(file);
    } else if (name.endsWith(".bib")) {
        handleBibFile(file);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        handleExcelFile(file); // Agora cobre ambos
    } else {
        alert("Por favor selecione um arquivo .json, .bib, .xlsx ou .xls válido.");
    }
}
