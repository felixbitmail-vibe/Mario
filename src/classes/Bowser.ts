import Phaser from 'phaser';

const JUMP_INTERVAL_MS = 2500;
const FIRE_INTERVAL_MS = 2000;
const HAMMER_INTERVAL_MS = 3000;
const JUMP_FORCE = -380;
const FIRE_SPEED = 200;
const HAMMER_VY = -180;
const HAMMER_VX = 80;
const BOWSER_WIDTH = 32;
const BOWSER_HEIGHT = 32;

export default class Bowser extends Phaser.Physics.Arcade.Sprite {
    private jumpTimer = 0;
    private fireTimer = 0;
    private hammerTimer = 0;
    private fireGroup: Phaser.Physics.Arcade.Group;
    private hammerGroup: Phaser.Physics.Arcade.Group;
    public isDead = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bowser');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);
        this.setCollideWorldBounds(true);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(BOWSER_WIDTH, BOWSER_HEIGHT);
        body.setGravityY(400);
        body.setVelocityX(0);

        this.fireGroup = scene.physics.add.group();
        this.hammerGroup = scene.physics.add.group();
    }

    getFireGroup(): Phaser.Physics.Arcade.Group {
        return this.fireGroup;
    }

    getHammerGroup(): Phaser.Physics.Arcade.Group {
        return this.hammerGroup;
    }

    update(_time: number, delta: number): void {
        if (this.isDead) return;

        this.jumpTimer += delta;
        this.fireTimer += delta;
        this.hammerTimer += delta;

        if (this.jumpTimer >= JUMP_INTERVAL_MS) {
            this.jumpTimer = 0;
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body?.blocked.down) this.setVelocityY(JUMP_FORCE);
        }

        if (this.fireTimer >= FIRE_INTERVAL_MS) {
            this.fireTimer = 0;
            this.shootFire();
        }

        if (this.hammerTimer >= HAMMER_INTERVAL_MS) {
            this.hammerTimer = 0;
            this.throwHammer();
        }
    }

    private shootFire(): void {
        const fire = this.scene.add.circle(this.x, this.y - 8, 6, 0xff4500);
        this.scene.physics.add.existing(fire);
        const body = fire.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        const dir = this.flipX ? 1 : -1;
        body.setVelocity(FIRE_SPEED * dir, 0);
        this.fireGroup.add(fire);
        this.scene.time.delayedCall(3000, () => {
            fire.destroy();
        });
    }

    private throwHammer(): void {
        const hammer = this.scene.add.rectangle(this.x, this.y - 16, 12, 12, 0x8b4513);
        this.scene.physics.add.existing(hammer);
        const body = hammer.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(true);
        body.setGravityY(400);
        const dir = this.flipX ? 1 : -1;
        body.setVelocity(HAMMER_VX * dir, HAMMER_VY);
        this.hammerGroup.add(hammer);
        this.scene.time.delayedCall(4000, () => {
            hammer.destroy();
        });
    }

    fallInLava(): void {
        this.isDead = true;
        this.setTint(0x333333);
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) body.setVelocity(0, 0);
        this.scene.tweens.add({
            targets: this,
            y: this.scene.scale.height + 50,
            duration: 800,
            ease: 'Linear',
            onComplete: () => this.destroy(),
        });
    }
}
