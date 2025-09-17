// Test rapide des traductions portugaises
import fs from 'fs';

// Charger les traductions
const ptTranslations = JSON.parse(fs.readFileSync('./locales/pt.json', 'utf8'));
const enTranslations = JSON.parse(fs.readFileSync('./locales/en.json', 'utf8'));
const frTranslations = JSON.parse(fs.readFileSync('./locales/fr.json', 'utf8'));
const esTranslations = JSON.parse(fs.readFileSync('./locales/es.json', 'utf8'));
const deTranslations = JSON.parse(fs.readFileSync('./locales/de.json', 'utf8'));

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

console.log('🇵🇹 Test des traductions portugaises:');
console.log('=====================================');

for (const key of testKeys) {
  const pt = getTranslation(key, ptTranslations);
  const en = getTranslation(key, enTranslations);
  const fr = getTranslation(key, frTranslations);
  const es = getTranslation(key, esTranslations);
  const de = getTranslation(key, deTranslations);
  
  console.log(`${key}:`);
  console.log(`  🇺🇸 EN: ${en}`);
  console.log(`  🇫🇷 FR: ${fr}`);
  console.log(`  🇪🇸 ES: ${es}`);
  console.log(`  🇩🇪 DE: ${de}`);
  console.log(`  🇵🇹 PT: ${pt}`);
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
const ptKeys = getAllKeys(ptTranslations).sort();

console.log('🔍 Vérification de cohérence:');
console.log('============================');
console.log(`Clés anglaises: ${enKeys.length}`);
console.log(`Clés portugaises: ${ptKeys.length}`);

const missingInPortuguese = enKeys.filter(key => !ptKeys.includes(key));
const extraInPortuguese = ptKeys.filter(key => !enKeys.includes(key));

if (missingInPortuguese.length === 0 && extraInPortuguese.length === 0) {
  console.log('✅ Toutes les clés correspondent parfaitement!');
} else {
  if (missingInPortuguese.length > 0) {
    console.log('❌ Clés manquantes en portugais:', missingInPortuguese);
  }
  if (extraInPortuguese.length > 0) {
    console.log('⚠️ Clés supplémentaires en portugais:', extraInPortuguese);
  }
}