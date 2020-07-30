/* App EntryPoint
   This handles the server hosting and
   routing. It also kicks off a test.
*/

import { Assignment } from './interfaces/Assignment';
import express from 'express';

// Vendor modules
const fs = require('fs');
const app = express();

const port = 4016;

// Custom modules
const routing = require('./routing');
const tester = require('./test');

app.get('/', (req, res) => {
    res.send('hello');
});

app.post('/assign/', (req, res) => {
    var body = '';

    req.on('data',  (data: string) => {
        body += data;
        if (body.length > 1e6)
            req.connection.destroy(); // Too much POST data, kill the connection!
    });

    req.on('end', () => {
        var post = JSON.parse(body);
        routing.assign(post).then((assignments: Assignment[]) => {
            res.send(assignments);
        });
    });
});

// ***********************************************************
// Simulate polling a pharmacy endpoint for current inventory
// Assumes RT inventory is managed at each pharmacy or
// an internal endpoint
app.get('/pharmacy', (req, res) => {
    res.send([1, 2, 3]); // this would be fed from a persisted datasource;
});

app.get('/pharmacy/:id', (req, res) => {
    try {
        const { id } = req.params;
        const fileData = fs.readFileSync(`mock_data/pharmacy_${id}.json`);
        res.send(JSON.parse(fileData));
    } catch (err) {
        res.send(err);
    }
});


// ***********************************************************
// Alternatively, poll a singlie endpoint for all available inventory
// Not in use in this demo
app.get('/inventory', (req, res) => {
    const inventoryList = fs.readFileSync('./mock_data/inventory.json');
    try {
        res.send(JSON.parse(inventoryList))
    } catch(err) {
        res.send(err);
    }
});

// Start up the server
app.listen(port, () => {
    console.log(`Server stared. Listening on port ${port}`);
    tester.startTest(`http://localhost:${port}`);
});