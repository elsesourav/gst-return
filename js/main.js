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
   localStorage.setItem('theme', themeName);
   document.documentElement.setAttribute('data-theme', themeName);
}

// Function to toggle between light and dark themes
function toggleTheme() {
   if (localStorage.getItem('theme') === 'dark') {
      setTheme('light');
   } else {
      setTheme('dark');
   }
}

// Check for saved theme preference or use system preference
function initTheme() {
   // Check if user previously selected a theme
   const savedTheme = localStorage.getItem('theme');
   
   if (savedTheme) {
      setTheme(savedTheme);
      return;
   }
   
   // Check for system preference
   const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
   
   if (prefersDarkScheme.matches) {
      setTheme('dark');
   } else {
      setTheme('light');
   }
}

// Initialize theme on page load
initTheme();

// Add event listener for theme toggle button
themeToggleBtn.addEventListener('click', toggleTheme);

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
         
         const docIssueData = getDocIssue(tableSheets);
         console.log(docIssueData);

         const hsnData = getHSNData(tableSheets);
         console.log(hsnData);
         

         const supecoData = getSupecoData(tableSheets, flipkartGSTNoValue);
         console.log(supecoData);

         

         const finalData = margeWithMainData(GST_ID, mmyy, {...b2csData, ...docIssueData, ...hsnData, ...supecoData});
         console.log(finalData);

         RESULT_FILE = { file: finalData, name: `${GST_ID}_${session}_ES.json` };
      };
   }
});

downloadJsonButton.addEventListener("click", () => {
   const { file, name } = RESULT_FILE;
   downloadJSON(file, name);
});


