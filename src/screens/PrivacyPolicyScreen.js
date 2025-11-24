import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Son güncelleme: 28 Ağustos 2025</Text>
          
          <Text style={styles.intro}>
            SoRita ("biz", "bizim" veya "uygulama"), kullanıcılarımızın gizliliğini korumaya kararlıdır. 
            Bu Gizlilik Politikası, SoRita mobil uygulamasını kullandığınızda kişisel bilgilerinizi 
            nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Topladığımız Bilgiler</Text>
            
            <Text style={styles.subTitle}>1.1 Kişisel Bilgiler</Text>
            <Text style={styles.bulletText}>• Hesap Bilgileri: Ad, e-posta adresi, profil fotoğrafı</Text>
            <Text style={styles.bulletText}>• Konum Bilgileri: Cihazınızın GPS konumu (izninizle)</Text>
            <Text style={styles.bulletText}>• İletişim Bilgileri: Arkadaş listesi ve mesajlar</Text>
            
            <Text style={styles.subTitle}>1.2 Otomatik Toplanan Bilgiler</Text>
            <Text style={styles.bulletText}>• Cihaz Bilgileri: Cihaz modeli, işletim sistemi, uygulama sürümü</Text>
            <Text style={styles.bulletText}>• Kullanım Verileri: Uygulama içi aktiviteler, özellik kullanımı</Text>
            <Text style={styles.bulletText}>• Teknik Veriler: IP adresi, cihaz tanımlayıcıları</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Bilgileri Nasıl Kullanıyoruz</Text>
            
            <Text style={styles.subTitle}>2.1 Hizmet Sağlama</Text>
            <Text style={styles.bulletText}>• Harita ve konum hizmetleri sunma</Text>
            <Text style={styles.bulletText}>• Yer önerileri ve kişiselleştirme</Text>
            <Text style={styles.bulletText}>• Arkadaşlarla liste paylaşımı</Text>
            
            <Text style={styles.subTitle}>2.2 İletişim</Text>
            <Text style={styles.bulletText}>• Önemli güncellemeler ve bildirimler</Text>
            <Text style={styles.bulletText}>• Teknik destek sağlama</Text>
            <Text style={styles.bulletText}>• Güvenlik uyarıları</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Bilgi Paylaşımı</Text>
            
            <Text style={styles.subTitle}>3.1 Paylaşmadığımız Durumlar</Text>
            <Text style={styles.bulletText}>• Kişisel bilgilerinizi üçüncü taraflarla satmayız</Text>
            <Text style={styles.bulletText}>• Pazarlama amacıyla bilgi paylaşmayız</Text>
            <Text style={styles.bulletText}>• Kullanıcı onayı olmadan hassas veri aktarmayız</Text>
            
            <Text style={styles.subTitle}>3.2 Paylaştığımız Durumlar</Text>
            <Text style={styles.bulletText}>• Hukuki Gereklilik: Yasal yükümlülükler</Text>
            <Text style={styles.bulletText}>• Güvenlik: Dolandırıcılık önleme</Text>
            <Text style={styles.bulletText}>• Hizmet Sağlayıcıları: Firebase, Google Maps (güvenli şekilde)</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Veri Güvenliği</Text>
            
            <Text style={styles.subTitle}>4.1 Teknik Önlemler</Text>
            <Text style={styles.bulletText}>• End-to-end şifreleme</Text>
            <Text style={styles.bulletText}>• Güvenli veri depolama</Text>
            <Text style={styles.bulletText}>• Düzenli güvenlik denetimleri</Text>
            
            <Text style={styles.subTitle}>4.2 Erişim Kontrolü</Text>
            <Text style={styles.bulletText}>• Güvenli kimlik doğrulama</Text>
            <Text style={styles.bulletText}>• Oturum güvenliği</Text>
            <Text style={styles.bulletText}>• Erişim logları</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Kullanıcı Hakları</Text>
            
            <Text style={styles.subTitle}>5.1 KVKK Kapsamında Haklarınız</Text>
            <Text style={styles.bulletText}>• Bilgi Alma: Hangi verilerinizin işlendiğini öğrenme</Text>
            <Text style={styles.bulletText}>• Düzeltme: Yanlış bilgileri düzeltme</Text>
            <Text style={styles.bulletText}>• Silme: Hesabınızı ve verilerinizi silme</Text>
            <Text style={styles.bulletText}>• Taşınabilirlik: Verilerinizi başka platforma aktarma</Text>
            
            <Text style={styles.subTitle}>5.2 Kontrol Seçenekleri</Text>
            <Text style={styles.bulletText}>• Konum paylaşımını açma/kapama</Text>
            <Text style={styles.bulletText}>• Bildirim tercihlerini yönetme</Text>
            <Text style={styles.bulletText}>• Profil görünürlüğünü ayarlama</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Çocukların Gizliliği</Text>
            <Text style={styles.text}>
              SoRita, 13 yaş altındaki çocuklardan bilerek kişisel bilgi toplamaz. Eğer 13 yaş altında 
              bir çocuğun bilgilerini topladığımızı fark edersek, bu bilgileri derhal sileriz.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Çerezler ve Takip</Text>
            <Text style={styles.text}>
              Uygulama performansını artırmak ve kullanıcı deneyimini iyileştirmek için çerezler kullanırız. 
              Bu çerezleri uygulama ayarlarından yönetebilirsiniz.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Değişiklikler</Text>
            <Text style={styles.text}>
              Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler için size bildirim göndereceğiz.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. İletişim</Text>
            <Text style={styles.text}>Gizlilik ile ilgili sorularınız için:</Text>
            <Text style={styles.bulletText}>• E-posta: privacy@sorita.app</Text>
            <Text style={styles.bulletText}>• Uygulama içi destek: Ayarlar &gt; Yardım</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}> SoRita 2025</Text>
            <Text style={styles.footerSubText}>Powered by MeMoDe</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    marginBottom: 6,
    paddingLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footerSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default PrivacyPolicyScreen;
