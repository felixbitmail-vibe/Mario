import Phaser from 'phaser';
import Mario from '../classes/Mario';
import AudioManager from '../managers/AudioManager';
import LevelManager from '../managers/LevelManager';

export default class MainScene extends Phaser.Scene {
    private mario!: Mario;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private bButton!: Phaser.Input.Keyboard.Key;
    private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
    private blocksGroup!: Phaser.Physics.Arcade.StaticGroup;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload(): void {
        this.load.json('1-1', '/assets/maps/1-1.json');
        this.load.spritesheet('mario', '/assets/sprites/mario.png', {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.image('tiles', '/assets/sprites/tiles.png');
        this.load.audio('overworld', '/assets/audio/overworld.mp3');
        this.load.audio('jump', '/assets/audio/jump.wav');
    }

    create(): void {
        const levelConfig = LevelManager.getInstance().getConfig();
        this.cameras.main.setBackgroundColor(levelConfig.bgColor || '#5C94FC');

        this.cache.json.get('1-1');
        const worldWidth = 3400;
        const worldHeight = 240;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        this.groundGroup = this.physics.add.staticGroup();
        this.blocksGroup = this.physics.add.staticGroup();

        const groundY = worldHeight - 16;
        const tileSize = 16;
        for (let x = 0; x < worldWidth; x += tileSize) {
            const ground = this.add.rectangle(x + tileSize / 2, groundY + tileSize / 2, tileSize, tileSize, 0x8b4513);
            this.groundGroup.add(ground);
        }

        const blockPositions = [[320, 180], [400, 180], [480, 180], [560, 140], [640, 140]];
        blockPositions.forEach(([x, y]) => {
            const block = this.add.rectangle(x, y, tileSize, tileSize, 0xc0392b);
            this.blocksGroup.add(block);
        });

        this.mario = new Mario(this, 100, groundY - 8);
        this.mario.setDepth(10);

        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('mario', { start: 0, end: 0 }),
            frameRate: 1,
            repeat: -1,
        });
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('mario', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1,
        });

        this.physics.add.collider(this.mario, this.groundGroup);
        this.physics.add.collider(this.mario, this.blocksGroup);

        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setScroll(0, 0);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.bButton = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        AudioManager.init(this);
        AudioManager.playMusic('overworld');
    }

    update(): void {
        this.mario.update(this.cursors, this.bButton);

        const cam = this.cameras.main;
        const marioOffset = 200;
        cam.scrollX = Math.max(cam.scrollX, Math.min(this.mario.x - marioOffset, this.physics.world.bounds.width - cam.width));
    }
}
