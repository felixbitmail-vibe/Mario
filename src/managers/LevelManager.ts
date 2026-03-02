export default class LevelManager {
    private static instance: LevelManager;
    public currentLevel = '1-1';
    private levels: any = {
        '1-1': { json: '1-1.json', type: 'overworld', bgColor: '#5C94FC', next: '1-2' }
    };
    public static getInstance() { if (!this.instance) this.instance = new LevelManager(); return this.instance; }
    public getConfig() { return this.levels[this.currentLevel]; }
}
