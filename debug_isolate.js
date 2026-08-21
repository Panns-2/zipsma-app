require('tsconfig-paths/register');
require('ts-node').register({ transpileOnly: true });

async function checkHandles(name, file) {
    console.log(`Checking ${name}...`);
    require(file);
    await new Promise(r => setTimeout(r, 500));
    console.log(`Active Handles after ${name}:`, process._getActiveHandles().map(h => h.constructor.name));
}

async function run() {
    await checkHandles('firebase-admin', './src/lib/firebase-admin.ts');
    await checkHandles('arkesel', './src/lib/arkesel.ts');
    await checkHandles('genkit', './src/ai/genkit.ts');
    process.exit(0);
}
run();
