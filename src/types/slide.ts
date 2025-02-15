import { Shape } from './shape';
import { Animation } from './animation';

export interface Transition {
  type: string;
  duration: number;
  speed: string;
}

export interface Slide {
  id?: string;
  slideIndex: number;
  width: number;
  height: number;
  shapes?: Shape[];
  animations?: Animation[];
  displayDuration?: number;
  content?: {
    title?: string;
    body?: string;
    imageUrl?: string;
    backgroundColor?: string;
  };
  transition?: {
    type: string;
    duration: number;
    speed: string;
  };
  version?: string;
  commitId?: string;
}

export interface Template {
  id: string;
  name: string;
  previewImage: string;
  slides: Slide[];
}

export interface SlideData {
  slideNumber: number;
  title: string;
  text: string;
  decorations: string[];
  photoPlaceholder?: string;
  animation?: string;
}

export type SampleData = {
  slides: SlideData[];
}; 