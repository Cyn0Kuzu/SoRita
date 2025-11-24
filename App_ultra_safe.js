import React from 'react';
import { View, Text, StatusBar } from 'react-native';

// Ultra minimal safe app - NO EXTERNAL DEPENDENCIES
const App = () => {
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFFFFF" 
        translucent={false}
      />
      <Text style={{
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 20
      }}>
        SoRita
      </Text>
      <Text style={{
        fontSize: 16,
        color: '#666666',
        textAlign: 'center'
      }}>
        Uygulama başarıyla çalışıyor!{'\n'}
        Version: 1.0.0
      </Text>
    </View>
  );
};

export default App;
