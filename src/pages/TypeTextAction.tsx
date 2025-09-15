import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { ArrowLeft, Save, RotateCcw, Play, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

// Interface für die Type Text Action Konfiguration
interface TypeTextActionConfig {
  text: string;
  delay: number;
  output_to_filesystem: boolean;
  command_file: string;
  wait_for_execution: boolean;
  execution_timeout: number;
}

// Standard-Konfiguration
const defaultConfig: TypeTextActionConfig = {
  text: '',
  delay: 100,
  output_to_filesystem: true,
  command_file: 'type_command.json',
  wait_for_execution: true,
  execution_timeout: 5000
};

const TypeTextAction: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<TypeTextActionConfig>(defaultConfig);
  const [isValid, setIsValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Konfiguration beim Laden der Komponente aus localStorage laden
  useEffect(() => {
    const savedConfig = localStorage.getItem('type_text_action_config');
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

  // Zeichenanzahl aktualisieren
  useEffect(() => {
    setCharCount(config.text.length);
  }, [config.text]);

  // Validierung der Eingaben
  useEffect(() => {
    const valid = 
      config.text.trim().length > 0 && 
      config.delay >= 0 && 
      config.execution_timeout > 0 &&
      config.command_file.trim().length > 0;
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
      localStorage.setItem('type_text_action_config', JSON.stringify(config));
      
      // Simuliere API-Aufruf für Backend-Persistierung
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Type Text Action Konfiguration erfolgreich gespeichert');
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
    localStorage.removeItem('type_text_action_config');
    toast.info('Konfiguration auf Standardwerte zurückgesetzt');
  };

  // Vorschau der Type Text Action
  const handlePreview = () => {
    const previewText = config.text.length > 50 ? config.text.substring(0, 50) + '...' : config.text;
    toast.info(`Type Text Vorschau: "${previewText}" mit ${config.delay}ms Verzögerung`);
  };

  // Eingabefeld-Handler
  const handleInputChange = (field: keyof TypeTextActionConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Beispieltext einfügen
  const insertSampleText = () => {
    const sampleTexts = [
      'Hallo Welt!',
      'Dies ist ein Beispieltext für die Automatisierung.',
      'Benutzername: admin\nPasswort: 123456',
      'E-Mail: test@example.com'
    ];
    const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    handleInputChange('text', randomText);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
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
            <h1 className="text-3xl font-bold text-gray-900">Type Text Action Konfiguration</h1>
            <p className="text-gray-600 mt-1">Konfigurieren Sie Texteingabe-Aktionen für Workflow-Automatisierung</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hauptkonfiguration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Text Konfiguration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  Text Eingabe
                </CardTitle>
                <CardDescription>
                  Definieren Sie den Text, der automatisch eingegeben werden soll
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="text-input">Text zum Eingeben</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{charCount} Zeichen</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={insertSampleText}
                        className="text-xs"
                      >
                        Beispiel
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="text-input"
                    value={config.text}
                    onChange={(e) => handleInputChange('text', e.target.value)}
                    placeholder="Geben Sie den Text ein, der automatisch getippt werden soll..."
                    className={`min-h-[120px] ${config.text.trim().length === 0 ? 'border-red-500' : ''}`}
                    rows={6}
                  />
                  {config.text.trim().length === 0 && (
                    <p className="text-sm text-red-500">Text ist erforderlich</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Tipp: Verwenden Sie \n für Zeilenumbrüche und \t für Tabs
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delay-input">Verzögerung zwischen Zeichen (ms)</Label>
                  <Input
                    id="delay-input"
                    type="number"
                    min="0"
                    max="10000"
                    step="10"
                    value={config.delay}
                    onChange={(e) => handleInputChange('delay', parseInt(e.target.value) || 0)}
                    placeholder="z.B. 100"
                    className={config.delay < 0 ? 'border-red-500' : ''}
                  />
                  {config.delay < 0 && (
                    <p className="text-sm text-red-500">Verzögerung muss ≥ 0 sein</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Niedrigere Werte = schnellere Eingabe, höhere Werte = langsamere, natürlichere Eingabe
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Dateisystem Integration */}
            <Card>
              <CardHeader>
                <CardTitle>Dateisystem Integration</CardTitle>
                <CardDescription>
                  Konfigurieren Sie die Ausgabe und Persistierung der Type Text Action
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filesystem-output"
                    checked={config.output_to_filesystem}
                    onCheckedChange={(checked) => handleInputChange('output_to_filesystem', checked)}
                  />
                  <Label htmlFor="filesystem-output">
                    Ausgabe an Dateisystem
                  </Label>
                </div>
                
                {config.output_to_filesystem && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="command-file">Befehlsdateiname</Label>
                      <Input
                        id="command-file"
                        value={config.command_file}
                        onChange={(e) => handleInputChange('command_file', e.target.value)}
                        placeholder="z.B. type_command.json"
                        className={config.command_file.trim().length === 0 ? 'border-red-500' : ''}
                      />
                      {config.command_file.trim().length === 0 && (
                        <p className="text-sm text-red-500">Dateiname ist erforderlich</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="wait-execution"
                        checked={config.wait_for_execution}
                        onCheckedChange={(checked) => handleInputChange('wait_for_execution', checked)}
                      />
                      <Label htmlFor="wait-execution">
                        Auf Ausführung warten
                      </Label>
                    </div>
                    
                    {config.wait_for_execution && (
                      <div className="space-y-2">
                        <Label htmlFor="execution-timeout">Ausführungs-Timeout (ms)</Label>
                        <Input
                          id="execution-timeout"
                          type="number"
                          min="1000"
                          max="60000"
                          step="1000"
                          value={config.execution_timeout}
                          onChange={(e) => handleInputChange('execution_timeout', parseInt(e.target.value) || 5000)}
                          placeholder="z.B. 5000"
                          className={config.execution_timeout <= 0 ? 'border-red-500' : ''}
                        />
                        {config.execution_timeout <= 0 && (
                          <p className="text-sm text-red-500">Timeout muss &gt; 0 sein</p>
                        )}
                      </div>
                    )}
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
                    <span className="text-gray-600">Zeichen:</span>
                    <span className="font-mono">{charCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verzögerung:</span>
                    <span>{config.delay}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Geschätzte Zeit:</span>
                    <span>{Math.round((charCount * config.delay) / 1000 * 10) / 10}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dateisystem:</span>
                    <span className={config.output_to_filesystem ? 'text-green-600' : 'text-gray-400'}>
                      {config.output_to_filesystem ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  {config.output_to_filesystem && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Datei:</span>
                        <span className="font-mono text-xs">{config.command_file}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Timeout:</span>
                        <span>{config.execution_timeout}ms</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Text Vorschau */}
            {config.text && (
              <Card>
                <CardHeader>
                  <CardTitle>Text Vorschau</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-3 rounded border text-sm font-mono max-h-32 overflow-y-auto">
                    {config.text.length > 100 
                      ? config.text.substring(0, 100) + '...' 
                      : config.text || 'Kein Text eingegeben'
                    }
                  </div>
                </CardContent>
              </Card>
            )}

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

export default TypeTextAction;