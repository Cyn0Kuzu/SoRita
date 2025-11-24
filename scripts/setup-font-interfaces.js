const fs = require('fs');
const path = require('path');

const fontInterfaceFiles = [
  {
    name: 'EXFontProcessorInterface.h',
    content: `#import <UIKit/UIKit.h>

@protocol EXFontProcessorInterface <NSObject>

- (UIFont *)updateFont:(UIFont *)uiFont
            withFamily:(NSString *)family
                  size:(NSNumber *)size
                weight:(NSString *)weight
                 style:(NSString *)style
               variant:(NSArray<NSDictionary *> *)variant
       scaleMultiplier:(CGFloat)scaleMultiplier;

@end
`,
  },
  {
    name: 'EXFontScalerInterface.h',
    content: `#import <UIKit/UIKit.h>

@protocol EXFontScalerInterface <NSObject>

- (UIFont *)scaledFont:(UIFont *)font toSize:(CGFloat)fontSize;

@end
`,
  },
  {
    name: 'EXFontScalersManagerInterface.h',
    content: `#import <Foundation/Foundation.h>

@protocol EXFontScalerInterface;

@protocol EXFontScalersManagerInterface <NSObject>

- (void)registerFontScaler:(id<EXFontScalerInterface>)scaler;

@end
`,
  },
  {
    name: 'EXFontManagerInterface.h',
    content: `#import <UIKit/UIKit.h>

@protocol EXFontProcessorInterface;

@protocol EXFontManagerInterface <NSObject>

- (void)addFontProcessor:(id<EXFontProcessorInterface>)processor;
- (UIFont *)fontForName:(NSString *)name;
- (void)setFont:(UIFont *)font forName:(NSString *)name;

@end
`,
  },
];

function ensureExpoFontInterfaces(rootDir = path.join(__dirname, '..')) {
  const interfacesDir = path.join(
    rootDir,
    'node_modules',
    'expo-modules-core',
    'ios',
    'Interfaces',
    'Font'
  );

  try {
    fs.mkdirSync(interfacesDir, { recursive: true });
    fontInterfaceFiles.forEach(({ name, content }) => {
      const target = path.join(interfacesDir, name);
      if (!fs.existsSync(target)) {
        fs.writeFileSync(target, content);
        console.log(`✅ Ensured ${name} exists for expo-font compatibility`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to ensure expo font interfaces exist:', error);
  }
}

if (require.main === module) {
  ensureExpoFontInterfaces();
}

module.exports = ensureExpoFontInterfaces;

