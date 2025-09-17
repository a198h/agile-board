// Test rapide des traductions chinoises
import fs from 'fs';

// Charger les traductions
const zhCNTranslations = JSON.parse(fs.readFileSync('./locales/zh-CN.json', 'utf8'));
const enTranslations = JSON.parse(fs.readFileSync('./locales/en.json', 'utf8'));
const frTranslations = JSON.parse(fs.readFileSync('./locales/fr.json', 'utf8'));
const esTranslations = JSON.parse(fs.readFileSync('./locales/es.json', 'utf8'));
const deTranslations = JSON.parse(fs.readFileSync('./locales/de.json', 'utf8'));
const ptTranslations = JSON.parse(fs.readFileSync('./locales/pt.json', 'utf8'));

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

console.log('🇨🇳 Test des traductions chinoises (simplifiées):');
console.log('===============================================');

for (const key of testKeys) {
  const zhCN = getTranslation(key, zhCNTranslations);
  const en = getTranslation(key, enTranslations);
  const fr = getTranslation(key, frTranslations);
  const es = getTranslation(key, esTranslations);
  const de = getTranslation(key, deTranslations);
  const pt = getTranslation(key, ptTranslations);
  
  console.log(`${key}:`);
  console.log(`  🇺🇸 EN: ${en}`);
  console.log(`  🇫🇷 FR: ${fr}`);
  console.log(`  🇪🇸 ES: ${es}`);
  console.log(`  🇩🇪 DE: ${de}`);
  console.log(`  🇵🇹 PT: ${pt}`);
  console.log(`  🇨🇳 ZH: ${zhCN}`);
  console.log('');
}

// Test spécial pour les pluriels chinois
console.log('🔢 Test des pluriels chinois:');
console.log('============================');
const frameCountKey = 'settings.list.frameCount';
const frameCount1 = getTranslation(frameCountKey, zhCNTranslations);
const frameCountEn1 = getTranslation(frameCountKey, enTranslations);

console.log(`${frameCountKey}:`);
console.log(`  🇺🇸 EN: ${frameCountEn1} (avec {plural})`);
console.log(`  🇨🇳 ZH: ${frameCount1} (pas de pluriel)`);
console.log('');

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
const zhCNKeys = getAllKeys(zhCNTranslations).sort();

console.log('🔍 Vérification de cohérence:');
console.log('============================');
console.log(`Clés anglaises: ${enKeys.length}`);
console.log(`Clés chinoises: ${zhCNKeys.length}`);

const missingInChinese = enKeys.filter(key => !zhCNKeys.includes(key));
const extraInChinese = zhCNKeys.filter(key => !enKeys.includes(key));

if (missingInChinese.length === 0 && extraInChinese.length === 0) {
  console.log('✅ Toutes les clés correspondent parfaitement!');
} else {
  if (missingInChinese.length > 0) {
    console.log('❌ Clés manquantes en chinois:', missingInChinese);
  }
  if (extraInChinese.length > 0) {
    console.log('⚠️ Clés supplémentaires en chinois:', extraInChinese);
  }
}