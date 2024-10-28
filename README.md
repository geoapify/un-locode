# @geoapify/un-locode

A Node.js library for querying United Nations Location Code ([UN/LOCODE](https://unece.org/trade/cefact/unlocode-code-list-country-and-territory)) data. This library provides easy access to UN/LOCODE data, allowing users to retrieve location details using country and location codes.

## Installation

Install the package via npm:

```bash
npm install @geoapify/un-locode
```

## Usage

Import the `query` function from the package. Use the function with `await` to fetch location details by specifying the country code and location code.

```javascript
const { query } = require('@geoapify/un-locode');

(async () => {
  try {
    const result = await query('US', 'APG');
    console.log(result);
  } catch (error) {
    console.error('Error fetching location data:', error);
  }
})();
```

### Parameters

- **countryCode** (string): The ISO 3166-1 alpha-2 country code, such as `US` for the United States.
- **locationCode** (string): The three-character location code, such as `APG` for Aberdeen.

### Response

The `query` function returns a Promise resolving to an object with location data. If the specified code is not found, it returns `null`. Example response:

```json
{
  "country": "US",
  "location": "APG",
  "locationName": "Aberdeen",
  "subdivision": "MD",
  "status": "AI",
  "functionCodes": ["3", "4"],
  "coordinates": {
    "lat": 39.5120347,
    "lon": -76.1643289
  }
}
```

- **country**: The ISO country code of the location.
- **location**: The location code within the specified country.
- **locationName**: The name of the location.
- **subdivision**: Subdivision code (e.g., state or province), if available.
- **status**: Location status code.
- **functionCodes**: Array of strings representing functional designation codes.
- **coordinates**: An object with `lat` (latitude) and `lon` (longitude) for geographic coordinates.

> **Note**: Some rows in the original UN/LOCODE data lack coordinates. We used the [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/) to find corresponding coordinates for these entries.

### Function Codes

Each defined function has a classifier; the most important are:

- **1** = Port (for any kind of waterborne transport)
- **2** = Rail terminal
- **3** = Road terminal
- **4** = Airport
- **5** = Postal exchange office
- **6** = Inland Clearance Depot (ICD) or "Dry Port", "Inland Clearance Terminal"
- **7** = Fixed transport functions (e.g., oil platform); the classifier "7" is reserved for this function. This includes terminals like oil pipelines and can be extended to electric power lines or ropeway terminals.
- **B** = Border crossing function
- **0** = Function not known, to be specified

### Status Codes

The status of the entry is indicated by a 2-character code, with the following codes currently in use:

- **AA**: Approved by a competent national government agency
- **AC**: Approved by Customs Authority
- **AF**: Approved by a national facilitation body
- **AI**: Code adopted by an international organization (e.g., IATA or ECLAC)
- **AM**: Approved by the UN/LOCODE Maintenance Agency
- **AQ**: Entry approved, functions not verified
- **AS**: Approved by a national standardization body
- **RL**: Recognized location; existence and representation confirmed by a nominated gazetteer or other reference
- **RN**: Request from credible national sources for locations within their own country
- **RQ**: Request under consideration
- **UR**: Entry included on user’s request; not officially approved
- **RR**: Request rejected
- **QQ**: Original entry not verified since the date indicated
- **XX**: Entry to be removed in the next issue of UN/LOCODE

## Error Handling

The function returns `null` if the location is not found. Ensure your application handles this scenario accordingly.

## Contributing

Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.