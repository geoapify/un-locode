const { query } = require("../dist/index.cjs");

async function runDemo() {
    try {
        const result = await query('US','APgggG');
        console.log(result);
    } catch (error) {
        console.error('Error during demo:', error);
    }
}

runDemo();
