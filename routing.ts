/* Routine Module
   This handles the drug order
   routing tasks. Triggered by
   the app endpoints in index.ts
*/

import { Order } from './interfaces/Order';
import { Pharmacy } from './pharmacy';
import { orderOptionsHelper, assignment } from './orderOptions';
import { InventoryItem } from './interfaces/Inventory';

const axios = require('axios');
// For this demo, use the URL of our current server
// This could likely be an external endpoint,
// preferrably on the same VPC
const baseUrl = 'http://localhost:4016';


const getData = async (url: string): Promise<Pharmacy> => {
    const result = await axios.get(url);
    let { pharmacy, inventory, location } = result.data;
    const typedInventory = inventory as InventoryItem[];
    const deDupedInventory = Array.from(new Set(typedInventory.map(i => i.drug)))
        .map(drugName => typedInventory.find(inv => inv.drug === drugName));
    inventory = deDupedInventory;
    return new Pharmacy(pharmacy, inventory, location);
}

// Hit the endpoint(s) that can serve the current inventory
const getInventory= async (): Promise<Pharmacy[]>  => {
    // Mock if Real time inventory is maintained per pharmacy
    const pharmacyList = await axios.get(`${baseUrl}/pharmacy`);
    const inventoryList: Pharmacy[] = await Promise
        .all(pharmacyList.data.map((pId: string) => getData(`${baseUrl}/pharmacy/${pId}`)));
    return inventoryList;

    // Sample code if all sources are available from a single endpoint (needs to be updated for TS)
    /* const inventoryList = await axios.get(`${baseUrl}/inventory); // List of all pharmacies along with their inventory
      return inventoryList.data;
    */
};

const assign = async (order: Order): Promise<assignment | undefined> => {
    const { items } = order; // items are the drugs that were ordered
    const availableInventory = await getInventory(); // A list of all pharmacies and their inventories
    const options = orderOptionsHelper(); // instantiate the helper function as "options"
    await options.setOrderOptions(order, availableInventory); // Create a Map of all orderable drug combinations (stored in "options")
    const allCombos = options.createOrderOptions(items); // Find all order combinations
    return options.findBestPricedCombination(allCombos); // Identify and return the best priced option
}

module.exports = {
  assign,
};
