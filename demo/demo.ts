const { query } = require("../dist/index.cjs");

async function runDemo() {
    try {
        const result = query('US','APG');
        console.log(result);
    } catch (error) {
        console.error('Error during demo:', error);
    }
}

runDemo();
