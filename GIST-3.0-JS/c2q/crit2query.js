function crit2query(res) {
	const with_format = (crit_id, crit_dom) => {
		let table = "";
		if (crit_dom[0] == "C") {
			table = ` c${crit_id} as ( select distinct person_id as c${crit_id} from condition_occurrence where condition_concept_id = ${crit_id})`;
		} else if (crit_dom[0] == "D") {
			table = ` d${crit_id} as ( select distinct person_id as d${crit_id} from drug_era where drug_concept_id = ${crit_id})`;
		} else if (crit_dom[0] == "M") {
			table = ` m${crit_id} as ( select distinct on (person_id) person_id,  value_as_number as m${crit_id}, measurement_date from measurement where measurement_concept_id = ${crit_id} order by 1, 3 desc)`;
		} else if (crit_dom[0] == "O") {
			table = ` o${crit_id} as ( select distinct person_id as o${crit_id} from observation where observation_concept_id = ${crit_id})`;
		} else if (crit_dom[0] == "P") {
			table = ` p${crit_id} as ( select distinct person_id as p${crit_id} from procedure_occurrence where procedure_concept_id = ${crit_id})`;
		}
		return table;
	};
	const add_with = (crit_id, crit_dom) => {
		let temp = with_format(crit_id, crit_dom);
		withs.push(temp);
		return `with ${temp}`;
	};
	const add_join_n_col = (crit_id, crit_dom, temp) => {
		let end = crit_dom[0] == "M" ? "person_id" : temp;
		joins.push(` left join ${temp} on main.p_id = ${temp}.${end}`);
		cols.push(temp);
		return temp;
	};
	const add_to_query = (ci, cd) => {
		let temp = cd[0].toLowerCase() + ci;
		if (cols.findIndex(val => val == temp) == -1) {
			let col_name = add_join_n_col(ci, cd, temp);
			return [add_with(ci, cd), col_name];
		}
		return [null, null];
	};

	let withs = [];
	let cols = [];
	let joins = [];
	let crit_input = [];

	// SECTION TARGET CONDITION
	const condition_concept_id = res[0].condition_concept_id;
	const condition_domain = res[0].condition_domain
		? res[0].condition_domain
		: "C";

	cols.push("p_id");
	withs.push(
		`with main as ( select distinct person_id as p_id from condition_occurrence where condition_concept_id = ${condition_concept_id})`
	);

	/*
	// SECTION GENDER
	withs.push(
		' gender as ( select distinct person_id, gender_concept_id as gender from person)'
	);
	cols.push("gender");
	joins.push(`left join gender on main.p_id = gender.person_id`);
	crit_input.push({
		criteria_concept_name: "Gender",
		criteria_concept_id: null,
		criteria_domain: null,
		criteria_elig_binary: null,
		criteria_query:
			'with gender as ( select person_id, gender_concept_id as gender from person)',
		column_name: "gender"
	});
	*/
	
	// SECTION CRITERIAs
	res.map(crit => {
		if (crit.criteria_domain) {
			if (crit.criteria_domain != "Person") {
				let [q, col] = add_to_query(
					crit.criteria_concept_id,
					crit.criteria_domain
				);
				if (q && col) {
					if (crit.criteria_domain[0] == "M") {
						crit_input.push({
							criteria_concept_name: crit.criteria_concept_name,
							criteria_concept_id: crit.criteria_concept_id,
							criteria_domain: crit.criteria_domain,
							criteria_elig_binary: crit.include,
							criteria_min: crit.min_value,
							criteria_max: crit.max_value,
							criteria_query: q,
							column_name: col
						});
					} else {
						crit_input.push({
							criteria_concept_name: crit.criteria_concept_name,
							criteria_concept_id: crit.criteria_concept_id,
							criteria_domain: crit.criteria_domain,
							criteria_elig_binary: crit.include,
							criteria_query: q,
							column_name: col
						});
					}
				}
			} else {
				if (crit.criteria_concept_name == "Age") {
					withs.push(
						" age as ( select person_id, extract(year from age((year_of_birth || '-' || month_of_birth || '-' || day_of_birth)::date)) as age from person)"
					);
					cols.push("age");
					joins.push(` left join age on main.p_id = age.person_id`);
					crit_input.push({
						criteria_concept_name: crit.criteria_concept_name,
						criteria_concept_id: crit.criteria_concept_id,
						criteria_domain: crit.criteria_domain,
						criteria_elig_binary: crit.include,
						criteria_query:
							"with age as ( select person_id, extract(year from age((year_of_birth || '-' || month_of_birth || '-' || day_of_birth)::date)) as age from person)",
						criteria_min: crit.min_value,
						criteria_max: crit.max_value,
						column_name: "age"
					});
				} else {
					withs.push(
							' gender as ( select distinct person_id, gender_concept_id as gender from person)'
						);
						cols.push("gender");
						joins.push(` left join gender on main.p_id = gender.person_id`);
						crit_input.push({
							criteria_concept_name: crit.criteria_concept_name,
							criteria_concept_id: crit.criteria_concept_id,
							criteria_domain: crit.criteria_domain,
							criteria_elig_binary: crit.include,
							criteria_query:
								' gender as ( select distinct person_id, gender_concept_id as gender from person)',
							male_allowed: crit.male_allowed,
							female_allowed: crit.female_allowed,
							column_name: "gender"
						});
				}
			}
		}
	});
//joins.reduce((prev, val) => prev + val) + " limit 1000;",
	return [
		withs.toString() +
			`select ${cols.toString()} from main ` +
			joins.reduce((prev, val) => prev + val) + " ;",
		crit_input
	];
}
exports.crit2query = crit2query;
