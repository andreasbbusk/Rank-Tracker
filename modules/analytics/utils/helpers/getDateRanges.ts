export function getDateRanges({
  searchParams,
  isSearchConsole = false,
}: {
  searchParams: {
    range?: string;
    rangeCompare?: string;
  };
  isSearchConsole?: boolean;
}) {
  const date = new Date();

  let currentDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);

  if (isSearchConsole) {
    currentDate = new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000);
  }

  let millisecondsPerDay = 29 * 24 * 60 * 60 * 1000;

  if (isSearchConsole) {
    millisecondsPerDay = 30 * 24 * 60 * 60 * 1000;
  }

  // Subtract 30 days from today
  const thirtyDaysAgo = new Date(currentDate.getTime() - millisecondsPerDay);

  let fromDate = thirtyDaysAgo.toISOString().split("T")[0];
  let toDate = currentDate.toISOString().split("T")[0];

  if (searchParams.range) {
    fromDate = searchParams.range.split("_")[0];
    toDate = searchParams.range.split("_")[1];
  }

  let rangeCompareFrom;
  let rangeCompareTo;
  let dateRanges = [
    {
      start_date: fromDate,
      end_date: toDate,
    },
  ];

  if (searchParams.rangeCompare) {
    rangeCompareFrom = searchParams.rangeCompare.split("_")[0];
    rangeCompareTo = searchParams.rangeCompare.split("_")[1];

    const newDateRanges = [
      ...dateRanges,
      {
        start_date: new Date(rangeCompareFrom).toISOString().split("T")[0],
        end_date: new Date(rangeCompareTo).toISOString().split("T")[0],
      },
    ];

    dateRanges = newDateRanges;
  }

  const placeholderDateRangeString = `&range=${dateRanges[0].start_date}_${dateRanges[0].end_date}`;

  let dataRangeString = placeholderDateRangeString;

  if (searchParams.range) {
    dataRangeString = `&range=${searchParams.range}`;
  }

  if (searchParams.rangeCompare) {
    dataRangeString += `&rangeCompare=${searchParams.rangeCompare}`;
  }

  return {
    dateRanges,
    fromDate,
    toDate,
    rangeCompareFrom,
    rangeCompareTo,
    placeholderDateRangeString,
    dataRangeString,
  };
}
