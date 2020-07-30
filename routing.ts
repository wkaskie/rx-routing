/* Routine Module
   This handles the drug order
   routing tasks. Triggered by
   the app endpoints in index.ts
*/

import { Order } from './interfaces/Order';
import { PharmacyType } from './pharmacy';

const axios = require('axios');
const { Pharmacy } = require('./pharmacy');
  // For this demo, use the URL of our current server
  // This could likely be an external endpoint,
  // preferrably on the same VPC
const baseUrl = 'http://localhost:4016';

interface interimAssignment {
    orderNumber?: number;
    name: string;
    drug: string;
    quantity: number;
    order: number;
    cost: number;
    message?: string;
}

// Hit the endpoint(s) that can serve the current inventory
const getInventory= async (): Promise<PharmacyType[]>  => {
    // If Real time inventory is maintained per pharmacy
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

// Construct the proper format for the expected output
const serializeAssignments = (assignmentList: interimAssignment[]) => {
    interface assHash { // sorry not sorry for that var name!
        [key: string]: {drug: string, order: number, quantity: number, subTotal: number}
    }
    // Use a hashmap (JS object) for easy de-dupe and structure contruction
    const assignmentHash: assHash = assignmentList.reduce((newList: any, pharmacy: interimAssignment) => {
        const { name, drug, quantity, order, cost } = pharmacy;
        if (!newList[name]) { newList[name] = { items: [] }; }
        const subTotal = quantity * cost;
        // the Pharmacy class can calculate this, but it will save time to do it here
        const orderTotal = subTotal + (newList[name].orderTotal || 0);
        newList[name]['orderTotal'] = orderTotal;
        newList[name].items.push({drug, order, quantity, subTotal});
        return newList;
    }, {});
    // Convert the hash to an array using the keys
    return Object.entries(assignmentHash).map(p => ({pharmacy: p[0], ...p[1]}));
}

const assign = async (order: Order) => {
    const { orderNumber, items } = order;
    const availableInventory = await getInventory(); // A list of all pharmacies and their inventories
    let assignment: interimAssignment[] = [];
    let starterAssignment: interimAssignment = {
        name: '',
        drug: '',
        quantity: 0,
        order: 0,
        cost: 0
    };

    items.forEach((item) => {
        const { drug, quantity } = item;
        // Get the pharmacies that have inventory
        const choicePharmacies = availableInventory.filter((pharm: PharmacyType) => pharm.isDrugInStock(drug));
        let bestChoice: interimAssignment = starterAssignment;

        if (choicePharmacies.length === 0) {
            bestChoice = { name: `The drug "${drug}" could not be sourced for this order.`, drug, quantity, order: orderNumber, cost: 0};
        } else {
            bestChoice = choicePharmacies.reduce((chosenPharm: interimAssignment, pharm: PharmacyType) => {
                const currentCost = chosenPharm.cost || null;
                const { name } = pharm;
                const localItem = pharm.findDrug(drug); // always exists due to the filter above
                
                if (currentCost) { // not the first round
                    const comparisonCost = localItem.cost;
                    if (comparisonCost < currentCost) {                                    
                        chosenPharm = {...chosenPharm, name, ...{cost: comparisonCost}};
                    }  /* no change. Do nothing */
                } else {
                    chosenPharm = { order: orderNumber, name, drug: localItem.drug, quantity, cost: localItem.cost };
                } /* first round, just use the "default" */
                return chosenPharm;
            }, starterAssignment);
        }

        assignment.push(bestChoice);
    });

    return serializeAssignments(assignment);

}

module.exports = {
    assign
}