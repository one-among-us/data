export interface HData {
    commentOnly: string[];
    exclude: string[];
    notShowOnHome: string[];
    actualHide: string[];
    trigger: string[];
    switch: [string, string][];
    skipAges: string[];
    probabilities: any;
    groups: string[][];
}

export interface PeopleMeta {
    id: string;
    name: string;
    profileUrl: string;
    path: string;
    sortKey: string;
    desc?: string;
}

export interface BannerData {
    type: string;
    icon: string;
    title: string;
    text: string;
}
