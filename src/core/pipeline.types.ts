/**
 * Item-generation pipeline types (CONTENT-002).
 */

export type AiGenerationPolicy = 'permitted' | 'prohibited';
export type CognitiveLevel = 'recall' | 'application' | 'analysis';
export type ReviewVerdict = 'approved' | 'rejected' | 'revise';

export interface PipelineConfig {
  examCode: string;
  vendor: { key: string; ai_generation_policy: AiGenerationPolicy };
  blueprintDoc: string;
  corpusRef: string;
  targets: { totalItems: number };
  cognitiveMix: { recall: number; application: number; analysis: number };
  model: { generate: string; explain: string };
  betaMixRatio: number;
  maxUsd: number;
  maxReviserIterations: number;
  promotion: {
    minResponses: number;
    pValueMin: number;
    pValueMax: number;
    pointBiserialMin: number;
  };
}

export interface SpecMatrixTarget {
  domain: string;
  objective: string;
  cognitive: CognitiveLevel;
  count: number;
}

export interface GeneratedItem {
  draft_id: string;
  stem: string;
  options: { key: string; text: string }[];
  correct_key: string;
  domain: string;
  objective: string;
  cognitive: CognitiveLevel;
  findings?: string[];
}

export interface BatchTransport {
  submit(prompts: string[]): Promise<{ batchId: string; estimatedUsd: number }>;
  poll(batchId: string): Promise<'running' | 'complete' | 'failed'>;
  fetch(batchId: string): Promise<string[]>;
}
