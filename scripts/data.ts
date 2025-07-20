export interface HData {
    commentOnly: string[];
    exclude: string[];
    notShowOnHome: string[];
    actualHide: string[];
    trigger: string[];
    switch: [string, string][];
    skipAges: string[];
    probilities: any;
}

export interface PeopleMeta {
    id: string;
    name: string;
    profileUrl: string;
    path: string;
    sortKey: string;
}

export interface BannerData {
    type: string;
    icon: string;
    title: string;
    text: string;
}
