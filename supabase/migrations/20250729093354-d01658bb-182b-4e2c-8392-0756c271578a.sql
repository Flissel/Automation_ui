-- Create table for Live Desktop configurations
CREATE TABLE IF NOT EXISTS live_desktop_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR DEFAULT 'custom'
);

-- Enable RLS
ALTER TABLE live_desktop_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for live_desktop_configs
CREATE POLICY "Users can view all configs" 
ON live_desktop_configs 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create configs" 
ON live_desktop_configs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update configs" 
ON live_desktop_configs 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete configs" 
ON live_desktop_configs 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_live_desktop_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_live_desktop_configs_updated_at
    BEFORE UPDATE ON live_desktop_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_live_desktop_configs_updated_at();