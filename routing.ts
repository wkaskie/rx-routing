/* Routine Module
   This handles the drug order
   routing tasks. Triggered by
   the app endpoints in index.ts
*/

import { Order } from './interfaces/Order';
import { PharmacyType } from './pharmacy';
import { InventoryItem } from './interfaces/Inventory';
import { pharmacyComparison } from './pharmacyComparison';

const axios = require('axios');
const { Pharmacy } = require('./pharmacy');
// For this demo, use the URL of our current server
// This could likely be an external endpoint,
// preferrably on the same VPC
const baseUrl = 'http://localhost:4016';

interface interimAssignment {
  orderNumber?: number;
  pharmacy: string;
  drug: string;
  quantity: number;
  order: number;
  cost: number;
  message?: string;
}

// Hit the endpoint(s) that can serve the current inventory
const getInventory = async (): Promise<PharmacyType[]> => {
  // If Real time inventory is maintained per pharmacy
  const pharmacyList = await axios.get(`${baseUrl}/pharmacy`);
  const getData = async (url: string) => {
    const result = await axios.get(url);
    const { pharmacy, inventory, location } = result.data;
    return new Pharmacy(pharmacy, inventory, location);
  };
  const inventoryList: PharmacyType[] = await Promise.all(
    pharmacyList.data.map((pId: string) =>
      getData(`${baseUrl}/pharmacy/${pId}`)
    )
  );
  return inventoryList;

  /* // Sample code if all sources are available from a single endpoint (needs to be updated for TS)
        const inventoryList = await axios.get(`${baseUrl}/inventory); // List of all pharmacies along with their inventory
        return inventoryList.data;
    */
};

// Construct the proper format for the expected output
const serializeAssignments = (assignmentList: interimAssignment[]) => {
  interface assHash {
    // sorry not sorry for that variable name!
    [key: string]: {
      drug: string;
      order: number;
      quantity: number;
      subTotal: number;
    };
  }
  // Use a hashmap (JS object) for easy de-dupe and structure contruction
  const assignmentHash: assHash = assignmentList.reduce(
    (newList: any, pharm: interimAssignment) => {
      const { pharmacy, drug, quantity, order, cost } = pharm;
      if (!newList[pharmacy]) {
        newList[pharmacy] = { items: [] };
      }
      const subTotal = quantity * cost;
      // the Pharmacy class can calculate this, but it will save time to do it here
      const orderTotal = subTotal + (newList[pharmacy].orderTotal || 0);
      newList[pharmacy]['orderTotal'] = orderTotal;
      newList[pharmacy].items.push({ drug, order, quantity, subTotal });
      return newList;
    },
    {}
  );
  // Convert the hash to an array using the keys
  return Object.entries(assignmentHash).map((p) => ({
    pharmacy: p[0],
    ...p[1],
  }));
};

const assign = async (order: Order) => {
  const { orderNumber, items, destination } = order;
  const orderZip = destination.toString();
  const availableInventory = await getInventory(); // A list of all pharmacies and their inventories
  let assignment: interimAssignment[] = [];
  const pharmGrid = new pharmacyComparison(); // Create a "hash table" of the order options

  for (let oi = 0; oi < items.length; oi++) {
    const orderedItem = items[oi];
    const { drug, quantity } = orderedItem;
    // Get the pharmacies that have inventory
    const pharmaciesWithInventory = availableInventory.filter(
      (pharm: PharmacyType) => pharm.isDrugInStock(drug)
    );
    let bestChoice: interimAssignment = {
      pharmacy: '',
      drug,
      quantity,
      order: orderNumber,
      cost: 0,
    };

    if (pharmaciesWithInventory.length === 0) {
      // No pharmacy carries the drug
      bestChoice = {
        ...bestChoice,
        pharmacy: `The drug "${drug}" could not be sourced for this order.`,
      };
    } else {
      let cheapestPharmacy = { pharmacy: '', subTotal: 9999999999, cost: 0 };
      for (let p = 0; p < pharmaciesWithInventory.length; p++) {
        const pharm: PharmacyType = pharmaciesWithInventory[p];

        const shippingCost = await pharm.estimateShippingCost(orderZip);
        pharmGrid.addToGrid(orderedItem, pharm, shippingCost);
        //     const { pharmacy } = pharm;
        //     let currentCost = -1;

        //     if (bestChoice.pharmacy.length >= 0) {
        //       // First pharmacy so just get the cost
        //       console.log('First Pass');
        //       currentCost = await pharm.estimateOrderCost([orderedItem], orderZip);
        //       bestChoice = {
        //         ...bestChoice,
        //         pharmacy,
        //         cost: currentCost,
        //       };
        //     } else {
        //       // Not the first, so compare the cost
        //       const comparisonCost = await pharm.estimateOrderCost([orderedItem], orderZip);
        //       if (comparisonCost < currentCost) {
        //         bestChoice = {
        //           ...bestChoice,
        //           pharmacy,
        //           ...{ cost: comparisonCost },
        //         };
        //       } /* Do nothing if the currentCost is not higher than comparison */
      }

      for (let opt of pharmGrid.pharmacyDrugGrid[drug]) {
        cheapestPharmacy =
          cheapestPharmacy.subTotal > opt.subTotal
            ? { pharmacy: opt.pharmacy, subTotal: opt.subTotal, cost: opt.cost }
            : cheapestPharmacy;
      }

      pharmGrid.rankPharmacies(order.items.length);

      bestChoice = {
        ...bestChoice,
        pharmacy: cheapestPharmacy.pharmacy,
        cost: cheapestPharmacy.cost,
      };
    }

    assignment.push(bestChoice);
  }

  //   console.log(pharmGrid.pharmacyDrugGrid);

  return serializeAssignments(assignment);
};

module.exports = {
  assign,
};
