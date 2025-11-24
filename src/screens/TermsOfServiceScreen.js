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

const TermsOfServiceScreen = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Kullanım Koşulları</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Son güncelleme: 28 Ağustos 2025</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Hizmet Kabul Edilmesi</Text>
            <Text style={styles.text}>
              SoRita uygulamasını kullanarak bu Kullanım Koşullarını kabul etmiş sayılırsınız. 
              Bu koşulları kabul etmiyorsanız, uygulamayı kullanmayınız.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Hizmet Açıklaması</Text>
            <Text style={styles.text}>
              SoRita, kullanıcıların konum bilgilerini paylaşabileceği, yerler keşfedebileceği, 
              liste oluşturabileceği ve arkadaşlarıyla deneyimlerini paylaşabileceği sosyal bir 
              platform uygulamasıdır.
            </Text>
            
            <Text style={styles.subTitle}>2.1 Ana Özellikler</Text>
            <Text style={styles.bulletText}>• Sosyal harita paylaşımı</Text>
            <Text style={styles.bulletText}>• Yer önerileri ve keşif</Text>
            <Text style={styles.bulletText}>• İşbirlikçi liste oluşturma</Text>
            <Text style={styles.bulletText}>• Arkadaşlarla deneyim paylaşımı</Text>
            <Text style={styles.bulletText}>• Konum tabanlı sosyal etkileşim</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Kullanıcı Sorumlulukları</Text>
            
            <Text style={styles.subTitle}>3.1 Hesap Güvenliği</Text>
            <Text style={styles.bulletText}>• Hesap bilgilerinizi gizli tutma ve korunmasından sorumlusunuz</Text>
            <Text style={styles.bulletText}>• Güçlü ve benzersiz şifre kullanmalısınız</Text>
            <Text style={styles.bulletText}>• Hesabınızda şüpheli aktivite fark ettiğinizde derhal bildirmelisiniz</Text>
            <Text style={styles.bulletText}>• Hesabınızın yetkisiz kullanımından siz sorumlusunuz</Text>
            
            <Text style={styles.subTitle}>3.2 İçerik Sorumlulukları</Text>
            <Text style={styles.bulletText}>• Paylaştığınız tüm içeriklerden sorumlusunuz</Text>
            <Text style={styles.bulletText}>• İçeriklerin yasalara uygun olmasını sağlamalısınız</Text>
            <Text style={styles.bulletText}>• Başkalarının haklarına saygı göstermelisiniz</Text>
            <Text style={styles.bulletText}>• Doğru ve güncel bilgi paylaşmalısınız</Text>
            
            <Text style={styles.subTitle}>3.3 Davranış Kuralları</Text>
            <Text style={styles.bulletText}>• Diğer kullanıcılara saygılı davranmalısınız</Text>
            <Text style={styles.bulletText}>• Topluluk kurallarına uymalısınız</Text>
            <Text style={styles.bulletText}>• Yapıcı ve olumlu etkileşim kurmalısınız</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Yasak Aktiviteler</Text>
            <Text style={styles.text}>Aşağıdaki aktiviteler kesinlikle yasaktır:</Text>
            
            <Text style={styles.bulletText}>• Platformu kötüye kullanma veya zarar verme</Text>
            <Text style={styles.bulletText}>• Başka kullanıcıları rahatsız etme, taciz etme</Text>
            <Text style={styles.bulletText}>• Spam, istenmeyen mesaj gönderme</Text>
            <Text style={styles.bulletText}>• Telif hakkı ihlali yapma</Text>
            <Text style={styles.bulletText}>• Sahte hesap oluşturma</Text>
            <Text style={styles.bulletText}>• Zararlı yazılım yayma</Text>
            <Text style={styles.bulletText}>• Güvenlik açıklarını kötüye kullanma</Text>
            <Text style={styles.bulletText}>• Yanıltıcı veya yanlış bilgi paylaşma</Text>
            <Text style={styles.bulletText}>• Ticari spam veya reklamcılık</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Hizmet Kullanılabilirliği</Text>
            
            <Text style={styles.subTitle}>5.1 Hizmet Sürekliliği</Text>
            <Text style={styles.bulletText}>• 7/24 erişim hedeflenir ancak kesintiler olabilir</Text>
            <Text style={styles.bulletText}>• Bakım ve güncellemeler önceden duyurulur</Text>
            <Text style={styles.bulletText}>• Acil müdahaleler anında yapılabilir</Text>
            <Text style={styles.bulletText}>• Teknik sorunlar mümkün olan en kısa sürede çözülür</Text>
            
            <Text style={styles.subTitle}>5.2 Hizmet Değişiklikleri</Text>
            <Text style={styles.bulletText}>• Özellikler güncellenebilir veya kaldırılabilir</Text>
            <Text style={styles.bulletText}>• Önemli değişiklikler önceden duyurulur</Text>
            <Text style={styles.bulletText}>• Geri bildirimleriniz değerlendirilir</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Fikri Mülkiyet</Text>
            <Text style={styles.text}>
              SoRita uygulaması, içeriği, tasarımı ve tüm fikri mülkiyet hakları SoRita'ya aittir. 
              Kullanıcılar, uygulamayı yalnızca kişisel ve ticari olmayan amaçlarla kullanabilir.
            </Text>
            
            <Text style={styles.subTitle}>6.1 Kullanıcı İçerikleri</Text>
            <Text style={styles.bulletText}>• Paylaştığınız içeriklerin telif hakları size aittir</Text>
            <Text style={styles.bulletText}>• SoRita'ya içerikleri gösterme lisansı verirsiniz</Text>
            <Text style={styles.bulletText}>• İçeriklerinizi istediğiniz zaman silebilirsiniz</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Sorumluluk Sınırlaması</Text>
            <Text style={styles.text}>
              SoRita, aşağıdaki durumlardan sorumlu değildir:
            </Text>
            <Text style={styles.bulletText}>• Platform kullanımından doğan dolaylı zararlar</Text>
            <Text style={styles.bulletText}>• Kullanıcı hatalarından kaynaklanan sorunlar</Text>
            <Text style={styles.bulletText}>• Üçüncü taraf hizmetlerindeki kesintiler</Text>
            <Text style={styles.bulletText}>• Veri kaybı (yedekleme önerilir)</Text>
            <Text style={styles.bulletText}>• Internet bağlantısı sorunları</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Hesap Sonlandırma</Text>
            
            <Text style={styles.subTitle}>8.1 Kullanıcı Sonlandırması</Text>
            <Text style={styles.bulletText}>• Hesabınızı istediğiniz zaman silebilirsiniz</Text>
            <Text style={styles.bulletText}>• Hesap silme işlemi geri alınamaz</Text>
            <Text style={styles.bulletText}>• Verileriniz güvenli şekilde silinir</Text>
            
            <Text style={styles.subTitle}>8.2 Platform Sonlandırması</Text>
            <Text style={styles.bulletText}>• Kullanım şartlarını ihlal eden hesaplar uyarı ile sonlandırılabilir</Text>
            <Text style={styles.bulletText}>• Ciddi ihlallerde hesap derhal kapatılabilir</Text>
            <Text style={styles.bulletText}>• İtiraz süreci mevcuttur</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Değişiklikler</Text>
            <Text style={styles.text}>
              Bu kullanım koşulları güncellenebilir. Önemli değişiklikler size bildirilir. 
              Güncellemelerden sonra uygulamayı kullanmaya devam ederek yeni koşulları kabul etmiş sayılırsınız.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Uygulanacak Hukuk</Text>
            <Text style={styles.text}>
              Bu şartlar, Türkiye Cumhuriyeti yasalarına göre yorumlanır ve uygulanır. 
              Uyuşmazlıklar Türkiye mahkemelerinde çözümlenir.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. İletişim</Text>
            <Text style={styles.text}>Kullanım koşulları ile ilgili sorularınız için:</Text>
            <Text style={styles.bulletText}>• E-posta: legal@sorita.app</Text>
            <Text style={styles.bulletText}>• Uygulama içi destek: Ayarlar &gt; Yardım</Text>
            <Text style={styles.bulletText}>• Online destek: www.sorita.app/support</Text>
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

export default TermsOfServiceScreen;
