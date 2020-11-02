var fs = require("fs");
var mysql = require("mysql");
const SVM = require("libsvm-js/asm");

// READ INPUT
var input = JSON.parse(fs.readFileSync("input.json", "utf8"));

// CONNECT SQL DATABASE
var con = mysql.createConnection({
	host: "127.0.0.1",
	port: "3306",
	user: "root",
	password: "herschel",
	database: "population",
	insecureAuth: true
});

con.connect(err => {
	if (err) throw err;
});

// QUERY SQL DATABASE
con.query("select " + elig_traits() + " from dummy_pop;", (err, res) => {
	if (err) throw err;
	main_program(res);
});

// MAIN PROGRAM
function main_program(patient_values) {
	calculations(patient_values);

	let weights = hyper_surface(patient_values);
	let sum_weights = weights.reduce((prev, curr) => prev + curr, 0);

	let { elig_full, elig_passed } = meetAllCriteria(patient_values);

	let mgist = cal_mgist(weights, sum_weights, elig_passed);
	let sgist = cal_sgist(weights, sum_weights, elig_full);
	console.log(mgist, sgist);
}

// GATHER ALL ELIG TRAITS
function elig_traits() {
	var traits = "";
	traits += input.gen_elig_trait.trait;
	input.lab_elig_traits.forEach(element => {
		traits += ", " + element.trait;
	});
	input.cat_elig_traits.forEach(element => {
		traits += ", " + element.trait;
	});
	traits += ", " + input.age_elig_trait.trait;
	return traits;
}

// CALCULATIONS
function calculations(patient_data) {
	input.lab_elig_traits.forEach(item => {
		values = patient_data.map(row => row[item.trait]);
		apply_values(item, values);
	});
	age_values = patient_data.map(item => item["age"]);
	apply_values(input.age_elig_trait, age_values);
}

function apply_values(item, values) {
	item["mean"] = cal_mean(values);
	item["std"] = cal_std(values);
	item["tally"] = cal_elig_prec(item.min, item.max, values);
	item["w_min"] = (item.min - item.mean) / item.std;
	item["w_max"] = (item.max - item.mean) / item.std;
}

function cal_mean(values) {
	return values.reduce((acc, curr_val) => acc + curr_val) / values.length;
}

function cal_std(values) {
	var avg = cal_mean(values);
	var squareDiffs = values.map(val => {
		var diff = val - avg;
		var sqrDiff = diff * diff;
		return sqrDiff;
	});
	var avgSqrDiff = cal_mean(squareDiffs);
	var stdev = Math.sqrt(avgSqrDiff);
	return stdev;
}

function cal_elig_prec(min, max, values) {
	var tally = values.filter(val => min > val || val > max);
	var percentage = tally.length / values.length;
	return percentage;
}

// SVR HYPER-SURFACE CALCULATIONS
function hyper_surface(patient_values) {
	let features = [];
	let labels = [];

	patient_values.map(patient_row => {
		const cal_weights = (val, mean, std, weight) =>
			((val - mean) / std) * weight;

		let data = Object.values(patient_row);

		input.lab_elig_traits.map((trait, i) => {
			w_feat = cal_weights(data[i + 1], trait.mean, trait.std, trait.tally);
			data[i + 1] = w_feat;
		});

		w_age = cal_weights(
			patient_row.age,
			input.age_elig_trait.mean,
			input.age_elig_trait.std,
			input.age_elig_trait.tally
		);

		features.push(data);
		labels.push(w_age);
	});

	const svm = new SVM({
		kernel: SVM.KERNEL_TYPES.RBF,
		gamma: 1,
		type: SVM.SVM_TYPES.EPSILON_SVR,
		cost: 1
	});

	svm.train(features, labels);
	const labels_pred = svm.predict(features);
	let weights = labels_pred.map(
		(pred, i) => 1 / (1 + Math.abs(pred - labels[i]))
	);

	return weights;
}

// CALCULATE ALL THAT MEET CRITERIA
function meetAllCriteria(pat_vals) {
	let count = 2 + input.lab_elig_traits.length + input.cat_elig_traits.length;

	let eligs = pat_vals.map(pat_row => cal_crit(pat_row));
	let elig_pass = eligs.map(bins =>
		bins.reduce((prev, curr) => prev + curr, 0) == count ? 1 : 0
	);

	return { elig_full: eligs, elig_passed: elig_pass };
}

function cal_crit(pat_row) {
	const cal_gen = (gen, elig) => (elig == gen ? 1 : 0);

	gen_crit = !input.gen_elig_trait.elig
		? 1
		: cal_gen(pat_row.gender, input.gen_elig_trait.elig);

	lab_crit = input.lab_elig_traits.map(({ trait, min, max }) => {
		let val = pat_row[trait];

		return min > val || val > max ? 0 : 1;
	});

	cat_crit = input.cat_elig_traits.map(({ trait, elig }) => {
		return pat_row[trait] != elig ? 0 : 1;
	});

	age_crit =
		input.age_elig_trait.min > pat_row["age"] ||
			pat_row["age"] > input.age_elig_trait.max
			? 0
			: 1;

	return [gen_crit, ...lab_crit, ...cat_crit, age_crit];
}

// CALCULATE mGIST SCORE
function cal_mgist(weights, sum_weights, eligs) {
	let sum_weighted_checks = eligs
		.map((val, i) => val * weights[i])
		.reduce((prev, curr) => prev + curr, 0);
	return sum_weighted_checks / sum_weights;
}

// CALCULATE sGIST SCORE
function cal_sgist(weights, sum_weights, eligs) {
	let count = 2 + input.lab_elig_traits.length + input.cat_elig_traits.length;

	let gen_col =
		eligs
			.map((row, i) => row[0] * weights[i])
			.reduce((prev, curr) => prev + curr, 0) / sum_weights;

	let lab_col = input.lab_elig_traits.map((_trait, i) => {
		return (
			eligs
				.map((pat_row, j) => pat_row[i + 1] * weights[j])
				.reduce((prev, curr) => prev + curr, 0) / sum_weights
		);
	});

	let cat_col = input.cat_elig_traits.map((_trait, i) => {
		return (
			eligs
				.map((row, j) => row[i + input.lab_elig_traits.length] * weights[j])
				.reduce((prev, curr) => prev + curr, 0) / sum_weights
		);
	});

	let age_col =
		eligs
			.map((row, i) => row[row.length - 1] * weights[i])
			.reduce((prev, curr) => prev + curr, 0) / sum_weights;

	return [gen_col, ...lab_col, ...cat_col, age_col];
}

con.end();
