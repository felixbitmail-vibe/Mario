import Phaser from 'phaser';

export enum PowerState { SMALL, BIG, FIRE }

const GRAVITY_NORMAL = 1000;
const GRAVITY_UNDERWATER = 200; // 80% reduktion
const SWIM_IMPULSE = -280;

export default class Mario extends Phaser.Physics.Arcade.Sprite {
    public powerState: PowerState = PowerState.SMALL;

    constructor(scene: Phaser.Scene, x: number, y: number, isUnderwater = false) {
        super(scene, x, y, 'mario');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true).setOrigin(0.5, 1);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setGravityY(isUnderwater ? GRAVITY_UNDERWATER : GRAVITY_NORMAL);
    }

    setUnderwater(underwater: boolean): void {
        const body = this.body as Phaser.Physics.Arcade.Body | null;
        if (body) body.setGravityY(underwater ? GRAVITY_UNDERWATER : GRAVITY_NORMAL);
    }

    update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, bButton: Phaser.Input.Keyboard.Key, isUnderwater = false): void {
        const speed = bButton.isDown ? 240 : 160;
        if (cursors.left.isDown) {
            this.setVelocityX(-speed);
            this.setFlipX(true);
            this.play(isUnderwater ? 'swim' : 'walk', true);
        } else if (cursors.right.isDown) {
            this.setVelocityX(speed);
            this.setFlipX(false);
            this.play(isUnderwater ? 'swim' : 'walk', true);
        } else {
            this.setVelocityX(0);
            this.play(isUnderwater ? 'swim' : 'idle');
        }

        const body = this.body as Phaser.Physics.Arcade.Body | null;
        if (isUnderwater) {
            if (cursors.up.isDown) {
                this.setVelocityY(SWIM_IMPULSE);
                this.play('swim', true);
            }
        } else if (cursors.up.isDown && body?.blocked.down) {
            this.setVelocityY(-360);
        }
    }
}
