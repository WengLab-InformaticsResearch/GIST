# GIST
GIST 2.0: A scalable multi-trait metric for quantifying population representativeness of individual clinical studies
GIST 3.0: An OMOP CDM Based Automatic Clinical Trial Generalizability Assessment Framework

# INSTALLATION:
1.	Download GitHub repository
2.	go into each folder and type “npm i” this will download all the packages required for the scripts/servers to run properly.

# SETTING AND RUNNING:
*C2Q Folder* - C2Q reads the input table and create an input JSON object for the server: For this script to run as desired, you will need to have a proper sql table in an sql database (One row per eligibility criterion, required columns: nct_id, condition_concept_id, condition_concept_name, criteria_concept_id, criteria_concept_name, include, criteria_domain, min_value, max_value, male_allowed, female_allowed [last two for gender only]).
When you have the data ready you can format the script to your database. You must change the following in the “index.js” file:
*	If you are using a mysql database, the index.js file need to change as the mysql package needs to be downloaded instead Postgres. But since the main part of the C2Q program is isolated from the query, it can be easily done.
*	For Postgres, you need to change the following parts of “client” with the proper config of your server where the sql input table will be. Change the user property to the user of your database. Change the host to an ip if the server is not on your local machine. Change the password to the password for the user of the account. Change the database where the input table is in. Change the port to where your server is hosted.
You can change the following in the “crit2query.js” file as you like:
*	To obtain a small sample set, we limit the patient number to 1000, it can be set as any number or completely removed in “crit2query.js”: joins.reduce((prev, val) => prev + val) + " limit 1000;",
*	The query generator has a slight preference for Postgres. Line 9 of crit2query.js, “on” is only part of the POSTgres sql language. The “on” keyword is meant to grab the latest date of a measurement value. TO combat this, you will need to find a query template that solely grabs the latest/relevant measurement value based on measurement dates.
Next, input the clinical trial ID in the “Input_Clinical_Trial_ID_List.text” file, one ID per line, like this:
 
After setting everything well, run the criteria2query query generation script by navigating to the 'criteria2query' folder in terminal and running 'node index.js':
 
Each generated query is saved as a text file named by the clinical trial ID and all files are located in the “query” folder under “C2Q” folder.

*Server Folder* - the server receives beautiful inputs and runs the gist calculations.
*	If you do not have Python running environment, you might need to install Python 2 or 3 first, and also need install the sklearn package. 
*	Next, you must change the following in the “server.js” file: change the following parts of “client” with the proper config of your server where the sql input table will be. Change the user property to the user of your database. Change the host to an ip if the server is not on your local machine. Change the password to the password for the user of the account. Change the database where the input table is in. Change the port to where your server is hosted. 
Run the criteria2query query generation script by navigating to the 'criteria2query' folder in terminal and running 'node server.js'.
 

The calculation result for each query is saved as a text file named by the clinical trial ID and the output is well organized in JSON format. All files are located in the “results” folder under “server” folder.
 


**IMPORTANT NOTE** : The query generator has a slight preference for Postgres. Line 9 of crit2query.js, “on” is only part of the POSTgres sql language. The “on” keyword is meant to grab the latest date of a measurement value. TO combat this, you will need to find a query template that solely grabs the latest/relevant measurement value based on measurement dates.
