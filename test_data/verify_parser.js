import fs from 'fs';
import path from 'path';

// Minimal verification script
const jsonContent = fs.readFileSync('./test_data/sample_vocabulary.json', 'utf8');
const eudicContent = fs.readFileSync('./test_data/sample_eudic.txt', 'utf8');
const maimemoContent = fs.readFileSync('./test_data/sample_maimemo.csv', 'utf8');

console.log('--- Testing files existence and read ---');
console.log('JSON Length:', jsonContent.length);
console.log('Eudic Length:', eudicContent.length);
console.log('MaiMemo Length:', maimemoContent.length);
console.log('All sample files verified successfully!');
