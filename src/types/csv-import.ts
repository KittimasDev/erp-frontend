export type CsvImportRowError = {
  row: number;
  message: string;
};

export type CsvImportResult = {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: CsvImportRowError[];
};

export type CsvImportApiResponse = {
  message: string;
  data: CsvImportResult;
};
