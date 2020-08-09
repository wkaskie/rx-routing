import { OrderItem } from './interfaces/OrderItem';
import { PharmacyType } from './pharmacy';

/* There must be one and only one instance
   of this class per order/Rx
*/

export class pharmacyComparison {
  pharmacyDrugGrid: {
    [key: string]: // drug
    [
      {
        pharmacy: string;
        cost: number;
        subTotal: number;
        shipping: number;
        orderTotal: number;
        cheapestWhen?: number; // minimum order qty to make the drug cheapest at this pharmacy
      }
    ];
  } = {};

  addToGrid(orderedItem: OrderItem, pharm: PharmacyType, shippingCost: number) {
    const { drug, quantity } = orderedItem;
    const pharmacyStockItem = pharm.inventory.find((inv) => inv.drug === drug);
    let subTotal = -1;
    if (pharmacyStockItem) {
      subTotal = quantity * pharmacyStockItem.cost;
    }
    this.pharmacyDrugGrid[drug] = this.pharmacyDrugGrid[drug] || [];
    this.pharmacyDrugGrid[drug].push({
      cost: pharmacyStockItem?.cost || -1,
      pharmacy: pharm.pharmacy,
      subTotal: subTotal,
      shipping: shippingCost,
      orderTotal: shippingCost + subTotal,
    });
  }

  rankPharmacies(orderLength: number) {
      const pDG = this.pharmacyDrugGrid; // alias it
    for (let drug in pDG) {
        const sortedByCost = pDG[drug].sort((a, b) => a.orderTotal - b.orderTotal);
        const cheapestWhenOne = sortedByCost[0]; // Drug is cheapest, even if only on drug is sourced here
        cheapestWhenOne.cheapestWhen = 1;
        const rankedPharmacies = sortedByCost.map(pharm => {
            for (let test = orderLength; test > 0; test--) {
                const sharedShipping = pharm.shipping / test; // cost to ship if test number of drugs on the order
                if (sharedShipping + pharm.subTotal > cheapestWhenOne.orderTotal) break; // if all drugs are sourced from here and it's STILL not the cheapest, we're done
                pharm.cheapestWhen = test; // if the order total would be less when we have test number of drugs on the order, then save that value
            }
            return pharm;
        });
        console.log(rankedPharmacies);
        
        
    }

  }
}
