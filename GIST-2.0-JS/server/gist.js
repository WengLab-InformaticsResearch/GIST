const SVM = require("libsvm-js/asm");

exports.main = main;

// SECTION MAIN PROGRAM
function main(input, patient_data) {
	const holy_results = clean_results(input, patient_data);
	calculations(input, holy_results);

	console.log("starting hypersurface process");
	const weights = hyper_surface(input, holy_results);
	const sum_weights = weights.reduce((prev, curr) => prev + curr, 0);

	var { elig_full, elig_passed } = meetAllCriteria(input, holy_results);
	var arrSum = arr => arr.reduce((a,b) => a + b, 0);
	console.log('Total number of eligible patients: ' + arrSum(elig_passed));
	var sgist = cal_sgist(input, weights, sum_weights, elig_full);
	
	//Rerun meetAllCriteria excluding traits with sGIST 0 to allow for trouble finding patient data without breaking the overall calculation
	console.log('Current sGIST array: ' + sgist);
	if (sgist.includes(0)) {
		const zero_indices = getAllIndices(sgist, 0);
		for (i=0; i<zero_indices.length; i++) {
			console.log('This trait has an sGIST of 0, being dropped from analysis: ' + input[zero_indices[i]].criteria_concept_name);
		}
		var { elig_full, elig_passed } = meetAllCriteria(input, holy_results, zero_indices);
		console.log('New number of eligible patients: ' + arrSum(elig_passed));
		
		//Now can run mGIST for overall score
		var mgist = cal_mgist(sum_weights, elig_passed);
		return [input, holy_results, mgist, sgist];
	} else {
		console.log('No 0s, moving on!');
	}
	
	var mgist = cal_mgist(sum_weights, elig_passed);

	return [input, holy_results, mgist, sgist];
}

function getAllIndices(arr, val) {
    var indices = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
        	indices.push(i);
    return indices;
}

function clean_results(inp, data) {
	let holyness = data.map((value, _index, _array) => {
		inp.forEach((value2, _index2, _array2) => {
			if (value[value2.column_name] == null) {
				value[value2.column_name] = -1;
			} else if (typeof value[value2.column_name] == typeof "") {
				value[value2.column_name] = parseFloat(value[value2.column_name]);
			} else if (value[value2.column_name] == value.p_id) {
				value[value2.column_name] = 1;
			} else if (value[value2.column_name] == 8507 && value2.column_name == 'gender'){
				value[value2.column_name] = "MALE";
			} else if (value[value2.column_name] == 8532 && value2.column_name == 'gender'){
				value[value2.column_name] = "FEMALE";
			}
		});
		return Object.freeze(value);
	});
	return holyness;
}



function calculations(input, pt_data) {
	input.forEach((criteria, ind) => {
		col = criteria.column_name;
		if (col[0] == "m" || col[0] == "a") {
			let values = pt_data.map(row => {
				if (row[col] != -1) {
					return row[col];
				}
				return undefined;
			});
			values = values.filter(val => val != undefined);
			if (values[0] == undefined) {
				input[ind].mean = -1;
				input[ind].std = -1;
				input[ind].tally = -1;
				input[ind].n_min = -1;
				input[ind].n_max = -1;
			} else {
				input[ind].mean = cal_mean(values);
				input[ind].std = cal_std(values);
				input[ind].tally = cal_elig_prec(
					input[ind].criteria_min,
					input[ind].criteria_max,
					values
				);
				input[ind].n_min =
					(input[ind].criteria_min - input[ind].mean) / input[ind].std;
				input[ind].n_max =
					(input[ind].criteria_max - input[ind].mean) / input[ind].std;
			}
		}
	});
	return input;
}
function cal_mean(values) {
	let temp = values.reduce((acc, curr_val) => acc + curr_val) / values.length;
	return temp == null ? -1 : temp;
}
function cal_std(values) {
	var avg = cal_mean(values);
	if (avg == -1) {
		return -1;
	}
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
	if (tally == []) {
		return -1;
	}
	var percentage = tally.length / values.length;
	return percentage;
}

function hyper_surface(input, patient_values) {
	let features = [];
	let labels = [];
	patient_values.map(patient_row => {
		const cal_weights = (val, mean, std, weight) =>
			((val - mean) / std) * weight;
		let data = patient_row;
		let age;
		input.forEach(trait => {
			if (trait.column_name[0] == "m") {
				if (data[trait.column_name] == -1) {
					data[trait.column_name] =
						((trait.criteria_max - trait.criteria_min) / 2) + trait.criteria_min;
				}
				w_feat = cal_weights(
					data[trait.column_name],
					trait.mean,
					trait.std,
					trait.tally
				);
				data[trait.column_name] = w_feat;
			} else if (trait.column_name[0] == "a") {
				if (data[trait.column_name] == -1) {
					data[trait.column_name] =
						(trait.criteria_max - trait.criteria_min) / 2 + trait.criteria_min;
				}
				age = cal_weights(
					data[trait.column_name],
					trait.mean,
					trait.std,
					trait.tally
				);
			}
		});

		features.push(Object.values(data).slice(0, data.length - 1));
		labels.push(age);
	});
	const svm = new SVM({
		kernel: SVM.KERNEL_TYPES.RBF,
		gamma: 1,
		type: SVM.SVM_TYPES.EPSILON_SVR,
		cost: 1
	});
	console.log("training");
	svm.train(features, labels);
	const labels_pred = svm.predict(features);
	let weights = labels_pred.map(
		(pred, i) => 1 / (1 + Math.abs(pred - labels[i]))
	);
	return weights;
}

function newCriteriaCheck(bins, drop_array) {
	for (i = 0; i < bins.length; i++)
		if (bins[i] == 0 && !drop_array.includes(i)) {
			return false
		}
	return true
}


function meetAllCriteria(input, pat_vals, to_drop = []) {
	let eligs = pat_vals.map(pat_row => cal_crit(input, pat_row));
//	let elig_pass = eligs.map(bins =>
//		bins.reduce((prev, curr) => prev + curr, 0) == bins.length ? 1 : 0
//	);
	let elig_pass = eligs.map(bins =>
		newCriteriaCheck(bins, to_drop) ? 1 : 0
	);
	return { elig_full: eligs, elig_passed: elig_pass };
}


function cal_crit(input, pat_row) {

	let calculated_criterias = input.map(crit => {
		let val = pat_row[crit.column_name];
		if (crit.column_name[0] == "g") {
			return (val == 'MALE' && crit.male_allowed == 1) || (val == 'FEMALE' && crit.female_allowed == 1) ? 1 : 0;
		} else if (crit.column_name[0] == "m" || crit.column_name[0] == "a") {
			return val == -1 || (val >= crit.criteria_min && val <= crit.criteria_max) ? 1 : 0;
		} else {
			return val == crit.criteria_elig_binary ||
				(crit.criteria_elig_binary == 0 && val == -1)
				? 1
				: 0;
		}
	});
	return calculated_criterias;
}



function cal_mgist(sum_weights, eligs) {
	let sum_weighted_checks = eligs.reduce((prev, curr) => prev + curr, 0);
	return sum_weighted_checks / sum_weights;
}



function cal_sgist(input, weights, sum_weights, eligs) {
	let columns = input.map((_trait, i) => {
		const score =
			eligs
				.map((pat_row, j) => {
					return pat_row[i] * weights[j];
				})
				.reduce((prev, curr) => prev + curr, 0) / sum_weights;
		input[i].sg_score = score;
		return score;
	});

	return columns;
}
