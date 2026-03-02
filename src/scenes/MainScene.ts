import Phaser from 'phaser';
import Mario from '../classes/Mario';
import Bowser from '../classes/Bowser';
import AudioManager from '../managers/AudioManager';
import LevelManager from '../managers/LevelManager';

const WORLD_HEIGHT = 240;
const TILE_SIZE = 16;
const GROUND_Y = WORLD_HEIGHT - 16;
const DEFAULT_LEVEL_TIME = 300;
const FLAG_POLE_X_1_1 = 3168;
const POINTS_PER_TIME_TICK = 50;

const keyState = { left: false, right: false, up: false, down: false, shift: false };

let windowKeyCleanup: (() => void) | null = null;

function initWindowKeys(): void {
    if (windowKeyCleanup) return;
    const keydown = (e: KeyboardEvent) => {
        switch (e.code) {
            case 'ArrowLeft': keyState.left = true; e.preventDefault(); break;
            case 'ArrowRight': keyState.right = true; e.preventDefault(); break;
            case 'ArrowUp': keyState.up = true; e.preventDefault(); break;
            case 'ArrowDown': keyState.down = true; e.preventDefault(); break;
            case 'ShiftLeft':
            case 'ShiftRight': keyState.shift = true; e.preventDefault(); break;
        }
    };
    const keyup = (e: KeyboardEvent) => {
        switch (e.code) {
            case 'ArrowLeft': keyState.left = false; break;
            case 'ArrowRight': keyState.right = false; break;
            case 'ArrowUp': keyState.up = false; break;
            case 'ArrowDown': keyState.down = false; break;
            case 'ShiftLeft':
            case 'ShiftRight': keyState.shift = false; break;
        }
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    windowKeyCleanup = () => {
        window.removeEventListener('keydown', keydown);
        window.removeEventListener('keyup', keyup);
        windowKeyCleanup = null;
    };
}

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
    private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
    private blocksGroup!: Phaser.Physics.Arcade.StaticGroup;
    private pipeZones: PipeZone[] = [];
    private enteringPipe = false;
    private subLevel: number | undefined;
    private isUnderwater = false;
    private levelTimeRemaining = DEFAULT_LEVEL_TIME;
    private score = 0;
    private coins = 0;
    private victoryActive = false;
    private bowser: Bowser | null = null;
    private bridgeBodies: Phaser.Physics.Arcade.StaticBody[] = [];
    private bridgeAxeTriggered = false;
    private axeZone: Phaser.GameObjects.Rectangle | null = null;
    private flagPoleZone: Phaser.GameObjects.Rectangle | null = null;

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
        this.load.audio('level_complete', '/assets/audio/level_complete.mp3');
        this.load.audio('tick', '/assets/audio/tick.wav');
    }

    create(data?: { currentLevel?: string; subLevel?: number }): void {
        const levelManager = LevelManager.getInstance();
        if (data?.currentLevel) levelManager.currentLevel = data.currentLevel;
        const currentLevel = levelManager.currentLevel;
        this.subLevel = data?.subLevel;

        const levelConfig = levelManager.getConfig();
        this.isUnderwater = levelConfig.type === 'underwater';
        this.cameras.main.setBackgroundColor(0x1a3d2b);

        const levelData = this.cache.json.get(currentLevel) as Record<string, unknown> | undefined;
        if (!levelData) {
            this.buildFallbackLevel(3400);
        } else if ('layers' in levelData && Array.isArray(levelData.layers)) {
            this.buildMethMethMethodLevel(levelData);
        } else {
            this.buildFuloxLevel(levelData, this.subLevel);
        }

        if (!this.textures.exists('bowser')) {
            const g = this.add.graphics();
            g.fillStyle(0x8b0000, 1);
            g.fillRect(0, 0, 32, 32);
            g.generateTexture('bowser', 32, 32);
            g.destroy();
        }

        const levelDataWithTime = levelData as { time?: number };
        this.levelTimeRemaining = typeof levelDataWithTime?.time === 'number' ? levelDataWithTime.time : DEFAULT_LEVEL_TIME;
        this.victoryActive = false;
        this.bridgeAxeTriggered = false;

        this.registry.set('score', this.score);
        this.registry.set('coins', this.coins);
        this.registry.set('time', this.levelTimeRemaining);

        const isCastle = levelConfig.type === 'castle';
        if (isCastle && currentLevel === '1-4') {
            this.buildBridgeAxeAndBowser();
        }

        if (!isCastle && this.subLevel === undefined) {
            this.setupFlagPole(currentLevel);
        }

        const spawnX = this.subLevel !== undefined ? 120 : 100;
        this.mario = new Mario(this, spawnX, GROUND_Y - 8, this.isUnderwater);
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
            this.anims.create({
                key: 'swim',
                frames: this.anims.generateFrameNumbers('mario', { start: 2, end: 5 }),
                frameRate: 12,
                repeat: -1,
            });
        }

        this.physics.add.collider(this.mario, this.groundGroup);
        this.physics.add.collider(this.mario, this.blocksGroup);

        if (this.bowser) {
            this.physics.add.collider(this.mario, this.bowser.getFireGroup(), this.marioHitByFire, undefined, this);
            this.physics.add.collider(this.mario, this.bowser.getHammerGroup(), this.marioHitByHammer, undefined, this);
        }
        if (this.axeZone) {
            this.physics.add.overlap(this.mario, this.axeZone, () => this.onAxeTouched(), undefined, this);
        }
        if (this.flagPoleZone) {
            this.physics.add.overlap(this.mario, this.flagPoleZone, () => this.startFlagVictory(), undefined, this);
        }

        const worldWidth = (this.physics.world.bounds as Phaser.Geom.Rectangle).width;
        this.cameras.main.setBounds(0, 0, worldWidth, WORLD_HEIGHT);
        this.cameras.main.setScroll(0, 0);

        if (levelConfig.type === 'overworld' || levelConfig.type === 'sky') {
            this.buildJungleBackground(worldWidth);
        }
        this.buildTexturedGround(worldWidth);

        keyState.left = false;
        keyState.right = false;
        keyState.up = false;
        keyState.down = false;
        keyState.shift = false;
        initWindowKeys();

        const canvas = this.sys.game.canvas;
        canvas.setAttribute('tabindex', '1');
        canvas.focus();
        this.input.on('pointerdown', () => canvas.focus());

        this.cursors = this.input.keyboard!.createCursorKeys();

        AudioManager.init(this);
        AudioManager.playMusic('overworld');

        this.scene.launch('HudScene');
        this.scene.launch('MobileOverlayScene');
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

    private buildJungleBackground(worldWidth: number): void {
        const h = WORLD_HEIGHT;
        const groundY = GROUND_Y;
        const g = this.add.graphics().setDepth(-100);

        for (let y = 0; y < h; y++) {
            const t = y / h;
            const r = Math.floor(26 * (1 - t * 0.6));
            const gr = Math.floor(61 + t * 40);
            const b = Math.floor(43 + t * 50);
            g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
            g.fillRect(0, y, worldWidth + 100, 1);
        }

        const seed = 12345;
        const rand = (n: number) => ((Math.sin(seed * n) * 0.5 + 0.5) * 1000) % 1;

        for (let i = 0; i < Math.ceil(worldWidth / 120); i++) {
            const x = 80 + i * 140 + rand(i * 7) * 80;
            const trunkW = 12 + rand(i * 3) * 8;
            const trunkH = 60 + rand(i * 5) * 40;
            const trunkY = groundY - trunkH;
            g.fillStyle(0x4a3728, 1);
            g.fillRoundedRect(x - trunkW / 2, trunkY, trunkW, trunkH, 2);
            g.fillStyle(0x2d5016, 0.95);
            g.fillCircle(x, trunkY - 25, 45 + rand(i * 11) * 25);
            g.fillStyle(0x3d6b1a, 0.9);
            g.fillCircle(x - 25, trunkY - 15, 28);
            g.fillCircle(x + 22, trunkY - 30, 30);
            g.fillStyle(0x1e3d0e, 0.85);
            g.fillCircle(x + 15, trunkY - 5, 18);
            if (rand(i * 13) > 0.5) {
                g.lineStyle(4, 0x3d3520, 0.9);
                g.beginPath();
                g.moveTo(x + trunkW / 2, trunkY + 20);
                g.lineTo(x + 50 + rand(i) * 30, trunkY - 10);
                g.strokePath();
            }
        }

        for (let i = 0; i < Math.ceil(worldWidth / 60); i++) {
            const x = 20 + i * 65 + rand(i * 17) * 40;
            g.lineStyle(3, 0x2d5016, 0.7);
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x + 8, groundY + 5);
            g.strokePath();
        }

        for (let i = 0; i < Math.ceil(worldWidth / 25); i++) {
            const x = i * 28 + rand(i * 19) * 15;
            const bladeH = 14 + rand(i * 23) * 10;
            g.fillStyle(0x2d5a1a, 0.9);
            g.fillRect(x, groundY + 2, 3, bladeH);
            g.fillStyle(0x3d7a22, 0.85);
            g.fillRect(x + 4, groundY + 4, 2, bladeH - 4);
        }

        for (let i = 0; i < Math.ceil(worldWidth / 180); i++) {
            const x = 100 + i * 200 + rand(i * 31) * 120;
            const rx = 15 + rand(i * 7) * 12;
            const ry = 8 + rand(i * 11) * 6;
            g.fillStyle(0x5a5a5a, 0.9);
            g.fillEllipse(x, groundY - ry, rx * 2, ry * 2);
            g.fillStyle(0x4a4a4a, 0.8);
            g.fillEllipse(x - 3, groundY - ry - 2, rx, ry);
        }

        for (let i = 0; i < Math.ceil(worldWidth / 80); i++) {
            const x = 60 + i * 90 + rand(i * 41) * 50;
            const y = 40 + rand(i * 43) * 120;
            g.fillStyle(0x2d5016, 0.6);
            g.fillCircle(x, y, 6 + rand(i) * 4);
        }

        for (let i = 0; i < Math.ceil(worldWidth / 400); i++) {
            const tx = 200 + i * 420 + rand(i * 53) * 150;
            const ty = 60 + rand(i * 59) * 80;
            g.fillStyle(0x6b4423, 0.95);
            g.fillCircle(tx, ty, 12);
            g.fillStyle(0x5a3a1a, 0.9);
            g.fillCircle(tx + 6, ty - 4, 6);
            g.lineStyle(3, 0x6b4423, 0.9);
            g.beginPath();
            g.arc(tx + 14, ty - 8, 15, -0.8, 0.4);
            g.strokePath();
        }

        for (let i = 0; i < Math.ceil(worldWidth / 350); i++) {
            const sx = 150 + i * 380 + rand(i * 67) * 100;
            const sy = groundY - 8 - rand(i * 71) * 6;
            g.lineStyle(4, 0x4a5a2a, 0.9);
            g.beginPath();
            g.moveTo(sx, sy);
            for (let j = 1; j <= 6; j++) {
                g.lineTo(sx + j * 18 + rand(i * 73 + j) * 10, sy + (j % 2 === 0 ? 6 : -4));
            }
            g.strokePath();
        }
    }

    private buildTexturedGround(worldWidth: number): void {
        const groundY = GROUND_Y;
        const bandTop = groundY - 4;
        const bandH = WORLD_HEIGHT - bandTop + 4;
        const g = this.add.graphics().setDepth(5);

        const seed = 54321;
        const rand = (n: number) => ((Math.sin(seed * n) * 0.5 + 0.5) * 1000) % 1;

        for (let x = 0; x < worldWidth; x += 8) {
            const t = rand(x * 0.7);
            const brown = Phaser.Display.Color.GetColor(
                120 + Math.floor(t * 40),
                70 + Math.floor(t * 30),
                40 + Math.floor(t * 25)
            );
            g.fillStyle(brown, 0.98);
            g.fillRect(x, bandTop, 10, bandH);
        }

        for (let i = 0; i < Math.ceil(worldWidth / 24); i++) {
            const x = i * 26 + rand(i * 47) * 18;
            const w = 2 + rand(i * 13) * 2;
            const len = 6 + rand(i * 19) * 10;
            g.fillStyle(0x2a1a0a, 0.85);
            g.fillRect(x, groundY + 2, w, len);
            if (rand(i * 23) > 0.6) {
                g.fillStyle(0x1a0d05, 0.9);
                g.fillRect(x + 1, groundY + 4, 1, len - 2);
            }
        }

        for (let i = 0; i < Math.ceil(worldWidth / 45); i++) {
            const cx = 15 + i * 48 + rand(i * 31) * 30;
            const cy = groundY + 6 + rand(i * 37) * 6;
            const rw = 4 + rand(i * 41) * 4;
            const rh = 3 + rand(i * 43) * 2;
            g.fillStyle(0x6a6a6a, 0.9);
            g.fillEllipse(cx, cy, rw * 2, rh * 2);
            g.fillStyle(0x5a5a5a, 0.7);
            g.fillEllipse(cx - 1, cy - 1, rw, rh);
        }

        for (let i = 0; i < Math.ceil(worldWidth / 90); i++) {
            const sx = 30 + i * 95 + rand(i * 61) * 50;
            const sy = groundY + rand(i * 67) * 10;
            g.lineStyle(1, 0x1a0d05, 0.9);
            g.beginPath();
            g.moveTo(sx, sy);
            let px = sx;
            let py = sy;
            for (let k = 0; k < 4 + Math.floor(rand(i * 71) * 4); k++) {
                px += 3 + rand(i * 73 + k) * 8;
                py += (rand(i * 79 + k) > 0.5 ? 1 : -1) * (2 + rand(i * 83 + k) * 3);
                g.lineTo(px, py);
            }
            g.strokePath();
        }

        for (let i = 0; i < Math.ceil(worldWidth / 70); i++) {
            const bx = 50 + i * 75 + rand(i * 89) * 45;
            const by = groundY - 1 - rand(i * 97) * 3;
            g.fillStyle(0xc98b6a, 0.95);
            g.fillEllipse(bx, by, 6, 4);
            g.fillStyle(0xb87a5a, 0.9);
            g.fillEllipse(bx - 2, by, 4, 3);
        }

        for (let i = 0; i < Math.ceil(worldWidth / 55); i++) {
            const rx = 80 + i * 60 + rand(i * 101) * 35;
            const startY = groundY + 2 + rand(i * 103) * 10;
            g.lineStyle(2, 0x3d2817, 0.85);
            g.beginPath();
            g.moveTo(rx, startY);
            let ry = startY;
            for (let k = 0; k < 5; k++) {
                ry -= 3 + rand(i * 107 + k) * 4;
                g.lineTo(rx + (k % 2 === 0 ? 4 : -2), ry);
            }
            g.strokePath();
        }
    }

    private buildBridgeAxeAndBowser(): void {
        const BRIDGE_X = 1080;
        const BRIDGE_W = 48;
        const BRIDGE_Y = GROUND_Y - 24;
        const AXE_X = 1118;
        const AXE_W = 20;
        const AXE_Y = GROUND_Y - 48;
        const LAVA_Y = GROUND_Y + 8;
        const BOWSER_X = 1092;

        for (let i = 0; i < BRIDGE_W; i += TILE_SIZE) {
            const seg = this.add.rectangle(BRIDGE_X + i + TILE_SIZE / 2, BRIDGE_Y + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x4a4a4a);
            this.groundGroup.add(seg);
            const body = seg.body as Phaser.Physics.Arcade.StaticBody;
            if (body) this.bridgeBodies.push(body);
        }

        this.axeZone = this.add.rectangle(AXE_X + AXE_W / 2, AXE_Y + 16, AXE_W, 40, 0xffd700).setVisible(false);
        this.physics.add.existing(this.axeZone, true);
        (this.axeZone.body as Phaser.Physics.Arcade.StaticBody).setSize(AXE_W, 40);

        this.add.rectangle(BRIDGE_X + BRIDGE_W / 2, LAVA_Y, BRIDGE_W + 40, 32, 0xff4400).setAlpha(0.9);

        this.bowser = new Bowser(this, BOWSER_X, BRIDGE_Y);
        this.bowser.setDepth(10);
        this.physics.add.collider(this.bowser, this.groundGroup);
    }

    private onAxeTouched(): void {
        if (this.bridgeAxeTriggered) return;
        this.bridgeAxeTriggered = true;

        for (const body of this.bridgeBodies) {
            const go = body.gameObject as Phaser.GameObjects.GameObject | undefined;
            if (go) {
                this.physics.world.remove(body);
                go.destroy();
            }
        }
        this.bridgeBodies = [];

        if (this.bowser && !this.bowser.isDead) this.bowser.fallInLava();
    }

    private marioHitByFire(): void {
        this.scene.restart();
    }

    private marioHitByHammer(): void {
        this.scene.restart();
    }

    private setupFlagPole(currentLevel: string): void {
        const flagX = currentLevel === '1-1' ? FLAG_POLE_X_1_1 : (this.physics.world.bounds as Phaser.Geom.Rectangle).width - 80;
        this.flagPoleZone = this.add.rectangle(flagX, WORLD_HEIGHT / 2, 24, WORLD_HEIGHT, 0).setVisible(false);
        this.physics.add.existing(this.flagPoleZone, true);
        (this.flagPoleZone.body as Phaser.Physics.Arcade.StaticBody).setSize(24, WORLD_HEIGHT);
    }

    private startFlagVictory(): void {
        if (this.victoryActive) return;
        this.victoryActive = true;

        const body = this.mario.body as Phaser.Physics.Arcade.Body | null;
        if (body) {
            body.setVelocity(0, 0);
            body.setAllowGravity(false);
        }

        const flagX = this.flagPoleZone ? this.flagPoleZone.x : this.mario.x;
        const slideDuration = 600;

        this.tweens.add({
            targets: this.mario,
            x: flagX - 8,
            y: GROUND_Y - 8,
            duration: slideDuration,
            ease: 'Linear',
            onComplete: () => {
                if (this.cache.audio.exists('level_complete')) AudioManager.playMusicOnce('level_complete');
                const castleX = flagX + 120;
                this.tweens.add({
                    targets: this.mario,
                    x: castleX,
                    duration: 1500,
                    ease: 'Linear',
                    onComplete: () => {
                        this.startTimeCountdown();
                    },
                });
            },
        });
    }

    private startTimeCountdown(): void {
        const tickInterval = 1000;
        const addPoints = () => {
            if (this.levelTimeRemaining <= 0) {
                const next = LevelManager.getInstance().getConfig().next;
                if (next) {
                    LevelManager.getInstance().currentLevel = next;
                    this.scene.start('MainScene', { currentLevel: next });
                } else {
                    this.scene.start('MainScene');
                }
                return;
            }
            this.levelTimeRemaining--;
            this.score += POINTS_PER_TIME_TICK;
            if (this.cache.audio.exists('tick')) AudioManager.playSFX('tick');
        };

        this.time.addEvent({
            delay: tickInterval,
            callback: addPoints,
            loop: true,
        });
        addPoints();
    }

    update(_time: number, delta: number): void {
        if (this.bowser && !this.bowser.isDead) this.bowser.update(_time, delta);

        if (this.victoryActive) return;
        if (this.enteringPipe) return;

        const body = this.mario.body as Phaser.Physics.Arcade.Body | null;
        const downPressed = keyState.down || this.cursors.down.isDown;
        if (body?.blocked.down && downPressed) {
            const zone = this.getPipeZoneAtMario();
            if (zone) {
                this.startPipeDescent(zone);
                return;
            }
        }

        this.registry.set('score', this.score);
        this.registry.set('coins', this.coins);
        this.registry.set('time', this.levelTimeRemaining);

        const inputLeft = this.registry.get('inputLeft') as boolean | undefined;
        const inputRight = this.registry.get('inputRight') as boolean | undefined;
        const inputJump = this.registry.get('inputJump') as boolean | undefined;
        const inputRun = this.registry.get('inputRun') as boolean | undefined;
        const useMobileInput = inputLeft || inputRight || inputJump || inputRun;

        const cursors = useMobileInput
            ? ({
                left: { isDown: !!inputLeft },
                right: { isDown: !!inputRight },
                up: { isDown: !!inputJump },
                down: { isDown: false },
                space: { isDown: false },
                shift: { isDown: !!inputRun },
            } as Phaser.Types.Input.Keyboard.CursorKeys)
            : ({
                left: { isDown: keyState.left },
                right: { isDown: keyState.right },
                up: { isDown: keyState.up },
                down: { isDown: keyState.down },
                space: { isDown: false },
                shift: { isDown: keyState.shift },
            } as Phaser.Types.Input.Keyboard.CursorKeys);
        const runKey = useMobileInput ? { isDown: !!inputRun } : { isDown: keyState.shift } as Phaser.Input.Keyboard.Key;

        this.mario.update(cursors, runKey as Phaser.Input.Keyboard.Key, this.isUnderwater);
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
                const levelKey = LevelManager.getInstance().currentLevel;
                if (zone.targetType === 'warp') {
                    LevelManager.getInstance().currentLevel = zone.target as string;
                    this.scene.start('MainScene', { currentLevel: zone.target });
                } else {
                    this.scene.start('MainScene', { currentLevel: levelKey, subLevel: zone.target as number });
                }
            },
        });
    }
}
