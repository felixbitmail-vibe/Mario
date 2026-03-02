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

let keyInputEl: HTMLInputElement | null = null;

function onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
        case 'ArrowLeft': keyState.left = true; e.preventDefault(); break;
        case 'ArrowRight': keyState.right = true; e.preventDefault(); break;
        case 'ArrowUp': keyState.up = true; e.preventDefault(); break;
        case 'ArrowDown': keyState.down = true; e.preventDefault(); break;
        case 'ShiftLeft':
        case 'ShiftRight': keyState.shift = true; e.preventDefault(); break;
    }
}

function onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
        case 'ArrowLeft': keyState.left = false; break;
        case 'ArrowRight': keyState.right = false; break;
        case 'ArrowUp': keyState.up = false; break;
        case 'ArrowDown': keyState.down = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': keyState.shift = false; break;
    }
}

function ensureKeyInput(): HTMLInputElement {
    if (keyInputEl) return keyInputEl;
    const el = document.createElement('input');
    el.type = 'text';
    el.autocomplete = 'off';
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = 0;
    el.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('keyup', onKeyUp);
    document.body.appendChild(el);
    keyInputEl = el;
    return el;
}

function focusKeyInput(): void {
    const el = ensureKeyInput();
    el.focus();
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
    private runKey!: Phaser.Input.Keyboard.Key;
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
    private keyHintOverlay: Phaser.GameObjects.Container | null = null;

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
        const bgHex = levelConfig.bgColor ? Number(levelConfig.bgColor.replace('#', '0x')) : 0x5C94FC;
        this.cameras.main.setBackgroundColor(bgHex);

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

        keyState.left = false;
        keyState.right = false;
        keyState.up = false;
        keyState.down = false;
        keyState.shift = false;

        focusKeyInput();
        this.time.delayedCall(150, () => focusKeyInput());
        this.time.delayedCall(600, () => focusKeyInput());
        this.input.on('pointerdown', () => {
            focusKeyInput();
            this.removeKeyHintOnce();
        });

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const bg = this.add.rectangle(w / 2, h / 2, w + 100, h + 100, 0x000000, 0.4).setScrollFactor(0).setDepth(5000).setInteractive();
        const txt = this.add.text(w / 2, h / 2, 'Klik her for at aktivere tastatur\n← → bevæg   ↑ hop   SHIFT løb', {
            fontSize: '14px',
            color: '#fff',
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(5001);
        this.keyHintOverlay = this.add.container(0, 0, [bg, txt]);
        bg.on('pointerdown', () => {
            focusKeyInput();
            this.removeKeyHintOnce();
        });

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.runKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        AudioManager.init(this);
        AudioManager.playMusic('overworld');

        this.scene.launch('HudScene');
        this.scene.launch('MobileOverlayScene');
    }

    private removeKeyHintOnce(): void {
        if (this.keyHintOverlay) {
            this.keyHintOverlay.destroy();
            this.keyHintOverlay = null;
        }
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
        const mobileLeft = !!inputLeft;
        const mobileRight = !!inputRight;
        const mobileJump = !!inputJump;
        const mobileRun = !!inputRun;

        const cursors = {
            left: { isDown: mobileLeft || keyState.left || this.cursors.left.isDown },
            right: { isDown: mobileRight || keyState.right || this.cursors.right.isDown },
            up: { isDown: mobileJump || keyState.up || this.cursors.up.isDown },
            down: { isDown: keyState.down || this.cursors.down.isDown },
            space: { isDown: false },
            shift: { isDown: mobileRun || keyState.shift || this.runKey.isDown },
        } as Phaser.Types.Input.Keyboard.CursorKeys;
        const runKey = { isDown: mobileRun || keyState.shift || this.runKey.isDown } as Phaser.Input.Keyboard.Key;

        this.mario.update(cursors, runKey, this.isUnderwater);
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
