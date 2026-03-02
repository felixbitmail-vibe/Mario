import Phaser from 'phaser';
export enum PowerState { SMALL, BIG, FIRE }
export default class Mario extends Phaser.Physics.Arcade.Sprite {
    public powerState: PowerState = PowerState.SMALL;
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'mario');
        scene.add.existing(this); scene.physics.add.existing(this);
        this.setCollideWorldBounds(true).setOrigin(0.5, 1);
        (this.body as Phaser.Physics.Arcade.Body).setGravityY(1000);
    }
    update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, bButton: Phaser.Input.Keyboard.Key) {
        const speed = bButton.isDown ? 240 : 160;
        if (cursors.left.isDown) { this.setVelocityX(-speed); this.setFlipX(true); this.play('walk', true); }
        else if (cursors.right.isDown) { this.setVelocityX(speed); this.setFlipX(false); this.play('walk', true); }
        else { this.setVelocityX(0); this.play('idle'); }
        const body = this.body as Phaser.Physics.Arcade.Body | null;
        if (cursors.up.isDown && body?.blocked.down) this.setVelocityY(-360);
    }
}
