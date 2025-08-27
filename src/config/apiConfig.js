// Config dosyası - API anahtarları ve ayarlar
export const config = {
  GOOGLE_MAPS_API_KEY: 'AIzaSyBxgDpK3-dWsuXewlIWB68ubkuH4Q4eEB8',
  MAPBOX_TOKEN: 'pk.eyJ1IjoiZWhoaHciLCJhIjoiY21lOTM1a2xnMDRrbzJpcnpjNDR2NnVrYyJ9.NB-W5Qu0l0-QINfc8tPq_A',
  
  // Map ayarları
  MAP_SETTINGS: {
    DEFAULT_LOCATION: {
      latitude: 41.0082,
      longitude: 28.9784 // İstanbul
    },
    DEFAULT_ZOOM: 12,
    SEARCH_RADIUS: 2000, // 2km
    MAX_MARKERS: 20
  },
  
  // API endpoints
  ENDPOINTS: {
    GOOGLE_PLACES_NEARBY: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
    GOOGLE_PLACES_TEXT_SEARCH: 'https://maps.googleapis.com/maps/api/place/textsearch/json',
    MAPBOX_GEOCODING: 'https://api.mapbox.com/geocoding/v5/mapbox.places'
  }
};

export default config;
