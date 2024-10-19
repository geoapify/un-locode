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
    status: Status;
    function: Array<FunctionCode>;
    date: string;
    iata: string
    coordinates: Coordinates;
    remarks: string;
}

export enum Status {
    APPROVED_BY_COMPETENT_NATIONAL_GOVERNMENT_AGENCY,
    APPROVED_BY_CUSTOMS_AUTHORITY,
    APPROVED_BY_NATIONAL_FACILITATION_BODY,
    CODE_ADOPTED_BY_INTERNATIONAL_ORGANISATION,
    APPROVED_BY_UN_LOCODE_MAINTENANCE_AGENCY,
    ENTRY_APPROVED_FUNCTIONS_NOT_VERIFIED,
    APPROVED_BY_NATIONAL_STANDARDISATION_BODY,
    RECOGNISED_LOCATION,
    REQUEST_FROM_CREDIBLE_NATIONAL_SOURCES,
    REQUEST_UNDER_CONSIDERATION,
    ENTRY_INCLUDED_ON_USER_REQUEST,
    REQUEST_REJECTED,
    ORIGINAL_ENTRY_NOT_VERIFIED,
    ENTRY_TO_BE_REMOVED_NEXT_ISSUE
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
