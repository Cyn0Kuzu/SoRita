// Ortak listeler için kullanıcı renkleri sistemi
export const COLLABORATOR_COLORS = [
  '#FF6B6B', // Kırmızı
  '#4ECDC4', // Turkuaz
  '#45B7D1', // Mavi
  '#96CEB4', // Yeşil
  '#FFEAA7', // Sarı
  '#DDA0DD', // Mor
  '#FFB347', // Turuncu
  '#98D8C8', // Mint
  '#F7DC6F', // Altın
  '#BB8FCE', // Lavanta
  '#85C1E9', // Açık Mavi
  '#A9DFBF', // Açık Yeşil
  '#F8C471', // Açık Turuncu
  '#D7BDE2', // Açık Mor
  '#AED6F1', // Bebek Mavisi
  '#A3E4D7', // Su Yeşili
  '#FAD7A0', // Krem
  '#D5A6BD', // Pembe
  '#A9CCE3', // Gri Mavi
  '#D2B4DE'  // Gri Mor
];

// Kullanıcı için benzersiz renk ataması
export const assignUserColor = (userId, existingAssignments = {}) => {
  // Eğer bu kullanıcı için zaten renk atanmışsa, onu döndür
  if (existingAssignments[userId]) {
    return existingAssignments[userId];
  }

  // Kullanılan renkleri bul
  const usedColors = Object.values(existingAssignments);
  
  // Kullanılmamış renk bul
  const availableColors = COLLABORATOR_COLORS.filter(color => !usedColors.includes(color));
  
  // Eğer tüm renkler kullanılmışsa, hash ile deterministik renk seç
  if (availableColors.length === 0) {
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
  }
  
  // İlk kullanılmamış rengi seç
  return availableColors[0];
};

// Liste için kullanıcı renk atamaları oluştur
export const generateColorAssignments = (userIds) => {
  const assignments = {};
  
  // İlk kullanıcı (liste sahibi) her zaman ilk rengi alır
  userIds.forEach((userId, index) => {
    if (index === 0) {
      // Liste sahibi her zaman ilk renk (kırmızı)
      assignments[userId] = COLLABORATOR_COLORS[0];
    } else {
      // Diğer kullanıcılar sırayla diğer renkleri alır
      assignments[userId] = assignUserColor(userId, assignments);
    }
  });
  
  return assignments;
};

// Rengin kontrast rengini bul (yazı için)
export const getContrastColor = (hexColor) => {
  // Hex'i RGB'ye çevir
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Luminance hesapla
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// Rengi daha açık hale getir (marker arka planı için)
export const lightenColor = (hexColor, amount = 0.3) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
  const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
  const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};
