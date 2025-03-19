const STATES = {
   "jammu & kashmir": { id: "01", name: "Jammu & Kashmir" },
   "jammu and kashmir": { id: "01", name: "Jammu & Kashmir" },
   "himachal pradesh": { id: "02", name: "Himachal Pradesh" },
   punjab: { id: "03", name: "Punjab" },
   chandigarh: { id: "04", name: "Chandigarh" },
   uttarakhand: { id: "05", name: "Uttarakhand" },
   haryana: { id: "06", name: "Haryana" },
   delhi: { id: "07", name: "Delhi" },
   rajasthan: { id: "08", name: "Rajasthan" },
   "uttar pradesh": { id: "09", name: "Uttar Pradesh" },
   bihar: { id: "10", name: "Bihar" },
   sikkim: { id: "11", name: "Sikkim" },
   "arunachal pradesh": { id: "12", name: "Arunachal Pradesh" },
   nagaland: { id: "13", name: "Nagaland" },
   manipur: { id: "14", name: "Manipur" },
   mizoram: { id: "15", name: "Mizoram" },
   tripura: { id: "16", name: "Tripura" },
   meghalaya: { id: "17", name: "Meghalaya" },
   assam: { id: "18", name: "Assam" },
   "west bengal": { id: "19", name: "West Bengal" },
   jharkhand: { id: "20", name: "Jharkhand" },
   odisha: { id: "21", name: "Odisha" },
   chhattisgarh: { id: "22", name: "Chhattisgarh" },
   "madhya pradesh": { id: "23", name: "Madhya Pradesh" },
   gujarat: { id: "24", name: "Gujarat" },
   "daman & diu": { id: "25", name: "Daman & Diu" },
   "daman and diu": { id: "25", name: "Daman & Diu" },
   "dadra & nagar haveli & daman & diu": {
      id: "26",
      name: "Dadra & Nagar Haveli & Daman & Diu",
   },
   "dadra and nagar haveli and daman and diu": {
      id: "26",
      name: "Dadra & Nagar Haveli & Daman & Diu",
   },
   "dadra and nagar haveli": {
      id: "26",
      name: "Dadra & Nagar Haveli & Daman & Diu",
   },
   "dadra & nagar haveli": {
      id: "26",
      name: "Dadra & Nagar Haveli & Daman & Diu",
   },
   maharashtra: { id: "27", name: "Maharashtra" },
   karnataka: { id: "29", name: "Karnataka" },
   goa: { id: "30", name: "Goa" },
   lakshdweep: { id: "31", name: "Lakshdweep" },
   kerala: { id: "32", name: "Kerala" },
   "tamil nadu": { id: "33", name: "Tamil Nadu" },
   puducherry: { id: "34", name: "Puducherry" },
   pondicherry: { id: "34", name: "Puducherry" },
   "andaman & nicobar islands": { id: "35", name: "Andaman & Nicobar Islands" },
   "andaman and nicobar islands": {
      id: "35",
      name: "Andaman & Nicobar Islands",
   },
   telangana: { id: "36", name: "Telangana" },
   "andhra pradesh": { id: "37", name: "Andhra Pradesh" },
   ladakh: { id: "38", name: "Ladakh" },
};

function findBestMatchingState(input) {
   input = input.toLowerCase().trim();

   if (STATES[input]) {
      return STATES[input];
   }

   const inputWords = input.split(/\s+/);
   let bestMatch = null;
   let maxMatchCount = 0;

   for (const key of Object.keys(STATES)) {
      const keyWords = key.split(/\s+/);
      let matchCount = 0;

      // Count matching words
      for (const word of inputWords) {
         if (keyWords.includes(word)) {
            matchCount++;
         }
      }

      if (matchCount > maxMatchCount) {
         maxMatchCount = matchCount;
         bestMatch = key;
      }
   }

   return bestMatch ? STATES[bestMatch] : null;
}

function ifFindThenGetKey(obj, value) {
   for (const key in obj) {
      if (obj[key].includes(value)) {
         return key;
      }
   }
   return null;
}

function b2csGetByMyState(table, sellerState = "West Bengal") {
   const tableTitle = table[1];
   const atvName = ifFindThenGetKey(tableTitle, "Aggregate Taxable Value");
   const cmName = ifFindThenGetKey(tableTitle, "CESS Amount");
   const cgstName = ifFindThenGetKey(tableTitle, "CGST");
   const sgstName = ifFindThenGetKey(tableTitle, "SGST/UT");
   if (atvName === null || cgstName === null) {
      return null;
   }

   delete table[1];
   const data = {};

   for (const n in table) {
      const row = table[n];
      const tax = +parseFloat(row[atvName] || 0).toFixed(2);
      const csamt = +parseFloat(row[cmName] || 0).toFixed(2);
      const igst = row[cgstName] || 0;
      const sgst = row[sgstName] || 0;

      const stateIDName = findBestMatchingState(sellerState);
      if (!stateIDName) {
         console.log("Not Found", sellerState);
         continue;
      }
      const { id, name } = stateIDName;

      const gstTotal = +parseFloat(parseFloat(igst) + parseFloat(sgst)).toFixed(
         2
      );

      if (!data[id]) {
         data[id] = {};
         data[id][gstTotal] = { tax, name, csamt };
         continue;
      }

      if (!data[id][gstTotal]) data[id][gstTotal] = { tax, name, csamt };
      else {
         data[id][gstTotal].tax += tax;
         data[id][gstTotal].csamt += csamt;
      }
   }

   return data;
}

function b2csGetByOthersState(table) {
   const tableTitle = table[1];
   const atvName = ifFindThenGetKey(tableTitle, "Aggregate Taxable Value");
   const dsName = ifFindThenGetKey(tableTitle, "Delivered State");
   const cmName = ifFindThenGetKey(tableTitle, "CESS Amount");
   const igstName = ifFindThenGetKey(tableTitle, "IGST");
   if (atvName === null || dsName === null || igstName === null) {
      return null;
   }

   delete table[1];
   const data = {};

   for (const n in table) {
      const row = table[n];
      const tax = +parseFloat(row[atvName] || 0).toFixed(2);
      const igst = +parseFloat(row[igstName] || 0).toFixed(2);
      const csamt = +parseFloat(row[cmName] || 0).toFixed(2);

      const stateIDName = findBestMatchingState(row[dsName]);
      if (!stateIDName) {
         console.log("Not Found", sellerState);
         continue;
      }
      const { id, name } = stateIDName;

      if (!data[id]) {
         data[id] = {};
         data[id][igst] = { tax, name, csamt };
         continue;
      }

      if (!data[id][igst]) data[id][igst] = { tax, name, csamt };
      else {
         data[id][igst].tax += tax;
         data[id][igst].csamt += csamt;
      }
   }

   return data;
}

function ifFindThenGetGstID(sheets) {
   let names = [];
   let gstId = null;

   for (const name in sheets) {
      if (
         name.includes("Section 7(A)(2)") ||
         name.includes("Section 7(B)(2)")
      ) {
         names.push(name);
      }
   }

   names.forEach((name) => {
      const sheet = sheets[name];
      const cellTable = getSheetDataToTable(sheet);
      const tableTitle = cellTable[1];
      const GSTIN = ifFindThenGetKey(tableTitle, "GSTIN");

      if (cellTable[2]?.[GSTIN] && !gstId) {
         gstId = cellTable[2]?.[GSTIN];
      }
   });

   return gstId;
}

function margeDataWithOthersDetails(data, GST_ID, session, myStateCode = "19") {
   const rows = [];
   let totalTaxableValue = 0;
   let integratedTax = 0;
   let centralTax = 0;
   let stateUTTax = 0;

   for (const sCode in data) {
      const row = data[sCode];

      for (const per in row) {
         const { tax, csamt } = row[per];
         const iamt = +((tax * per) / 100).toFixed(2);
         totalTaxableValue += tax;

         // for others state
         if (sCode !== myStateCode) {
            rows.push({
               sply_ty: "INTER",
               rt: +per,
               typ: "OE",
               pos: sCode,
               txval: tax,
               iamt: iamt,
               csamt: csamt,
            });
            integratedTax += iamt;

         // for my state
         } else {
            const halfGst = +(iamt / 2).toFixed(2);
            rows.push({
               sply_ty: "INTRA",
               rt: +per,
               typ: "OE",
               pos: sCode,
               txval: tax,
               camt: halfGst,
               samt: halfGst,
               csamt: csamt,
            });
            centralTax += halfGst;
            stateUTTax += halfGst;
         }
      }
   }

   const finalData = {
      gstin: GST_ID,
      fp: session,
      version: "GST3.2.1",
      hash: "hash",
      b2cs: [...rows],
   };

   _total_taxable_value_.innerText = totalTaxableValue.toFixed(2);
   _integrated_tax_.innerText = integratedTax.toFixed(2);
   _central_tax_.innerText = centralTax.toFixed(2);
   _state_ut_tax_.innerText = stateUTTax.toFixed(2);
   taxOutputSection.classList.remove("hidden");
   _seller_gst_no_.innerText = GST_ID;

   return finalData;
}

function getB2CsData(sheets, GST_ID, session) {
   let b2csData = {};

   for (const name in sheets) {
      const sheet = sheets[name];
      const cellTable = getSheetDataToTable(sheet);

      if (name.includes("Section 7(A)(2)")) {
         const localStateData = b2csGetByMyState(cellTable, "West Bengal");
         if (localStateData) b2csData = localStateData;
      } else if (name.includes("Section 7(B)(2)")) {
         const othersStateData = b2csGetByOthersState(cellTable);
         if (othersStateData) b2csData = { ...b2csData, ...othersStateData };
      }
   }

   console.log(b2csData);
   return margeDataWithOthersDetails(b2csData, GST_ID, session);
}
