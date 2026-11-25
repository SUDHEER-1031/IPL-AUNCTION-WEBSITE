export interface TeamBrand {
  id: string;
  shortName: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  textOnPrimary: string;
  tagline: string;
}

export const TEAM_BRANDS: TeamBrand[] = [
  {
    id: 'CSK',
    shortName: 'CSK',
    name: 'Chennai Super Kings',
    primaryColor: '#FDB913',
    secondaryColor: '#0081E9',
    textOnPrimary: '#0F172A',
    tagline: 'Whistle Podu',
  },
  {
    id: 'MI',
    shortName: 'MI',
    name: 'Mumbai Indians',
    primaryColor: '#004BA0',
    secondaryColor: '#D1AB3E',
    textOnPrimary: '#FFFFFF',
    tagline: 'Duniya Hila Denge',
  },
  {
    id: 'RCB',
    shortName: 'RCB',
    name: 'Royal Challengers Bengaluru',
    primaryColor: '#EC1C24',
    secondaryColor: '#2B2A29',
    textOnPrimary: '#FFFFFF',
    tagline: 'Play Bold',
  },
  {
    id: 'KKR',
    shortName: 'KKR',
    name: 'Kolkata Knight Riders',
    primaryColor: '#3A225D',
    secondaryColor: '#D4AF37',
    textOnPrimary: '#FFFFFF',
    tagline: 'Korbo Lorbo Jeetbo',
  },
  {
    id: 'SRH',
    shortName: 'SRH',
    name: 'Sunrisers Hyderabad',
    primaryColor: '#FF822A',
    secondaryColor: '#1A1A1A',
    textOnPrimary: '#0F172A',
    tagline: 'Rise Up To Every Challenge',
  },
  {
    id: 'DC',
    shortName: 'DC',
    name: 'Delhi Capitals',
    primaryColor: '#0078BC',
    secondaryColor: '#EF1B23',
    textOnPrimary: '#FFFFFF',
    tagline: 'Roar Macha',
  },
  {
    id: 'RR',
    shortName: 'RR',
    name: 'Rajasthan Royals',
    primaryColor: '#EA1A85',
    secondaryColor: '#004BA0',
    textOnPrimary: '#FFFFFF',
    tagline: 'Halla Bol',
  },
  {
    id: 'PBKS',
    shortName: 'PBKS',
    name: 'Punjab Kings',
    primaryColor: '#DD1F2D',
    secondaryColor: '#D7B56D',
    textOnPrimary: '#FFFFFF',
    tagline: 'Sadda Punjab',
  },
  {
    id: 'LSG',
    shortName: 'LSG',
    name: 'Lucknow Super Giants',
    primaryColor: '#00AEEF',
    secondaryColor: '#F36F21',
    textOnPrimary: '#0F172A',
    tagline: 'Ab Apni Baari Hai',
  },
  {
    id: 'GT',
    shortName: 'GT',
    name: 'Gujarat Titans',
    primaryColor: '#1B2133',
    secondaryColor: '#B9975B',
    textOnPrimary: '#FFFFFF',
    tagline: 'Aava De',
  },
];

export function getTeamBrand(teamId: string | null | undefined): TeamBrand | undefined {
  if (!teamId) return undefined;
  return TEAM_BRANDS.find((t) => t.id === teamId);
}
