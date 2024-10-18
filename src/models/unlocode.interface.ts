export interface UnlocodeItem {
    fullCode: string;
    locationName: string;  // Location name
    subdivision?: string;  // Subdivision or state (optional)
    status: Status;  // Status
    functionCodes: FunctionCode[];  // Function codes (optional)
    coordinates?: Coordinates;  // Coordinates (latitude and longitude, optional)
}

export interface UnlocodeJsonItem {
    change: string;
    country: string;
    location: string;
    name: string;
    nameWoDiacritics: string;
    subdivision: string;
    status: string;
    function: Array<FunctionCode>;
    date: string;
    iata: string
    coordinates: Coordinates;
    remarks: string;
}

export enum Status {
    ACTIVE,
    INACTIVE
}

export enum FunctionCode {
    PORT,
    RAIL_TERMINAL,
    ROAD_TERMINAL,
    AIRPORT,
    POSTAL_EXCHANGE_OFFICE,
    INLAND_CLEARANCE_DEPOT,
    FIXED_TRANSPORT_FUNCTIONS,
    BORDER_CROSSING_FUNCTION,
    FUNCTION_NOT_KNOWN
}

export interface Coordinates {
    lat: number;
    lon: number;
}
