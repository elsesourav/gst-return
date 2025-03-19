const selectSession = document.getElementById("selectSession");
const generateJsonButton = document.getElementById("generateJson");
const downloadJsonButton = document.getElementById("_click_to_download_");

// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

let selectedFile;
let RESULT_FILES = [];
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


// Function to load Excel file from URL
async function loadExcelFromURL(url) {
   try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      processWorkbook(workbook);
   } catch (error) {
      console.error("Error loading Excel file:", error);
      document.getElementById("jsondata").innerHTML =
         "Error loading Excel file: " + error.message;
   }
}


generateJsonButton.addEventListener("click", () => {
   const session = selectSession.value;
   const [yy, mm] = session.split("-");
   const mmyy = `${mm}${yy}`

   if (selectedFile && session) {
      let fileReader = new FileReader();
      fileReader.readAsBinaryString(selectedFile);
      fileReader.onload = (event) => {
         const data = event.target.result;
         const workbook = XLSX.read(data, { type: "binary" });
         const sheets = workbook.Sheets;
         const GST_ID = ifFindThenGetGstID(sheets);

         RESULT_FILES = [];
         
         const b2csData = getB2CsData(sheets, GST_ID, mmyy);
         RESULT_FILES.push({ file: b2csData, name: `B2CS_(7)_${GST_ID}_${session}_ES.json`});
         console.log(b2csData);
      };
   }
});


downloadJsonButton.addEventListener("click", () => {
   RESULT_FILES.forEach(({ file, name }) => {
      downloadCSV(file, name);
   })
});
