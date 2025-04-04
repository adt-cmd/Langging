document.addEventListener("DOMContentLoaded", function () {
    let startDateInput = document.getElementById("start-date");
    let endDateInput = document.getElementById("end-date");

    function setDefaultSalaryPeriod() {
        let today = new Date();
        let year = today.getFullYear();
        let month = today.getMonth(); // 0-based index (0 = Jan, 11 = Dec)
        let lastDay = new Date(year, month + 1, 0).getDate(); // Gets last day of the month

        let startDay, endDay;

        if (today.getDate() <= 15) {
            // First period: 1st to 15th
            startDay = 1;
            endDay = 15;
        } else {
            // Second period: 16th to LAST day (ensuring 31 is included)
            startDay = 16;
            endDay = lastDay; // Now correctly handles months with 31 days
        }

        // Assign values to input fields
        startDateInput.value = formatDate(new Date(year, month, startDay));
        endDateInput.value = formatDate(new Date(year, month, endDay));
    }

    function formatDate(date) {
        let month = (date.getMonth() + 1).toString().padStart(2, "0");
        let day = date.getDate().toString().padStart(2, "0");
        return `${date.getFullYear()}-${month}-${day}`;
    }

    setDefaultSalaryPeriod();
    

    document.getElementById("csvInput").addEventListener("change", function (event) {
        let file = event.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = function (e) {
            let csvData = e.target.result;
            let rows = csvData.split("\n").map(row => row.split(",").map(cell => cell.trim()));
        
            if (rows.length < 2) return;
        
            let headers = rows[0]; 
            let timeRecords = {};
        
            rows.slice(1).forEach(row => {
                if (row.length < 4) return;
        
                let biometricNo = row[0];
                let name = row[1];
                let rawDate = row[2]; // Format: DD/MM/YYYY
                let time = row[3];
        
                // Convert DD/MM/YYYY to YYYY-MM-DD
                let [day, month, year] = rawDate.split("/");
                let date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        
                let key = `${biometricNo}_${date}`;
        
                if (!timeRecords[key]) {
                    timeRecords[key] = { Name: name, BiometricNo: biometricNo, Date: date, TimeIn: "", TimeOut: "" };
                }
        
                if (timeRecords[key].TimeIn === "") {
                    timeRecords[key].TimeIn = time;
                } else {
                    timeRecords[key].TimeOut = time;
                }
            });
        
            let fromDate = document.getElementById("start-date").value;
            let toDate = document.getElementById("end-date").value;
        
            if (!fromDate || !toDate) {
                alert("Please select a valid date range.");
                return;
            }
        
            let container = document.getElementById("container");
            container.innerHTML = "";
        
            let groupedData = {};
            for (let key in timeRecords) {
                let record = timeRecords[key];
                if (!groupedData[record.BiometricNo]) {
                    groupedData[record.BiometricNo] = [];
                }
                groupedData[record.BiometricNo].push(record);
            }
        
            for (let biometricNo in groupedData) {
                let employeeRecords = groupedData[biometricNo];
                let employeeName = employeeRecords[0].Name;
        
                let dateRows = generateDateRows(fromDate, toDate, employeeRecords);
        
                let html = `
                    <div class="grand-container">
                        <div class="header-container">pppp <br> k</div>
                        <div class="main-container">
                            <div class="main-header-container">
                                <div class="header-title">Daily Time Record</div>
                                <div class="header-information">
                                    <div class="input-group">
                                        <div class="input-container">
                                            <label for="Name">NAME:</label>
                                            <input type="text" value="${employeeName}">
                                        </div>
                                        <div class="input-container">
                                            <label for="Position">POSITION:</label>
                                            <input type="text">
                                        </div>
                                    </div>
                                    <div class="input-group">
                                        <div class="input-container">
                                            <label for="Location">LOCATION:</label>
                                            <input type="text">
                                        </div>
                                        <div class="input-container">
                                            <label for="BiometricNo">Biometric #:</label>
                                            <input type="text" value="${biometricNo}">
                                        </div>
                                        <div class="input-container">
                                            <label for="PeriodCovered">Period Covered:</label>
                                            <input type="text" value="${fromDate} to ${toDate}">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="main-body-container">
                                <table class="dtr-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Day</th>
                                            <th>Time-In</th>
                                            <th>Time-Out</th>
                                            <th>Office</th>
                                            <th>Total Hours <br> Worked</th>
                                            <th>Regular Hours</th>
                                            <th>Overtime (hrs)</th>
                                            <th>OT Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${dateRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += html;
            }
        
            // Ensure time conversion runs after the elements exist
            convertTimeFormat();
        };

        reader.readAsText(file);
    });

    function generateDateRows(fromDate, toDate, records) {
        let rows = "";
        let currentDate = new Date(fromDate);
        let endDate = new Date(toDate);
        let totalWorkedHours = 0;
        let totalOfficeHours = 0;
        let totalRegularHours = 0;
        let totalOvertimeHours = 0; // Track total overtime hours
    
        while (currentDate <= endDate) {
            let formattedDate = currentDate.toISOString().split("T")[0];
            let displayDate = currentDate.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' });
            let dayName = currentDate.toLocaleDateString("en-US", { weekday: 'long' });
    
            let record = records.find(r => r.Date === formattedDate);
            let timeIn = record ? record.TimeIn : "";
            let timeOut = record ? record.TimeOut : "";
    
            let isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
            let regularHours = isWeekend ? 0 : 8; 
    
            // Calculate worked hours
            let officeHours = calculateWorkedHours(timeIn, timeOut, false, isWeekend);
            let totalHours = calculateWorkedHours(timeIn, timeOut, true, isWeekend);
    
            totalOfficeHours += parseFloat(officeHours) || 0;
            totalWorkedHours += parseFloat(totalHours) || 0;
            totalRegularHours += parseFloat(regularHours) || 0;
    
            // Calculate overtime: totalWorkedHours - regularHours, in whole hours
            let overtimeHours = (totalHours > regularHours) ? Math.floor(totalHours - regularHours) : 0;
            totalOvertimeHours += overtimeHours; // Add to total overtime
    
            rows += `
                <tr>
                    <td>${displayDate}</td>
                    <td>${dayName}</td>
                    <td>
                        <input type="time" class="time-input-field" value="${timeIn}" oninput="updateWorkedHours(this, event, ${isWeekend})">
                        <span class="converted-time-container">${formatAMPM(timeIn)}</span>
                    </td>
                    <td>
                        <input type="time" class="time-input-field" value="${timeOut}" oninput="updateWorkedHours(this, event, ${isWeekend})">
                        <span class="converted-time-container">${formatAMPM(timeOut)}</span>
                    </td>
                    <td>
                        <input type="number" class="office-hours small-input" value="${officeHours || "0"}" oninput="updateWorkedHours(this, event)">
                    </td>
                    <td>
                        <input type="number" class="total-hours-worked small-input" value="${totalHours || "0"}" oninput="updateWorkedHours(this, event)">
                    </td>
                    <td>
                        <input type="number" class="regular-hours small-input" value="${regularHours}" oninput="updateTotalRegularHours(event), updateWorkedHours(this, event)">
                    </td>
                    <td>
                        <input type="number" class="overtime-hours small-input" value="${overtimeHours.toFixed(0) || "0"}" oninput="updateWorkedHours(this, event)">
                    </td>
                    <td>
                        <textarea></textarea>
                    </td>
                </tr>
            `;
    
            currentDate.setDate(currentDate.getDate() + 1);
        }
    
        // Summary rows with total overtime hours
        rows += `
            <tr><td></td><td></td><td colspan="2" class="label-col">Total Hours:</td>
                <td class="totalOfficeHours">${totalOfficeHours.toFixed(2)}</td>
                <td class="totalWorkedHours">${totalWorkedHours.toFixed(2)}</td>
                <td class="totalRegularHours">${totalRegularHours.toFixed(2)}</td>
                <td class="totalOvertimeHours">${totalOvertimeHours.toFixed(2)}</td><td></td>
            </tr>
            <tr><td></td><td></td><td colspan="2" class="label-col">Absent (hrs):</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td colspan="2" class="label-col">Late (hrs):</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td colspan="2" class="label-col">Leave (hrs):</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td colspan="2" class="label-col">Holiday:</td><td></td><td></td><td></td><td></td><td></td></tr>
        `;
    
        return rows;
    }
    
   

    function convertTimeFormat() {
        document.querySelectorAll(".time-input-field").forEach((timeInput, index) => {
            let convertedTime = document.querySelectorAll(".converted-time-container")[index];
        
            // If the input has a value, show the converted time and hide the input
            if (timeInput.value) {
                convertedTime.textContent = formatAMPM(timeInput.value);
                convertedTime.style.display = "inline";
                timeInput.style.display = "none";
            } else {
                convertedTime.style.display = "none"; // Hide span if no time is set
            }
        
            convertedTime.addEventListener("click", function () {
                timeInput.style.display = "inline";
                timeInput.focus();
                convertedTime.style.display = "none";
            });
        
            timeInput.addEventListener("blur", function () {
                let time = this.value;
                if (time) {
                    convertedTime.textContent = formatAMPM(time);
                    convertedTime.style.display = "inline";
                    timeInput.style.display = "none";
                } else {
                    convertedTime.style.display = "none"; // Hide the span if no value is set
                }
            });
        });
    }

    function formatAMPM(time) {
        if (!time) return "";
        let [hours, minutes] = time.split(":").map(Number);
        let ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    }
});

// Helper function to calculate worked hours
function calculateWorkedHours(timeIn, timeOut, withBreak, isWeekend) {
    if (!timeIn || !timeOut) return withBreak ? "-1.50" : "0.00";

    let inTime = new Date(`1970-01-01T${timeIn}`);
    let outTime = new Date(`1970-01-01T${timeOut}`);

    // If timeOut is earlier than timeIn, treat it as the next day's time
    if (outTime < inTime) {
        outTime.setDate(outTime.getDate() + 1);
    }

    let diff = (outTime - inTime) / (1000 * 60 * 60); // Convert milliseconds to hours
    let noonTime = new Date(inTime);
    noonTime.setHours(12, 0, 1, 0); // Set to 12:00 PM

    if (withBreak) {
        if (!isWeekend && (inTime <= noonTime || outTime <= noonTime)) {
            // Weekdays: Deduct if time covers or is before 12 PM
            diff -= 1.5;
        } else if (isWeekend && (inTime <= noonTime && outTime >= noonTime)) {
            // Weekends: Deduct only if time covers 12 PM
            diff -= 1.5;
        }
    }

    return diff.toFixed(2);
}

// Function to update total regular hours
function updateTotalRegularHours(event) {
    let total = 0;
    let table = event.target.closest("table");
    table.querySelectorAll('.regular-hours').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    table.querySelector(".totalRegularHours").textContent = total.toFixed(2);
}

// Function to update total worked hours dynamically
function updateWorkedHours(input, event, isWeekend) {
    let row = input.closest("tr");
    let timeIn = row.querySelectorAll('input[type="time"]')[0].value;
    let timeOut = row.querySelectorAll('input[type="time"]')[1].value;
    let totalInput = row.querySelector(".total-hours-worked");
    let officeInput = row.querySelector(".office-hours");
    let overtimeInput = row.querySelector(".overtime-hours");
    let regularHoursInput = row.querySelector(".regular-hours");
    let table = event.target.closest("table");

    // Calculate worked hours
    let newOfficeTotal = calculateWorkedHours(timeIn, timeOut, false, isWeekend);
    officeInput.value = newOfficeTotal || "0"; // Default to 0 if empty

    let newWorkTotal = calculateWorkedHours(timeIn, timeOut, true, isWeekend);
    totalInput.value = newWorkTotal || "0"; // Default to 0 if empty

    // Get total office, worked, regular, and overtime hours
    let totalOffice = 0, totalWorked = 0, totalRegular = 0, totalOvertime = 0;

    table.querySelectorAll('.office-hours').forEach(input => {
        totalOffice += parseFloat(input.value) || 0;
    });

    table.querySelectorAll('.total-hours-worked').forEach(input => {
        totalWorked += parseFloat(input.value) || 0;
    });

    table.querySelectorAll('.regular-hours').forEach(input => {
        totalRegular += parseFloat(input.value) || 0;
    });

    // Calculate overtime
    let regularHours = parseFloat(regularHoursInput.value) || 0;
    let overtimeHours = (newWorkTotal > regularHours) ? Math.floor(newWorkTotal - regularHours) : 0;
    overtimeInput.value = overtimeHours.toFixed(2); // Update overtime hours

    // Get total overtime hours from table
    table.querySelectorAll('.overtime-hours').forEach(input => {
        totalOvertime += parseFloat(input.value) || 0;
    });

    // Update summary row
    table.querySelector(".totalOfficeHours").textContent = totalOffice.toFixed(2);
    table.querySelector(".totalWorkedHours").textContent = totalWorked.toFixed(2);
    table.querySelector(".totalRegularHours").textContent = totalRegular.toFixed(2);
    table.querySelector(".totalOvertimeHours").textContent = totalOvertime.toFixed(2);
}