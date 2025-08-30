export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  type: 'vessel' | 'port' | 'wind' | 'current' | 'wave' | 'warning';
  title: string;
  details: string;
  status?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface LayerData {
  id: string;
  label: string;
  icon: any;
  color: string;
}

export interface MapData {
  [key: string]: {
    speed?: string;
    direction?: string;
    height?: string;
    period?: string;
    coverage?: string;
    active?: string;
    severity?: string;
  };
}