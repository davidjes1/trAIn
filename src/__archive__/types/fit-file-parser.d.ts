// Type declaration for fit-file-parser module
declare module 'fit-file-parser' {
  interface FitParserOptions {
    speedUnit?: 'km/h' | 'm/s' | 'mph';
    lengthUnit?: 'km' | 'mi' | 'm';
    temperatureUnit?: 'celsius' | 'kelvin' | 'fahrenheit';
    mode?: 'cascade' | 'list' | 'both';
    elapsedRecordField?: boolean;
    force?: boolean;
  }

  interface FitData {
    activity?: any;
    sessions?: any[];
    laps?: any[];
    records?: any[];
    events?: any[];
    device_infos?: any[];
    [key: string]: any;
  }

  type FitParserCallback = (error: Error | null, data?: FitData) => void;

  class FitParser {
    constructor(options?: FitParserOptions);
    parse(buffer: Buffer, callback: FitParserCallback): void;
  }

  export = FitParser;
}