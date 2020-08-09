import axios from'axios';
import { Order } from './interfaces/Order';
import { OrderItem } from './interfaces/OrderItem';

const fs = require('fs');
let baseUrl = '';

const runTest = (fakeOrder: Order) => {
    axios.post(`${baseUrl}/assign`, fakeOrder)
    .then((response) => {
        const { data } = response;
        console.log('\n\n*******************************************\nORDER: ', fakeOrder)
        console.log('\nASSIGNMENTS: ');
        console.dir(data, {depth: 4});
    }).catch((error) => {
        // console.log(error);
    });
}

const startTest = (baseUri: string) => {
    baseUrl = baseUri; // Note that this sets it globally in the test.ts file
    // Post a fake order to the /assign endpoint to retrieve the list of assignments
    const orders: Order[] = JSON.parse(fs.readFileSync('./mock_data/fakeOrders.json')) as Order[];
    // JSON generator doesn't have a "no dupes" or "unique" option, so do it here
    const deDupedOrders: Order[] = orders.map<Order>((order: Order) => {
        const deDupedItems = Array.from(new Set(order.items.map<string>(item => item.drug)))
            .map(drug => 
                order.items.find(d => d.drug === drug) || {} as OrderItem
            );
        order.items = deDupedItems || []; 
        return order;
    });
    // runTest(deDupedOrders[1]);
    deDupedOrders.forEach(runTest);
}

module.exports = {
    startTest
}
