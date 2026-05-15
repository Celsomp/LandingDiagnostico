const fs = require('fs');
let config = fs.readFileSync('config.template.js', 'utf8');
config = config.replace('SUPABASE_URL_PLACEHOLDER', process.env.SUPABASE_URL || '');
config = config.replace('SUPABASE_KEY_PLACEHOLDER', process.env.SUPABASE_KEY || '');
fs.writeFileSync('config.js', config);
console.log('config.js gerado com sucesso');
