const SVM = require('libsvm-js/asm');
const { input } = require("./index2");
// MAIN PROGRAM
function main_program(patient_rows) {
	calculations(patient_rows);
	let weights = hyper_surface(patient_rows);
	let sum_weights = weights.reduce((prev, curr) => prev + curr, 0);
	let { elig_full, elig_passed } = meetAllCriteria(patient_rows);
	let mgist = cal_mgist(weights, sum_weights, elig_passed);
	let sgist = cal_sgist(weights, sum_weights, elig_full);
	console.log(mgist, sgist);
}
exports.main_program = main_program;
// GATHER ALL ELIG TRAITS
function elig_traits() {
	var traits = '';
	traits += input.gen_elig_trait.trait;
	input.elig_traits.forEach(element => {
		traits += ', ' + element.trait;
	});
	traits += ', ' + input.age_elig_trait.trait;
	return traits;
}
exports.elig_traits = elig_traits;
// CALCULATIONS
function calculations(pat_row) {
	input.elig_traits.forEach(item => {
		if (item.kind == 'lab') {
			values = pat_row.map(row => row[item.trait]);
			apply_values(item, values);
		}
	});
	age_values = pat_row.map(item => item['age']);
	apply_values(input.age_elig_trait, age_values);
}
function apply_values(item, values) {
	item['mean'] = cal_mean(values);
	item['std'] = cal_std(values);
	item['tally'] = cal_elig_prec(item.min, item.max, values);
	item['w_min'] = (item.min - item.mean) / item.std;
	item['w_max'] = (item.max - item.mean) / item.std;
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
		const cal_weights = (val, mean, std, weight) => ((val - mean) / std) * weight;
		let data = patient_row;
		input.elig_traits.forEach(trait => {
			if (trait.kind == 'lab') {
				w_feat = cal_weights(data[trait.trait], trait.mean, trait.std, trait.tally);
				data[trait] = w_feat;
			}
		});
		w_age = cal_weights(patient_row.age, input.age_elig_trait.mean, input.age_elig_trait.std, input.age_elig_trait.tally);
		features.push(Object.values(data));
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
	let weights = labels_pred.map((pred, i) => 1 / (1 + Math.abs(pred - labels[i])));
	return weights;
}
// CALCULATE ALL THAT MEET CRITERIA
function meetAllCriteria(pat_vals) {
	let count = 2 + input.elig_traits.length;
	let eligs = pat_vals.map(pat_row => cal_crit(pat_row));
	let elig_pass = eligs.map(bins => bins.reduce((prev, curr) => prev + curr, 0) == count ? 1 : 0);
	return { elig_full: eligs, elig_passed: elig_pass };
}
function cal_crit(pat_row) {
	const cal_gen = (gen, elig) => (elig == gen ? 1 : 0);
	gen_crit = !input.gen_elig_trait.elig
		? 1
		: cal_gen(pat_row.gender, input.gen_elig_trait.elig);
	elig_crit = input.elig_traits.map(item => {
		if (item.kind == 'lab') {
			let val = pat_row[item.trait];
			return item.min > val || val > item.max ? 0 : 1;
		}
		else {
			return pat_row[item.trait] != item.elig ? 0 : 1;
		}
	});
	age_crit =
		input.age_elig_trait.min > pat_row['age'] ||
			pat_row['age'] > input.age_elig_trait.max
			? 0
			: 1;
	return [gen_crit, ...elig_crit, age_crit];
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
	let gen_col = eligs
		.map((row, i) => row[0] * weights[i])
		.reduce((prev, curr) => prev + curr, 0) / sum_weights;
	let elig_col = input.elig_traits.map((_trait, i) => {
		return (eligs
			.map((pat_row, j) => pat_row[i + 1] * weights[j])
			.reduce((prev, curr) => prev + curr, 0) / sum_weights);
	});
	let age_col = eligs
		.map((row, i) => row[row.length - 1] * weights[i])
		.reduce((prev, curr) => prev + curr, 0) / sum_weights;
	return [gen_col, ...elig_col, age_col];
}
