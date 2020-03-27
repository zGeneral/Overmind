import {log} from '../../console/log';
import {ClaimingOverlord} from '../../overlords/colonization/claimer';
import {profile} from '../../profiler/decorator';
import {Cartographer, ROOMTYPE_CONTROLLER} from '../../utilities/Cartographer';
import {printRoomName} from '../../utilities/utils';
import {MY_USERNAME} from '../../~settings';
import {Directive} from '../Directive';
import {DirectiveHaul} from "../resource/haul";
import {Pathing} from "../../movement/Pathing";
import {DirectiveDismantle} from "../targeting/dismantle";


/**
 * Claims a new room, destroys all structures in the room, then unclaims it
 */
@profile
export class DirectiveClearRoom extends Directive {

	static directiveName = 'clearRoom';
	static color = COLOR_PURPLE;
	static secondaryColor = COLOR_ORANGE;

	overlords: {
		claim: ClaimingOverlord;
	};

	constructor(flag: Flag) {
		super(flag, colony => colony.level >= 3);
		// Remove if misplaced
		if (Cartographer.roomType(this.pos.roomName) != ROOMTYPE_CONTROLLER) {
			log.warning(`${this.print}: ${printRoomName(this.pos.roomName)} is not a controller room; ` +
				`removing directive!`);
			this.remove(true);
		}
		if (Memory.settings.resourceCollectionMode && Memory.settings.resourceCollectionMode >= 1) {
			this.memory.keepStorageStructures = true;
		}
	}

	spawnMoarOverlords() {
		this.overlords.claim = new ClaimingOverlord(this);
	}

	init() {
		this.alert(`Clearing out room`);
	}

	private removeAllStructures(): boolean {

		const keepStorageStructures = this.memory.keepStorageStructures !== undefined
			? this.memory.keepStorageStructures : true;
		const keepRoads = this.memory.keepRoads !== undefined ? this.memory.keepRoads : true;
		const keepContainers = this.memory.keepContainers !== undefined ? this.memory.keepContainers : true;

		if (this.room) {
			const allStructures = this.room.find(FIND_STRUCTURES);
			let i = 0;
			for (const s of allStructures) {
				if (s.structureType == STRUCTURE_CONTROLLER) continue;
				if (keepStorageStructures &&
					(s.structureType == STRUCTURE_STORAGE || s.structureType == STRUCTURE_TERMINAL) && !s.isEmpty) {
					// Create a collection flag
					DirectiveHaul.createIfNotPresent(s.pos, 'pos');
					continue;
				}
				if (s.structureType == STRUCTURE_NUKER && s.energy > 50000) {
					DirectiveHaul.createIfNotPresent(s.pos, 'pos');
				}
				if (keepRoads && s.structureType == STRUCTURE_ROAD) {
					continue;
				}
				if (keepContainers && s.structureType == STRUCTURE_CONTAINER) {
					continue;
				}
				const result = s.destroy();
				if (result == OK) {
					i++;
				}
			}
			log.alert(`Destroyed ${i} structures in ${this.room.print}.`);
			return true;
		} else {
			return false;
		}

	}

	run() {
		// Remove if structures are done
		if (this.room && this.room.my) {
			const done = this.removeAllStructures();
			if (done) {
				let res = this.room.controller!.unclaim();
				// Clear up flags
				for (let flag of this.room.flags) {
					if (!DirectiveClearRoom.filter(flag) && !DirectiveHaul.filter(flag)) {
						flag.remove();
					}
				}
				log.notify(`Removing clearRoom directive in ${this.pos.roomName}: operation completed.`);
				if (res == OK) {
					this.remove();
				}
			}
			// Clear path if controller is not reachable
		} else if (this.room && this.room.creeps.length > 1) {
			let currentlyDismantlingLocations = DirectiveDismantle.find(this.room.flags);

			if (currentlyDismantlingLocations.length == 0) {
				let pathablePos = this.room.creeps[0] ? this.room.creeps[0].pos
					: Pathing.findPathablePosition(this.room.name);
				let blockingLocation = Pathing.findBlockingPos(pathablePos, this.room.controller!.pos,
					_.filter(this.room.structures, s => !s.isWalkable));
				if (blockingLocation && !Directive.isPresent(blockingLocation, 'pos')) {
					log.notify(`Adding dismantle directive for ${this.pos.roomName} to reach controller.`);
					DirectiveDismantle.create(blockingLocation);
				}
			}
		}

		// Remove if owned by other player
		if (Game.time % 10 == 2 && this.room && !!this.room.owner && this.room.owner != MY_USERNAME) {
			log.notify(`Removing clearRoom directive in ${this.pos.roomName}: room already owned by another player.`);
			this.remove();
		}
	}
}
