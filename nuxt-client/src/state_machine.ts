import { World } from "./world/world"
import { Entities, Old_Entity } from "./entity/entities";
import { Socket } from "./socket";
import { Packet, PacketType } from "./packet";
import { Player } from "./entity/player";
import { MainPlayer } from "./entity/mainPlayer";
import { Vector3, ShadowGenerator, Light, IShadowLight, PointLight, Mesh } from "@babylonjs/core";
import type { Item, PlayerItem } from "./gui/items";

const smallest_pos_change: number = 0.01;
const smallest_angle_change: number = 0.01;

class State_machine {
  public players: Map<string, Player> = new Map();
  public entities: Map<string, Entities> = new Map();
  private _client: MainPlayer

  public players: Map<string, Player> = new Map();
  public entities: Map<string, Entities> = new Map(); 
  public old_entities: Map<string, Old_Entity> = new Map();
  public sun_light: PointLight;
  public moon_light: PointLight;
  public shadowGenerator: ShadowGenerator;
  private socket_ref: Socket;
  // private world_ref: World;

  // dealing with consumables
  private items: Array<{item: PlayerItem, position: Vector3}> = []

  private ready(){
    console.log("Checking status of State Machine")
    if (this.socket_ref) console.log("State Machine has Socket!")
    // if (this.world_ref) console.log("State Machine has World!")
    // if (this.socket_ref && this.world_ref) {
    //     console.log("State Machine is ready!")
    // }
  }


  private pass_changes(a: Entities, b: Old_Entity): boolean{
      
    let pos_change: Vector3 = new Vector3(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z)
    let rot_change: Vector3 = a.angularVelocity.subtract(b.angularVelocity);

    let flag: boolean = true;

    if (pos_change.x > smallest_pos_change && 
        pos_change.y > smallest_pos_change && 
        pos_change.z > smallest_pos_change
    )   flag = false;

    if (rot_change.x > smallest_angle_change && 
        rot_change.y > smallest_angle_change &&
        rot_change.z > smallest_angle_change
    )   flag = false;

    b.update(a)
    this.old_entities.set(b.id, b)

    return flag
  }

  public check_entity(info: boolean = false): void{
      for (let uid of this.entities.keys()){
          let entity: Entities = this.entities.get(uid);
          let entity_old: Old_Entity = this.old_entities.get(uid)

          let passed: boolean = this.pass_changes(entity, entity_old) // if changes a lot asks for reconfirm
          
          if (!passed) {
              // request for position of mesh to server
              this.socket_ref.send(new Packet(PacketType.request_mesh, [], entity.id))
          }
      }
  }

  public setSocket(socket_ref: Socket): void{
      this.socket_ref = socket_ref;
      this.ready()
  }

  public setShadowGenerator(light: IShadowLight, sun_light: PointLight, moon_light: PointLight): void{
      this.shadowGenerator = new ShadowGenerator(1024, light);
      this.sun_light = sun_light;
      this.moon_light = moon_light
      this.shadowGenerator.useBlurExponentialShadowMap = true;
  }

  public applyShadow(mesh: Mesh): void{
      this.shadowGenerator.addShadowCaster(mesh, [this.sun_light, this.moon_light])
  }

  public update_player(uid: string, player: Player) {
    this.players.set(uid, player);
  }

  public update_entity(uid: string, entity: Entities) {
    this.entities.set(uid, entity);
  }

  public add_player(uid: string, player: Player) {
    this.players.set(uid, player);
  }

  public add_entity(uid: string, entity: Entities){
      this.entities.set(uid, entity);
      this.old_entities.set(uid, new Old_Entity(entity));
      // if (this.shadowGenerator) this.shadowGenerator.getShadowMap()?.renderList?.push(entity.object)
      if (this.shadowGenerator) this.shadowGenerator.addShadowCaster(entity.object, [this.moon_light, this.sun_light])
  }

  public delete_player(uid: string){
    this.players.delete(uid)
    this.old_entities.delete(uid);
  }

  public set client(player: MainPlayer) {
    this._client = player
  }

  public get client() {
    return this._client
  }

  public dropItem(item: PlayerItem) {
    let rep = { item: item, position: this._client.position }
    this.items.push(rep)
    this.socket_ref.send(new Packet(PacketType.drop_item, [...this.items]))
  }

  public pickupItem(item: PlayerItem) {
    let rep = this.items.find((element) => element.item._name == item._name)
    let index = this.items.findIndex((element) => element == rep)

    this.items.splice(index, 1)
    
    console.log(item)
    const payload = [rep, [...this.items]]
    console.log(payload)

    this.socket_ref.send(new Packet(PacketType.pickup_item, payload))
  }
}

const state_machine = new State_machine();

export { state_machine };