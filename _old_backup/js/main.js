const selectSession = document.getElementById("selectSession");
const generateJsonButton = document.getElementById("generateJson");
const downloadJsonButton = document.getElementById("_click_to_download_");
const selectedGSTState = document.getElementById("selectedGSTState");
const flipkartGSTNo = document.getElementById("flipkartGSTNo");
const themeToggleBtn = document.getElementById("theme-toggle");

// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Theme handling
function setTheme(themeName) {
   localStorage.setItem("theme", themeName);
   document.documentElement.setAttribute("data-theme", themeName);
}

// Function to toggle between light and dark themes
function toggleTheme() {
   if (localStorage.getItem("theme") === "dark") {
      setTheme("light");
   } else {
      setTheme("dark");
   }
}

// Check for saved theme preference or use system preference
function initTheme() {
   // Check if user previously selected a theme
   const savedTheme = localStorage.getItem("theme");

   if (savedTheme) {
      setTheme(savedTheme);
      return;
   }

   // Check for system preference
   const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

   if (prefersDarkScheme.matches) {
      setTheme("dark");
   } else {
      setTheme("light");
   }
}

// Initialize theme on page load
initTheme();

// Add event listener for theme toggle button
themeToggleBtn.addEventListener("click", toggleTheme);

let selectedFile;
let RESULT_FILE;
document.getElementById("input").addEventListener("change", (event) => {
   selectedFile = event.target.files[0];
});

// Function to convert worksheet to CSV
function worksheetToCSV(worksheet) {
   return XLSX.utils.sheet_to_csv(worksheet, { FS: ",", RS: "\n" });
}

// Function to trigger CSV download
function downloadCSV(csv, filename) {
   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
   const link = document.createElement("a");
   if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   }
}

generateJsonButton.addEventListener("click", () => {
   const stateGSTValue = selectedGSTState.value;
   const flipkartGSTNoValue = flipkartGSTNo.value;
   const session = selectSession.value;
   const [yy, mm] = session.split("-");
   const mmyy = `${mm}${yy}`;

   if (selectedFile && session) {
      RESULT_FILES = [];
      let fileReader = new FileReader();
      fileReader.readAsBinaryString(selectedFile);
      fileReader.onload = (event) => {
         const data = event.target.result;
         const workbook = XLSX.read(data, { type: "binary" });
         const sheets = workbook.Sheets;
         const tableSheets = getTableSheets(sheets);
         const GST_ID = ifFindThenGetGstID(tableSheets);

         const b2csData = getB2CsData(tableSheets, GST_ID, stateGSTValue);
         console.log(b2csData);

         // Populate the table with B2CS data
         if (b2csData) {
            populateB2CsTable(b2csData);
         }

         const docIssueData = getDocIssue(tableSheets);
         console.log(docIssueData);

         const hsnData = getHSNData(tableSheets);
         console.log(hsnData);

         const supecoData = getSupecoData(tableSheets, flipkartGSTNoValue);
         console.log(supecoData);

         const finalData = margeWithMainData(GST_ID, mmyy, {
            ...b2csData,
            ...docIssueData,
            ...hsnData,
            ...supecoData,
         });
         console.log(finalData);

         RESULT_FILE = {
            file: finalData,
            name: `${GST_ID}_${session}_ES.json`,
         };
      };
   }
});

downloadJsonButton.addEventListener("click", () => {
   const { file, name } = RESULT_FILE;
   downloadJSON(file, name);
});

// B2CS Data Table functionality
let currentB2CsData = null;
let filteredData = [];

// Get DOM elements for table functionality
const toggleTableBtn = document.getElementById("toggleTableBtn");
const toggleBtnText = document.getElementById("toggleBtnText");
const toggleBtnIcon = document.getElementById("toggleBtnIcon");
const b2csTableSection = document.getElementById("b2csTableSection");
const stateSearchInput = document.getElementById("stateSearchInput");
const b2csTableBody = document.getElementById("b2csTableBody");
const showNumberOfResults = document.getElementById("showNumberOfResults");
const searchContainer = document.querySelector(".search-container");
const moreInfo = document.getElementById("moreInfo");

// State mapping for display names
const STATE_NAMES = {
   "01": "Jammu & Kashmir",
   "02": "Himachal Pradesh",
   "03": "Punjab",
   "04": "Chandigarh",
   "05": "Uttarakhand",
   "06": "Haryana",
   "07": "Delhi",
   "08": "Rajasthan",
   "09": "Uttar Pradesh",
   10: "Bihar",
   11: "Sikkim",
   12: "Arunachal Pradesh",
   13: "Nagaland",
   14: "Manipur",
   15: "Mizoram",
   16: "Tripura",
   17: "Meghalaya",
   18: "Assam",
   19: "West Bengal",
   20: "Jharkhand",
   21: "Odisha",
   22: "Chhattisgarh",
   23: "Madhya Pradesh",
   24: "Gujarat",
   25: "Daman & Diu",
   26: "Dadra & Nagar Haveli & Daman & Diu",
   27: "Maharashtra",
   29: "Karnataka",
   30: "Goa",
   31: "Lakshdweep",
   32: "Kerala",
   33: "Tamil Nadu",
   34: "Puducherry",
   35: "Andaman & Nicobar Islands",
   36: "Telangana",
   37: "Andhra Pradesh",
   38: "Ladakh",
};

// Toggle table visibility
toggleTableBtn.addEventListener("click", () => {
   const isHidden = b2csTableSection.classList.contains("hidden");

   if (isHidden) {
      b2csTableSection.classList.remove("hidden");
      searchContainer.classList.remove("hidden-transition");
      toggleBtnText.textContent = "Hide B2CS Data Table";
      toggleBtnIcon.classList.add("rotated");
      moreInfo.classList.remove("center-toggle");

      // Populate table if data is available
      if (currentB2CsData) {
         populateB2CsTable(currentB2CsData);
      }
   } else {
      b2csTableSection.classList.add("hidden");
      searchContainer.classList.add("hidden-transition");
      toggleBtnText.textContent = "Show B2CS Data Table";
      toggleBtnIcon.classList.remove("rotated");
      moreInfo.classList.add("center-toggle");
   }
});

// Function to extract table data from B2CS data
function extractTableData(b2csData) {
   const tableData = [];

   // Try different possible data structures
   let dataArray = null;

   if (b2csData && b2csData.b2cs && Array.isArray(b2csData.b2cs)) {
      dataArray = b2csData.b2cs;
   } else if (b2csData && Array.isArray(b2csData)) {
      dataArray = b2csData;
   } else if (b2csData && b2csData.data && Array.isArray(b2csData.data)) {
      dataArray = b2csData.data;
   }

   if (dataArray && Array.isArray(dataArray)) {
      dataArray.forEach((item, index) => {
         const stateCode = item.pos || "";
         const stateName = STATE_NAMES[stateCode] || "Unknown State";
         const selectedState = selectedGSTState.value;
         const isSelectedState = stateCode === selectedState;

         tableData.push({
            id: index + 1,
            stateCode: stateCode,
            stateName: stateName,
            txval: parseFloat(item.txval) || 0,
            stats: isSelectedState ? "Your State" : "Other State",
         });
      });
   }

   return tableData;
}

// Function to populate the B2CS table
function populateB2CsTable(b2csData) {
   currentB2CsData = b2csData;
   const tableData = extractTableData(b2csData);
   filteredData = [...tableData];

   renderTable(filteredData);
   updateResultsCount(filteredData.length);
}

// Function to update results count
function updateResultsCount(count) {
   showNumberOfResults.textContent = count;
}

// Function to render table rows
function renderTable(data) {
   b2csTableBody.innerHTML = "";

   if (data.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML =
         '<td colspan="4" style="text-align: center; padding: 2rem; opacity: 0.7;">No data found</td>';
      b2csTableBody.appendChild(emptyRow);
      return;
   }

   data.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
         <td><strong>${item.stateCode}</strong></td>
         <td>${item.stateName}</td>
         <td>₹${item.txval.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
         })}</td>
         <td><span class="stats-badge ${
            item.stats === "Your State" ? "your-state" : "other-state"
         }">${item.stats}</span></td>
      `;
      b2csTableBody.appendChild(row);
   });
}

// Function to filter data based on search
function filterData() {
   const searchTerm = stateSearchInput.value.toLowerCase();
   const allData = extractTableData(currentB2CsData);

   filteredData = allData.filter((item) => {
      const matchesSearch =
         item.stateName.toLowerCase().includes(searchTerm) ||
         item.stateCode.toLowerCase().includes(searchTerm);
      return matchesSearch;
   });

   renderTable(filteredData);
   updateResultsCount(filteredData.length);
}

// Initialize the UI state
function initializeUI() {
   // Initially hide search container and center toggle button
   if (searchContainer && moreInfo) {
      searchContainer.classList.add("hidden-transition");
      moreInfo.classList.add("center-toggle");
   }
}

// Event listener for search
stateSearchInput.addEventListener("input", filterData);

// Initialize UI when page loads
initializeUI();
