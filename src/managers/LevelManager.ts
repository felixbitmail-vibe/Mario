export default class LevelManager {
    private static instance: LevelManager;
    public currentLevel = '1-1';
    private levels: Record<string, { json: string; type: string; bgColor: string; next: string | null }> = {
        '1-1': { json: '1-1.json', type: 'overworld', bgColor: '#5C94FC', next: '1-2' },
        '1-2': { json: '1-2.json', type: 'overworld', bgColor: '#5C94FC', next: '1-3' },
        '1-3': { json: '1-3.json', type: 'sky', bgColor: '#5C94FC', next: '1-4' },
        '1-4': { json: '1-4.json', type: 'castle', bgColor: '#2D2D2D', next: '2-1' },
        '2-1': { json: '2-1.json', type: 'overworld', bgColor: '#5C94FC', next: '2-2' },
        '2-2': { json: '2-2.json', type: 'underworld', bgColor: '#1a1a2e', next: '2-3' },
        '2-3': { json: '2-3.json', type: 'sky', bgColor: '#5C94FC', next: '2-4' },
        '2-4': { json: '2-4.json', type: 'castle', bgColor: '#2D2D2D', next: '3-1' },
        '3-1': { json: '3-1.json', type: 'overworld', bgColor: '#5C94FC', next: '3-2' },
        '3-2': { json: '3-2.json', type: 'underworld', bgColor: '#1a1a2e', next: '3-3' },
        '3-3': { json: '3-3.json', type: 'sky', bgColor: '#5C94FC', next: '3-4' },
        '3-4': { json: '3-4.json', type: 'castle', bgColor: '#2D2D2D', next: '4-1' },
        '4-1': { json: '4-1.json', type: 'overworld', bgColor: '#5C94FC', next: '4-2' },
        '4-2': { json: '4-2.json', type: 'underworld', bgColor: '#1a1a2e', next: '4-3' },
        '4-3': { json: '4-3.json', type: 'sky', bgColor: '#5C94FC', next: '4-4' },
        '4-4': { json: '4-4.json', type: 'castle', bgColor: '#2D2D2D', next: '5-1' },
        '5-1': { json: '5-1.json', type: 'overworld', bgColor: '#5C94FC', next: '5-2' },
        '5-2': { json: '5-2.json', type: 'underworld', bgColor: '#1a1a2e', next: '5-3' },
        '5-3': { json: '5-3.json', type: 'sky', bgColor: '#5C94FC', next: '5-4' },
        '5-4': { json: '5-4.json', type: 'castle', bgColor: '#2D2D2D', next: '6-1' },
        '6-1': { json: '6-1.json', type: 'overworld', bgColor: '#5C94FC', next: '6-2' },
        '6-2': { json: '6-2.json', type: 'underworld', bgColor: '#1a1a2e', next: null },
    };

    public static getInstance(): LevelManager {
        if (!this.instance) this.instance = new LevelManager();
        return this.instance;
    }

    public getLevelKeys(): string[] {
        return Object.keys(this.levels);
    }

    public getConfig() {
        return this.levels[this.currentLevel];
    }
}
