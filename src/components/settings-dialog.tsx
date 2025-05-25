import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings } from "@/stores/settings";
import { Settings2 } from "lucide-react";

export function SettingsDialog() {
  const { theme, language, customApiKey, setTheme, setLanguage, setCustomApiKey } = useSettings();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Settings">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tema</Label>
            <RadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
              className="grid grid-cols-3 gap-2"
            >
              <Label className="flex flex-col items-center gap-2 rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="light" className="sr-only" />
                <span>Terang</span>
              </Label>
              <Label className="flex flex-col items-center gap-2 rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="dark" className="sr-only" />
                <span>Gelap</span>
              </Label>
              <Label className="flex flex-col items-center gap-2 rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="system" className="sr-only" />
                <span>System</span>
              </Label>
            </RadioGroup>
          </div>
          <div className="grid gap-2">
            <Label>Bahasa</Label>
            <RadioGroup
              value={language}
              onValueChange={(value) => setLanguage(value as 'id' | 'en')}
              className="grid grid-cols-2 gap-2"
            >
              <Label className="flex flex-col items-center gap-2 rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="id" className="sr-only" />
                <span>Indonesia</span>
              </Label>
              <Label className="flex flex-col items-center gap-2 rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="en" className="sr-only" />
                <span>English</span>
              </Label>
            </RadioGroup>
          </div>
          <div className="grid gap-2">
            <Label>Custom API Key (Optional)</Label>
            <Input
              placeholder="Paste your Gemini API key here"
              value={customApiKey || ''}
              onChange={(e) => setCustomApiKey(e.target.value || null)}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Kosongkan untuk pakai API key default
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
