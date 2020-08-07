/* Doing a little functional composition
   no tactical reason, just switching things
   up for demonstration purposes.
*/

import { Order } from "./interfaces/Order";
import { Pharmacy } from "./pharmacy";
import { OrderItem } from "./interfaces/OrderItem";
import { userInfo } from "os";
import { stringify } from "querystring";

export interface orderCombo {
  pharmacy: string;
  inventory: OrderItem[];
  total: number;
}

export const orderOptions = () => {
  // Create a map of all drug/pharmacy options
  const setOrderOptions = (order: Order, inventory: Pharmacy[]) => {
    const allOrderCombos = new Map<string, orderCombo[]>();
    const { items: drugs, orderNumber } = order;
    const maxLen = Math.pow(2, drugs.length); // possible combinations count
    drugs.sort((a, b) =>
      a.drug.toLowerCase() < b.drug.toLowerCase() ? -1 : 1
    );

    for (var i = 0; i < maxLen; i++) {
      let temp = "";
      let qty = 0;
      for (var j = 0; j < drugs.length; j++) {
        // Use bitwise comparison to grab only true when
        // the binary pattern matches our "unique" state
        if (i & Math.pow(2, j)) {
          temp += drugs[j].drug + " ";
          qty = drugs[j].quantity;
        }
      }
      if (temp !== "") {
        const newDrugCombos = inventory.map((p) => {
          const emptyArray: OrderItem[] = [];
          const drugList = p.inventory.reduce((inv, drug) => {
            if (temp.indexOf(drug.drug) !== -1) {
              // Remove drugs that are not part of this order
              // if this drug is one we're looking for
              inv.push({ ...drug, order: orderNumber, quantity: qty });
            }
            return inv;
          }, emptyArray);
          const orderCost = p.estimateOrderCost(drugList);
          return { pharmacy: p.name, inventory: drugList, total: orderCost };
        });
        allOrderCombos.set(temp, newDrugCombos);
      }
    }
    console.dir(allOrderCombos, { depth: 2 });
    return allOrderCombos;
  };

  const getBestPricedOption = (allCombos: Map<string, orderCombo[]>, orderOptionKey: string) => {
    return allCombos
    .get(orderOptionKey)
    ?.reduce((lowest, opt) => (opt.total < lowest.total ? opt : lowest)) || {} as orderCombo;
  }

  const createAssignment = (
    orderCount: number,
    optionKey: string,
    remainingOptions: string[],
    allOrderCombinations: Map<string, orderCombo[]>
  ) => {
    let assignment: orderCombo[] = [];
    let drugsMatchedSoFar = optionKey.trim().split(" ");

    // loop to complete the order with enough items
    for (let d = 0; d < remainingOptions.length && drugsMatchedSoFar.length < orderCount; d++) {
      // Add drugs until we have them all
      const opt = remainingOptions[d];
      const comboArray = opt.trim().split(" ");
      if (
        comboArray.filter((c) => drugsMatchedSoFar.includes(c)).length === 0
      ) {
        // if we can use this order combo, track it and get the full order option
        drugsMatchedSoFar = [...drugsMatchedSoFar, ...comboArray];
        assignment.push(getBestPricedOption(allOrderCombinations, remainingOptions[d]));
      } // keep looking for a usable match
    }
    
  };

  const findBestCombination = (
    order: OrderItem[],
    allCombos: Map<string, orderCombo[]>
  ) => {
    order.forEach((drugItem) => {
      // Get all options for this drug
      // and separate it from all options that do NOT include this drug
      const allDrugItemOptions: string[] = [];
      const allCombineableOptions: string[] = [];
      Array.from(allCombos.keys()).forEach((comboName) => {
        if (comboName.indexOf(drugItem.drug) !== -1) {
          allDrugItemOptions.push(comboName);
        } else {
          allCombineableOptions.push(comboName);
        }
      });
      // Remove the combineable options that have drugs that we've already accounted for
    //   const usableComboOptions = allCombineableOptions.filter((otherOption) =>
    //     allDrugItemOptions.map((d) => d.trim().split(" ").includes(otherOption))
    //   );
      console.log(drugItem.drug);

      allDrugItemOptions.forEach((option) => {
        // Match combos of this drug with options w/out this drug
        // let drugsMatchedSoFar = option.trim().split(" "); // The drugItem option
        let lowestOption = getBestPricedOption(allCombos, option);
        let assignment = [lowestOption]; // a list of pharmacy order combinations
        let otherOptions = createAssignment(order.length, option, allCombineableOptions, allCombos);
        console.log("ASSIGNMENT: ", option, assignment);
      });
    });
  };

  return { setOrderOptions, findBestCombination };
};
