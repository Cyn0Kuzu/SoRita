// Google Maps & Places API Configuration
export const GoogleConfig = {
  // API Keys
  API_KEY: 'AIzaSyBxgDpK3-dWsuXewlIWB68ubkuH4Q4eEB8',
  
  // API Endpoints
  ENDPOINTS: {
    PLACES_NEARBY: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
    PLACES_TEXT_SEARCH: 'https://maps.googleapis.com/maps/api/place/textsearch/json',
    PLACES_DETAILS: 'https://maps.googleapis.com/maps/api/place/details/json',
    PLACES_AUTOCOMPLETE: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
    GEOCODING: 'https://maps.googleapis.com/maps/api/geocode/json',
    DIRECTIONS: 'https://maps.googleapis.com/maps/api/directions/json'
  },
  
  // Default Settings
  DEFAULT_SETTINGS: {
    location: {
      latitude: 41.0082,
      longitude: 28.9784, // İstanbul
      zoom: 12
    },
    search: {
      radius: 2000, // 2km
      maxResults: 20
    }
  },
  
  // Place Types for Category Search
  PLACE_TYPES: {
    restaurant: { name: 'Restoran', icon: 'restaurant' },
    cafe: { name: 'Kafe', icon: 'local-cafe' },
    hospital: { name: 'Hastane', icon: 'local-hospital' },
    bank: { name: 'Banka', icon: 'account-balance' },
    supermarket: { name: 'Market', icon: 'store' },
    gas_station: { name: 'Benzin İstasyonu', icon: 'local-gas-station' },
    lodging: { name: 'Otel', icon: 'hotel' },
    pharmacy: { name: 'Eczane', icon: 'local-pharmacy' },
    school: { name: 'Okul', icon: 'school' },
    shopping_mall: { name: 'AVM', icon: 'local-mall' },
    tourist_attraction: { name: 'Turistik Yer', icon: 'place' },
    gym: { name: 'Spor Salonu', icon: 'fitness-center' }
  }
};

// Helper Functions
export const GooglePlacesAPI = {
  // Yakındaki Mekanları Getir
  async getNearbyPlaces(lat, lng, type = null, radius = 2000) {
    try {
      let url = `${GoogleConfig.ENDPOINTS.PLACES_NEARBY}?location=${lat},${lng}&radius=${radius}&key=${GoogleConfig.API_KEY}`;
      
      if (type) url += `&type=${type}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Nearby Places API Error:', error);
      throw error;
    }
  },
  
  // Metin Araması
  async textSearch(query, lat = null, lng = null) {
    try {
      let url = `${GoogleConfig.ENDPOINTS.PLACES_TEXT_SEARCH}?query=${encodeURIComponent(query)}&key=${GoogleConfig.API_KEY}`;
      
      if (lat && lng) {
        url += `&location=${lat},${lng}&radius=10000`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Text Search API Error:', error);
      throw error;
    }
  },
  
  // Otomatik Tamamlama
  async getAutocomplete(input, lat = null, lng = null) {
    try {
      let url = `${GoogleConfig.ENDPOINTS.PLACES_AUTOCOMPLETE}?input=${encodeURIComponent(input)}&key=${GoogleConfig.API_KEY}`;
      
      if (lat && lng) {
        url += `&location=${lat},${lng}&radius=50000`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Autocomplete API Error:', error);
      throw error;
    }
  },
  
  // Mekan Detayları
  async getPlaceDetails(placeId) {
    try {
      const url = `${GoogleConfig.ENDPOINTS.PLACES_DETAILS}?place_id=${placeId}&fields=name,rating,formatted_phone_number,formatted_address,opening_hours,website,photos,reviews,price_level&key=${GoogleConfig.API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Place Details API Error:', error);
      throw error;
    }
  },
  
  // Fotoğraf URL'si Oluştur
  getPhotoUrl(photoReference, maxWidth = 400) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GoogleConfig.API_KEY}`;
  }
};

export default GoogleConfig;
