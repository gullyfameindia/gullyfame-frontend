





const { withAndroidManifest } = require('@expo/config-plugins');

const withRazorpay = (config) => {
  
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    
    if (!androidManifest.manifest) {
      androidManifest.manifest = {};
    }
    
    
    if (!androidManifest.manifest.usesPermission) {
      androidManifest.manifest.usesPermission = [];
    }
    
    const hasInternetPermission = androidManifest.manifest.usesPermission.some(
      (permission) => permission.$['android:name'] === 'android.permission.INTERNET'
    );
    
    if (!hasInternetPermission) {
      androidManifest.manifest.usesPermission.push({
        $: { 'android:name': 'android.permission.INTERNET' },
      });
    }

    return config;
  });

  
  

  return config;
};

module.exports = withRazorpay;

