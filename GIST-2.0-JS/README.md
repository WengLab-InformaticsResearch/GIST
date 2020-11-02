# GIST-2.0-JS 

Documentation:

Installation:
1. Download GitHub repository
1. go into each folder and type “npm i” this will download all the packages required for the scripts/servers to run properly.

C2Q Folder - C2Q reads the input table and create an input JSON object for the server:
For this script to run as desired, you will need to have a proper sql table in an sql database (One row per eligibility criterion, required columns: nct_id, condition_concept_id, condition_concept_name, criteria_concept_id, criteria_concept_name, include, criteria_domain, min_value, max_value, male_allowed, female_allowed [last two for gender only]).

When you have the data ready you can format the script to your database.
You must change the following:

If you are using a mysql database, the index.js file need to change as the mysql package needs to be downloaded instead Postgres. But since the main part of the C2Q program is isolated from the query, it can be easily done.

Now For Postgres, you need to change line 7, 13 with the proper config of your server where the sql input table will be.
Change the user property to the user of your database.
Change the host to an ip if the server is not on your local machine.
Change the password to the password for the user of the account.
Change the database where the input table is in.
Change the port to where your server is hosted.

Also change line 31 to how you want your data to presented.


IMPORTANT NOTE:
The query generator has a slight preference for Postgres. Line 9 of crit2query.js, “on” is only part of the POSTgres sql language. The “on” keyword is meant to grab the latest date of a measurement value. TO combat this, you will need to find a query template that solely grabs the latest/relevant measurement value based on measurement dates.

———

GIST Folder is irrelevant, it is just for reference for data formatting.

————

Server Folder - the server receives beautiful inputs and runs the gist calculations:

Now For Postgres, you need to change line 15, 21 with the proper config of your server where the sql input table will be.
Change the user property to the user of your database.
Change the host to an ip if the server is not on your local machine.
Change the password to the password for the user of the account.
Change the database where the input table is in.
Change the port to where your server is hosted.

** to start the server, navigate to the server directory, and ensure a NodeJS server is installed in this location (if using Mac, feel free to navigate to this folder in the terminal and install the server using 'brew install node'). Once the server is installed, it can be started using the commandtype “node .”
This will start the server!

To send the API request, you can install Postman and establish a get request to http://localhost:3000 (3000 being the power of the nodejs server).

RUNNING THE PROGRAMS

1. Start the nodejs server in the 'server' folder
2. Run the criteria2query query generation script by navigating to the 'criteria2query' folder in terminal and running 'node index.js'.
3. Copy the output of this query into Postman and submit the GetRequest as described above. Console log and errors will appear in the terminal used to start the nodejs server and query output will appear in Postman.

IMPORTANT NOTE:
The server accepts the input data in the form of a JSON object in the body of an http request.
