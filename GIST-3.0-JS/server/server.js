const express = require("express");
const bodyParser = require("body-parser");

const { Client } = require("pg");
const gist = require("./gist");
const fs = require("fs");

const perf = require('execution-time')(console.log);

/*
Used for the user interface interaction in GIST 2.0, not being used in GIST 3.0
*/
//const app = express();
//const port = 3000;
//app.use(bodyParser.json());


/*
Set the parameters for the conneciton with the Postgres atabase
*/


const client = new Client({
		user: "****",
		host: "****",
		password: "****",
		database: "gist",
		port: "5432"
	});

/*
Assign the name of the input data (clinical trail ID list) file 
*/

var FileName = "Input_Clinical_Trial_ID_List.txt"

try {
    var input = fs.readFileSync('../c2q/' + FileName, 'utf-8');
    Input_CL_ID_List = input.split('\n').filter(function(e){ return e != "" });
} catch (err) {
     console.log(err);
}

console.log('------------GIST CALCULATION------------');
console.log(`You input ${Input_CL_ID_List.length} clincial trials: ${Input_CL_ID_List}`)

client.connect(err => {
	if (err) {
		console.error(`connection error: \n\t`, err.stack);
	}
});

const run = async _ => {
	/*
	 Batch Mode for GIST, Updated by Yingcheng
	*/
	for (var [index, CL_ID] of Input_CL_ID_List.entries()){
		//perf.start();
		console.log(`Start to process No. ${index+1} clinical trial: ${CL_ID}`);
		var generated_query = fs.readFileSync('../c2q/query/'+ CL_ID+'.txt', 'utf-8');
		generated_query  = JSON.parse(generated_query);
		
		await client
			.query(generated_query.beatiful_query)
			.then(results => {
				//perf.stop();
				const [output, patient_data, m, s] = gist.main(
					generated_query.beatiful_input,
					results.rows
				);
				/*
				Fortmat control
				*/
				var b = JSON.stringify(output, null, 4);
        		outputToFile = `{\n"output": ${b},\n"mGIST": ${m}\n}`; 
        		fs.writeFileSync('results/'+CL_ID, outputToFile);	
        		//perf.stop();

			})
			
		.catch(err => console.error(err.stack))
		.then(() => {
			//client.end();
		});		
		
	}
}

run()


/*
Used for the user interface interaction in GIST 2.0, not being used in GIST 3.0
*/

//app.listen(port, () => console.log("HEYYO WORLD, SERVER RUNNING ON PORT 3000"));
