import { WEB_JS_KEY } from '../config/googleApiKeys';

const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

export const placesService = {
  // Search for nearby places using fetch API
  async searchNearbyPlaces(latitude, longitude, radius = 1500, type = 'restaurant') {
    try {
      console.log('🔍 [PlacesService] Searching nearby places...', {
        latitude,
        longitude,
        radius,
        type,
      });

      const url = `${BASE_URL}/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${WEB_JS_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(
          `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`
        );
      }

      console.log(
        '✅ [PlacesService] Places search successful:',
        data.results.length,
        'places found'
      );

      return data.results.map((place) => ({
        place_id: place.place_id,
        name: place.name,
        rating: place.rating,
        vicinity: place.vicinity,
        geometry: place.geometry,
        types: place.types,
        price_level: place.price_level,
        opening_hours: place.opening_hours,
        photos: place.photos,
      }));
    } catch (error) {
      console.error('❌ [PlacesService] Error searching nearby places:', error);
      throw error;
    }
  },

  // Get place details using fetch API
  async getPlaceDetails(placeId) {
    try {
      console.log('📍 [PlacesService] Getting place details for:', placeId);

      const fields =
        'name,formatted_address,address_components,rating,user_ratings_total,formatted_phone_number,website,opening_hours,reviews,photos,types';
      const url = `${BASE_URL}/details/json?place_id=${placeId}&fields=${fields}&key=${WEB_JS_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(
          `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`
        );
      }

      console.log('✅ [PlacesService] Place details loaded:', data.result.name);

      const place = data.result;
      return {
        place_id: placeId,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        totalRatings: place.user_ratings_total,
        phone: place.formatted_phone_number || '-',
        website: place.website,
        openingHours: place.opening_hours?.weekday_text || [],
        reviews: place.reviews?.slice(0, 3) || [], // İlk 3 yorumu al
        photos: place.photos || [],
      };
    } catch (error) {
      console.error('❌ [PlacesService] Error getting place details:', error);
      throw error;
    }
  },

  // Search places by text using fetch API
  async searchPlacesByText(query, latitude, longitude) {
    try {
      console.log('🔍 [PlacesService] Searching places by text:', query);

      const url = `${BASE_URL}/textsearch/json?query=${encodeURIComponent(query)}&location=${latitude},${longitude}&radius=50000&key=${WEB_JS_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(
          `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`
        );
      }

      console.log(
        '✅ [PlacesService] Text search successful:',
        data.results.length,
        'places found'
      );

      return data.results.map((place) => ({
        place_id: place.place_id,
        name: place.name,
        rating: place.rating,
        vicinity: place.vicinity || place.formatted_address,
        geometry: place.geometry,
        types: place.types,
        price_level: place.price_level,
        opening_hours: place.opening_hours,
        photos: place.photos,
      }));
    } catch (error) {
      console.error('❌ [PlacesService] Error searching places by text:', error);
      throw error;
    }
  },

  // Reverse geocoding - koordinatlara göre adres bilgisi al
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      console.log('📍 [PlacesService] Getting address for coordinates:', latitude, longitude);

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${WEB_JS_KEY}&language=tr`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(
          `Google Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`
        );
      }

      if (data.results.length === 0) {
        return {
          formatted_address: `Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          address_components: [],
          short_address: 'Bilinmeyen konum',
        };
      }

      const result = data.results[0];
      const components = result.address_components;

      // Adres bileşenlerini ayıkla
      let street = '';
      let neighborhood = '';
      let district = '';
      let city = '';
      let province = '';
      let country = '';
      let postal_code = '';

      components.forEach((component) => {
        const { types } = component;
        if (types.includes('route')) {
          street = component.long_name;
        } else if (types.includes('neighborhood') || types.includes('sublocality')) {
          neighborhood = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          district = component.long_name;
        } else if (types.includes('administrative_area_level_3')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          province = component.long_name;
        } else if (types.includes('country')) {
          country = component.long_name;
        } else if (types.includes('postal_code')) {
          postal_code = component.long_name;
        }
      });

      // Kısa adres oluştur
      const shortAddressParts = [];
      if (neighborhood) shortAddressParts.push(neighborhood);
      if (district) shortAddressParts.push(district);
      if (province) shortAddressParts.push(province);

      console.log('✅ [PlacesService] Address found:', result.formatted_address);

      return {
        formatted_address: result.formatted_address,
        short_address: shortAddressParts.join(', ') || 'Bilinmeyen konum',
        street,
        neighborhood,
        district,
        city,
        province,
        country,
        postal_code,
        address_components: components,
      };
    } catch (error) {
      console.error('❌ [PlacesService] Error getting address:', error);
      return {
        formatted_address: `Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        address_components: [],
        short_address: 'Adres bilgisi alınamadı',
      };
    }
  },
};
