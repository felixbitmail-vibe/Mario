import Phaser from 'phaser';
import Mario from '../classes/Mario';
import AudioManager from '../managers/AudioManager';
import LevelManager from '../managers/LevelManager';

const WORLD_HEIGHT = 240;
const TILE_SIZE = 16;
const GROUND_Y = WORLD_HEIGHT - 16;

interface PipeZone {
    x: number;
    y: number;
    w: number;
    h: number;
    pipeHeight: number;
    targetType: 'sublevel' | 'warp';
    target: number | string;
}

export default class MainScene extends Phaser.Scene {
    private mario!: Mario;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private bButton!: Phaser.Input.Keyboard.Key;
    private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
    private blocksGroup!: Phaser.Physics.Arcade.StaticGroup;
    private pipeZones: PipeZone[] = [];
    private enteringPipe = false;
    private subLevel: number | undefined;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload(): void {
        const levelManager = LevelManager.getInstance();
        for (const key of levelManager.getLevelKeys()) {
            this.load.json(key, `/assets/maps/${key}.json`);
        }
        this.load.spritesheet('mario', '/assets/sprites/mario.png', {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.image('tiles', '/assets/sprites/tiles.png');
        this.load.audio('overworld', '/assets/audio/overworld.mp3');
        this.load.audio('jump', '/assets/audio/jump.wav');
    }

    create(data?: { currentLevel?: string; subLevel?: number }): void {
        const levelManager = LevelManager.getInstance();
        if (data?.currentLevel) levelManager.currentLevel = data.currentLevel;
        const currentLevel = levelManager.currentLevel;
        this.subLevel = data?.subLevel;

        const levelConfig = levelManager.getConfig();
        this.cameras.main.setBackgroundColor(levelConfig.bgColor || '#5C94FC');

        const levelData = this.cache.json.get(currentLevel) as Record<string, unknown> | undefined;
        if (!levelData) {
            this.buildFallbackLevel(3400);
        } else if ('layers' in levelData && Array.isArray(levelData.layers)) {
            this.buildMethMethMethodLevel(levelData);
        } else {
            this.buildFuloxLevel(levelData, this.subLevel);
        }

        const spawnX = this.subLevel !== undefined ? 120 : 100;
        this.mario = new Mario(this, spawnX, GROUND_Y - 8);
        this.mario.setDepth(10);

        if (!this.anims.exists('idle')) {
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
        }

        this.physics.add.collider(this.mario, this.groundGroup);
        this.physics.add.collider(this.mario, this.blocksGroup);

        const worldWidth = (this.physics.world.bounds as Phaser.Geom.Rectangle).width;
        this.cameras.main.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
        this.cameras.main.setScroll(0, 0);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.bButton = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        AudioManager.init(this);
        AudioManager.playMusic('overworld');
    }

    private buildMethMethMethodLevel(_levelData: Record<string, unknown>): void {
        this.pipeZones = [];
        const worldWidth = 3400;
        this.physics.world.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
        this.groundGroup = this.physics.add.staticGroup();
        this.blocksGroup = this.physics.add.staticGroup();

        const groundY = WORLD_HEIGHT - 16;
        for (let x = 0; x < worldWidth; x += TILE_SIZE) {
            const ground = this.add.rectangle(x + TILE_SIZE / 2, groundY + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x8b4513);
            this.groundGroup.add(ground);
        }
        const blockPositions = [[320, 180], [400, 180], [480, 180], [560, 140], [640, 140]];
        blockPositions.forEach(([x, y]) => {
            const block = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0xc0392b);
            this.blocksGroup.add(block);
        });
    }

    private buildFuloxLevel(levelData: Record<string, unknown>, subLevelIndex?: number): void {
        const areas = levelData.areas as Array<{ creation?: Array<Record<string, unknown>> }> | undefined;
        if (!Array.isArray(areas)) {
            this.buildFallbackLevel(3400);
            return;
        }

        const areasToBuild = subLevelIndex !== undefined ? [areas[subLevelIndex]] : areas;
        let worldWidth = 3400;
        let lastPipeEntrance: number | null = null;

        for (const area of areasToBuild) {
            const creation = area.creation;
            if (!Array.isArray(creation)) continue;
            for (const item of creation) {
                if (item?.macro === 'Floor' && typeof item.width === 'number') {
                    const start = typeof item.x === 'number' ? item.x : 0;
                    worldWidth = Math.max(worldWidth, start + item.width + 200);
                }
            }
        }

        if (subLevelIndex !== undefined) {
            let maxX = 0;
            for (const item of areas[subLevelIndex].creation ?? []) {
                if (item?.macro === 'Floor' && typeof item.width === 'number') {
                    const start = typeof item.x === 'number' ? item.x : 0;
                    maxX = Math.max(maxX, start + item.width);
                }
            }
            if (maxX > 0) worldWidth = maxX + 200;
        }

        this.physics.world.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
        this.groundGroup = this.physics.add.staticGroup();
        this.blocksGroup = this.physics.add.staticGroup();
        this.pipeZones = [];

        const groundY = GROUND_Y;
        for (let x = 0; x < worldWidth; x += TILE_SIZE) {
            const ground = this.add.rectangle(x + TILE_SIZE / 2, groundY + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x8b4513);
            this.groundGroup.add(ground);
        }

        const area0 = areas[0];
        if (area0?.creation && subLevelIndex === undefined) {
            for (const item of area0.creation) {
                if (item?.thing === 'PipeHorizontal' && typeof item.entrance === 'number') {
                    lastPipeEntrance = item.entrance as number;
                }
                if (item?.macro === 'Pipe' && typeof item.x === 'number' && typeof item.height === 'number' && lastPipeEntrance !== null) {
                    const pipeHeight = item.height as number;
                    const pipeY = groundY - pipeHeight;
                    this.pipeZones.push({
                        x: item.x as number,
                        y: pipeY,
                        w: 32,
                        h: pipeHeight,
                        pipeHeight,
                        targetType: 'sublevel',
                        target: lastPipeEntrance,
                    });
                    lastPipeEntrance = null;
                }
                if (item?.macro === 'WarpWorld' && typeof item.x === 'number' && Array.isArray(item.warps)) {
                    const warps = item.warps as number[];
                    for (let i = 0; i < warps.length; i++) {
                        this.pipeZones.push({
                            x: (item.x as number) + i * 48,
                            y: groundY - 32,
                            w: 32,
                            h: 32,
                            pipeHeight: 32,
                            targetType: 'warp',
                            target: `${warps[i]}-1`,
                        });
                    }
                }
            }
        }
    }

    private buildFallbackLevel(worldWidth: number): void {
        this.pipeZones = [];
        this.physics.world.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
        this.groundGroup = this.physics.add.staticGroup();
        this.blocksGroup = this.physics.add.staticGroup();
        const groundY = WORLD_HEIGHT - 16;
        for (let x = 0; x < worldWidth; x += TILE_SIZE) {
            const ground = this.add.rectangle(x + TILE_SIZE / 2, groundY + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x8b4513);
            this.groundGroup.add(ground);
        }
    }

    update(): void {
        if (this.enteringPipe) return;

        const body = this.mario.body as Phaser.Physics.Arcade.Body | null;
        if (body?.blocked.down && this.cursors.down.isDown) {
            const zone = this.getPipeZoneAtMario();
            if (zone) {
                this.startPipeDescent(zone);
                return;
            }
        }

        this.mario.update(this.cursors, this.bButton);
        const cam = this.cameras.main;
        const marioOffset = 200;
        const worldWidth = (this.physics.world.bounds as Phaser.Geom.Rectangle).width;
        cam.scrollX = Math.max(cam.scrollX, Math.min(this.mario.x - marioOffset, worldWidth - cam.width));
    }

    private getPipeZoneAtMario(): PipeZone | null {
        const mx = this.mario.x;
        const my = this.mario.y;
        for (const zone of this.pipeZones) {
            if (mx >= zone.x && mx <= zone.x + zone.w && my >= zone.y && my <= zone.y + zone.h) {
                return zone;
            }
        }
        return null;
    }

    private startPipeDescent(zone: PipeZone): void {
        this.enteringPipe = true;
        const body = this.mario.body as Phaser.Physics.Arcade.Body | null;
        if (body) {
            body.setVelocity(0, 0);
            body.setAllowGravity(false);
        }
        const targetY = zone.y + zone.pipeHeight + 16;
        this.tweens.add({
            targets: this.mario,
            y: targetY,
            duration: 800,
            ease: 'Linear',
            onComplete: () => {
                const currentLevel = LevelManager.getInstance().currentLevel;
                if (zone.targetType === 'warp') {
                    LevelManager.getInstance().currentLevel = zone.target as string;
                    this.scene.start('MainScene', { currentLevel: zone.target });
                } else {
                    this.scene.start('MainScene', { currentLevel, subLevel: zone.target as number });
                }
            },
        });
    }
}
