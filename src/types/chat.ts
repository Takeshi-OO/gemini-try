import { Template, Slide } from './slide';

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'loading' | 'template' | 'slides';
  content: string | Template | Slide[] | string[];
  timestamp: number;
  images?: string[];
  imageTypes?: ('material' | 'request')[];
  projectDir?: string;
  versionDir?: string;
}

export interface UserRequest {
  text?: string;
  images?: File[];
}

export interface PastOutput {
  id: string;
  name: string;
  date: string;
  slides: Slide[];
} 