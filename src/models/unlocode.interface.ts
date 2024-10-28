export interface UnlocodeItem {
    country: string;
    location: string;
    locationName: string;  // Location name
    subdivision?: string;  // Subdivision or state (optional)
    status: string;  // Status
    functionCodes: string[];  // Function codes (optional)
    coordinates?: {
        lat: number;
        lon: number;
    };  // Coordinates (latitude and longitude, optional)
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
    iata: string;
    lat?: number;
    lon?: number;
    remarks: string;
    geocoded?: boolean;
}
export interface LoadedFile {
    loadDate: Date;
    data: Array<UnlocodeJsonItem>;
}
