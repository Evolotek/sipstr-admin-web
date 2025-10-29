Open terminal in project directory and run

"npm install"

once done run

"npm run dev"
to start the server on port 8005

Currently backend uses production url "https://api.sipstr.com"
To use on localhost change in .env file

To hide Sidebar options
Right now all are set to true
To hide make them false

-----------------Role-------
if Admin is not accessible
Change role in .env.local file

--------------------TO-DO-----------

🛠️ Functionality & UI Fixes

Search Logic Enhancement: In modules where search currently uses UUID (e.g., Reports, Offer Management), update the frontend logic to support searching by Name and then use the store name to fetch the corresponding storeUUID for API calls.

Consumption History Check: Investigate and resolve the underlying error when attempting to view the Consumption History for an offer.

Delete Confirmation (Taxonomy): Implement a required confirmation alert/modal before deleting entries in the Brand, Category, and Package Unit modules to prevent accidental data loss.

Alert Alignment: Review and standardize the positioning of all success/error alerts across the application to ensure they are consistently centered (or center-right) and visually aligned.