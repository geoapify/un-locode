import {query} from "../src";

async function runDemo() {
    try {
        const result = await query('US', 'NYC');
        console.log(result);
    } catch (error) {
        console.error('Error during demo:', error);
    }
}

runDemo();
