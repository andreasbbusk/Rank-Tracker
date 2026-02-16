export function myCustomSorting(rowA: any, rowB: any, columnId: string) {
  const getValue = (row: any) => {
    const rawValue = row.getValue(columnId);
    const numericValue = parseFloat(String(rawValue).split("!!")[0]);
    return numericValue;
  };

  const valA = getValue(rowA);
  const valB = getValue(rowB);

  // Handle null or undefined values gracefully
  if (valA === null || valA === undefined) return 1;
  if (valB === null || valB === undefined) return -1;

  // Return comparison result based on ascending or descending order
  return valA < valB ? 1 : valA > valB ? -1 : 0;
}

export function myCustomCompareSorting(rowA: any, rowB: any, columnId: string) {
  const getValue = (row: any) => {
    const rawValue = row.getValue(columnId);
    const numericValue = parseFloat(String(rawValue).split("!!")[1] || "0");
    return numericValue;
  };

  const valA = getValue(rowA);
  const valB = getValue(rowB);

  // Handle null or undefined values gracefully
  if (valA === null || valA === undefined) return 1;
  if (valB === null || valB === undefined) return -1;

  // Return comparison result based on ascending or descending order
  return valA < valB ? 1 : valA > valB ? -1 : 0;
}

export function number(rowA: any, rowB: any, columnId: string) {
  const getValue = (row: any) => {
    const rawValue = row.getValue(columnId);
    const numericValue = Number(String(rawValue));
    return numericValue;
  };

  const valA = getValue(rowA);
  const valB = getValue(rowB);

  // Handle null or undefined values gracefully
  if (valA === null || valA === undefined) return 1;
  if (valB === null || valB === undefined) return -1;

  // Return comparison result based on ascending or descending order
  return valA < valB ? 1 : valA > valB ? -1 : 0;
}

export function currency(rowA: any, rowB: any, columnId: string) {
  const getValue = (row: any) => {
    const rawValue = row.getValue(columnId);
    const numericValue = Number(
      rawValue.replaceAll(",", ".").replace(" kr.", ""),
    );
    return numericValue;
  };

  const valA = getValue(rowA);
  const valB = getValue(rowB);

  // Handle null or undefined values gracefully
  if (valA === null || valA === undefined) return 1;
  if (valB === null || valB === undefined) return -1;

  // Return comparison result based on ascending or descending order
  return valA < valB ? 1 : valA > valB ? -1 : 0;
}

export function competition(rowA: any, rowB: any, columnId: string) {
  const getValue = (row: any) => {
    const rawValue = row.getValue(columnId);

    function returnValue(
      rawValue: "Ikke tilgængelig" | "Lav" | "Mellem" | "Høj",
    ) {
      switch (rawValue) {
        case "Ikke tilgængelig":
          return 0;
        case "Lav":
          return 1;
        case "Mellem":
          return 2;
        case "Høj":
          return 3;
        default:
          return 0;
      }
    }

    const numericValue = returnValue(rawValue);
    return numericValue;
  };

  const valA = getValue(rowA);
  const valB = getValue(rowB);

  // Handle null or undefined values gracefully
  if (valA === null || valA === undefined) return 1;
  if (valB === null || valB === undefined) return -1;

  // Return comparison result based on ascending or descending order
  return valA < valB ? 1 : valA > valB ? -1 : 0;
}
