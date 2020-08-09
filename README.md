# Rx Routing Test
Basic order distribution system using prescriptions as sample orders

## Notes
Note that I use the term "hashmap" and sometimes "hash" for short
in my comments as a habit from working with Rails. In these cases,
I mean a JavaScript object.

There are several test orders in the fakeOrders.json file in the 
mock_data folder.  These orders, along with the pharmacy files were
generated with a JSON generator.  So this code has some de-duping 
algos to clean up the data before using it.

The current algorithm accounts for the best cost to source an Rx
taking shipping costs into consdieration. Shipping Costs are per
order/Rx, not per item.

There are a few commented out console.log lines. These are left in
place to allow for showing key data collection points. Uncomment
any line to log additional information.

## To run the program

Clone the repo or expand the zip file.
This code uses Google Maps, Distance Matrix and GeoCode to generate
a fake shipping cost. You will need an API key with access to each
of these three APIs for this to work as intended.

Shipping costs will fallback to a more generic fake cost if no API
Key is detected.

Enter the directory.
Run `npm i` in the root directory of the project to install all dependencies
Run `MAPS_API_KEY=<your API key> npm run dev` to spin up the server and execute the tests.
Type ctrl+C to stop the running process.