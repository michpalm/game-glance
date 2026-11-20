export interface SearchResults {
    data: Array<{
        game_id: number;
        game_name: string;
        comp_all_count: number;
    }>;
}

export interface GamePageData {
    pageProps: {
        game: {
            data: {
                game: GameData[];
            };
        };
    };
}

export interface GameData {
    comp_main: number;
    comp_plus: number;
    comp_100: number;
    comp_all: number;
    game_id: number;
    profile_steam: number;
    review_score?: number; // game-glance local patch: the players' rating (percent), kept for the game page's card
}

export interface HLTBGameStats {
    mainStat: string;
    mainPlusStat: string;
    completeStat: string;
    allStylesStat: string;
    lastUpdatedAt: Date;
    gameId: number;
    reviewScore?: number | null; // game-glance local patch: GameData.review_score, null without one
}

export interface HLTBStats extends Omit<HLTBGameStats, 'gameId'> {
    gameId?: number;
    showStats: boolean;
    version?: number;
}
