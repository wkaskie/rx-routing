# rx-routing
Basic order distribution system using prescriptions as sample orders

## Notes
Note that I use the term "hashmap" and sometimes "hash" for short
in my comments as a habit from working with Rails. In this case,
I mean a javaScript object.

There are two test orders in the fakeOrders.json file in the 
mock_data folder.  The first is fairly straight-forward, picking the 
lowest cost pharmacy for three drugs in an order.  The second tests
a case where the drug cannot be sourced.

The current algorithm is a first-come-first serve selection. In other 
words, the first pharmacy that sells the drug will be chosen, and only
overwritten in the case where a less expensive alternative is found.

## To run the program

Clone the repo or expand the zip file.
Enter the directory.
Run `npm i` in the root directory of the project
Run `npm run dev` to spin up the server and execute the tests.
Type ctrl+C to stop the running process.