import * as Config from "../../config/config";

export interface CreepConfiguration {
	body: string[];
	name: string;
	properties: CreepProperties;
}
export interface CreepProperties {
	role: string;
	renew_station_id?: string;
	target_energy_dropoff_id?: string;
	target_energy_source_id?: string;
	target_source_id?: string;
	target_construction_site_id?: string;
	target_controller_id?: string;
}

export interface ICreepGovernor {

	getCreepConfig(): CreepConfiguration;
	getCreepLimit(): number;
}

export default class CreepGovernor implements ICreepGovernor {
	public static PRIORITY: number = Config.PRIORITY_CREEP;
	public static ROLE: string = "Creep";

	public getCreepConfig(): CreepConfiguration {
		return {body: [], name: "", properties: {role: null}};
	}

	public getCreepLimit(): number {
		return 0;
	}
}
