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
    function: string;
    date: string;
    iata: string
    coordinates: string;
    remarks: string;
}

export enum Status {
    ACTIVE,
    INACTIVE
}

export enum FunctionCode {
    Seaport = 'Seaport',
    Airport = 'Airport',
    RailTerminal = 'RailTerminal',
    RoadTerminal = 'RoadTerminal',
    PostalExchange = 'PostalExchange',
    InlandPort = 'InlandPort',
    FixedTransport = 'FixedTransport',
    BorderCrossing = 'BorderCrossing',
}

export interface Coordinates {
    lat: number;
    lon: number;
}
