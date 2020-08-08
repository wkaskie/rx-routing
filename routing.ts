/* Routine Module
   This handles the drug order
   routing tasks. Triggered by
   the app endpoints in index.ts
*/

import { Order } from './interfaces/Order';
import { PharmacyType } from './pharmacy';
import { orderOptionsHelper } from './orderOptions';

const axios = require('axios');
const { Pharmacy } = require('./pharmacy');
  // For this demo, use the URL of our current server
  // This could likely be an external endpoint,
  // preferrably on the same VPC
const baseUrl = 'http://localhost:4016';

// Hit the endpoint(s) that can serve the current inventory
const getInventory= async (): Promise<PharmacyType[]>  => {
    // Mock if Real time inventory is maintained per pharmacy
    const pharmacyList = await axios.get(`${baseUrl}/pharmacy`);
    const getData = async (url: string) => {
        const result = await axios.get(url);
        const { pharmacy, inventory } = result.data;
        return new Pharmacy(pharmacy, inventory);
    }
    const inventoryList: PharmacyType[] = await Promise
        .all(pharmacyList.data.map((pId: string) => getData(`${baseUrl}/pharmacy/${pId}`)));
    return inventoryList;

    /* // Sample code if all sources are available from a single endpoint (needs to be updated for TS)
        const inventoryList = await axios.get(`${baseUrl}/inventory);
        return inventoryList.data;
    */
}

const assign = async (order: Order) => {
    const { items } = order;
    const availableInventory = await getInventory(); // A list of all pharmacies and their inventories
    const options = orderOptionsHelper(); // instantiate the helper function as "options"
    options.setOrderOptions(order, availableInventory); // Create a Map of all orderable drug combinations (stored in "options")
    const allCombos = options.createOrderOptions(items); // Find all order combinations
    return options.findBestPricedCombination(allCombos); // Identify and return the best priced option
}

module.exports = {
    assign
}