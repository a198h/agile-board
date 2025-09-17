// Test rapide des traductions espagnoles
import fs from 'fs';

// Charger les traductions
const esTranslations = JSON.parse(fs.readFileSync('./locales/es.json', 'utf8'));
const enTranslations = JSON.parse(fs.readFileSync('./locales/en.json', 'utf8'));
const frTranslations = JSON.parse(fs.readFileSync('./locales/fr.json', 'utf8'));

// Fonction simplifiée de traduction pour test
function getTranslation(key, translations) {
  const keys = key.split('.');
  let current = translations;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return null;
    }
  }
  
  return typeof current === 'string' ? current : null;
}

// Tests de traductions clés
const testKeys = [
  'settings.header',
  'settings.button.newLayout',
  'editor.title',
  'editor.sidebar.selection.title',
  'common.save',
  'common.cancel',
  'error.validationError'
];

console.log('🇪🇸 Test des traductions espagnoles:');
console.log('=====================================');

for (const key of testKeys) {
  const es = getTranslation(key, esTranslations);
  const en = getTranslation(key, enTranslations);
  const fr = getTranslation(key, frTranslations);
  
  console.log(`${key}:`);
  console.log(`  🇺🇸 EN: ${en}`);
  console.log(`  🇫🇷 FR: ${fr}`);
  console.log(`  🇪🇸 ES: ${es}`);
  console.log('');
}

// Vérifier la cohérence des clés
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], currentKey));
    } else {
      keys.push(currentKey);
    }
  }
  return keys;
}

const enKeys = getAllKeys(enTranslations).sort();
const esKeys = getAllKeys(esTranslations).sort();

console.log('🔍 Vérification de cohérence:');
console.log('============================');
console.log(`Clés anglaises: ${enKeys.length}`);
console.log(`Clés espagnoles: ${esKeys.length}`);

const missingInSpanish = enKeys.filter(key => !esKeys.includes(key));
const extraInSpanish = esKeys.filter(key => !enKeys.includes(key));

if (missingInSpanish.length === 0 && extraInSpanish.length === 0) {
  console.log('✅ Toutes les clés correspondent parfaitement!');
} else {
  if (missingInSpanish.length > 0) {
    console.log('❌ Clés manquantes en espagnol:', missingInSpanish);
  }
  if (extraInSpanish.length > 0) {
    console.log('⚠️ Clés supplémentaires en espagnol:', extraInSpanish);
  }
}