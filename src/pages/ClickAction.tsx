import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { ArrowLeft, Save, RotateCcw, Play, MousePointer } from 'lucide-react';
import { toast } from 'sonner';

// Interface für die Click Action Konfiguration
interface ClickActionConfig {
  x: number;
  y: number;
  button: 'left' | 'right' | 'middle';
  filesystem_output_enabled: boolean;
  command_filename: string;
  execution_wait_time: number;
}

// Standard-Konfiguration
const defaultConfig: ClickActionConfig = {
  x: 100,
  y: 100,
  button: 'left',
  filesystem_output_enabled: false,
  command_filename: 'click_action.json',
  execution_wait_time: 1000
};

const ClickAction: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ClickActionConfig>(defaultConfig);
  const [isValid, setIsValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Konfiguration beim Laden der Komponente aus localStorage laden
  useEffect(() => {
    const savedConfig = localStorage.getItem('click_action_config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsedConfig });
      } catch (error) {
        console.error('Fehler beim Laden der gespeicherten Konfiguration:', error);
        toast.error('Fehler beim Laden der gespeicherten Konfiguration');
      }
    }
  }, []);

  // Validierung der Eingaben
  useEffect(() => {
    const valid = 
      config.x >= 0 && 
      config.y >= 0 && 
      config.execution_wait_time >= 0 &&
      config.command_filename.trim().length > 0;
    setIsValid(valid);
  }, [config]);

  // Konfiguration speichern
  const handleSave = async () => {
    if (!isValid) {
      toast.error('Bitte korrigieren Sie die ungültigen Eingaben');
      return;
    }

    setIsSaving(true);
    try {
      // In localStorage speichern
      localStorage.setItem('click_action_config', JSON.stringify(config));
      
      // Simuliere API-Aufruf für Backend-Persistierung
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Click Action Konfiguration erfolgreich gespeichert');
    } catch (error) {
      console.error('Fehler beim Speichern der Konfiguration:', error);
      toast.error('Fehler beim Speichern der Konfiguration');
    } finally {
      setIsSaving(false);
    }
  };

  // Konfiguration zurücksetzen
  const handleReset = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('click_action_config');
    toast.info('Konfiguration auf Standardwerte zurückgesetzt');
  };

  // Vorschau der Click Action
  const handlePreview = () => {
    toast.info(`Click Action Vorschau: Klick bei (${config.x}, ${config.y}) mit ${config.button} Maustaste`);
  };

  // Eingabefeld-Handler
  const handleInputChange = (field: keyof ClickActionConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Click Action Konfiguration</h1>
            <p className="text-gray-600 mt-1">Konfigurieren Sie Mausklick-Aktionen für Workflow-Automatisierung</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hauptkonfiguration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Koordinaten Konfiguration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="h-5 w-5" />
                  Klick-Koordinaten
                </CardTitle>
                <CardDescription>
                  Definieren Sie die X- und Y-Koordinaten für den Mausklick
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="x-coordinate">X-Koordinate</Label>
                    <Input
                      id="x-coordinate"
                      type="number"
                      min="0"
                      value={config.x}
                      onChange={(e) => handleInputChange('x', parseInt(e.target.value) || 0)}
                      placeholder="z.B. 100"
                      className={config.x < 0 ? 'border-red-500' : ''}
                    />
                    {config.x < 0 && (
                      <p className="text-sm text-red-500">X-Koordinate muss ≥ 0 sein</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="y-coordinate">Y-Koordinate</Label>
                    <Input
                      id="y-coordinate"
                      type="number"
                      min="0"
                      value={config.y}
                      onChange={(e) => handleInputChange('y', parseInt(e.target.value) || 0)}
                      placeholder="z.B. 100"
                      className={config.y < 0 ? 'border-red-500' : ''}
                    />
                    {config.y < 0 && (
                      <p className="text-sm text-red-500">Y-Koordinate muss ≥ 0 sein</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mouse-button">Maustaste</Label>
                  <Select
                    value={config.button}
                    onValueChange={(value: 'left' | 'right' | 'middle') => handleInputChange('button', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen Sie eine Maustaste" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Linke Maustaste</SelectItem>
                      <SelectItem value="right">Rechte Maustaste</SelectItem>
                      <SelectItem value="middle">Mittlere Maustaste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Dateisystem Integration */}
            <Card>
              <CardHeader>
                <CardTitle>Dateisystem Integration</CardTitle>
                <CardDescription>
                  Konfigurieren Sie die Ausgabe und Persistierung der Click Action
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filesystem-output"
                    checked={config.filesystem_output_enabled}
                    onCheckedChange={(checked) => handleInputChange('filesystem_output_enabled', checked)}
                  />
                  <Label htmlFor="filesystem-output">
                    Dateisystem-Ausgabe aktivieren
                  </Label>
                </div>
                
                {config.filesystem_output_enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="command-filename">Befehlsdateiname</Label>
                      <Input
                        id="command-filename"
                        value={config.command_filename}
                        onChange={(e) => handleInputChange('command_filename', e.target.value)}
                        placeholder="z.B. click_action.json"
                        className={config.command_filename.trim().length === 0 ? 'border-red-500' : ''}
                      />
                      {config.command_filename.trim().length === 0 && (
                        <p className="text-sm text-red-500">Dateiname ist erforderlich</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="execution-wait">Wartezeit für Ausführung (ms)</Label>
                      <Input
                        id="execution-wait"
                        type="number"
                        min="0"
                        value={config.execution_wait_time}
                        onChange={(e) => handleInputChange('execution_wait_time', parseInt(e.target.value) || 0)}
                        placeholder="z.B. 1000"
                        className={config.execution_wait_time < 0 ? 'border-red-500' : ''}
                      />
                      {config.execution_wait_time < 0 && (
                        <p className="text-sm text-red-500">Wartezeit muss ≥ 0 sein</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Seitenleiste */}
          <div className="space-y-6">
            {/* Aktionen */}
            <Card>
              <CardHeader>
                <CardTitle>Aktionen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleSave}
                  disabled={!isValid || isSaving}
                  className="w-full flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Speichern...' : 'Konfiguration speichern'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Zurücksetzen
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={handlePreview}
                  className="w-full flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Vorschau
                </Button>
              </CardContent>
            </Card>

            {/* Konfigurationsvorschau */}
            <Card>
              <CardHeader>
                <CardTitle>Aktuelle Konfiguration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Position:</span>
                    <span className="font-mono">({config.x}, {config.y})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maustaste:</span>
                    <span className="capitalize">{config.button}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dateisystem:</span>
                    <span className={config.filesystem_output_enabled ? 'text-green-600' : 'text-gray-400'}>
                      {config.filesystem_output_enabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  {config.filesystem_output_enabled && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Datei:</span>
                        <span className="font-mono text-xs">{config.command_filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Wartezeit:</span>
                        <span>{config.execution_wait_time}ms</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-sm font-medium ${
                  isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isValid ? '✓ Konfiguration gültig' : '✗ Konfiguration ungültig'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClickAction;