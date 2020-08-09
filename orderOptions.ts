/* Doing a little functional composition
   no tactical reason, just switching things
   up for demonstration purposes.

   Helper factory for generating and comparing order options
*/

import { Order } from './interfaces/Order';
import { Pharmacy } from './pharmacy';
import { OrderItem } from './interfaces/OrderItem';

export interface orderCombo {
  pharmacy: string;
  inventory: OrderItem[];
  shipping?: number;
  total: number;
}

export interface assignment {
  grandTotal: number;
  orderNumber?: number;
  orders: orderCombo[];
}

export const orderOptionsHelper = () => {
  // Keep these for the life of the function (per Rx)
  let orderCount: number = 0;
  let orderNum = 0;
  let allOrderCombinations: Map<string, orderCombo[]>;

  const _drugIsInTheOrder = (optionsKey: string, optionsKeys: string[]) => {
    const comboArray = optionsKey.trim().split(' '); // Create array of drugs from this order option key
    const drugsAlreadyInTheCombo = comboArray.filter((c) => {
      const arrayOfKeys = optionsKeys.map((k) => k.trim().split(' ')); // Turn key strings to arrays of drugs
      const arrayCheck = [''].concat.apply([], arrayOfKeys); // flatten the array
      return arrayCheck.includes(c); // Keep this option if it is in both the new option and original
    });

    return drugsAlreadyInTheCombo && drugsAlreadyInTheCombo.length > 0;
  };

  const _separateOptions = (drugName: string) => {
    const allDrugItemOptions: string[] = [];
    const allCombineableOptions: string[] = [];
    Array.from(allOrderCombinations.keys()).forEach((comboName) => {
      if (comboName.indexOf(drugName) !== -1) {
        allDrugItemOptions.push(comboName);
      } else {
        allCombineableOptions.push(comboName);
      }
    });

    return { allDrugItemOptions, allCombineableOptions };
  }

  // Create a map of all drug/pharmacy options
  const setOrderOptions = async (order: Order, inventory: Pharmacy[]) => {
    allOrderCombinations = new Map<string, orderCombo[]>();
    const { items: drugs, orderNumber } = order;
    orderNum = orderNumber;
    orderCount = drugs.length;
    const maxLen = Math.pow(2, drugs.length); // possible combinations count
    drugs.sort((a, b) =>
      a.drug.toLowerCase() < b.drug.toLowerCase() ? -1 : 1
    ); // sort the drug names to ensure uniquness and completeness

    for (var i = 0; i < maxLen; i++) {
      let mapKey = ''; // Will be a list of drugs purchased together from a single pharmacy
      for (var j = 0; j < orderCount; j++) {
        // Use bitwise comparison to eval only true when
        // the binary pattern matches our "unique" state
        if (i & Math.pow(2, j)) {
          mapKey += drugs[j].drug + ' '; // Track each combo as a string key
        }
      }
      if (mapKey !== '') {
        const keyDrugCount = mapKey.trim().split(' ').length; // how many drugs in this "key"
        // match the potential orderable combinations with pharmacies' inventory
        // estimate the total for later comparison
        let newDrugCombos =[];
        for (let p = 0; p < inventory.length; p++) {
          const pharmacy = inventory[p];
          const drugList = pharmacy.inventory.reduce((inv, drug) => {
            if (mapKey.indexOf(drug.drug) !== -1) {
              // if this drug is one we're looking for, keep it
              const qty = order.items.find((i) => i.drug === drug.drug)
                ?.quantity;
              delete drug.id;
              inv.push({ ...drug, order: orderNumber, quantity: qty || 0 });
            }
            return inv;
          }, [] as OrderItem[]);
          const orderCost = await pharmacy.estimateOrderCost(
            drugList,
            order.destination
          );
          newDrugCombos.push({
            pharmacy: pharmacy.pharmacy,
            inventory: drugList,
            total: Number(orderCost.toFixed(2)),
            shipping: Number(pharmacy.getShipping(order.destination).toFixed(2)),
          });
        };

        // Filter out pharmacies that don't have all of the drugs in the mapKey
        const withInventory = newDrugCombos.filter(
          (oC) => oC.inventory.length === keyDrugCount
        );
        if (withInventory.length > 0) {
          allOrderCombinations.set(mapKey, withInventory);
        } else { // If no pharmacies carry the drug option
          const unSourcedItem: OrderItem = {
            drug: mapKey,
            order: orderNum,
            quantity: 0,
          };
          const cannotBeSourcedCombo: orderCombo[] = [
            {
              pharmacy: 'None',
              inventory: [unSourcedItem],
              total: 0,
              shipping: 0,
            },
          ];
          allOrderCombinations.set(mapKey, cannotBeSourcedCombo);
        }
      }
    }
    // console.dir(allOrderCombinations, { depth: 5 }); // log all order possibilities
  };

  const getBestPricedOption = (orderOptionKey: string) => {
    const pharms = allOrderCombinations.get(orderOptionKey);
    return (
      pharms?.reduce((lowest, opt) =>
        opt.total < lowest.total ? opt : lowest
      ) || ({} as orderCombo)
    );
  };

  // Recursively identify order assignements
  const createAssignments = (
    optionKeys: string[],
    remainingOptions: string[]
  ) => {
    // if the optionKeys are for the whole order, return it as an assignment
    const drugCount = optionKeys.reduce(
      (count, drug) => count + drug.trim().split(' ').length,
      0
    );
    if (drugCount === orderCount) return [optionKeys]; // this optionKey is for the entire order at one pharmacy
    let assignmentList: string[][] = [];
    // loop to complete the order with enough items
    for (let o = 0; o < remainingOptions.length; o++) {
      const opt = remainingOptions.slice(o)[0];
      if (opt) {
        if (!_drugIsInTheOrder(opt, optionKeys)) {
          // the new opt has no drugs that are already accounted for
          // if we can use this order combo, track it and
          // keep looking until the order is full
          const drugsMatchedSoFar = [...optionKeys, opt];
          const drugCount = drugsMatchedSoFar.reduce(
            (count, drug) => count + drug.trim().split(' ').length,
            0
          ); // Cannot coung drugsMatchedSoFar because any string value may contain multiple drugs
          if (drugCount < orderCount && remainingOptions.length > 0) {
            // If there are more options to try to make a full order, call again
            const assgnmt = createAssignments(
              drugsMatchedSoFar,
              remainingOptions.slice(1)
            );
            assignmentList = [...assignmentList, ...assgnmt]; // spread instead of push in case assgnmt is []
          } else if(drugCount === orderCount) {
            assignmentList.push(drugsMatchedSoFar);
          }
        } // keep looking for a usable match
      } // If no option, do nothing
    }
    // after an order is fully filled, return that list
    return assignmentList;
  };

  const createOrderOptions = (order: OrderItem[]): string[][][] => {
    // Given the possible drug order combinations,
    // Pair up drug options that will create a full order
    // That is, each drug in the Rx filled once per order
    const allCombos: string[][][] = []; // hold all options as strings to match the Map keys
    order.forEach((drugItem) => {
      // Get all order options for this drug
      // and separate it from all options that do NOT include this drug
      const { allDrugItemOptions, allCombineableOptions } = _separateOptions(drugItem.drug);
      // Match combos of this drug with options w/out this drug
      allDrugItemOptions.forEach((option) => {
        // console.log('OPTION: ' + option); // Log out the unique drug combinations    
        let orderOptions = createAssignments([option], allCombineableOptions);
        allCombos.push(orderOptions);
      });
    });
    return allCombos;
  };

  const findBestPricedCombination = (
    allAssignmentCombinations: string[][][]
  ): assignment | undefined => {
    // TODO: De-dupe the array to improve speed
    // Flatten the array
    const allOptions = [['']].concat.apply([['']], allAssignmentCombinations);
    // console.log("ALL: ", allOptions); // Log all possible orderable combinations
    let bestPrice = 99999999;
    let bestOrder: assignment = { grandTotal: 0, orders: [] };
    let bestPricedOption: orderCombo;

    allOptions.forEach((orderCombo) => {
      // console.log(orderCombo);
      if (orderCombo[0].length > 0) {
        const starterOrderCombo = { grandTotal: 0, orders: [] as orderCombo[] };
        const comboOrder = orderCombo.reduce((acc, order) => {
          bestPricedOption = getBestPricedOption(order);
          // console.log(bestPricedOption); // Log the best option for a given "key"
          acc.orders.push(bestPricedOption);
          acc.grandTotal += Number(bestPricedOption.total.toFixed(2));
          return acc;
        }, starterOrderCombo);
        const comboPrice = comboOrder.grandTotal;
        const invCount = comboOrder.orders.reduce(
          (total, o) => o.inventory.length + total,
          0
        );
        if (comboPrice < bestPrice && invCount === orderCount) {
          bestPrice = comboPrice;
          bestOrder = comboOrder;
        }
      }
    });

    bestOrder = { ...bestOrder, orderNumber: orderNum }; // add the orderNumber at the root for easier reading
    return bestOrder;
  };

  return { setOrderOptions, createOrderOptions, findBestPricedCombination };
};
