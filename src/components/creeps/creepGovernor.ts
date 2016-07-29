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
	role: string;

	getCreepConfig(): CreepConfiguration;
	getCreepLimit(): number;
}

export default class CreepGovernor implements ICreepGovernor {

	public role = "Creep";

	public getCreepConfig(): CreepConfiguration {
		return {body: [], name: "", properties: {role: null}};
	}

	public getCreepLimit(): number {
		return 0;
	}
}
