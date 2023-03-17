export enum PacketType{
    update = "Update",
    info = "Info",
    movement = "Movement",
    mesh = "Mesh",
    close = "Close",
    interaction = "Interaction",
    chat = "Chat",
    player_creation = "PlayerCreation",
    request_mesh = "RequestMesh",
    drop_item = "DropItem",
    pickup_item = "PickupItem"
}

export class Packet{

    public type: String;
    public payload: any; 
    public uid?: string;

    constructor(packetType: PacketType, data: Array<any>, uid?: string){
        this.type = packetType;
        this.payload = data;
        if (uid) this.uid = uid
    }

}