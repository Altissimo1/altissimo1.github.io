document.addEventListener("DOMContentLoaded", function () {


    function prefillHallInfoTable() {
        const tableHallInfoBody = document.getElementById("tableHallInfoBody");
        const IVs = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26];

        const AI = [
            "No AI",
            "No AI",
            "No AI",
            "Basic AI",
            "Basic AI",
            "Basic AI",
            "Basic AI",
            "Basic + Strong + Expert AI",
            "Basic + Strong + Expert AI",
            "Basic + Strong + Expert AI"
        ];

        const OPPONENTS_GROUP = [
            "Group 1",
            "Group 1",
            "Group 1-2",
            "Group 1-2",
            "Group 1-2",
            "Group 2-3",
            "Group 2-3",
            "Group 2-3",
            "Group 3-4",
            "Group 3-4"
        ];

        for (let rank = 1; rank <= 10; rank++) {
            const row = document.createElement("tr");
            row.className = rank % 2 === 0 ? "light-true" : "light-false";


            const rankCell = document.createElement("td");
            rankCell.textContent = rank;
            row.appendChild(rankCell);

            const levelCell = document.createElement("td");
            levelCell.textContent = "-";
            row.appendChild(levelCell);

            const ivCell = document.createElement("td");
            ivCell.textContent = IVs[rank - 1];
            row.appendChild(ivCell);

            const aiFlagsCell = document.createElement("td");
            aiFlagsCell.textContent = AI[rank - 1];
            row.appendChild(aiFlagsCell);

            const opponentsGroupCell = document.createElement("td");
            opponentsGroupCell.textContent = OPPONENTS_GROUP[rank - 1];
            row.appendChild(opponentsGroupCell);

            tableHallInfoBody.appendChild(row);
        }
    }

    function calculateHallLevel(userLevel, round, rank) {
        const baseValue = userLevel - 3 * Math.sqrt(userLevel);
        const increment = Math.sqrt(userLevel) / 5;
        const rawValue = baseValue + ((round - 1) / 2.0) + (rank - 1) * increment;
        const level = Math.min(userLevel, Math.ceil(rawValue));
        return {
            baseValue,
            increment,
            level
        };
    }

    function updateHallInfoTable() {
        const userLevel = parseInt(document.getElementById("inputUserLevel").value);
        const round = parseInt(document.getElementById("inputRound").value);
        const tableRows = document.getElementById("tableHallInfoBody").children;

        const baseValueDisplay = document.getElementById("baseValueDisplay");
        const incrementDisplay = document.getElementById("incrementDisplay");

        if (
            isNaN(userLevel) || userLevel < 30 || userLevel > 100 ||
            isNaN(round) || round < 1 || round > 17
        ) {
            baseValueDisplay.textContent = "-";
            incrementDisplay.textContent = "-";

            for (let i = 0; i < tableRows.length; i++) {
                const levelCell = tableRows[i].children[1];
                levelCell.textContent = "-";
            }

            return;
        }

        const { baseValue, increment } = calculateHallLevel(userLevel, round, 1);

        baseValueDisplay.textContent = baseValue.toFixed(2);
        incrementDisplay.textContent = increment.toFixed(2);

        for (let i = 0; i < tableRows.length; i++) {
            const rank = i + 1;
            const levelCell = tableRows[i].children[1];
            const { level } = calculateHallLevel(userLevel, round, rank);
            levelCell.textContent = level;
        }
    }

    document.getElementById("inputUserLevel").addEventListener("input", updateHallInfoTable);
    document.getElementById("inputRound").addEventListener("input", updateHallInfoTable);

    prefillHallInfoTable();
    updateHallInfoTable();
});