const { crit2query: read_trial } = require("./crit2query");
const { Client } = require("pg");

const fs = require("fs");

// CONNECTING TO POSTGRES DATABASE
const client = new Client({
	user: "****",
	host: "****",
	password: "****",
	database: "gist",
	port: "5432"
});

client.connect(err => {
	if (err) {
		console.error(`connection error: \n\t`, err.stack);
	}
});

let beaut = {
	beatiful_query: "",
	beatiful_input: []
};

// MAKING QUERY AND INPUT JSON FOR API

/*
 Batch Mode for GIST
*/
var FileName = "Input_Clinical_Trial_ID_List.txt"

try {
    var input = fs.readFileSync(FileName, 'utf-8');
    Input_CL_ID_List = input.split('\n').filter(function(e){ return e != "" });
} catch (err) {
     console.log(err);
}

console.log('------------QUERY GENERATION------------');
console.log(`You input ${Input_CL_ID_List.length} clincial trials: ${Input_CL_ID_List}`);

/*
 Batch Mode for GIST
*/

const generate_queries = async _ => {
	for (var [index, CL_ID] of Input_CL_ID_List.entries()){
		console.log(`Start to generate query for No. ${index+1} clinical trial: ${CL_ID}`);
		await client
			.query(`select * from gist_test.sample_ec where nct_id = '${CL_ID}';`)
			.then(res => {
				[beaut.beatiful_query, beaut.beatiful_input] = read_trial(res.rows);
				created_query = JSON.stringify(beaut, null, 4);
				//console.log(created_query)
				fs.writeFileSync('query/'+CL_ID+'.txt', created_query);
			})
			.catch(err => console.error(err.stack))
			.then(() => {
				//client.end();
			});
			
		}
}

generate_queries()





