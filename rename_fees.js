const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf-8');
        let newContent = content
            .replace(/Main School Fees/g, 'Core School Fees')
            .replace(/Main School fees/g, 'Core School Fees')
            .replace(/main school fees/g, 'core school fees')
            .replace(/Main Fees/g, 'Core Fees')
            .replace(/main fees/g, 'core fees')
            .replace(/Main fee logic/g, 'Core fee logic')
            .replace(/\(Main Fee \+/g, '(Core Fee +')
            .replace(/Main Fee/g, 'Core Fee');
            
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf-8');
            console.log(`Updated ${filePath}`);
        }
    }
});
