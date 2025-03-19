function getCellId(id) {
   const match = id.match(/^([A-Za-z]+)(\d+)$/);
   if (match?.[2] === undefined) {
      return [null, null]
   }
   return [match[1], Number(match[2])];
}

function getSheetDataToTable(sheet) {
   let data = {};
   for (const cellId in sheet) {
      const [id, n] = getCellId(cellId);
      if (id === null) continue;
      if (!data[n]) data[n] = {};
      
      data[n][id] = sheet[cellId].v;
   }
   return data;
}