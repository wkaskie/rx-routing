const axios = require('axios');
const fs = require('fs');

let baseUrl = '';

const runTest = (fakeOrder) => {

    axios.post(`${baseUrl}/assign`, fakeOrder)
    .then((response) => {
        const { data } = response;
        console.log('\n\n*******************************************\nORDER: ', fakeOrder)
        console.log('\nASSIGNMENTS: ');
        console.dir(data, {depth: 4});
    }).catch((error) => {
        console.log(error);
    });
}

const startTest = (baseUri) => {
    baseUrl = baseUri;
    // Post a fake order to the /assign endpoint to retrieve the list of assignments
    const orders = JSON.parse(fs.readFileSync('./mock_data/fakeOrders.json'))
    runTest(orders[0]);
    // orders.forEach(runTest);
}

module.exports = {
    startTest
}
