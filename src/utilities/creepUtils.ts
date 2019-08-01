// Creep utilities that don't belong anywhere else


// Does not account for range, just total of body parts
export function calculateFormationStrength(creeps : Creep[]): Record<BodyPartConstant, number> {
	let tally: Record<BodyPartConstant, number> = {
		move : 0,
		work : 0,
		carry : 0,
		attack : 0,
		ranged_attack : 0,
		tough : 0,
		heal : 0,
		claim : 0,
	};

	_.forEach(creeps,
		function (unit) {
			let individualTally = calculateBodyPotential(unit.body);
			for (let bodyType in individualTally) {
				let type = bodyType as BodyPartConstant;
				tally[type] += individualTally[type];
			}
	});
	return tally;
}

export function calculateBodyPotential(body : BodyPartDefinition[]): Record<BodyPartConstant, number> {
	let tally: Record<BodyPartConstant, number> = {
		move : 0,
		work : 0,
		carry : 0,
		attack : 0,
		ranged_attack : 0,
		tough : 0,
		heal : 0,
		claim : 0,
	};
	_.forEach(body, function (bodyPart) {
			// Needs boost logic
			tally[bodyPart.type] += 1;
		}
	);
	return tally;
}
