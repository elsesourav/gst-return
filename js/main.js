let selectedFile;
// console.log(window.XLSX);
document.getElementById("input").addEventListener("change", (event) => {
   selectedFile = event.target.files[0];
});
const selectSession = document.getElementById("selectSession");

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

// Function to process workbook and generate CSVs
function processWorkbook(workbook) {
   workbook.SheetNames.forEach((sheet) => {
      try {
         const worksheet = workbook.Sheets[sheet];
         const csv = worksheetToCSV(worksheet);
         downloadCSV(csv, `${sheet}.csv`);
      } catch (error) {
         console.error(`Error processing sheet ${sheet}:`, error);
      }
   });
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


document.getElementById("button").addEventListener("click", () => {

   if (selectedFile) {
      let fileReader = new FileReader();
      fileReader.readAsBinaryString(selectedFile);
      fileReader.onload = (event) => {
         const data = event.target.result;
         const workbook = XLSX.read(data, { type: "binary" });
         const sheets = workbook.Sheets;
         const GST_ID = ifFindThenGetGstID(sheets);
         const session = selectSession.value;
         const [yy, mm] = session.split("-");
         const mmyy = `${mm}${yy}`
         console.log(yy, mm);
         
         
         const b2csData = getB2CsData(sheets, GST_ID, mmyy);
         console.log(b2csData);

         
         

      };
   }
});
