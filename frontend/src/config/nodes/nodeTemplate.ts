export interface InputPort {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  defaultValue?: any;
  allowMultiple?: boolean;
}

export interface OutputPort {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  value?: any;
}

export enum NodeCategory {
  TRIGGERS = 'triggers',
  ACTIONS = 'actions',
  LOGIC = 'logic',
  DATA = 'data',
  DESKTOP = 'desktop',
  AUTOMATION = 'automation'
}

export interface NodeTemplate {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  inputs: InputPort[];
  outputs: OutputPort[];
  defaultConfig: Record<string, any>;
  configSchema: Record<string, any>;
}